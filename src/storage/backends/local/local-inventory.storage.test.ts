import { afterEach, describe, expect, it, vi } from "vitest";

import { Character } from "../../../model";
import { StorageError, StorageErrorCode } from "../../interface";
import {
  describeStorageContract,
  FakeStorageEvents,
  FakeWebStorage,
} from "../../testing";

import { LOCAL_INVENTORY_DTO_VERSION } from "./dto";
import { LocalInventoryStorage } from "./local-inventory.storage";
import {
  LOCAL_INVENTORY_KEY,
  LOCAL_STORAGE_ID,
} from "./local-storage.constant";

describeStorageContract(
  "LocalInventoryStorage",
  async () => new LocalInventoryStorage(new FakeWebStorage()),
);

function setup() {
  const webStorage = new FakeWebStorage();
  const events = new FakeStorageEvents();
  const storage = new LocalInventoryStorage(webStorage, events);
  return { webStorage, events, storage };
}

function saveCharacter(storage: LocalInventoryStorage, name = "Mira") {
  const record = Character.create(name);
  return storage.apply([{ op: "save", kind: "character", record }]);
}

async function expectStorageError(
  promise: Promise<unknown>,
  code: StorageErrorCode,
): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(StorageError);
  expect(error instanceof StorageError && error.code).toBe(code);
}

describe("LocalInventoryStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is a persistent, single-user GM storage", async () => {
    const { storage } = setup();

    expect(storage.id).toBe(LOCAL_STORAGE_ID);
    expect(storage.capabilities).toEqual({
      persistent: true,
      lazyTexts: false,
      multiUser: false,
    });
    expect(await storage.getRole()).toBe("GM");
  });

  describe("persistence", () => {
    it("writes a versioned DTO under its key", async () => {
      const { webStorage, storage } = setup();

      await saveCharacter(storage);

      const stored: unknown = JSON.parse(
        webStorage.peek(LOCAL_INVENTORY_KEY) ?? "null",
      );
      expect(stored).toMatchObject({
        version: LOCAL_INVENTORY_DTO_VERSION,
        characters: [{ name: "Mira" }],
      });
    });

    it("keeps data for a new controller on the same storage", async () => {
      const { webStorage, storage } = setup();
      await saveCharacter(storage);

      const reopened = new LocalInventoryStorage(webStorage);

      expect((await reopened.load()).characters[0].name).toBe("Mira");
    });

    it("reads the storage on every call instead of caching", async () => {
      const { webStorage, storage } = setup();
      const otherTab = new LocalInventoryStorage(webStorage);

      await saveCharacter(otherTab, "Tomas");

      expect((await storage.load()).characters[0].name).toBe("Tomas");
    });
  });

  describe("unreadable data", () => {
    const cases: [string, string, StorageErrorCode][] = [
      ["corrupt JSON", "{not json", "unreadable"],
      ["an invalid shape", '{"version":1,"items":{}}', "unreadable"],
      ["no version", '{"items":[]}', "unreadable"],
      [
        "another version",
        JSON.stringify({ version: LOCAL_INVENTORY_DTO_VERSION + 1 }),
        "unsupported-version",
      ],
    ];

    for (const [label, text, code] of cases) {
      it(`rejects ${label} and never overwrites it`, async () => {
        const { webStorage, storage } = setup();
        webStorage.poke(LOCAL_INVENTORY_KEY, text);

        await expectStorageError(storage.load(), code);
        await expectStorageError(saveCharacter(storage), code);
        await expectStorageError(
          storage.loadTexts({ kind: "item", id: "x" }),
          code,
        );
        expect(webStorage.peek(LOCAL_INVENTORY_KEY)).toBe(text);
      });
    }

    it("rejects when reading the storage fails", async () => {
      const { webStorage, storage } = setup();
      webStorage.failReads = true;

      await expectStorageError(storage.load(), "unreadable");
    });

    it("drops invalid entries, keeps valid ones and logs only a count", async () => {
      const { webStorage, storage } = setup();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      webStorage.poke(
        LOCAL_INVENTORY_KEY,
        JSON.stringify({
          version: LOCAL_INVENTORY_DTO_VERSION,
          characters: [
            { id: "char-1", name: "Mira" },
            { id: "char-2", secret: "player text" },
          ],
        }),
      );

      const { characters } = await storage.load();

      expect(characters.map((entry) => entry.id)).toEqual(["char-1"]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).not.toContain("player text");
    });
  });

  describe("write failures", () => {
    it("rejects, keeps the stored data and emits nothing", async () => {
      const { webStorage, storage } = setup();
      await saveCharacter(storage);
      const before = webStorage.peek(LOCAL_INVENTORY_KEY);
      const listener = vi.fn();
      storage.subscribe(listener);
      webStorage.failWrites = true;

      await expectStorageError(saveCharacter(storage, "Tomas"), "write-failed");

      expect(webStorage.peek(LOCAL_INVENTORY_KEY)).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("changes from other tabs", () => {
    it("emits a records change for its key and for a cleared storage", () => {
      const { events, storage } = setup();
      const listener = vi.fn();
      storage.subscribe(listener);

      events.fire(LOCAL_INVENTORY_KEY);
      events.fire(null);

      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenCalledWith({ type: "records" });
    });

    it("ignores changes to other keys", () => {
      const { events, storage } = setup();
      const listener = vi.fn();
      storage.subscribe(listener);

      events.fire("other/key");

      expect(listener).not.toHaveBeenCalled();
    });

    it("removes its event listener on dispose", () => {
      const { events, storage } = setup();

      storage.dispose();

      expect(events.listenerCount).toBe(0);
    });
  });

  describe("clear", () => {
    it("removes the stored inventory and emits a records change", async () => {
      const { webStorage, storage } = setup();
      await saveCharacter(storage);
      const listener = vi.fn();
      storage.subscribe(listener);

      await storage.clear();

      expect(webStorage.peek(LOCAL_INVENTORY_KEY)).toBeUndefined();
      expect((await storage.load()).characters).toEqual([]);
      expect(listener).toHaveBeenCalledWith({ type: "records" });
    });

    it("removes unreadable data, so the storage is usable again", async () => {
      const { webStorage, storage } = setup();
      webStorage.poke(LOCAL_INVENTORY_KEY, "{not json");

      await storage.clear();
      await saveCharacter(storage);

      expect((await storage.load()).characters).toHaveLength(1);
    });

    it("rejects when the delete fails", async () => {
      const { webStorage, storage } = setup();
      webStorage.failWrites = true;

      await expectStorageError(storage.clear(), "write-failed");
    });
  });

  describe("browser wiring", () => {
    it("is unavailable and not created without a browser localStorage", () => {
      expect(LocalInventoryStorage.isAvailableInBrowser()).toBe(false);
      expect(LocalInventoryStorage.fromBrowser()).toBeUndefined();
    });
  });
});
