import { Character, Item, ItemInstance } from "../../model";
import { RecordKind, StorageOperation, TextRef } from "../../storage";

import { OperationPlan } from "./operation-plan.types";

/**
 * Collects the operations of one command in order and tracks which saved
 * records still need their long texts. The records passed in become part of
 * the plan; callers hand in clones, never state records.
 */
export class OperationPlanBuilder {
  // #region Fields
  readonly #operations: StorageOperation[] = [];
  readonly #textsFromState: TextRef[] = [];
  // #endregion

  // #region Operations
  /**
   * Adds a save of an item definition.
   * @param item Clone to store.
   * @param textsComplete `true` if `item` already carries its real long
   *   texts (new record, or texts loaded and set by the caller).
   * @returns This builder, for chaining.
   */
  saveItem(item: Item, textsComplete = false): this {
    this.#operations.push({ op: "save", kind: "item", record: item });
    if (!textsComplete) {
      this.#textsFromState.push({ kind: "item", id: item.id });
    }
    return this;
  }

  /**
   * Adds a save of an instance.
   * @param instance Clone to store.
   * @param textsComplete `true` if `instance` already carries its real notes
   *   (new record, or notes set by the caller).
   * @returns This builder, for chaining.
   */
  saveInstance(instance: ItemInstance, textsComplete = false): this {
    this.#operations.push({ op: "save", kind: "instance", record: instance });
    if (!textsComplete) {
      this.#textsFromState.push({ kind: "instance", id: instance.id });
    }
    return this;
  }

  /**
   * Adds a save of a character (characters have no long texts).
   * @param character Clone to store.
   * @returns This builder, for chaining.
   */
  saveCharacter(character: Character): this {
    this.#operations.push({ op: "save", kind: "character", record: character });
    return this;
  }

  /**
   * Adds a delete.
   * @param kind Kind of the record.
   * @param id Id of the record.
   * @returns This builder, for chaining.
   */
  delete(kind: RecordKind, id: string): this {
    this.#operations.push({ op: "delete", kind, id });
    return this;
  }
  // #endregion

  // #region Build
  /**
   * Finishes the plan.
   * @param result What the command returns to its caller.
   * @returns The plan with all operations added so far.
   */
  build<Result>(result: Result): OperationPlan<Result> {
    return {
      operations: [...this.#operations],
      textsFromState: [...this.#textsFromState],
      result,
    };
  }
  // #endregion
}
