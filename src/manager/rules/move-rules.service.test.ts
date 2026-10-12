import { describe, expect, it } from "vitest";

import { atCharacter, Character, inInstance, UNASSIGNED } from "../../model";
import { ManagerError } from "../errors";
import { makeInstance, makeItem, stateOf } from "../testing";

import { assertMove, checkMove, checkTarget } from "./move-rules.service";

// Mira carries a backpack with a pouch; a rope lies unassigned.
function sample() {
  const backpack = makeItem("Backpack", { hasInventory: true });
  const pouch = makeItem("Pouch", { hasInventory: true });
  const rope = makeItem("Rope");
  const mira = Character.create("Mira");
  const pack = makeInstance(backpack, atCharacter(mira.id));
  const purse = makeInstance(pouch, inInstance(pack.id));
  const coil = makeInstance(rope);
  const state = stateOf({
    items: [backpack, pouch, rope],
    instances: [pack, purse, coil],
    characters: [mira],
  });
  return { state, mira, pack, purse, coil };
}

describe("checkTarget", () => {
  it("accepts unassigned, existing characters and containers", () => {
    const { state, mira, pack } = sample();

    expect(checkTarget(state, UNASSIGNED)).toBeUndefined();
    expect(checkTarget(state, atCharacter(mira.id))).toBeUndefined();
    expect(checkTarget(state, inInstance(pack.id))).toBeUndefined();
  });

  it("rejects missing targets and instances without inventory", () => {
    const { state, coil } = sample();

    expect(checkTarget(state, atCharacter("gone"))?.code).toBe("invalid-move");
    expect(checkTarget(state, inInstance("gone"))?.code).toBe("invalid-move");
    expect(checkTarget(state, inInstance(coil.id))?.code).toBe("invalid-move");
  });
});

describe("checkMove", () => {
  it("accepts valid moves, including to the current location", () => {
    const { state, mira, pack, purse, coil } = sample();

    expect(checkMove(state, coil.id, inInstance(purse.id))).toBeUndefined();
    expect(checkMove(state, purse.id, atCharacter(mira.id))).toBeUndefined();
    expect(checkMove(state, purse.id, inInstance(pack.id))).toBeUndefined();
  });

  it("rejects unknown instances", () => {
    const { state } = sample();

    expect(checkMove(state, "gone", UNASSIGNED)?.code).toBe("not-found");
  });

  it("rejects moves into the instance itself or its contents", () => {
    const { state, pack, purse } = sample();

    expect(checkMove(state, pack.id, inInstance(pack.id))?.code).toBe(
      "invalid-move",
    );
    expect(checkMove(state, pack.id, inInstance(purse.id))?.code).toBe(
      "invalid-move",
    );
  });
});

describe("assertMove", () => {
  it("throws the problem found by checkMove", () => {
    const { state, pack, coil } = sample();

    expect(() => assertMove(state, coil.id, inInstance(pack.id))).not.toThrow();
    expect(() => assertMove(state, coil.id, inInstance(coil.id))).toThrow(
      ManagerError,
    );
  });
});
