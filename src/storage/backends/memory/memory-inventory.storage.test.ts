import { describe, expect, it } from "vitest";

import { Character } from "../../../model";
import { describeStorageContract } from "../../testing";

import { MemoryInventoryStorage } from "./memory-inventory.storage";
import { MEMORY_STORAGE_ID } from "./memory-storage.constant";

describeStorageContract(
  "MemoryInventoryStorage",
  async () => new MemoryInventoryStorage(),
);

describe("MemoryInventoryStorage", () => {
  it("is a non-persistent, single-user GM storage", async () => {
    const storage = new MemoryInventoryStorage();

    expect(storage.id).toBe(MEMORY_STORAGE_ID);
    expect(storage.capabilities).toEqual({
      persistent: false,
      lazyTexts: false,
      multiUser: false,
    });
    expect(await storage.getRole()).toBe("GM");
  });

  it("keeps no data between instances", async () => {
    const first = new MemoryInventoryStorage();
    const record = Character.create("Mira");
    await first.apply([{ op: "save", kind: "character", record }]);

    expect((await new MemoryInventoryStorage().load()).characters).toEqual([]);
  });
});
