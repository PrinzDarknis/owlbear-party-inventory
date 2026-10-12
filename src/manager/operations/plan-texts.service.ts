import { TextRef, TextsFor } from "../../storage";

import { OperationPlan } from "./operation-plan.types";

/** Returns the loaded long texts of a record. */
export type TextLookup = <Ref extends TextRef>(ref: Ref) => TextsFor<Ref>;

/**
 * Sets the stored long texts on the records a plan saves with texts from the
 * state (`textsFromState`). Needed with lazy texts, where the state has none
 * and saving without them would erase them. Mutates the plan's records,
 * which are clones owned by the plan.
 * @param plan Plan built by an operation builder.
 * @param lookup Returns the loaded texts of every ref in `plan.textsFromState`.
 */
export function fillTexts(
  plan: OperationPlan<unknown>,
  lookup: TextLookup,
): void {
  const pending = new Set(
    plan.textsFromState.map((ref) => `${ref.kind}:${ref.id}`),
  );
  for (const operation of plan.operations) {
    if (operation.op !== "save") continue;
    if (!pending.has(`${operation.kind}:${operation.record.id}`)) continue;
    if (operation.kind === "item") {
      const texts = lookup({ kind: "item", id: operation.record.id });
      operation.record.description = texts.description;
      operation.record.dmNotes = texts.dmNotes;
    } else if (operation.kind === "instance") {
      const texts = lookup({ kind: "instance", id: operation.record.id });
      operation.record.notes = texts.notes;
    }
  }
}
