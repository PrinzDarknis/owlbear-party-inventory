import { Character, ItemInstance, ItemLocation, UNASSIGNED } from "../../model";
import { InventorySnapshot } from "../../storage";

import { InventoryState } from "./inventory-state.types";
import { LocationKey, locationKey } from "./location-key.service";

/**
 * Creates a state without any records, used before the first `load()`.
 * @param version Version of the empty state; defaults to 0.
 * @returns An empty state.
 */
export function createEmptyState(version = 0): InventoryState {
  return {
    version,
    items: new Map(),
    instances: new Map(),
    characters: new Map(),
    placements: new Map(),
    contents: new Map(),
    misplaced: new Set(),
  };
}

/**
 * Builds the manager state from a freshly loaded snapshot. Takes ownership of
 * the snapshot's records (binds every instance to its item). Invalid stored
 * locations are resolved to `unassigned` for display only; nothing is written
 * back, so N clients never repair the same data in a loop.
 * @param snapshot Records from `load()`; the state takes ownership of them and mutates their item binding.
 * @param version Version of the new state, higher than the previous one.
 * @returns The new state with item bindings, effective placements and contents per location.
 */
export function buildState(
  snapshot: InventorySnapshot,
  version: number,
): InventoryState {
  const items = new Map(snapshot.items.map((item) => [item.id, item]));
  const characters = new Map(
    snapshot.characters.map((character) => [character.id, character]),
  );
  const instances = new Map<string, ItemInstance>();
  for (const instance of snapshot.instances) {
    const item = items.get(instance.itemId);
    if (item) instance.bindItem(item);
    instances.set(instance.id, instance);
  }

  const placements = resolvePlacements(instances, characters);
  const contents = new Map<LocationKey, string[]>();
  const misplaced = new Set<string>();
  for (const instance of instances.values()) {
    const placement = placements.get(instance.id) ?? UNASSIGNED;
    if (
      placement.type === "unassigned" &&
      instance.location.type !== "unassigned"
    ) {
      misplaced.add(instance.id);
    }
    const key = locationKey(placement);
    const list = contents.get(key);
    if (list) list.push(instance.id);
    else contents.set(key, [instance.id]);
  }

  return {
    version,
    items,
    instances,
    characters,
    placements,
    contents,
    misplaced,
  };
}

/**
 * Resolves the effective location of every instance.
 * @param instances All instances, already bound to their items.
 * @param characters All characters, to check character locations.
 * @returns Per instance id the stored location if it is valid, else `UNASSIGNED`.
 */
function resolvePlacements(
  instances: ReadonlyMap<string, ItemInstance>,
  characters: ReadonlyMap<string, Character>,
): Map<string, ItemLocation> {
  const placements = new Map<string, ItemLocation>();
  // Container of each instance whose direct reference is valid.
  const parents = new Map<string, string>();

  for (const instance of instances.values()) {
    const location = instance.location;
    let valid = instance.item !== undefined;
    if (valid && location.type === "character") {
      valid = characters.has(location.characterId);
    } else if (valid && location.type === "instance") {
      const container = instances.get(location.instanceId);
      valid = container !== undefined && container.canHoldItems;
      if (valid) parents.set(instance.id, location.instanceId);
    }
    placements.set(instance.id, valid ? location : UNASSIGNED);
  }

  for (const id of findCycleMembers(parents)) placements.set(id, UNASSIGNED);
  return placements;
}

/**
 * Finds the instances that lie on a cycle of container references. Every
 * instance has at most one parent, so walking up from any instance either
 * ends or enters a cycle.
 * @param parents Container id per instance id, for valid container references only.
 * @returns Ids of all instances on a cycle; instances that only lead into one are excluded.
 */
function findCycleMembers(parents: ReadonlyMap<string, string>): Set<string> {
  const onCycle = new Set<string>();
  const done = new Set<string>();

  for (const start of parents.keys()) {
    const path: string[] = [];
    const onPath = new Set<string>();
    let current: string | undefined = start;
    while (current !== undefined && !done.has(current)) {
      if (onPath.has(current)) {
        // Everything from the first visit of `current` on is the cycle.
        for (const id of path.slice(path.indexOf(current))) onCycle.add(id);
        break;
      }
      path.push(current);
      onPath.add(current);
      current = parents.get(current);
    }
    for (const id of path) done.add(id);
  }
  return onCycle;
}
