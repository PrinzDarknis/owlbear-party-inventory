import {
  Character,
  Item,
  ItemInstance,
  ItemLocation,
  UNASSIGNED,
} from "../../model";
import { StorageOperation } from "../../storage";
import { InventoryState } from "../state/inventory-state.types";
import { buildState } from "../state/build-state.service";

/** Flags of a test item definition. */
export interface ItemOptions {
  /** Instances track a quantity; defaults to `false`. */
  stackable?: boolean;
  /** Instances can contain other instances; defaults to `false`. */
  hasInventory?: boolean;
  /** Weight of one piece in pounds; defaults to none. */
  weight?: number;
}

/**
 * Creates an item definition for a test.
 * @param name Name of the definition.
 * @param options Flags and weight; all optional.
 * @returns A new definition with a fresh id.
 */
export function makeItem(name: string, options: ItemOptions = {}): Item {
  const item = Item.create(name);
  item.stackable = options.stackable ?? false;
  item.hasInventory = options.hasInventory ?? false;
  item.weight = options.weight;
  return item;
}

/**
 * Creates an instance of a definition for a test.
 * @param item Definition the instance refers to (not bound; `stateOf` binds it).
 * @param location Where the instance is; defaults to `UNASSIGNED`.
 * @param quantity Stored quantity; defaults to 1.
 * @returns A new instance with a fresh id.
 */
export function makeInstance(
  item: Item,
  location: ItemLocation = UNASSIGNED,
  quantity = 1,
): ItemInstance {
  return ItemInstance.create(item.id, location, quantity);
}

/** Records a test state is built from; missing lists are empty. */
export interface StateRecords {
  items?: Item[];
  instances?: ItemInstance[];
  characters?: Character[];
}

/**
 * Builds a manager state from clones of the records, like after a `load()`,
 * so the test's own records stay unbound and unchanged.
 * @param records Records of the state.
 * @param version Version of the state; defaults to 1.
 * @returns The built state.
 */
export function stateOf(records: StateRecords, version = 1): InventoryState {
  return buildState(
    {
      items: (records.items ?? []).map((item) => item.clone()),
      instances: (records.instances ?? []).map((instance) => instance.clone()),
      characters: (records.characters ?? []).map((character) =>
        character.clone(),
      ),
    },
    version,
  );
}

/**
 * Applies operations to a state like a storage followed by a reload, so tests
 * can check the outcome of a plan without a controller.
 * @param state State the operations were planned on (not changed).
 * @param operations Operations in order; later ones win.
 * @returns The state after the operations, with the next version.
 */
export function stateAfter(
  state: InventoryState,
  operations: readonly StorageOperation[],
): InventoryState {
  const items = new Map(state.items);
  const instances = new Map(state.instances);
  const characters = new Map(state.characters);
  for (const operation of operations) {
    if (operation.op === "delete") {
      if (operation.kind === "item") items.delete(operation.id);
      else if (operation.kind === "instance") instances.delete(operation.id);
      else characters.delete(operation.id);
    } else if (operation.kind === "item") {
      items.set(operation.record.id, operation.record);
    } else if (operation.kind === "instance") {
      instances.set(operation.record.id, operation.record);
    } else {
      characters.set(operation.record.id, operation.record);
    }
  }
  return stateOf(
    {
      items: [...items.values()],
      instances: [...instances.values()],
      characters: [...characters.values()],
    },
    state.version + 1,
  );
}
