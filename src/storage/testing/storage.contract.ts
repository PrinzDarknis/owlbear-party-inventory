import { describe, expect, it, vi } from "vitest";

import { Character, Item, ItemInstance } from "../../model";
import { InventoryStorage, StorageChange } from "../interface";

/** Creates a fresh, empty controller for one test. */
export type StorageFactory = () => Promise<InventoryStorage>;

/**
 * Contract every `InventoryStorage` controller must pass. Call it from the
 * controller's own test file; controller-specific behavior (persistence,
 * failures, foreign changes) is tested there separately.
 */
export function describeStorageContract(
  name: string,
  createStorage: StorageFactory,
): void {
  describe(`${name}: InventoryStorage contract`, () => {
    function sampleRecords() {
      const item = Item.create("Longbow");
      item.description = "A tall bow.";
      item.dmNotes = "Cursed.";
      item.weight = 2;
      const character = Character.create("Mira");
      const instance = ItemInstance.create(item.id, {
        type: "character",
        characterId: character.id,
      });
      instance.notes = "Found in the crypt.";
      return { item, instance, character };
    }

    async function storageWithSample() {
      const storage = await createStorage();
      const records = sampleRecords();
      await storage.apply([
        { op: "save", kind: "item", record: records.item },
        { op: "save", kind: "instance", record: records.instance },
        { op: "save", kind: "character", record: records.character },
      ]);
      return { storage, ...records };
    }

    it("has an id and reports a valid role", async () => {
      const storage = await createStorage();

      expect(storage.id).not.toBe("");
      expect(["GM", "PLAYER"]).toContain(await storage.getRole());
    });

    it("starts empty", async () => {
      const storage = await createStorage();

      expect(await storage.load()).toEqual({
        items: [],
        instances: [],
        characters: [],
      });
    });

    it("loads saved records with their data", async () => {
      const { storage, item, instance, character } = await storageWithSample();

      const snapshot = await storage.load();

      expect(snapshot.items.map((entry) => entry.id)).toEqual([item.id]);
      expect(snapshot.instances.map((entry) => entry.serialize())).toEqual([
        instance.serialize(),
      ]);
      expect(snapshot.characters.map((entry) => entry.serialize())).toEqual([
        character.serialize(),
      ]);
      const loaded = snapshot.items[0];
      expect(loaded.name).toBe("Longbow");
      expect(loaded.weight).toBe(2);
      if (!storage.capabilities.lazyTexts) {
        expect(loaded.serialize()).toEqual(item.serialize());
      }
    });

    it("replaces a saved record as a whole", async () => {
      const { storage, item } = await storageWithSample();
      const update = item.clone();
      update.name = "Shortbow";
      update.weight = undefined;

      await storage.apply([{ op: "save", kind: "item", record: update }]);

      const [loaded] = (await storage.load()).items;
      expect(loaded.name).toBe("Shortbow");
      expect(loaded.weight).toBeUndefined();
    });

    it("deletes records and ignores unknown ids", async () => {
      const { storage, item, character } = await storageWithSample();

      await storage.apply([
        { op: "delete", kind: "character", id: character.id },
        { op: "delete", kind: "instance", id: "unknown" },
      ]);

      const snapshot = await storage.load();
      expect(snapshot.characters).toEqual([]);
      expect(snapshot.instances).toHaveLength(1);
      expect(snapshot.items.map((entry) => entry.id)).toEqual([item.id]);
    });

    it("applies operations in order", async () => {
      const storage = await createStorage();
      const kept = Character.create("Mira");
      const dropped = Character.create("Tomas");
      const renamed = kept.clone();
      renamed.name = "Mira the Bold";

      await storage.apply([
        { op: "save", kind: "character", record: kept },
        { op: "save", kind: "character", record: dropped },
        { op: "delete", kind: "character", id: dropped.id },
        { op: "save", kind: "character", record: renamed },
      ]);

      const { characters } = await storage.load();
      expect(characters.map((entry) => entry.name)).toEqual(["Mira the Bold"]);
    });

    it("is not affected by changes to saved or loaded objects", async () => {
      const { storage, item } = await storageWithSample();

      item.name = "Changed after save";
      (await storage.load()).items[0].name = "Changed after load";

      expect((await storage.load()).items[0].name).toBe("Longbow");
    });

    it("returns long texts per record and nothing for unknown ids", async () => {
      const { storage, item, instance } = await storageWithSample();

      expect(await storage.loadTexts({ kind: "item", id: item.id })).toEqual({
        description: "A tall bow.",
        dmNotes: "Cursed.",
      });
      expect(
        await storage.loadTexts({ kind: "instance", id: instance.id }),
      ).toEqual({ notes: "Found in the crypt." });
      expect(await storage.loadTexts({ kind: "item", id: "unknown" })).toEqual(
        {},
      );
    });

    it("emits one records change per successful apply", async () => {
      const storage = await createStorage();
      const listener = vi.fn<(change: StorageChange) => void>();
      storage.subscribe(listener);

      await storage.apply([
        { op: "save", kind: "character", record: Character.create("Mira") },
        { op: "save", kind: "character", record: Character.create("Tomas") },
      ]);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ type: "records" });
    });

    it("does nothing for an empty operation list", async () => {
      const storage = await createStorage();
      const listener = vi.fn();
      storage.subscribe(listener);

      await storage.apply([]);

      expect(listener).not.toHaveBeenCalled();
    });

    it("stops notifying after unsubscribe and after dispose", async () => {
      const storage = await createStorage();
      const unsubscribed = vi.fn();
      const disposed = vi.fn();
      storage.subscribe(unsubscribed)();
      storage.subscribe(disposed);
      const record = Character.create("Mira");

      storage.dispose();
      await storage.apply([{ op: "save", kind: "character", record }]);

      expect(unsubscribed).not.toHaveBeenCalled();
      expect(disposed).not.toHaveBeenCalled();
    });
  });
}
