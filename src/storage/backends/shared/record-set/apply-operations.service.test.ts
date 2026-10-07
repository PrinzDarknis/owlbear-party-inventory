import { describe, expect, it } from "vitest";

import { Character, Item, ItemInstance } from "../../../../model";

import { applyOperations } from "./apply-operations.service";
import { createEmptyRecordSet } from "./record-set.service";

function setWith(item: Item) {
  return applyOperations(createEmptyRecordSet(), [
    { op: "save", kind: "item", record: item },
  ]);
}

describe("applyOperations", () => {
  it("saves records of every kind", () => {
    const item = Item.create("Rope");
    const instance = ItemInstance.create(item.id);
    const character = Character.create("Mira");

    const set = applyOperations(createEmptyRecordSet(), [
      { op: "save", kind: "item", record: item },
      { op: "save", kind: "instance", record: instance },
      { op: "save", kind: "character", record: character },
    ]);

    expect(set.items.get(item.id)?.name).toBe("Rope");
    expect(set.instances.has(instance.id)).toBe(true);
    expect(set.characters.get(character.id)?.name).toBe("Mira");
  });

  it("replaces a record with the same id as a whole", () => {
    const item = Item.create("Rope");
    item.description = "Hemp, 50 ft.";
    const update = item.clone();
    update.name = "Silk rope";
    update.description = undefined;

    const set = applyOperations(setWith(item), [
      { op: "save", kind: "item", record: update },
    ]);

    expect(set.items.get(item.id)?.name).toBe("Silk rope");
    expect(set.items.get(item.id)?.description).toBeUndefined();
  });

  it("does not mutate the input set", () => {
    const item = Item.create("Rope");
    const before = setWith(item);

    applyOperations(before, [
      { op: "save", kind: "item", record: Item.create("Torch") },
      { op: "delete", kind: "item", id: item.id },
    ]);

    expect([...before.items.keys()]).toEqual([item.id]);
  });

  it("stores clones, so later caller changes don't reach the set", () => {
    const item = Item.create("Rope");
    const set = setWith(item);

    item.name = "Changed";

    expect(set.items.get(item.id)).not.toBe(item);
    expect(set.items.get(item.id)?.name).toBe("Rope");
  });

  it("deletes records of the given kind and ignores unknown ids", () => {
    const item = Item.create("Rope");
    const character = Character.create("Mira");
    const before = applyOperations(setWith(item), [
      { op: "save", kind: "character", record: character },
    ]);

    const set = applyOperations(before, [
      { op: "delete", kind: "character", id: character.id },
      { op: "delete", kind: "item", id: "unknown" },
    ]);

    expect(set.characters.size).toBe(0);
    expect(set.items.has(item.id)).toBe(true);
  });

  it("applies operations in order, so the last one on an id wins", () => {
    const item = Item.create("Rope");
    const renamed = item.clone();
    renamed.name = "Silk rope";

    const deletedLast = applyOperations(createEmptyRecordSet(), [
      { op: "save", kind: "item", record: item },
      { op: "delete", kind: "item", id: item.id },
    ]);
    const savedLast = applyOperations(setWith(item), [
      { op: "delete", kind: "item", id: item.id },
      { op: "save", kind: "item", record: renamed },
    ]);

    expect(deletedLast.items.has(item.id)).toBe(false);
    expect(savedLast.items.get(item.id)?.name).toBe("Silk rope");
  });

  it("returns an equal set for no operations", () => {
    const item = Item.create("Rope");

    const set = applyOperations(setWith(item), []);

    expect([...set.items.keys()]).toEqual([item.id]);
  });
});
