import { describe, expect, it } from "vitest";

import { QUANTITY_MAX } from "../common/limits.constant";
import { Item } from "../item";
import { atCharacter, inInstance, UNASSIGNED } from "../location";

import { ItemInstance } from "./item-instance";
import { ItemInstanceData } from "./item-instance.types";

/** Deserializes test data that is known to be valid. */
function deserializeInstance(value: unknown): ItemInstance {
  const instance = ItemInstance.deserialize(value);
  if (!instance) throw new Error("invalid test data");
  return instance;
}

function makeItem(stackable: boolean, hasInventory = false): Item {
  const item = Item.create(stackable ? "Arrow" : "Backpack");
  item.stackable = stackable;
  item.hasInventory = hasInventory;
  return item;
}

describe("ItemInstance", () => {
  it("creates with defaults", () => {
    const instance = ItemInstance.create("item-1");
    expect(instance.itemId).toBe("item-1");
    expect(instance.location).toEqual(UNASSIGNED);
    expect(instance.quantity).toBe(1);
    expect(instance.item).toBeUndefined();
  });

  it("uses the stored quantity only for stackable items", () => {
    const arrows = makeItem(true);
    const stack = ItemInstance.create(arrows.id, UNASSIGNED, 20);
    stack.bindItem(arrows);
    expect(stack.quantity).toBe(20);

    const backpack = makeItem(false);
    const single = ItemInstance.create(backpack.id, UNASSIGNED, 5);
    single.bindItem(backpack);
    expect(single.quantity).toBe(1);
    expect(single.rawQuantity).toBe(5);
  });

  it("allows quantity 0 and clamps silently", () => {
    const instance = ItemInstance.create("item-1");
    instance.quantity = 0;
    expect(instance.quantity).toBe(0);
    instance.quantity = -4;
    expect(instance.quantity).toBe(0);
    instance.quantity = QUANTITY_MAX + 1;
    expect(instance.quantity).toBe(QUANTITY_MAX);
    instance.quantity = Number.NaN;
    expect(instance.quantity).toBe(QUANTITY_MAX);
    instance.quantity = 2.4;
    expect(instance.quantity).toBe(2);
  });

  it("ignores binding an item with a different id", () => {
    const instance = ItemInstance.create("item-1");
    instance.bindItem(makeItem(true));
    expect(instance.item).toBeUndefined();
  });

  it("can hold items only if the bound item has an inventory", () => {
    const bag = makeItem(false, true);
    const instance = ItemInstance.create(bag.id);
    expect(instance.canHoldItems).toBe(false);
    instance.bindItem(bag);
    expect(instance.canHoldItems).toBe(true);
  });

  it("copies locations in and out", () => {
    const instance = ItemInstance.create("item-1");
    const location = atCharacter("c1");
    instance.location = location;
    (location as { characterId: string }).characterId = "changed";
    expect(instance.location).toEqual(atCharacter("c1"));

    const read = instance.location as { characterId: string };
    read.characterId = "changed";
    expect(instance.location).toEqual(atCharacter("c1"));
  });

  it("round-trips through JSON", () => {
    const data: ItemInstanceData = {
      id: "n1",
      itemId: "i1",
      location: inInstance("n0"),
      alias: "Quiver arrows",
      notes: "Silvered",
      quantity: 12,
    };
    const restored = deserializeInstance(
      JSON.parse(JSON.stringify(deserializeInstance(data).serialize())),
    );
    expect(restored.serialize()).toEqual(data);
  });

  it("clones independently and keeps the binding", () => {
    const arrows = makeItem(true);
    const instance = ItemInstance.create(arrows.id, UNASSIGNED, 3);
    instance.bindItem(arrows);
    const copy = instance.clone();
    copy.quantity = 10;
    expect(instance.quantity).toBe(3);
    expect(copy.item).toBe(arrows);
  });
});

describe("ItemInstance.deserialize", () => {
  it("rejects missing ids", () => {
    expect(ItemInstance.deserialize({ itemId: "i1" })).toBeUndefined();
    expect(ItemInstance.deserialize({ id: "n1" })).toBeUndefined();
    expect(ItemInstance.deserialize("n1")).toBeUndefined();
  });

  it("normalizes and fills defaults", () => {
    expect(
      ItemInstance.deserialize({
        id: "n1",
        itemId: "i1",
        location: { type: "bogus" },
        alias: "  ",
        notes: 5,
        quantity: "7",
      })?.serialize(),
    ).toEqual({ id: "n1", itemId: "i1", location: UNASSIGNED, quantity: 1 });
  });

  it("keeps valid values", () => {
    const data: ItemInstanceData = {
      id: "n1",
      itemId: "i1",
      location: atCharacter("c1"),
      alias: "Spare",
      notes: "Dented",
      quantity: 0,
    };
    expect(ItemInstance.deserialize(data)?.serialize()).toEqual(data);
  });
});
