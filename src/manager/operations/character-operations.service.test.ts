import { describe, expect, it } from "vitest";

import {
  atCharacter,
  Character,
  inInstance,
  ItemInstance,
  UNASSIGNED,
} from "../../model";
import { ManagerError } from "../errors";
import { makeInstance, makeItem, stateAfter, stateOf } from "../testing";

import {
  planCreateCharacter,
  planDeleteCharacter,
  planUpdateCharacter,
} from "./character-operations.service";

describe("planCreateCharacter", () => {
  it("saves a new character", () => {
    const plan = planCreateCharacter("Mira");

    expect(plan.result.name).toBe("Mira");
    expect(plan.operations).toEqual([
      { op: "save", kind: "character", record: plan.result },
    ]);
    expect(plan.textsFromState).toEqual([]);
  });
});

describe("planUpdateCharacter", () => {
  it("saves a changed clone and leaves the state alone", () => {
    const mira = Character.create("Mira");
    const state = stateOf({ characters: [mira] });

    const plan = planUpdateCharacter(state, mira.id, (character) => {
      character.name = "Mira the Bold";
    });

    expect(plan.result.name).toBe("Mira the Bold");
    expect(state.characters.get(mira.id)?.name).toBe("Mira");
    expect(plan.operations).toHaveLength(1);
  });

  it("rejects unknown characters", () => {
    expect(() => planUpdateCharacter(stateOf({}), "gone", () => {})).toThrow(
      ManagerError,
    );
  });
});

describe("planDeleteCharacter", () => {
  it("unassigns direct instances, keeps container contents and deletes", () => {
    const backpack = makeItem("Backpack", { hasInventory: true });
    const rope = makeItem("Rope");
    const mira = Character.create("Mira");
    const pack = makeInstance(backpack, atCharacter(mira.id));
    const inside = makeInstance(rope, inInstance(pack.id));
    const orphan = ItemInstance.create("gone", atCharacter(mira.id));
    const state = stateOf({
      items: [backpack, rope],
      instances: [pack, inside, orphan],
      characters: [mira],
    });

    const plan = planDeleteCharacter(state, mira.id);
    const after = stateAfter(state, plan.operations);

    expect(after.characters.has(mira.id)).toBe(false);
    expect(after.instances.get(pack.id)?.location).toEqual(UNASSIGNED);
    expect(after.instances.get(orphan.id)?.location).toEqual(UNASSIGNED);
    expect(after.instances.get(inside.id)?.location).toEqual(
      inInstance(pack.id),
    );
    expect(plan.operations.at(-1)).toEqual({
      op: "delete",
      kind: "character",
      id: mira.id,
    });
  });
});
