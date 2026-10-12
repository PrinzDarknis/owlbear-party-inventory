import { ItemInstance, locationEquals } from "../../model";
import { ManagerError } from "../errors";
import { InventoryState } from "../state";

/**
 * Checks a split: some available pieces of a stack become a new instance.
 * Used pieces stay with the source.
 * @param stack Bound source instance.
 * @param quantity Pieces to split off; an integer from 1 to `stack.available`.
 * @throws {ManagerError} `invalid-quantity` if the item isn't stackable or the
 *   quantity is out of range.
 */
export function assertSplit(stack: ItemInstance, quantity: number): void {
  assertStackable(stack);
  assertPieces(quantity, stack.available, "Split");
}

/**
 * Checks a use: available pieces are counted as used.
 * @param stack Bound instance.
 * @param quantity Pieces to use; an integer from 1 to `stack.available`.
 * @throws {ManagerError} `invalid-quantity` if the item isn't stackable or the
 *   quantity is out of range.
 */
export function assertUse(stack: ItemInstance, quantity: number): void {
  assertStackable(stack);
  assertPieces(quantity, stack.available, "Use");
}

/**
 * Checks an unuse (GM undo of a use).
 * @param stack Bound instance.
 * @param quantity Pieces to restore; an integer from 1 to `stack.used`.
 * @throws {ManagerError} `invalid-quantity` if the item isn't stackable or the
 *   quantity is out of range.
 */
export function assertUnuse(stack: ItemInstance, quantity: number): void {
  assertStackable(stack);
  assertPieces(quantity, stack.used, "Unuse");
}

/**
 * Checks a merge of two stacks into one.
 * @param state Current manager state, for the effective locations.
 * @param target Bound instance that receives the pieces and stays.
 * @param source Bound instance that is merged into `target` and deleted.
 * @throws {ManagerError} `invalid-merge` if the instances are the same, of
 *   different items or not at the same location; `invalid-quantity` if the
 *   item isn't stackable.
 */
export function assertMerge(
  state: InventoryState,
  target: ItemInstance,
  source: ItemInstance,
): void {
  if (target.id === source.id) {
    throw new ManagerError("invalid-merge", "Can't merge a stack with itself");
  }
  if (target.itemId !== source.itemId) {
    throw new ManagerError("invalid-merge", "Can't merge different items");
  }
  assertStackable(target);
  const targetLocation = state.placements.get(target.id);
  const sourceLocation = state.placements.get(source.id);
  if (
    !targetLocation ||
    !sourceLocation ||
    !locationEquals(targetLocation, sourceLocation)
  ) {
    throw new ManagerError(
      "invalid-merge",
      "Only stacks at the same location can be merged",
    );
  }
}

/**
 * Rejects instances whose item doesn't track a quantity.
 * @param stack Bound instance.
 * @throws {ManagerError} `invalid-quantity` if the item is missing or not stackable.
 */
function assertStackable(stack: ItemInstance): void {
  if (!stack.item?.stackable) {
    throw new ManagerError("invalid-quantity", "Item is not stackable");
  }
}

/**
 * Rejects piece counts outside 1..max.
 * @param quantity Requested pieces.
 * @param max Largest allowed count.
 * @param command Command name for the message.
 * @throws {ManagerError} `invalid-quantity` if `quantity` is no integer in 1..max.
 */
function assertPieces(quantity: number, max: number, command: string): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > max) {
    throw new ManagerError(
      "invalid-quantity",
      `${command} quantity must be between 1 and ${max}`,
    );
  }
}
