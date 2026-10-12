import { Character, Item, ItemInstance, UNASSIGNED } from "../../model";
import { ManagerError } from "../errors";
import { InventoryState } from "../state";

/**
 * Looks up an item definition a command needs.
 * @param state Current manager state.
 * @param id Id of the definition.
 * @returns The state's definition (read only; clone before changing it).
 * @throws {ManagerError} `not-found` if it doesn't exist.
 */
export function requireItem(state: InventoryState, id: string): Item {
  const item = state.items.get(id);
  if (!item) throw new ManagerError("not-found", "Item not found");
  return item;
}

/**
 * Looks up an instance a command needs.
 * @param state Current manager state.
 * @param id Id of the instance.
 * @returns The state's bound instance (read only; use `writableInstance` to change it).
 * @throws {ManagerError} `not-found` if it doesn't exist.
 */
export function requireInstance(
  state: InventoryState,
  id: string,
): ItemInstance {
  const instance = state.instances.get(id);
  if (!instance) throw new ManagerError("not-found", "Instance not found");
  return instance;
}

/**
 * Looks up a character a command needs.
 * @param state Current manager state.
 * @param id Id of the character.
 * @returns The state's character (read only; clone before changing it).
 * @throws {ManagerError} `not-found` if it doesn't exist.
 */
export function requireCharacter(state: InventoryState, id: string): Character {
  const character = state.characters.get(id);
  if (!character) throw new ManagerError("not-found", "Character not found");
  return character;
}

/**
 * Clones an instance for a write. The clone gets the effective location, so
 * the next write of a misplaced instance also stores the corrected location.
 * @param state Current manager state.
 * @param id Id of the instance.
 * @returns A bound clone at its effective location.
 * @throws {ManagerError} `not-found` if the instance doesn't exist.
 */
export function writableInstance(
  state: InventoryState,
  id: string,
): ItemInstance {
  const clone = requireInstance(state, id).clone();
  clone.location = state.placements.get(id) ?? UNASSIGNED;
  return clone;
}
