import { describe, expect, it } from "vitest";

import { DM_NOTES_MAX, ID_MAX } from "../common/limits.constant";

import { Item } from "./item";

/** Deserializes and serializes again, to compare plain data. */
const deserializeData = (value: unknown) =>
  Item.deserialize(value)?.serialize();

describe("Item.deserialize", () => {
  it("accepts a valid definition", () => {
    const data = {
      id: "i1",
      name: "Arrow",
      categories: ["Ammo"],
      rarity: "common",
      valueCp: 5,
      weight: 0.05,
      stackable: true,
      hasInventory: false,
    };
    expect(deserializeData(data)).toEqual(data);
  });

  it("rejects missing or invalid required fields", () => {
    expect(deserializeData(null)).toBeUndefined();
    expect(deserializeData({ name: "Arrow" })).toBeUndefined();
    expect(deserializeData({ id: "", name: "Arrow" })).toBeUndefined();
    expect(
      deserializeData({ id: "x".repeat(ID_MAX + 1), name: "Arrow" }),
    ).toBeUndefined();
    expect(deserializeData({ id: "i1" })).toBeUndefined();
    expect(deserializeData({ id: "i1", name: "   " })).toBeUndefined();
  });

  it("drops invalid optional fields and defaults flags to false", () => {
    expect(
      deserializeData({
        id: "i1",
        name: "Gem",
        description: 3,
        categories: "Loot",
        rarity: "mythic",
        valueCp: "100",
        weight: Number.NaN,
        stackable: "yes",
        dmNotes: {},
      }),
    ).toEqual({ id: "i1", name: "Gem", stackable: false, hasInventory: false });
  });

  it("normalizes values", () => {
    const parsed = deserializeData({
      id: "i1",
      name: "  Gem  ",
      categories: ["Loot", "loot", 7, ""],
      valueCp: -10,
      dmNotes: "z".repeat(DM_NOTES_MAX + 10),
      stackable: false,
      hasInventory: true,
    });
    expect(parsed?.name).toBe("Gem");
    expect(parsed?.categories).toEqual(["Loot"]);
    expect(parsed?.valueCp).toBe(0);
    expect(parsed?.dmNotes).toHaveLength(DM_NOTES_MAX);
    expect(parsed?.hasInventory).toBe(true);
  });

  it("ignores unknown fields", () => {
    expect(
      deserializeData({
        id: "i1",
        name: "Gem",
        extra: "x",
        __proto__: { a: 1 },
      }),
    ).toEqual({ id: "i1", name: "Gem", stackable: false, hasInventory: false });
  });
});
