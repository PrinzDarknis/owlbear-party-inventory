import { Rarity } from "../rarity";

/** Persisted JSON shape of an item definition. Optional fields are omitted when unset. */
export interface ItemData {
  readonly id: string;
  name: string;
  description?: string;
  categories?: readonly string[];
  rarity?: Rarity;
  /** Value in copper pieces (1 gp = 100 cp). */
  valueCp?: number;
  /** Weight in pounds. */
  weight?: number;
  stackable: boolean;
  hasInventory: boolean;
  dmNotes?: string;
}
