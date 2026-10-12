import { describe, expect, it } from "vitest";

import { atCharacter, Character, inInstance } from "../../model";
import { ManagerError } from "../errors";
import { makeInstance, makeItem, stateAfter, stateOf } from "../testing";

import {
  planCreateItem,
  planDeleteItem,
  planUpdateItem,
} from "./item-operations.service";

// Mira carries a bag holding a second bag of the same kind with a rope inside.
function nestedBags() {
  const bag = makeItem("Bag", { hasInventory: true });
  const rope = makeItem("Rope");
  const mira = Character.create("Mira");
  const outer = makeInstance(bag, atCharacter(mira.id));
  const inner = makeInstance(bag, inInstance(outer.id));
  const coil = makeInstance(rope, inInstance(inner.id));
  const loose = makeInstance(rope, inInstance(outer.id));
  const state = stateOf({
    items: [bag, rope],
    instances: [outer, inner, coil, loose],
    characters: [mira],
  });
  return { state, bag, rope, mira, outer, inner, coil, loose };
}

describe("planCreateItem", () => {
  it("saves a new definition with its initial values", () => {
    const plan = planCreateItem("Arrow", (item) => {
      item.stackable = true;
      item.description = "Pointy.";
    });

    expect(plan.result.stackable).toBe(true);
    expect(plan.operations).toEqual([
      { op: "save", kind: "item", record: plan.result },
    ]);
    expect(plan.textsFromState).toEqual([]);
  });
});

describe("planUpdateItem", () => {
  it("marks texts from the state when no texts are given", () => {
    const rope = makeItem("Rope");
    const state = stateOf({ items: [rope] });

    const plan = planUpdateItem(state, rope.id, (item) => {
      item.weight = 10;
    });

    expect(plan.result.weight).toBe(10);
    expect(plan.textsFromState).toEqual([{ kind: "item", id: rope.id }]);
  });

  it("sets given texts before the edit and counts them as complete", () => {
    const rope = makeItem("Rope");
    const state = stateOf({ items: [rope] });

    const plan = planUpdateItem(
      state,
      rope.id,
      (item) => {
        item.dmNotes = "Frayed.";
      },
      { description: "Hempen, 50 ft.", dmNotes: "Old." },
    );

    expect(plan.result.description).toBe("Hempen, 50 ft.");
    expect(plan.result.dmNotes).toBe("Frayed.");
    expect(plan.textsFromState).toEqual([]);
  });

  it("moves contents out when the definition loses its inventory", () => {
    const { state, bag, mira, outer, inner, coil, loose } = nestedBags();

    const plan = planUpdateItem(state, bag.id, (item) => {
      item.hasInventory = false;
    });
    const after = stateAfter(state, plan.operations);

    for (const id of [outer.id, inner.id, coil.id, loose.id]) {
      expect(after.placements.get(id)).toEqual(atCharacter(mira.id));
    }
    expect(after.misplaced.size).toBe(0);
  });

  it("rejects unknown definitions", () => {
    expect(() => planUpdateItem(stateOf({}), "gone", () => {})).toThrow(
      ManagerError,
    );
  });
});

describe("planDeleteItem", () => {
  it("deletes all instances and moves their contents to the nearest survivor", () => {
    const { state, bag, mira, outer, inner, coil, loose } = nestedBags();

    const plan = planDeleteItem(state, bag.id);
    const after = stateAfter(state, plan.operations);

    expect(after.items.has(bag.id)).toBe(false);
    expect(after.instances.has(outer.id)).toBe(false);
    expect(after.instances.has(inner.id)).toBe(false);
    expect(after.instances.get(coil.id)?.location).toEqual(
      atCharacter(mira.id),
    );
    expect(after.instances.get(loose.id)?.location).toEqual(
      atCharacter(mira.id),
    );
    expect(after.misplaced.size).toBe(0);
  });

  it("saves re-homed instances with texts from the state", () => {
    const { state, bag, coil } = nestedBags();

    const plan = planDeleteItem(state, bag.id);

    expect(plan.textsFromState).toContainEqual({
      kind: "instance",
      id: coil.id,
    });
  });
});
