import { describe, expect, it } from "vitest";

import { atCharacter, Character, inInstance, UNASSIGNED } from "../../model";
import { makeInstance, makeItem, stateOf } from "../testing";

import {
  contentsOf,
  descendantsOf,
  isWithin,
  ownerOf,
  pathOf,
} from "./tree.service";

// Mira carries a backpack with a pouch with coins; a rope lies unassigned.
function sampleTree() {
  const backpack = makeItem("Backpack", { hasInventory: true });
  const pouch = makeItem("Pouch", { hasInventory: true });
  const coin = makeItem("Coin", { stackable: true });
  const rope = makeItem("Rope");
  const mira = Character.create("Mira");
  const pack = makeInstance(backpack, atCharacter(mira.id));
  const purse = makeInstance(pouch, inInstance(pack.id));
  const coins = makeInstance(coin, inInstance(purse.id), 12);
  const loose = makeInstance(rope);
  const state = stateOf({
    items: [backpack, pouch, coin, rope],
    instances: [pack, purse, coins, loose],
    characters: [mira],
  });
  return { state, mira, pack, purse, coins, loose };
}

const ids = (records: { id: string }[]) => records.map((record) => record.id);

describe("contentsOf", () => {
  it("lists the direct contents of a location", () => {
    const { state, mira, pack, purse, loose } = sampleTree();

    expect(ids(contentsOf(state, atCharacter(mira.id)))).toEqual([pack.id]);
    expect(ids(contentsOf(state, inInstance(pack.id)))).toEqual([purse.id]);
    expect(ids(contentsOf(state, UNASSIGNED))).toEqual([loose.id]);
  });

  it("returns bound instances from the state", () => {
    const { state, mira } = sampleTree();

    expect(contentsOf(state, atCharacter(mira.id))[0]?.item?.name).toBe(
      "Backpack",
    );
  });

  it("is empty for unknown locations", () => {
    const { state } = sampleTree();

    expect(contentsOf(state, atCharacter("gone"))).toEqual([]);
  });
});

describe("pathOf", () => {
  it("lists containers from the outermost to the direct one", () => {
    const { state, pack, purse, coins } = sampleTree();

    expect(ids(pathOf(state, coins.id))).toEqual([pack.id, purse.id]);
    expect(pathOf(state, pack.id)).toEqual([]);
    expect(pathOf(state, "gone")).toEqual([]);
  });
});

describe("ownerOf", () => {
  it("finds the character at any depth", () => {
    const { state, mira, pack, coins } = sampleTree();

    expect(ownerOf(state, pack.id)?.id).toBe(mira.id);
    expect(ownerOf(state, coins.id)?.id).toBe(mira.id);
  });

  it("is undefined for unassigned and unknown instances", () => {
    const { state, loose } = sampleTree();

    expect(ownerOf(state, loose.id)).toBeUndefined();
    expect(ownerOf(state, "gone")).toBeUndefined();
  });

  it("uses the effective placement of misplaced containers", () => {
    const bag = makeItem("Bag", { hasInventory: true });
    const rope = makeItem("Rope");
    const lost = makeInstance(bag, atCharacter("gone"));
    const inside = makeInstance(rope, inInstance(lost.id));
    const state = stateOf({ items: [bag, rope], instances: [lost, inside] });

    expect(ownerOf(state, inside.id)).toBeUndefined();
    expect(ids(pathOf(state, inside.id))).toEqual([lost.id]);
  });
});

describe("isWithin", () => {
  it("detects nesting at any depth", () => {
    const { state, pack, purse, coins } = sampleTree();

    expect(isWithin(state, coins.id, pack.id)).toBe(true);
    expect(isWithin(state, purse.id, pack.id)).toBe(true);
    expect(isWithin(state, pack.id, coins.id)).toBe(false);
    expect(isWithin(state, pack.id, pack.id)).toBe(false);
  });
});

describe("descendantsOf", () => {
  it("lists all nested contents", () => {
    const { state, pack, purse, coins, loose } = sampleTree();

    expect(descendantsOf(state, pack.id).sort()).toEqual(
      [purse.id, coins.id].sort(),
    );
    expect(descendantsOf(state, loose.id)).toEqual([]);
    expect(descendantsOf(state, "gone")).toEqual([]);
  });
});
