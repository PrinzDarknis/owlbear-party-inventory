import { inInstance, ItemLocation, WEIGHT_DECIMALS } from "../../model";
import { InventoryState } from "../state";

import { contentsOf } from "./tree.service";

/**
 * Weight of an instance including everything inside it. Only available
 * pieces count: used ones (e.g. shot arrows) are gone.
 * @param state Current manager state.
 * @param instanceId Instance to weigh.
 * @returns Weight in pounds, rounded to `WEIGHT_DECIMALS`; 0 if the instance
 *   doesn't exist or its item has no weight.
 */
export function instanceWeight(
  state: InventoryState,
  instanceId: string,
): number {
  return roundWeight(rawInstanceWeight(state, instanceId));
}

/**
 * Weight of everything shown at a location, including nested contents.
 * @param state Current manager state.
 * @param location Character, container instance or `unassigned`.
 * @returns Weight in pounds, rounded to `WEIGHT_DECIMALS`.
 */
export function totalWeight(
  state: InventoryState,
  location: ItemLocation,
): number {
  return roundWeight(rawLocationWeight(state, location));
}

/**
 * Counts the instances of an item definition, e.g. for the catalog or a
 * delete confirmation.
 * @param state Current manager state.
 * @param itemId Definition to count.
 * @returns Number of instances referring to the definition, wherever they are.
 */
export function instanceCount(state: InventoryState, itemId: string): number {
  let count = 0;
  for (const instance of state.instances.values()) {
    if (instance.itemId === itemId) count++;
  }
  return count;
}

/**
 * Sums the weight of an instance and its contents without rounding, so
 * rounding happens once at the end.
 * @param state Current manager state.
 * @param instanceId Instance to weigh.
 * @returns Unrounded weight in pounds; 0 if the instance doesn't exist.
 */
function rawInstanceWeight(state: InventoryState, instanceId: string): number {
  const instance = state.instances.get(instanceId);
  if (!instance) return 0;
  const own = (instance.item?.weight ?? 0) * instance.available;
  return own + rawLocationWeight(state, inInstance(instanceId));
}

/**
 * Sums the weight of everything at a location without rounding.
 * @param state Current manager state.
 * @param location Location to weigh.
 * @returns Unrounded weight in pounds.
 */
function rawLocationWeight(
  state: InventoryState,
  location: ItemLocation,
): number {
  return contentsOf(state, location).reduce(
    (sum, instance) => sum + rawInstanceWeight(state, instance.id),
    0,
  );
}

/**
 * Rounds a weight to hide floating point noise.
 * @param weight Weight in pounds.
 * @returns The weight rounded to `WEIGHT_DECIMALS` places.
 */
function roundWeight(weight: number): number {
  const factor = 10 ** WEIGHT_DECIMALS;
  return Math.round(weight * factor) / factor;
}
