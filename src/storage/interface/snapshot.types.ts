import { Character, Item, ItemInstance } from "../../model";

/** The record kinds a backend stores. */
export type RecordKind = "items" | "instances" | "characters";

/** Everything a backend holds. Texts may be missing if `capabilities.lazyTexts`. */
export interface InventorySnapshot {
  items: Item[];
  instances: ItemInstance[];
  characters: Character[];
}
