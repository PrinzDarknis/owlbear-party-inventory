import { describe, expect, it } from "vitest";

import { Character, Item, ItemInstance } from "../../../../model";

import { applyOperations } from "./apply-operations.service";
import {
  createEmptyRecordSet,
  textsOf,
  toSnapshot,
} from "./record-set.service";

function sampleSet() {
  const item = Item.create("Longbow");
  item.description = "A tall bow.";
  item.dmNotes = "Cursed.";
  const instance = ItemInstance.create(item.id);
  instance.notes = "Found in the crypt.";
  const character = Character.create("Mira");
  const set = applyOperations(createEmptyRecordSet(), [
    { op: "save", kind: "item", record: item },
    { op: "save", kind: "instance", record: instance },
    { op: "save", kind: "character", record: character },
  ]);
  return { set, item, instance, character };
}

describe("createEmptyRecordSet", () => {
  it("has no records", () => {
    const set = createEmptyRecordSet();

    expect(set.items.size + set.instances.size + set.characters.size).toBe(0);
  });
});

describe("toSnapshot", () => {
  it("returns all records", () => {
    const { set, item, instance, character } = sampleSet();

    const snapshot = toSnapshot(set);

    expect(snapshot.items.map((entry) => entry.id)).toEqual([item.id]);
    expect(snapshot.instances.map((entry) => entry.id)).toEqual([instance.id]);
    expect(snapshot.characters.map((entry) => entry.id)).toEqual([
      character.id,
    ]);
  });

  it("returns clones, so mutating them doesn't change the set", () => {
    const { set, item } = sampleSet();

    toSnapshot(set).items[0].name = "Changed";

    expect(set.items.get(item.id)?.name).toBe("Longbow");
  });
});

describe("textsOf", () => {
  it("returns description and GM notes of an item", () => {
    const { set, item } = sampleSet();

    expect(textsOf(set, { kind: "item", id: item.id })).toEqual({
      description: "A tall bow.",
      dmNotes: "Cursed.",
    });
  });

  it("returns the player notes of an instance", () => {
    const { set, instance } = sampleSet();

    expect(textsOf(set, { kind: "instance", id: instance.id })).toEqual({
      notes: "Found in the crypt.",
    });
  });

  it("omits unset texts", () => {
    const item = Item.create("Rope");
    const set = applyOperations(createEmptyRecordSet(), [
      { op: "save", kind: "item", record: item },
    ]);

    expect(textsOf(set, { kind: "item", id: item.id })).toEqual({});
  });

  it("returns an empty object for unknown ids", () => {
    const { set } = sampleSet();

    expect(textsOf(set, { kind: "item", id: "unknown" })).toEqual({});
    expect(textsOf(set, { kind: "instance", id: "unknown" })).toEqual({});
  });
});
