import { Item } from "../../model";
import { ItemTexts } from "../../storage";
import { InventoryState } from "../state";

import { OperationPlanBuilder } from "./operation-plan-builder";
import { OperationPlan } from "./operation-plan.types";
import { requireItem } from "./record-access.service";
import { rehomeContents } from "./rehome.service";

/**
 * Plans the creation of an item definition.
 * @param name Name of the definition; normalized by the model.
 * @param edit Optional initial values, set on the new definition before saving.
 * @returns A plan with one save; its result is the new definition.
 */
export function planCreateItem(
  name: string,
  edit?: (item: Item) => void,
): OperationPlan<Item> {
  const item = Item.create(name);
  edit?.(item);
  return new OperationPlanBuilder().saveItem(item, true).build(item);
}

/**
 * Plans a change of an item definition. If it loses `hasInventory`, the
 * contents of all its instances move to the location of their container.
 * @param state Current manager state.
 * @param id Id of the definition.
 * @param edit Changes a clone of the definition; must not keep a reference to it.
 * @param texts The definition's stored long texts, set on the clone before
 *   `edit`. Required with lazy texts (the state has none); omit it otherwise.
 * @returns A plan with the save (and re-homed contents); its result is the changed clone.
 * @throws {ManagerError} `not-found` if the definition doesn't exist.
 */
export function planUpdateItem(
  state: InventoryState,
  id: string,
  edit: (item: Item) => void,
  texts?: ItemTexts,
): OperationPlan<Item> {
  const original = requireItem(state, id);
  const item = original.clone();
  if (texts) {
    item.description = texts.description;
    item.dmNotes = texts.dmNotes;
  }
  edit(item);

  const builder = new OperationPlanBuilder().saveItem(
    item,
    texts !== undefined,
  );
  if (original.hasInventory && !item.hasInventory) {
    rehomeContents(state, builder, instanceIdsOf(state, id), new Set());
  }
  return builder.build(item);
}

/**
 * Plans the deletion of an item definition with all its instances. Their
 * contents move to the nearest location that survives.
 * @param state Current manager state.
 * @param id Id of the definition.
 * @returns A plan that saves the re-homed contents and deletes the instances
 *   and the definition.
 * @throws {ManagerError} `not-found` if the definition doesn't exist.
 */
export function planDeleteItem(
  state: InventoryState,
  id: string,
): OperationPlan<undefined> {
  requireItem(state, id);
  const instanceIds = instanceIdsOf(state, id);
  const builder = new OperationPlanBuilder();
  rehomeContents(state, builder, instanceIds, instanceIds);
  for (const instanceId of instanceIds) builder.delete("instance", instanceId);
  return builder.delete("item", id).build(undefined);
}

/**
 * Collects the instances of a definition.
 * @param state Current manager state.
 * @param itemId Id of the definition.
 * @returns Ids of all its instances.
 */
function instanceIdsOf(state: InventoryState, itemId: string): Set<string> {
  const ids = new Set<string>();
  for (const instance of state.instances.values()) {
    if (instance.itemId === itemId) ids.add(instance.id);
  }
  return ids;
}
