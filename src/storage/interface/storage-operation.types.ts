import { Character, Item, ItemInstance } from "../../model";

/** The kinds of records a controller stores. */
export type RecordKind = "item" | "instance" | "character";

/** Inserts a record or replaces the stored one with the same id as a whole. */
export type SaveOperation =
  | { op: "save"; kind: "item"; record: Item }
  | { op: "save"; kind: "instance"; record: ItemInstance }
  | { op: "save"; kind: "character"; record: Character };

/** Deletes a record. Unknown ids are ignored. */
export interface DeleteOperation {
  op: "delete";
  kind: RecordKind;
  id: string;
}

/**
 * One change to one record. `apply` takes a list of them, applies it in
 * order (a later operation on the same id wins) and stores it atomically.
 */
export type StorageOperation = SaveOperation | DeleteOperation;
