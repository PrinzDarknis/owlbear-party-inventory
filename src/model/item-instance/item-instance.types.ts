import { ItemLocation } from "../location";

/** Persisted JSON shape of an item instance. Optional fields are omitted when unset. */
export interface ItemInstanceData {
  readonly id: string;
  readonly itemId: string;
  location: ItemLocation;
  alias?: string;
  /** Player notes. */
  notes?: string;
  /** Quantity; only meaningful if the item is stackable. The class getter returns 1 otherwise, `serialize` stores the raw value. */
  quantity: number;
  /** Used pieces of a stack (≤ quantity), omitted when 0. Optional, so data without it reads as 0. */
  used?: number;
}
