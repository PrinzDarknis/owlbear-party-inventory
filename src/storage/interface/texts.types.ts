/** Identifies the long texts of one item definition or one instance. */
export type TextRef =
  { kind: "item"; id: string } | { kind: "instance"; id: string };

/** Long texts of an item definition. */
export interface ItemTexts {
  description?: string;
  dmNotes?: string;
}

/** Long texts of an instance (player notes). */
export interface InstanceTexts {
  notes?: string;
}

/** Texts returned by `loadTexts`, depending on the kind of the ref. */
export type TextsFor<Ref extends TextRef> = Ref extends { kind: "item" }
  ? ItemTexts
  : InstanceTexts;
