import { describe, expect, it } from "vitest";

import { Character, Item, ItemInstance } from "../../../../model";
import { applyOperations, createEmptyRecordSet } from "../../shared";

import { LOCAL_INVENTORY_DTO_VERSION } from "./local-inventory.dto.constant";
import { fromDto, toDto } from "./local-inventory.dto.service";

/** Reads a DTO that is known to be valid. */
function readValid(value: unknown) {
  const result = fromDto(value);
  if (!result.ok) throw new Error(`unexpected error: ${result.error}`);
  return result;
}

describe("toDto", () => {
  it("writes the current version and all records serialized", () => {
    const item = Item.create("Rope");
    const character = Character.create("Mira");
    const instance = ItemInstance.create(item.id, {
      type: "character",
      characterId: character.id,
    });
    const records = applyOperations(createEmptyRecordSet(), [
      { op: "save", kind: "item", record: item },
      { op: "save", kind: "instance", record: instance },
      { op: "save", kind: "character", record: character },
    ]);

    expect(toDto(records)).toEqual({
      version: LOCAL_INVENTORY_DTO_VERSION,
      items: [item.serialize()],
      instances: [instance.serialize()],
      characters: [character.serialize()],
    });
  });

  it("round-trips through JSON", () => {
    const item = Item.create("Longbow");
    item.description = "A tall bow.";
    item.weight = 2;
    const records = applyOperations(createEmptyRecordSet(), [
      { op: "save", kind: "item", record: item },
    ]);

    const result = readValid(JSON.parse(JSON.stringify(toDto(records))));

    expect(result.records.items.get(item.id)?.serialize()).toEqual(
      item.serialize(),
    );
    expect(result.dropped).toBe(0);
  });
});

describe("fromDto", () => {
  it("rejects values that are not a DTO", () => {
    for (const value of [null, undefined, 42, "text", [], {}]) {
      expect(fromDto(value)).toEqual({ ok: false, error: "invalid" });
    }
  });

  it("rejects other versions", () => {
    expect(fromDto({ version: LOCAL_INVENTORY_DTO_VERSION + 1 })).toEqual({
      ok: false,
      error: "unsupported-version",
    });
  });

  it("rejects lists of the wrong type", () => {
    expect(
      fromDto({ version: LOCAL_INVENTORY_DTO_VERSION, items: {} }),
    ).toEqual({ ok: false, error: "invalid" });
  });

  it("treats missing lists as empty", () => {
    const { records } = readValid({ version: LOCAL_INVENTORY_DTO_VERSION });

    expect(
      records.items.size + records.instances.size + records.characters.size,
    ).toBe(0);
  });

  it("drops and counts invalid entries, keeps valid ones", () => {
    const result = readValid({
      version: LOCAL_INVENTORY_DTO_VERSION,
      items: [{ id: "item-1", name: "Rope" }, { id: "item-2" }, "junk"],
      instances: [{ id: "inst-1" }],
      characters: [{ id: "char-1", name: "Mira" }, null],
    });

    expect([...result.records.items.keys()]).toEqual(["item-1"]);
    expect(result.records.instances.size).toBe(0);
    expect([...result.records.characters.keys()]).toEqual(["char-1"]);
    expect(result.dropped).toBe(4);
  });

  it("keeps the last entry for duplicate ids", () => {
    const { records } = readValid({
      version: LOCAL_INVENTORY_DTO_VERSION,
      characters: [
        { id: "char-1", name: "Mira" },
        { id: "char-1", name: "Mira the Bold" },
      ],
    });

    expect(records.characters.get("char-1")?.name).toBe("Mira the Bold");
  });
});
