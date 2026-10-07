import { InventorySnapshot, TextRef, TextsFor } from "../../../interface";

import { RecordSet } from "./record-set.types";

/** Set without any records. */
export function createEmptyRecordSet(): RecordSet {
  return { items: new Map(), instances: new Map(), characters: new Map() };
}

/** All records as independent clones, so callers can't mutate the set. */
export function toSnapshot(set: RecordSet): InventorySnapshot {
  return {
    items: [...set.items.values()].map((item) => item.clone()),
    instances: [...set.instances.values()].map((instance) => instance.clone()),
    characters: [...set.characters.values()].map((character) =>
      character.clone(),
    ),
  };
}

/** Long texts of one record; empty object if the record is unknown. */
export function textsOf<Ref extends TextRef>(
  set: RecordSet,
  ref: Ref,
): TextsFor<Ref> {
  // TS can't narrow the conditional return type through the `kind` check, so
  // each branch is checked against its concrete type before widening.
  if (ref.kind === "item") {
    const item = set.items.get(ref.id);
    const texts: TextsFor<{ kind: "item"; id: string }> = {};
    if (item?.description !== undefined) texts.description = item.description;
    if (item?.dmNotes !== undefined) texts.dmNotes = item.dmNotes;
    return texts as TextsFor<Ref>;
  }
  const instance = set.instances.get(ref.id);
  const texts: TextsFor<{ kind: "instance"; id: string }> = {};
  if (instance?.notes !== undefined) texts.notes = instance.notes;
  return texts as TextsFor<Ref>;
}
