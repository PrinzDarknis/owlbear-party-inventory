import { Character, inInstance, ItemInstance, ItemLocation } from "../../model";
import { InventoryState, locationKey } from "../state";

// All walks follow the effective placements, which `buildState` keeps free of
// cycles, so they always end.

/**
 * Lists the instances shown directly at a location (not their contents).
 * @param state Current manager state.
 * @param location Character, container instance or `unassigned`.
 * @returns The instances in load order; empty if there are none.
 */
export function contentsOf(
  state: InventoryState,
  location: ItemLocation,
): ItemInstance[] {
  const ids = state.contents.get(locationKey(location)) ?? [];
  return ids.flatMap((id) => state.instances.get(id) ?? []);
}

/**
 * Lists the containers an instance is in, for breadcrumbs.
 * @param state Current manager state.
 * @param instanceId Instance to start from.
 * @returns The containers from the outermost to the direct one; empty if the
 *   instance is not inside a container or doesn't exist.
 */
export function pathOf(
  state: InventoryState,
  instanceId: string,
): ItemInstance[] {
  const path: ItemInstance[] = [];
  let location = state.placements.get(instanceId);
  while (location?.type === "instance") {
    const container = state.instances.get(location.instanceId);
    if (!container) break;
    path.unshift(container);
    location = state.placements.get(container.id);
  }
  return path;
}

/**
 * Finds the character that carries an instance, directly or in containers.
 * @param state Current manager state.
 * @param instanceId Instance to look up.
 * @returns The owning character, or `undefined` if the instance is
 *   unassigned (also inside an unassigned container) or doesn't exist.
 */
export function ownerOf(
  state: InventoryState,
  instanceId: string,
): Character | undefined {
  const outermost = pathOf(state, instanceId)[0]?.id ?? instanceId;
  const location = state.placements.get(outermost);
  return location?.type === "character"
    ? state.characters.get(location.characterId)
    : undefined;
}

/**
 * Checks whether an instance is a container's content at any depth, used to
 * refuse moves that would put a container into itself.
 * @param state Current manager state.
 * @param instanceId Instance that may be inside.
 * @param containerId Container that may contain it.
 * @returns `true` if `instanceId` is inside `containerId` at any depth;
 *   `false` for the same id.
 */
export function isWithin(
  state: InventoryState,
  instanceId: string,
  containerId: string,
): boolean {
  return pathOf(state, instanceId).some(
    (container) => container.id === containerId,
  );
}

/**
 * Lists all contents of a container at any depth.
 * @param state Current manager state.
 * @param containerId Container to start from.
 * @returns The ids of all nested instances (depth first); empty if the
 *   container holds nothing or doesn't exist.
 */
export function descendantsOf(
  state: InventoryState,
  containerId: string,
): string[] {
  const result: string[] = [];
  const pending = [containerId];
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined) break;
    for (const child of state.contents.get(locationKey(inInstance(id))) ?? []) {
      result.push(child);
      pending.push(child);
    }
  }
  return result;
}
