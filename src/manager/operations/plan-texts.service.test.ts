import { describe, expect, it } from "vitest";

import { Character } from "../../model";
import { InstanceTexts, ItemTexts, TextRef, TextsFor } from "../../storage";
import { makeInstance, makeItem } from "../testing";

import { OperationPlanBuilder } from "./operation-plan-builder";
import { fillTexts, TextLookup } from "./plan-texts.service";

// Lookup over texts stored per `<kind>:<id>`; unknown refs have no texts.
function lookupOf(
  stored: Record<string, ItemTexts | InstanceTexts>,
): TextLookup {
  return <Ref extends TextRef>(ref: Ref) =>
    // Test data is keyed by kind, so each entry matches its ref's text type.
    (stored[`${ref.kind}:${ref.id}`] ?? {}) as TextsFor<Ref>;
}

describe("OperationPlanBuilder", () => {
  it("keeps operations in order and tracks texts from the state", () => {
    const rope = makeItem("Rope");
    const coil = makeInstance(rope);
    const mira = Character.create("Mira");

    const plan = new OperationPlanBuilder()
      .saveItem(rope)
      .saveInstance(coil, true)
      .saveCharacter(mira)
      .delete("instance", "old")
      .build("done");

    expect(plan.operations.map((operation) => operation.op)).toEqual([
      "save",
      "save",
      "save",
      "delete",
    ]);
    expect(plan.textsFromState).toEqual([{ kind: "item", id: rope.id }]);
    expect(plan.result).toBe("done");
  });
});

describe("fillTexts", () => {
  it("sets loaded texts only on records with texts from the state", () => {
    const rope = makeItem("Rope");
    const coil = makeInstance(rope);
    const other = makeInstance(rope);
    const plan = new OperationPlanBuilder()
      .saveItem(rope)
      .saveInstance(coil)
      .saveInstance(other, true)
      .build(undefined);

    fillTexts(
      plan,
      lookupOf({
        [`item:${rope.id}`]: { description: "Hempen.", dmNotes: "Old." },
        [`instance:${coil.id}`]: { notes: "Knotted." },
        [`instance:${other.id}`]: { notes: "Must not be set." },
      }),
    );

    expect(rope.description).toBe("Hempen.");
    expect(rope.dmNotes).toBe("Old.");
    expect(coil.notes).toBe("Knotted.");
    expect(other.notes).toBeUndefined();
  });

  it("clears texts the storage doesn't have", () => {
    const rope = makeItem("Rope");
    rope.description = "Stale.";
    const plan = new OperationPlanBuilder().saveItem(rope).build(undefined);

    fillTexts(plan, lookupOf({}));

    expect(rope.description).toBeUndefined();
  });
});
