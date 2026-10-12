import { Character, Item, ItemInstance, ItemLocation } from "../../model";

import { LocationKey } from "./location-key.service";

/**
 * The manager's in-memory inventory, rebuilt from every `load()`. Treated as
 * immutable: a change builds a new state, records are never mutated in place
 * and leave the manager only as read-only views or clones.
 */
export interface InventoryState {
  /** Increases with every new state; used by `useSyncExternalStore`. */
  readonly version: number;
  readonly items: ReadonlyMap<string, Item>;
  /** Instances, each bound to its item (if it exists). */
  readonly instances: ReadonlyMap<string, ItemInstance>;
  readonly characters: ReadonlyMap<string, Character>;
  /**
   * Effective location of every instance. Equals the stored location unless
   * that one is invalid (missing item, character or container, a container
   * that can't hold items, a cycle); then it is `unassigned`.
   */
  readonly placements: ReadonlyMap<string, ItemLocation>;
  /** Instance ids per effective location, in load order. */
  readonly contents: ReadonlyMap<LocationKey, readonly string[]>;
  /** Ids of instances whose effective location differs from the stored one. */
  readonly misplaced: ReadonlySet<string>;
}
