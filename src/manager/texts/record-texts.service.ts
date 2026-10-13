import { Item, ItemInstance } from "../../model";
import { InstanceTexts, ItemTexts, TextRef, TextsFor } from "../../storage";
import { InventoryState } from "../state";

/**
 * Extracts the long texts of an item definition.
 * @param item Definition that carries its texts.
 * @returns Its texts; unset texts are omitted.
 */
export function itemTexts(item: Item): ItemTexts {
  const texts: ItemTexts = {};
  if (item.description !== undefined) texts.description = item.description;
  if (item.dmNotes !== undefined) texts.dmNotes = item.dmNotes;
  return texts;
}

/**
 * Extracts the long texts of an instance.
 * @param instance Instance that carries its notes.
 * @returns Its texts; unset notes are omitted.
 */
export function instanceTexts(instance: ItemInstance): InstanceTexts {
  return instance.notes === undefined ? {} : { notes: instance.notes };
}

/**
 * Reads the long texts of a record from the state, for storages without
 * `lazyTexts` (their snapshot contains all texts).
 * @param state Current manager state.
 * @param ref Record whose texts are requested.
 * @returns Its texts, or `undefined` if the record doesn't exist.
 */
export function textsInState<Ref extends TextRef>(
  state: InventoryState,
  ref: Ref,
): TextsFor<Ref> | undefined {
  // TS can't narrow the conditional return type through the `kind` check, so
  // each branch returns the concrete type of its kind.
  if (ref.kind === "item") {
    const item = state.items.get(ref.id);
    return item ? (itemTexts(item) as TextsFor<Ref>) : undefined;
  }
  const instance = state.instances.get(ref.id);
  return instance ? (instanceTexts(instance) as TextsFor<Ref>) : undefined;
}
