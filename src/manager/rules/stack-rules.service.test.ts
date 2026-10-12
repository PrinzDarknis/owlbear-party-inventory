import { describe, expect, it } from "vitest";

import { atCharacter, Character, UNASSIGNED } from "../../model";
import { ManagerError, ManagerErrorCode } from "../errors";
import { makeInstance, makeItem, stateOf } from "../testing";

import {
  assertMerge,
  assertSplit,
  assertUnuse,
  assertUse,
} from "./stack-rules.service";

// 20 arrows (5 used) and 10 arrows unassigned, 3 arrows at Mira, one sword.
function sample() {
  const arrow = makeItem("Arrow", { stackable: true });
  const bolt = makeItem("Bolt", { stackable: true });
  const sword = makeItem("Sword");
  const mira = Character.create("Mira");
  const quiver = makeInstance(arrow, UNASSIGNED, 20);
  quiver.used = 5;
  const spare = makeInstance(arrow, UNASSIGNED, 10);
  const carried = makeInstance(arrow, atCharacter(mira.id), 3);
  const bolts = makeInstance(bolt, UNASSIGNED, 10);
  const blade = makeInstance(sword);
  const state = stateOf({
    items: [arrow, bolt, sword],
    instances: [quiver, spare, carried, bolts, blade],
    characters: [mira],
  });
  const get = (id: string) => {
    const instance = state.instances.get(id);
    if (!instance) throw new Error("missing test instance");
    return instance;
  };
  return {
    state,
    quiver: get(quiver.id),
    spare: get(spare.id),
    carried: get(carried.id),
    bolts: get(bolts.id),
    blade: get(blade.id),
  };
}

function codeOf(run: () => void): ManagerErrorCode | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    if (error instanceof ManagerError) return error.code;
    throw error;
  }
}

describe("assertSplit", () => {
  it("accepts 1 to the available pieces", () => {
    const { quiver } = sample();

    expect(codeOf(() => assertSplit(quiver, 1))).toBeUndefined();
    expect(codeOf(() => assertSplit(quiver, 15))).toBeUndefined();
  });

  it("rejects out-of-range, fractional and non-stackable splits", () => {
    const { quiver, blade } = sample();

    expect(codeOf(() => assertSplit(quiver, 0))).toBe("invalid-quantity");
    expect(codeOf(() => assertSplit(quiver, 16))).toBe("invalid-quantity");
    expect(codeOf(() => assertSplit(quiver, 1.5))).toBe("invalid-quantity");
    expect(codeOf(() => assertSplit(blade, 1))).toBe("invalid-quantity");
  });
});

describe("assertUse / assertUnuse", () => {
  it("limits use to available and unuse to used pieces", () => {
    const { quiver } = sample();

    expect(codeOf(() => assertUse(quiver, 15))).toBeUndefined();
    expect(codeOf(() => assertUse(quiver, 16))).toBe("invalid-quantity");
    expect(codeOf(() => assertUnuse(quiver, 5))).toBeUndefined();
    expect(codeOf(() => assertUnuse(quiver, 6))).toBe("invalid-quantity");
  });

  it("rejects non-stackable items", () => {
    const { blade } = sample();

    expect(codeOf(() => assertUse(blade, 1))).toBe("invalid-quantity");
    expect(codeOf(() => assertUnuse(blade, 1))).toBe("invalid-quantity");
  });
});

describe("assertMerge", () => {
  it("accepts stacks of the same item at the same location", () => {
    const { state, quiver, spare } = sample();

    expect(codeOf(() => assertMerge(state, quiver, spare))).toBeUndefined();
  });

  it("rejects the same instance, other items and other locations", () => {
    const { state, quiver, carried, bolts } = sample();

    expect(codeOf(() => assertMerge(state, quiver, quiver))).toBe(
      "invalid-merge",
    );
    expect(codeOf(() => assertMerge(state, quiver, bolts))).toBe(
      "invalid-merge",
    );
    expect(codeOf(() => assertMerge(state, quiver, carried))).toBe(
      "invalid-merge",
    );
  });

  it("rejects non-stackable items", () => {
    const sword = makeItem("Sword");
    const a = makeInstance(sword);
    const b = makeInstance(sword);
    const state = stateOf({ items: [sword], instances: [a, b] });
    const [first, second] = [...state.instances.values()];
    if (!first || !second) throw new Error("missing test instances");

    expect(codeOf(() => assertMerge(state, first, second))).toBe(
      "invalid-quantity",
    );
  });
});
