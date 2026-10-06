import { describe, expect, it } from "vitest";

import {
  DESCRIPTION_MAX,
  NAME_MAX,
  VALUE_CP_MAX,
} from "../common/limits.constant";

import { DEFAULT_ITEM_NAME, Item } from "./item";
import { ItemData } from "./item.types";

/** Deserializes test data that is known to be valid. */
function deserializeItem(value: unknown): Item {
  const item = Item.deserialize(value);
  if (!item) throw new Error("invalid test data");
  return item;
}

const FULL_DATA: ItemData = {
  id: "item-1",
  name: "Longbow",
  description: "A tall bow.",
  categories: ["Weapon", "Ranged"],
  rarity: "uncommon",
  valueCp: 5000,
  weight: 2,
  stackable: false,
  hasInventory: false,
  dmNotes: "Cursed.",
};

describe("Item", () => {
  it("creates with a fresh id and a default name for empty input", () => {
    const a = Item.create("Rope");
    const b = Item.create("   ");
    expect(a.id).not.toBe(b.id);
    expect(a.name).toBe("Rope");
    expect(b.name).toBe(DEFAULT_ITEM_NAME);
  });

  it("keeps the old name when set to an empty value", () => {
    const item = Item.create("Rope");
    item.name = "  ";
    expect(item.name).toBe("Rope");
    item.name = "x".repeat(NAME_MAX + 5);
    expect(item.name).toHaveLength(NAME_MAX);
  });

  it("corrects numbers silently", () => {
    const item = Item.create("Gem");
    item.valueCp = 12.7;
    expect(item.valueCp).toBe(13);
    item.valueCp = -1;
    expect(item.valueCp).toBe(0);
    item.valueCp = VALUE_CP_MAX * 2;
    expect(item.valueCp).toBe(VALUE_CP_MAX);
    item.valueCp = Number.NaN;
    expect(item.valueCp).toBe(VALUE_CP_MAX);
    item.valueCp = undefined;
    expect(item.valueCp).toBeUndefined();

    item.weight = 1.555;
    expect(item.weight).toBe(1.56);
    item.weight = -3;
    expect(item.weight).toBe(0);
  });

  it("clears optional texts with empty values and truncates long ones", () => {
    const item = Item.create("Map");
    item.description = "  ";
    expect(item.description).toBeUndefined();
    item.description = "y".repeat(DESCRIPTION_MAX + 1);
    expect(item.description).toHaveLength(DESCRIPTION_MAX);
  });

  it("does not expose its categories for mutation", () => {
    const item = Item.create("Arrow");
    item.categories = ["Ammo"];
    const list = item.categories as string[];
    list.push("Hacked");
    expect(item.categories).toEqual(["Ammo"]);
  });

  it("round-trips through JSON", () => {
    const item = deserializeItem(FULL_DATA);
    const restored = deserializeItem(
      JSON.parse(JSON.stringify(item.serialize())),
    );
    expect(restored.serialize()).toEqual(FULL_DATA);
  });

  it("omits unset optional fields in serialize", () => {
    const data = Item.create("Torch").serialize();
    expect(Object.keys(data).sort()).toEqual(
      ["hasInventory", "id", "name", "stackable"].sort(),
    );
  });

  it("clones independently", () => {
    const item = deserializeItem(FULL_DATA);
    const copy = item.clone();
    copy.name = "Shortbow";
    expect(item.name).toBe("Longbow");
    expect(copy.id).toBe(item.id);
  });

  it("allows subclasses to override accessors without leaking into storage", () => {
    class UnidentifiedItem extends Item {
      constructor(data: ItemData) {
        super(data.id, data.name);
      }
      override get name(): string {
        return "Unknown item";
      }
      override set name(value: string) {
        super.name = value;
      }
    }

    const item = new UnidentifiedItem(FULL_DATA);
    expect(item.name).toBe("Unknown item");
    item.name = "Elven bow";
    expect(item.name).toBe("Unknown item");
    expect(item.serialize().name).toBe("Elven bow");
  });
});
