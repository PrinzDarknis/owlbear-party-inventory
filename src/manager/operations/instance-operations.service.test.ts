import { describe, expect, it } from "vitest";

import {
  atCharacter,
  Character,
  inInstance,
  QUANTITY_MAX,
  UNASSIGNED,
} from "../../model";
import { ManagerError, ManagerErrorCode } from "../errors";
import { makeInstance, makeItem, stateAfter, stateOf } from "../testing";

import {
  planAssignItem,
  planDeleteInstance,
  planMergeInstances,
  planMoveInstance,
  planSplitInstance,
  planUnuseInstance,
  planUpdateInstance,
  planUseInstance,
  planWriteNotes,
} from "./instance-operations.service";

// Mira carries a backpack (with a rope) and 20 arrows (5 used, alias
// "Quiver"); Theo carries nothing; 10 more arrows lie unassigned.
function sample() {
  const backpack = makeItem("Backpack", { hasInventory: true });
  const rope = makeItem("Rope");
  const arrow = makeItem("Arrow", { stackable: true });
  const mira = Character.create("Mira");
  const theo = Character.create("Theo");
  const pack = makeInstance(backpack, atCharacter(mira.id));
  const coil = makeInstance(rope, inInstance(pack.id));
  const quiver = makeInstance(arrow, atCharacter(mira.id), 20);
  quiver.used = 5;
  quiver.alias = "Quiver";
  quiver.notes = "Silvered.";
  const spare = makeInstance(arrow, UNASSIGNED, 10);
  const state = stateOf({
    items: [backpack, rope, arrow],
    instances: [pack, coil, quiver, spare],
    characters: [mira, theo],
  });
  return {
    state,
    backpack,
    rope,
    arrow,
    mira,
    theo,
    pack,
    coil,
    quiver,
    spare,
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

describe("planAssignItem", () => {
  it("creates an instance at the target", () => {
    const { state, arrow, theo } = sample();

    const plan = planAssignItem(state, arrow.id, atCharacter(theo.id), 12);

    expect(plan.result.itemId).toBe(arrow.id);
    expect(plan.result.location).toEqual(atCharacter(theo.id));
    expect(plan.result.rawQuantity).toBe(12);
    expect(plan.textsFromState).toEqual([]);
  });

  it("stores quantity 1 for non-stackable items", () => {
    const { state, rope } = sample();

    expect(
      planAssignItem(state, rope.id, UNASSIGNED, 5).result.rawQuantity,
    ).toBe(1);
  });

  it("rejects unknown items, invalid targets and quantities", () => {
    const { state, arrow, coil } = sample();

    expect(codeOf(() => planAssignItem(state, "gone", UNASSIGNED))).toBe(
      "not-found",
    );
    expect(
      codeOf(() => planAssignItem(state, arrow.id, inInstance(coil.id))),
    ).toBe("invalid-move");
    expect(codeOf(() => planAssignItem(state, arrow.id, UNASSIGNED, 0))).toBe(
      "invalid-quantity",
    );
    expect(
      codeOf(() =>
        planAssignItem(state, arrow.id, UNASSIGNED, QUANTITY_MAX + 1),
      ),
    ).toBe("invalid-quantity");
  });
});

describe("planUpdateInstance", () => {
  it("sets given notes before the edit and counts texts as complete", () => {
    const { state, quiver } = sample();

    const plan = planUpdateInstance(
      state,
      quiver.id,
      (instance) => {
        instance.alias = "Hunting arrows";
      },
      { notes: "Loaded." },
    );

    expect(plan.result.alias).toBe("Hunting arrows");
    expect(plan.result.notes).toBe("Loaded.");
    expect(plan.textsFromState).toEqual([]);
  });

  it("validates a changed location like a move", () => {
    const { state, pack } = sample();

    expect(
      codeOf(() =>
        planUpdateInstance(state, pack.id, (instance) => {
          instance.location = inInstance(pack.id);
        }),
      ),
    ).toBe("invalid-move");
  });

  it("stores the corrected location of misplaced instances", () => {
    const { rope } = sample();
    const lost = makeInstance(rope, atCharacter("gone"));
    const state = stateOf({ items: [rope], instances: [lost] });

    const plan = planUpdateInstance(state, lost.id, (instance) => {
      instance.alias = "Found";
    });

    expect(plan.result.location).toEqual(UNASSIGNED);
  });
});

describe("planWriteNotes", () => {
  it("saves the notes without texts from the state", () => {
    const { state, quiver } = sample();

    const plan = planWriteNotes(state, quiver.id, "Two are bent.");

    expect(plan.result.notes).toBe("Two are bent.");
    expect(plan.textsFromState).toEqual([]);
  });
});

describe("planMoveInstance", () => {
  it("moves the whole instance including used pieces", () => {
    const { state, quiver, theo } = sample();

    const plan = planMoveInstance(state, quiver.id, atCharacter(theo.id));
    const after = stateAfter(state, plan.operations);

    expect(after.instances.get(quiver.id)?.location).toEqual(
      atCharacter(theo.id),
    );
    expect(after.instances.get(quiver.id)?.used).toBe(5);
    expect(plan.textsFromState).toEqual([{ kind: "instance", id: quiver.id }]);
  });

  it("moves the whole instance when all available pieces move", () => {
    const { state, quiver, theo } = sample();

    const plan = planMoveInstance(state, quiver.id, atCharacter(theo.id), 15);

    expect(plan.operations).toHaveLength(1);
    expect(plan.result.id).toBe(quiver.id);
  });

  it("does nothing when the instance already is at the target", () => {
    const { state, quiver, mira } = sample();

    expect(
      planMoveInstance(state, quiver.id, atCharacter(mira.id)).operations,
    ).toEqual([]);
  });

  it("stores a move of a misplaced instance to unassigned", () => {
    const { rope } = sample();
    const lost = makeInstance(rope, atCharacter("gone"));
    const state = stateOf({ items: [rope], instances: [lost] });

    expect(
      planMoveInstance(state, lost.id, UNASSIGNED).operations,
    ).toHaveLength(1);
  });

  it("splits fewer pieces off into the target", () => {
    const { state, quiver, theo } = sample();

    const plan = planMoveInstance(state, quiver.id, atCharacter(theo.id), 4);
    const after = stateAfter(state, plan.operations);

    expect(after.instances.get(quiver.id)?.quantity).toBe(16);
    expect(after.instances.get(plan.result.id)?.location).toEqual(
      atCharacter(theo.id),
    );
    expect(after.instances.get(plan.result.id)?.quantity).toBe(4);
  });

  it("rejects moves into the instance's own contents", () => {
    const { state, pack } = sample();

    expect(
      codeOf(() => planMoveInstance(state, pack.id, inInstance(pack.id))),
    ).toBe("invalid-move");
  });
});

describe("planSplitInstance", () => {
  it("splits available pieces off; used pieces and notes stay", () => {
    const { state, quiver, mira } = sample();

    const plan = planSplitInstance(state, quiver.id, 15);
    const after = stateAfter(state, plan.operations);
    const source = after.instances.get(quiver.id);
    const part = after.instances.get(plan.result.id);

    expect(source?.quantity).toBe(5);
    expect(source?.used).toBe(5);
    expect(source?.available).toBe(0);
    expect(part?.location).toEqual(atCharacter(mira.id));
    expect(part?.quantity).toBe(15);
    expect(part?.used).toBe(0);
    expect(part?.alias).toBe("Quiver");
    expect(part?.notes).toBeUndefined();
    expect(plan.textsFromState).toEqual([{ kind: "instance", id: quiver.id }]);
  });

  it("rejects more pieces than available", () => {
    const { state, quiver } = sample();

    expect(codeOf(() => planSplitInstance(state, quiver.id, 16))).toBe(
      "invalid-quantity",
    );
  });
});

describe("planMergeInstances", () => {
  it("adds quantity and used pieces and deletes the source", () => {
    const { state, arrow, theo } = sample();
    const a = makeInstance(arrow, atCharacter(theo.id), 8);
    a.used = 2;
    const b = makeInstance(arrow, atCharacter(theo.id), 4);
    b.used = 1;
    const merged = stateOf({
      items: [...state.items.values()],
      instances: [a, b],
      characters: [...state.characters.values()],
    });

    const plan = planMergeInstances(merged, a.id, b.id);
    const after = stateAfter(merged, plan.operations);

    expect(after.instances.get(a.id)?.quantity).toBe(12);
    expect(after.instances.get(a.id)?.used).toBe(3);
    expect(after.instances.has(b.id)).toBe(false);
  });

  it("moves the contents of a merged container stack", () => {
    const sack = makeItem("Sack", { stackable: true, hasInventory: true });
    const rope = makeItem("Rope");
    const a = makeInstance(sack, UNASSIGNED, 1);
    const b = makeInstance(sack, UNASSIGNED, 1);
    const coil = makeInstance(rope, inInstance(b.id));
    const state = stateOf({ items: [sack, rope], instances: [a, b, coil] });

    const plan = planMergeInstances(state, a.id, b.id);
    const after = stateAfter(state, plan.operations);

    expect(after.instances.get(coil.id)?.location).toEqual(inInstance(a.id));
  });

  it("rejects stacks at different locations and too large sums", () => {
    const { state, quiver, spare, arrow } = sample();
    expect(codeOf(() => planMergeInstances(state, quiver.id, spare.id))).toBe(
      "invalid-merge",
    );

    const big = makeInstance(arrow, UNASSIGNED, QUANTITY_MAX);
    const one = makeInstance(arrow, UNASSIGNED, 1);
    const full = stateOf({ items: [arrow], instances: [big, one] });
    expect(codeOf(() => planMergeInstances(full, big.id, one.id))).toBe(
      "invalid-quantity",
    );
  });
});

describe("planUseInstance / planUnuseInstance", () => {
  it("counts and restores used pieces", () => {
    const { state, quiver } = sample();

    expect(planUseInstance(state, quiver.id, 3).result.used).toBe(8);
    expect(planUnuseInstance(state, quiver.id, 5).result.used).toBe(0);
    expect(codeOf(() => planUseInstance(state, quiver.id, 16))).toBe(
      "invalid-quantity",
    );
    expect(codeOf(() => planUnuseInstance(state, quiver.id, 6))).toBe(
      "invalid-quantity",
    );
  });
});

describe("planDeleteInstance", () => {
  it("deletes the instance and moves its contents to its location", () => {
    const { state, pack, coil, mira } = sample();

    const plan = planDeleteInstance(state, pack.id);
    const after = stateAfter(state, plan.operations);

    expect(after.instances.has(pack.id)).toBe(false);
    expect(after.instances.get(coil.id)?.location).toEqual(
      atCharacter(mira.id),
    );
  });

  it("rejects unknown instances", () => {
    expect(codeOf(() => planDeleteInstance(stateOf({}), "gone"))).toBe(
      "not-found",
    );
  });
});
