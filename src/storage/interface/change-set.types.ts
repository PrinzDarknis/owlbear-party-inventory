import { Character, Item, ItemInstance } from "../../model";

/** Records to insert or replace (by id). Each record is replaced as a whole. */
export interface RecordUpserts {
  items?: readonly Item[];
  instances?: readonly ItemInstance[];
  characters?: readonly Character[];
}

/** Ids of records to delete. Unknown ids are ignored. */
export interface RecordRemovals {
  items?: readonly string[];
  instances?: readonly string[];
  characters?: readonly string[];
}

/**
 * One atomic write: either every change is stored or none. Removals win over
 * upserts with the same id in the same changeset.
 */
export interface ChangeSet {
  upsert?: RecordUpserts;
  remove?: RecordRemovals;
}
