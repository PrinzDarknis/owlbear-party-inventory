import {
  inInstance,
  ItemInstance,
  ItemLocation,
  locationEquals,
  QUANTITY_MAX,
} from "../../model";
import { InstanceTexts } from "../../storage";
import { ManagerError } from "../errors";
import {
  assertMerge,
  assertMove,
  assertSplit,
  assertUnuse,
  assertUse,
  checkTarget,
} from "../rules";
import { InventoryState, locationKey } from "../state";

import { OperationPlanBuilder } from "./operation-plan-builder";
import { OperationPlan } from "./operation-plan.types";
import {
  requireInstance,
  requireItem,
  writableInstance,
} from "./record-access.service";
import { rehomeContents } from "./rehome.service";

/**
 * Plans a new instance of a definition at a location.
 * @param state Current manager state.
 * @param itemId Id of the definition.
 * @param target Where the instance goes.
 * @param quantity Pieces, an integer from 1 to `QUANTITY_MAX`; defaults to 1
 *   and is always 1 for non-stackable items.
 * @returns A plan with one save; its result is the new instance.
 * @throws {ManagerError} `not-found` for an unknown definition,
 *   `invalid-move` for an invalid target, `invalid-quantity` for an invalid quantity.
 */
export function planAssignItem(
  state: InventoryState,
  itemId: string,
  target: ItemLocation,
  quantity = 1,
): OperationPlan<ItemInstance> {
  const item = requireItem(state, itemId);
  const targetProblem = checkTarget(state, target);
  if (targetProblem) throw targetProblem;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > QUANTITY_MAX) {
    throw new ManagerError(
      "invalid-quantity",
      `Quantity must be between 1 and ${QUANTITY_MAX}`,
    );
  }
  const instance = ItemInstance.create(
    itemId,
    target,
    item.stackable ? quantity : 1,
  );
  return new OperationPlanBuilder()
    .saveInstance(instance, true)
    .build(instance);
}

/**
 * Plans a GM change of an instance (alias, quantity, used, notes).
 * @param state Current manager state.
 * @param id Id of the instance.
 * @param edit Changes a bound clone at its effective location; must not keep
 *   a reference to it. A changed location is validated like a move.
 * @param texts The instance's stored notes, set on the clone before `edit`.
 *   Required with lazy texts (the state has none); omit it otherwise.
 * @returns A plan with one save; its result is the changed clone.
 * @throws {ManagerError} `not-found` for an unknown instance, `invalid-move`
 *   if `edit` set an invalid location.
 */
export function planUpdateInstance(
  state: InventoryState,
  id: string,
  edit: (instance: ItemInstance) => void,
  texts?: InstanceTexts,
): OperationPlan<ItemInstance> {
  const instance = writableInstance(state, id);
  if (texts) instance.notes = texts.notes;
  const before = instance.location;
  edit(instance);
  if (!locationEquals(before, instance.location)) {
    assertMove(state, id, instance.location);
  }
  return new OperationPlanBuilder()
    .saveInstance(instance, texts !== undefined)
    .build(instance);
}

/**
 * Plans a change of the player notes. Notes are the only long text of an
 * instance, so nothing has to be loaded first.
 * @param state Current manager state.
 * @param id Id of the instance.
 * @param notes New notes; `undefined` or empty text clears them.
 * @returns A plan with one save; its result is the changed clone.
 * @throws {ManagerError} `not-found` for an unknown instance.
 */
export function planWriteNotes(
  state: InventoryState,
  id: string,
  notes: string | undefined,
): OperationPlan<ItemInstance> {
  const instance = writableInstance(state, id);
  instance.notes = notes;
  return new OperationPlanBuilder()
    .saveInstance(instance, true)
    .build(instance);
}

/**
 * Plans a move. Moving all available pieces (or omitting `quantity`) moves the
 * whole instance including used pieces; fewer pieces split a new instance off
 * into the target. Stacks are never merged automatically.
 * @param state Current manager state.
 * @param id Id of the instance.
 * @param target Destination.
 * @param quantity Pieces to move; defaults to the whole instance.
 * @returns A plan; empty if the instance already is at `target`. Its result is
 *   the instance at the target (the moved clone or the split-off instance).
 * @throws {ManagerError} `not-found`, `invalid-move` or `invalid-quantity`.
 */
export function planMoveInstance(
  state: InventoryState,
  id: string,
  target: ItemLocation,
  quantity?: number,
): OperationPlan<ItemInstance> {
  const instance = requireInstance(state, id);
  assertMove(state, id, target);
  if (quantity !== undefined && quantity !== instance.available) {
    return planSplitInstance(state, id, quantity, target);
  }
  const clone = writableInstance(state, id);
  if (locationEquals(clone.location, target) && !state.misplaced.has(id)) {
    return new OperationPlanBuilder().build(clone);
  }
  clone.location = target;
  return new OperationPlanBuilder().saveInstance(clone).build(clone);
}

/**
 * Plans a split: available pieces of a stack become a new instance with the
 * same alias, no notes and no used pieces. Used pieces stay with the source.
 * @param state Current manager state.
 * @param id Id of the source stack.
 * @param quantity Pieces to split off; an integer from 1 to the available pieces.
 * @param target Where the new instance goes; defaults to the source's location.
 * @returns A plan that saves the source and the new instance; its result is
 *   the new instance.
 * @throws {ManagerError} `not-found`, `invalid-move` or `invalid-quantity`.
 */
export function planSplitInstance(
  state: InventoryState,
  id: string,
  quantity: number,
  target?: ItemLocation,
): OperationPlan<ItemInstance> {
  const source = writableInstance(state, id);
  assertSplit(source, quantity);
  const destination = target ?? source.location;
  if (target) assertMove(state, id, target);

  source.quantity = source.quantity - quantity;
  const part = ItemInstance.create(source.itemId, destination, quantity);
  part.alias = source.alias;
  return new OperationPlanBuilder()
    .saveInstance(source)
    .saveInstance(part, true)
    .build(part);
}

/**
 * Plans a merge of two stacks: the target gets the source's quantity and used
 * pieces (and its contents, if any); the source is deleted with its alias and notes.
 * @param state Current manager state.
 * @param targetId Id of the stack that stays.
 * @param sourceId Id of the stack that is merged into the target.
 * @returns A plan that saves the target and deletes the source; its result is the changed target.
 * @throws {ManagerError} `not-found`, `invalid-merge`, or `invalid-quantity`
 *   if the item isn't stackable or the sum exceeds `QUANTITY_MAX`.
 */
export function planMergeInstances(
  state: InventoryState,
  targetId: string,
  sourceId: string,
): OperationPlan<ItemInstance> {
  const target = writableInstance(state, targetId);
  const source = requireInstance(state, sourceId);
  assertMerge(state, target, source);
  if (target.quantity + source.quantity > QUANTITY_MAX) {
    throw new ManagerError(
      "invalid-quantity",
      `Merged quantity must not exceed ${QUANTITY_MAX}`,
    );
  }
  const used = target.used + source.used;
  target.quantity = target.quantity + source.quantity;
  target.used = used;

  const builder = new OperationPlanBuilder().saveInstance(target);
  for (const childId of state.contents.get(locationKey(inInstance(sourceId))) ??
    []) {
    const child = writableInstance(state, childId);
    child.location = inInstance(targetId);
    builder.saveInstance(child);
  }
  return builder.delete("instance", sourceId).build(target);
}

/**
 * Plans a use: available pieces of a stack are counted as used.
 * @param state Current manager state.
 * @param id Id of the stack.
 * @param quantity Pieces to use; an integer from 1 to the available pieces.
 * @returns A plan with one save; its result is the changed clone.
 * @throws {ManagerError} `not-found` or `invalid-quantity`.
 */
export function planUseInstance(
  state: InventoryState,
  id: string,
  quantity: number,
): OperationPlan<ItemInstance> {
  const instance = writableInstance(state, id);
  assertUse(instance, quantity);
  instance.used = instance.used + quantity;
  return new OperationPlanBuilder().saveInstance(instance).build(instance);
}

/**
 * Plans an unuse (GM undo of a use).
 * @param state Current manager state.
 * @param id Id of the stack.
 * @param quantity Pieces to restore; an integer from 1 to the used pieces.
 * @returns A plan with one save; its result is the changed clone.
 * @throws {ManagerError} `not-found` or `invalid-quantity`.
 */
export function planUnuseInstance(
  state: InventoryState,
  id: string,
  quantity: number,
): OperationPlan<ItemInstance> {
  const instance = writableInstance(state, id);
  assertUnuse(instance, quantity);
  instance.used = instance.used - quantity;
  return new OperationPlanBuilder().saveInstance(instance).build(instance);
}

/**
 * Plans the deletion of an instance. Its contents move to its location.
 * @param state Current manager state.
 * @param id Id of the instance.
 * @returns A plan that saves the re-homed contents and deletes the instance.
 * @throws {ManagerError} `not-found` for an unknown instance.
 */
export function planDeleteInstance(
  state: InventoryState,
  id: string,
): OperationPlan<undefined> {
  requireInstance(state, id);
  const builder = new OperationPlanBuilder();
  const removed = new Set([id]);
  rehomeContents(state, builder, removed, removed);
  return builder.delete("instance", id).build(undefined);
}
