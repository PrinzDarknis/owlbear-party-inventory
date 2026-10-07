import { Character, Item, ItemInstance } from "../../../../model";

/**
 * The whole inventory as maps by id, for controllers that hold or rebuild all
 * records at once (memory, local). Treated as immutable: changes produce a new
 * set, stored records are never mutated and leave the set only as clones.
 */
export interface RecordSet {
  readonly items: ReadonlyMap<string, Item>;
  readonly instances: ReadonlyMap<string, ItemInstance>;
  readonly characters: ReadonlyMap<string, Character>;
}
