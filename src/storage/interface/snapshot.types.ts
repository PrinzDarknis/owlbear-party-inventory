import { Character, Item, ItemInstance } from "../../model";

/** Everything a backend holds. Texts may be missing if `capabilities.lazyTexts`. */
export interface InventorySnapshot {
  items: Item[];
  instances: ItemInstance[];
  characters: Character[];
}
