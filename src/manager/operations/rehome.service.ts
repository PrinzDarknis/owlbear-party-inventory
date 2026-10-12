import { inInstance, ItemLocation, UNASSIGNED } from "../../model";
import { InventoryState, locationKey } from "../state";

import { OperationPlanBuilder } from "./operation-plan-builder";
import { writableInstance } from "./record-access.service";

/**
 * Moves the contents of containers that disappear (deleted, or their item
 * lost `hasInventory`) to the nearest location that survives, walking up past
 * other disappearing containers.
 * @param state Current manager state.
 * @param builder Plan that receives one save per moved instance.
 * @param removed Containers that can no longer hold items.
 * @param skip Instances that are deleted in the same plan and must not be saved.
 */
export function rehomeContents(
  state: InventoryState,
  builder: OperationPlanBuilder,
  removed: ReadonlySet<string>,
  skip: ReadonlySet<string>,
): void {
  for (const containerId of removed) {
    const target = survivingLocation(state, containerId, removed);
    for (const childId of state.contents.get(
      locationKey(inInstance(containerId)),
    ) ?? []) {
      if (skip.has(childId)) continue;
      const child = writableInstance(state, childId);
      child.location = target;
      builder.saveInstance(child);
    }
  }
}

/**
 * Finds where the contents of a disappearing container go.
 * @param state Current manager state.
 * @param containerId The disappearing container.
 * @param removed All disappearing containers.
 * @returns The effective location of the nearest ancestor that survives, or
 *   the container's own location if that one survives.
 */
function survivingLocation(
  state: InventoryState,
  containerId: string,
  removed: ReadonlySet<string>,
): ItemLocation {
  let location = state.placements.get(containerId) ?? UNASSIGNED;
  // Placements are cycle free, so this walk ends.
  while (location.type === "instance" && removed.has(location.instanceId)) {
    location = state.placements.get(location.instanceId) ?? UNASSIGNED;
  }
  return location;
}
