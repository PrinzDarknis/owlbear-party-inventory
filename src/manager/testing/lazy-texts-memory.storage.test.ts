import { describe, expect, it, vi } from "vitest";

import { Item } from "../../model";
import { StorageError } from "../../storage";
import { describeStorageContract } from "../../storage/testing";

import { LazyTextsMemoryStorage } from "./lazy-texts-memory.storage";

describeStorageContract(
  "LazyTextsMemoryStorage",
  async () => new LazyTextsMemoryStorage(),
);

async function storageWithRope() {
  const storage = new LazyTextsMemoryStorage();
  const rope = Item.create("Rope");
  rope.description = "Hempen.";
  await storage.apply([{ op: "save", kind: "item", record: rope }]);
  return { storage, rope };
}

describe("LazyTextsMemoryStorage", () => {
  it("omits texts on load and records text requests", async () => {
    const { storage, rope } = await storageWithRope();

    const snapshot = await storage.load();

    expect(snapshot.items[0]?.description).toBeUndefined();
    await expect(
      storage.loadTexts({ kind: "item", id: rope.id }),
    ).resolves.toEqual({ description: "Hempen." });
    expect(storage.textRequests).toEqual([{ kind: "item", id: rope.id }]);
  });

  it("holds and fails text loads on request", async () => {
    const { storage, rope } = await storageWithRope();
    const release = storage.holdTexts();
    let loaded = false;
    const pending = storage
      .loadTexts({ kind: "item", id: rope.id })
      .then(() => (loaded = true));
    await Promise.resolve();
    expect(loaded).toBe(false);
    release();
    await pending;
    expect(loaded).toBe(true);

    const failure = new StorageError("unavailable", "GM offline");
    storage.failTexts(failure);
    await expect(storage.loadTexts({ kind: "item", id: rope.id })).rejects.toBe(
      failure,
    );
  });

  it("emits texts and role changes for simulated other users", async () => {
    const { storage, rope } = await storageWithRope();
    const listener = vi.fn();
    storage.subscribe(listener);

    storage.changeItemDescription(rope.id, "Silk.");
    storage.setRole("PLAYER");

    expect(listener.mock.calls).toEqual([
      [{ type: "texts", refs: [{ kind: "item", id: rope.id }] }],
      [{ type: "role" }],
    ]);
    await expect(storage.getRole()).resolves.toBe("PLAYER");
    await expect(
      storage.loadTexts({ kind: "item", id: rope.id }),
    ).resolves.toEqual({ description: "Silk." });
  });
});
