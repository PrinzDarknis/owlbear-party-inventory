import { ItemLocation } from "../../model";
import { ManagerError } from "../errors";
import { isWithin } from "../queries";
import { InventoryState } from "../state";

/**
 * Checks whether a location can receive instances: the character or the
 * container exists and the container's item has an inventory.
 * @param state Current manager state.
 * @param target Location to check; `unassigned` is always valid.
 * @returns `undefined` if valid, else a `ManagerError` (`invalid-move`).
 */
export function checkTarget(
  state: InventoryState,
  target: ItemLocation,
): ManagerError | undefined {
  switch (target.type) {
    case "unassigned":
      return undefined;
    case "character":
      return state.characters.has(target.characterId)
        ? undefined
        : new ManagerError("invalid-move", "Target character not found");
    case "instance": {
      const container = state.instances.get(target.instanceId);
      if (!container) {
        return new ManagerError("invalid-move", "Target container not found");
      }
      return container.canHoldItems
        ? undefined
        : new ManagerError("invalid-move", "Target can't hold items");
    }
  }
}

/**
 * Checks whether an instance may move to a location, e.g. to mark valid drop
 * targets. Moving to the current location is valid (a no-op for the caller).
 * @param state Current manager state.
 * @param instanceId Instance to move.
 * @param target Destination.
 * @returns `undefined` if valid, else a `ManagerError`: `not-found` for an
 *   unknown instance, `invalid-move` for an invalid target or a move into the
 *   instance itself or its own contents.
 */
export function checkMove(
  state: InventoryState,
  instanceId: string,
  target: ItemLocation,
): ManagerError | undefined {
  if (!state.instances.has(instanceId)) {
    return new ManagerError("not-found", "Instance not found");
  }
  const targetProblem = checkTarget(state, target);
  if (targetProblem) return targetProblem;
  if (
    target.type === "instance" &&
    (target.instanceId === instanceId ||
      isWithin(state, target.instanceId, instanceId))
  ) {
    return new ManagerError(
      "invalid-move",
      "Can't move a container into itself",
    );
  }
  return undefined;
}

/**
 * Like `checkMove`, for commands.
 * @param state Current manager state.
 * @param instanceId Instance to move.
 * @param target Destination.
 * @throws {ManagerError} `not-found` or `invalid-move`, see `checkMove`.
 */
export function assertMove(
  state: InventoryState,
  instanceId: string,
  target: ItemLocation,
): void {
  const problem = checkMove(state, instanceId, target);
  if (problem) throw problem;
}
