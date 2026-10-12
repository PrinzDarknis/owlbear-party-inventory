import { TextRef, TextsFor } from "../../storage";

/** Loading state of the long texts of one record, as the UI sees it. */
export interface TextEntry<Ref extends TextRef> {
  readonly status: "loading" | "loaded" | "error";
  /** Last loaded texts; kept while reloading and after a failed reload. */
  readonly texts?: TextsFor<Ref>;
  /** Why the last load failed (`status: "error"`), usually a `StorageError`. */
  readonly error?: unknown;
}

/** Loads the long texts of one record (`InventoryStorage.loadTexts`). */
export type TextLoader = <Ref extends TextRef>(
  ref: Ref,
) => Promise<TextsFor<Ref>>;
