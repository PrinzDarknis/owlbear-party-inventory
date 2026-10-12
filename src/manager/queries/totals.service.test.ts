import { describe, expect, it } from "vitest";

import {
  atCharacter,
  Character,
  inInstance,
  ItemInstance,
  UNASSIGNED,
} from "../../model";
import { makeInstance, makeItem, stateOf } from "../testing";

import { instanceCount, instanceWeight, totalWeight } from "./totals.service";

describe("instanceWeight", () => {
  it("multiplies the weight by the available pieces", () => {
    const arrow = makeItem("Arrow", { stackable: true, weight: 0.05 });
    const stack = makeInstance(arrow, UNASSIGNED, 20);
    stack.used = 4;
    const state = stateOf({ items: [arrow], instances: [stack] });

    expect(instanceWeight(state, stack.id)).toBe(0.8);
  });

  it("counts one piece for non-stackable items", () => {
    const sword = makeItem("Sword", { weight: 3 });
    const single = makeInstance(sword, UNASSIGNED, 5);
    const state = stateOf({ items: [sword], instances: [single] });

    expect(instanceWeight(state, single.id)).toBe(3);
  });

  it("includes nested contents", () => {
    const backpack = makeItem("Backpack", { hasInventory: true, weight: 5 });
    const pouch = makeItem("Pouch", { hasInventory: true, weight: 1 });
    const coin = makeItem("Coin", { stackable: true, weight: 0.02 });
    const pack = makeInstance(backpack);
    const purse = makeInstance(pouch, inInstance(pack.id));
    const coins = makeInstance(coin, inInstance(purse.id), 50);
    const state = stateOf({
      items: [backpack, pouch, coin],
      instances: [pack, purse, coins],
    });

    expect(instanceWeight(state, purse.id)).toBe(2);
    expect(instanceWeight(state, pack.id)).toBe(7);
  });

  it("is 0 without an item, a weight or the instance", () => {
    const rope = makeItem("Rope");
    const light = makeInstance(rope);
    const orphan = ItemInstance.create("gone");
    const state = stateOf({ items: [rope], instances: [light, orphan] });

    expect(instanceWeight(state, light.id)).toBe(0);
    expect(instanceWeight(state, orphan.id)).toBe(0);
    expect(instanceWeight(state, "gone")).toBe(0);
  });
});

describe("totalWeight", () => {
  it("sums everything at a location and rounds once", () => {
    const coin = makeItem("Coin", { stackable: true, weight: 0.1 });
    const mira = Character.create("Mira");
    const a = makeInstance(coin, atCharacter(mira.id), 1);
    const b = makeInstance(coin, atCharacter(mira.id), 2);
    const state = stateOf({
      items: [coin],
      instances: [a, b],
      characters: [mira],
    });

    // 0.1 + 0.2 is 0.30000000000000004 without rounding.
    expect(totalWeight(state, atCharacter(mira.id))).toBe(0.3);
    expect(totalWeight(state, UNASSIGNED)).toBe(0);
  });
});

describe("instanceCount", () => {
  it("counts instances of a definition wherever they are", () => {
    const bag = makeItem("Bag", { hasInventory: true });
    const rope = makeItem("Rope");
    const sack = makeInstance(bag);
    const state = stateOf({
      items: [bag, rope],
      instances: [
        sack,
        makeInstance(rope),
        makeInstance(rope, inInstance(sack.id)),
      ],
    });

    expect(instanceCount(state, rope.id)).toBe(2);
    expect(instanceCount(state, bag.id)).toBe(1);
    expect(instanceCount(state, "gone")).toBe(0);
  });
});
