import { StorageOperation } from "../../../interface";

import { RecordSet } from "./record-set.types";

/**
 * Applies operations in order to a set without mutating it and returns the
 * new set. Saved records are stored as clones, so later changes by the
 * caller can't reach the set. Deleting an unknown id does nothing.
 */
export function applyOperations(
  set: RecordSet,
  operations: readonly StorageOperation[],
): RecordSet {
  const items = new Map(set.items);
  const instances = new Map(set.instances);
  const characters = new Map(set.characters);
  const byKind = { item: items, instance: instances, character: characters };

  for (const operation of operations) {
    if (operation.op === "delete") {
      byKind[operation.kind].delete(operation.id);
      continue;
    }
    switch (operation.kind) {
      case "item":
        items.set(operation.record.id, operation.record.clone());
        break;
      case "instance":
        instances.set(operation.record.id, operation.record.clone());
        break;
      case "character":
        characters.set(operation.record.id, operation.record.clone());
        break;
    }
  }
  return { items, instances, characters };
}
