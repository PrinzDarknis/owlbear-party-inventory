import { describe, expect, it, vi } from "vitest";

import { atCharacter, inInstance } from "../model";
import { StorageError } from "../storage";
import {
  LOCAL_INVENTORY_KEY,
  LocalInventoryStorage,
} from "../storage/backends/local";
import { MemoryInventoryStorage } from "../storage/backends/memory";
import { FakeStorageEvents, FakeWebStorage } from "../storage/testing";

import { ManagerError, ManagerErrorCode } from "./errors";
import { InventoryManager } from "./inventory-manager";
import { LazyTextsMemoryStorage } from "./testing";

async function memoryManager() {
  const storage = new MemoryInventoryStorage();
  const manager = new InventoryManager(storage);
  await manager.start();
  return { storage, manager };
}

async function lazyManager() {
  const storage = new LazyTextsMemoryStorage();
  const manager = new InventoryManager(storage);
  await manager.start();
  return { storage, manager };
}

async function codeOf(run: Promise<unknown>): Promise<ManagerErrorCode> {
  const error = await run.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof ManagerError)) throw new Error("no ManagerError");
  return error.code;
}

// Mira carries a backpack and 20 arrows; the item catalog has both.
async function sampleInventory(manager: InventoryManager) {
  const mira = await manager.createCharacter("Mira");
  const backpack = await manager.createItem("Backpack", (item) => {
    item.hasInventory = true;
    item.weight = 5;
  });
  const arrow = await manager.createItem("Arrow", (item) => {
    item.stackable = true;
    item.weight = 0.05;
  });
  const pack = await manager.assignItem(backpack.id, atCharacter(mira.id));
  const quiver = await manager.assignItem(arrow.id, atCharacter(mira.id), 20);
  return { mira, backpack, arrow, pack, quiver };
}

describe("InventoryManager: lifecycle and store", () => {
  it("starts ready and empty with the storage role", async () => {
    const { manager } = await memoryManager();

    expect(manager.status).toEqual({ type: "ready" });
    expect(manager.role).toBe("GM");
    expect(manager.storageId).toBe("memory");
    expect(manager.characters()).toEqual([]);
    expect(manager.getVersion()).toBeGreaterThan(0);
  });

  it("notifies listeners and bumps the version after a command", async () => {
    const { manager } = await memoryManager();
    const listener = vi.fn();
    manager.subscribe(listener);
    const before = manager.getVersion();

    const mira = await manager.createCharacter("Mira");

    expect(manager.getVersion()).toBeGreaterThan(before);
    expect(listener).toHaveBeenCalled();
    expect(manager.characters().map((character) => character.id)).toEqual([
      mira.id,
    ]);
  });

  it("keeps query results identical until the next change", async () => {
    const { manager } = await memoryManager();
    const { mira } = await sampleInventory(manager);

    const contents = manager.contentsOf(atCharacter(mira.id));
    expect(manager.contentsOf(atCharacter(mira.id))).toBe(contents);
    expect(manager.characters()).toBe(manager.characters());

    const characters = manager.characters();
    await manager.createCharacter("Theo");
    expect(manager.characters()).not.toBe(characters);
    expect(manager.contentsOf(atCharacter(mira.id))).not.toBe(contents);
  });

  it("runs concurrent commands one after another", async () => {
    const { manager } = await memoryManager();

    await Promise.all([
      manager.createCharacter("Mira"),
      manager.createCharacter("Theo"),
      manager.createCharacter("Ash"),
    ]);

    expect(manager.characters().map((character) => character.name)).toEqual([
      "Mira",
      "Theo",
      "Ash",
    ]);
  });

  it("waits for the first load before running a command", async () => {
    const storage = new MemoryInventoryStorage();
    const manager = new InventoryManager(storage);
    const started = manager.start();

    const mira = await manager.createCharacter("Mira");
    await started;

    expect(manager.character(mira.id)?.name).toBe("Mira");
  });

  it("stops after dispose", async () => {
    const { storage, manager } = await memoryManager();
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.dispose();
    await storage.apply([]);

    await expect(manager.createCharacter("Mira")).rejects.toThrow(
      "Inventory manager disposed",
    );
    expect(listener).not.toHaveBeenCalled();
  });

  it("opens a registry entry", async () => {
    const manager = await InventoryManager.open({
      id: "memory",
      label: "Temporary",
      isAvailable: async () => true,
      create: async () => new MemoryInventoryStorage(),
    });

    expect(manager.status).toEqual({ type: "ready" });
  });
});

describe("InventoryManager: queries and commands", () => {
  it("builds the tree and derived values", async () => {
    const { manager } = await memoryManager();
    const { mira, arrow, pack, quiver } = await sampleInventory(manager);

    await manager.moveInstance(quiver.id, inInstance(pack.id));
    await manager.useInstance(quiver.id, 4);

    expect(manager.contentsOf(atCharacter(mira.id)).map((i) => i.id)).toEqual([
      pack.id,
    ]);
    expect(manager.pathOf(quiver.id).map((i) => i.id)).toEqual([pack.id]);
    expect(manager.ownerOf(quiver.id)?.id).toBe(mira.id);
    expect(manager.instance(quiver.id)?.available).toBe(16);
    expect(manager.totalWeight(atCharacter(mira.id))).toBe(5.8);
    expect(manager.instanceWeight(pack.id)).toBe(5.8);
    expect(manager.instanceCount(arrow.id)).toBe(1);
  });

  it("splits, merges and deletes with re-homing", async () => {
    const { manager } = await memoryManager();
    const { mira, backpack, pack, quiver } = await sampleInventory(manager);

    const part = await manager.splitInstance(quiver.id, 5, inInstance(pack.id));
    expect(manager.instance(quiver.id)?.quantity).toBe(15);
    expect(manager.contentsOf(inInstance(pack.id)).map((i) => i.id)).toEqual([
      part.id,
    ]);

    await manager.deleteItem(backpack.id);
    expect(manager.instance(pack.id)).toBeUndefined();
    expect(manager.instance(part.id)?.location).toEqual(atCharacter(mira.id));

    const merged = await manager.mergeInstances(quiver.id, part.id);
    expect(merged.quantity).toBe(20);
    expect(manager.instance(part.id)).toBeUndefined();
  });

  it("rejects rule violations without writing", async () => {
    const { storage, manager } = await memoryManager();
    const { pack, quiver } = await sampleInventory(manager);
    const apply = vi.spyOn(storage, "apply");

    expect(
      await codeOf(manager.moveInstance(pack.id, inInstance(pack.id))),
    ).toBe("invalid-move");
    expect(await codeOf(manager.useInstance(quiver.id, 21))).toBe(
      "invalid-quantity",
    );
    expect(await codeOf(manager.deleteInstance("gone"))).toBe("not-found");
    expect(apply).not.toHaveBeenCalled();
    expect(manager.checkMove(pack.id, inInstance(pack.id))?.code).toBe(
      "invalid-move",
    );
  });

  it("does not write when a move changes nothing", async () => {
    const { storage, manager } = await memoryManager();
    const { mira, quiver } = await sampleInventory(manager);
    const apply = vi.spyOn(storage, "apply");

    await manager.moveInstance(quiver.id, atCharacter(mira.id));

    expect(apply).not.toHaveBeenCalled();
  });

  it("reads texts from the state for storages without lazy texts", async () => {
    const { manager } = await memoryManager();
    const rope = await manager.createItem("Rope", (item) => {
      item.description = "Hempen.";
    });

    const entry = manager.texts({ kind: "item", id: rope.id });

    expect(entry).toEqual({
      status: "loaded",
      texts: { description: "Hempen." },
    });
    expect(manager.texts({ kind: "item", id: rope.id })).toBe(entry);
    await expect(
      manager.loadTexts({ kind: "item", id: rope.id }),
    ).resolves.toEqual({ description: "Hempen." });
    expect(manager.texts({ kind: "item", id: "gone" })).toBeUndefined();
  });
});

describe("InventoryManager: rights", () => {
  it("applies player rights while the GM views as player", async () => {
    const { manager } = await memoryManager();
    const { quiver, pack } = await sampleInventory(manager);

    manager.setViewAsPlayer(true);

    expect(manager.effectiveRole).toBe("PLAYER");
    expect(manager.can("deleteInstance")).toBe(false);
    expect(manager.can("moveInstance")).toBe(true);
    expect(await codeOf(manager.createCharacter("Theo"))).toBe("forbidden");
    expect(await codeOf(manager.unuseInstance(quiver.id, 1))).toBe("forbidden");
    await manager.moveInstance(quiver.id, inInstance(pack.id));
    await manager.useInstance(quiver.id, 2);
    await manager.writeNotes(quiver.id, "Two are bent.");
    expect(manager.instance(quiver.id)?.used).toBe(2);

    manager.setViewAsPlayer(false);
    expect(manager.can("deleteInstance")).toBe(true);
  });

  it("follows role changes of the storage", async () => {
    const { storage, manager } = await lazyManager();

    storage.setRole("PLAYER");

    await vi.waitFor(() => expect(manager.role).toBe("PLAYER"));
    expect(manager.can("createItem")).toBe(false);
  });
});

describe("InventoryManager: storage changes and errors", () => {
  it("reloads after changes from another user", async () => {
    const { storage, manager } = await lazyManager();
    const other = new InventoryManager(storage);
    await other.start();

    const mira = await other.createCharacter("Mira");

    await vi.waitFor(() => expect(manager.character(mira.id)).toBeDefined());
  });

  it("surfaces load errors and rejects commands with them", async () => {
    const web = new FakeWebStorage();
    web.poke(LOCAL_INVENTORY_KEY, "{not json");
    const manager = new InventoryManager(new LocalInventoryStorage(web));

    await manager.start();

    expect(manager.status.type).toBe("error");
    const error =
      manager.status.type === "error" ? manager.status.error : undefined;
    expect(error).toBeInstanceOf(StorageError);
    await expect(manager.createCharacter("Mira")).rejects.toBe(error);
  });

  it("rejects with write errors and keeps the state", async () => {
    const { storage, manager } = await memoryManager();
    const failure = new StorageError("write-failed", "Quota exceeded");
    vi.spyOn(storage, "apply").mockRejectedValueOnce(failure);

    await expect(manager.createCharacter("Mira")).rejects.toBe(failure);
    expect(manager.characters()).toEqual([]);
    expect(manager.status).toEqual({ type: "ready" });
    await manager.createCharacter("Theo");
    expect(manager.characters()).toHaveLength(1);
  });

  it("persists through the local controller and sees other tabs", async () => {
    const web = new FakeWebStorage();
    const events = new FakeStorageEvents();
    const first = new InventoryManager(new LocalInventoryStorage(web, events));
    await first.start();
    const second = new InventoryManager(new LocalInventoryStorage(web, events));
    await second.start();

    const mira = await first.createCharacter("Mira");
    events.fire(LOCAL_INVENTORY_KEY);

    await vi.waitFor(() =>
      expect(second.character(mira.id)?.name).toBe("Mira"),
    );
  });
});

describe("InventoryManager: lazy texts", () => {
  it("loads texts only on request and caches them", async () => {
    const { storage, manager } = await lazyManager();
    const rope = await manager.createItem("Rope", (item) => {
      item.description = "Hempen.";
    });
    const ref = { kind: "item", id: rope.id } as const;

    expect(manager.texts(ref)).toEqual({
      status: "loaded",
      texts: { description: "Hempen." },
    });
    expect(storage.textRequests).toEqual([]);
    expect(manager.item(rope.id)?.description).toBeUndefined();
  });

  it("keeps stored texts when a command saves a record without them", async () => {
    const { storage, manager } = await lazyManager();
    const { quiver, pack } = await sampleInventory(manager);
    await manager.writeNotes(quiver.id, "Silvered.");
    const fresh = new InventoryManager(storage);
    await fresh.start();

    await fresh.moveInstance(quiver.id, inInstance(pack.id));
    await fresh.useInstance(quiver.id, 1);

    expect(storage.textRequests).toEqual([{ kind: "instance", id: quiver.id }]);
    await expect(
      storage.loadTexts({ kind: "instance", id: quiver.id }),
    ).resolves.toEqual({ notes: "Silvered." });
  });

  it("loads texts before an edit so the edit keeps them", async () => {
    const { storage, manager } = await lazyManager();
    const rope = await manager.createItem("Rope", (item) => {
      item.description = "Hempen.";
      item.dmNotes = "Cursed.";
    });
    const fresh = new InventoryManager(storage);
    await fresh.start();

    const updated = await fresh.updateItem(rope.id, (item) => {
      item.weight = 10;
    });

    expect(updated.description).toBe("Hempen.");
    await expect(
      storage.loadTexts({ kind: "item", id: rope.id }),
    ).resolves.toEqual({ description: "Hempen.", dmNotes: "Cursed." });
  });

  it("writes notes without loading texts", async () => {
    const { storage, manager } = await lazyManager();
    const { quiver } = await sampleInventory(manager);
    const fresh = new InventoryManager(storage);
    await fresh.start();

    await fresh.writeNotes(quiver.id, "Bent.");

    expect(storage.textRequests).toEqual([]);
  });

  it("does not write when texts can't be loaded", async () => {
    const { storage, manager } = await lazyManager();
    const { quiver, pack } = await sampleInventory(manager);
    const fresh = new InventoryManager(storage);
    await fresh.start();
    const failure = new StorageError("unavailable", "GM offline");
    storage.failTexts(failure);
    const apply = vi.spyOn(storage, "apply");

    await expect(
      fresh.moveInstance(quiver.id, inInstance(pack.id)),
    ).rejects.toBe(failure);
    expect(apply).not.toHaveBeenCalled();
    expect(fresh.texts({ kind: "instance", id: quiver.id })?.status).toBe(
      "error",
    );
  });

  it("refreshes cached texts on a texts change and drops deleted records", async () => {
    const { storage, manager } = await lazyManager();
    const rope = await manager.createItem("Rope");
    const ref = { kind: "item", id: rope.id } as const;
    await manager.loadTexts(ref);

    storage.changeItemDescription(rope.id, "Silk.");
    await vi.waitFor(() =>
      expect(manager.texts(ref)?.texts).toEqual({ description: "Silk." }),
    );

    await manager.deleteItem(rope.id);
    expect(manager.texts(ref)).toBeUndefined();
  });
});
