import { Character, UNASSIGNED } from "../../model";
import { InventoryState } from "../state";

import { OperationPlanBuilder } from "./operation-plan-builder";
import { OperationPlan } from "./operation-plan.types";
import { requireCharacter, writableInstance } from "./record-access.service";

/**
 * Plans the creation of a character.
 * @param name Name of the character; normalized by the model.
 * @returns A plan with one save; its result is the new character.
 */
export function planCreateCharacter(name: string): OperationPlan<Character> {
  const character = Character.create(name);
  return new OperationPlanBuilder().saveCharacter(character).build(character);
}

/**
 * Plans a change of a character.
 * @param state Current manager state.
 * @param id Id of the character.
 * @param edit Changes a clone of the character; must not keep a reference to it.
 * @returns A plan with one save; its result is the changed clone.
 * @throws {ManagerError} `not-found` if the character doesn't exist.
 */
export function planUpdateCharacter(
  state: InventoryState,
  id: string,
  edit: (character: Character) => void,
): OperationPlan<Character> {
  const character = requireCharacter(state, id).clone();
  edit(character);
  return new OperationPlanBuilder().saveCharacter(character).build(character);
}

/**
 * Plans the deletion of a character. Its direct instances become unassigned;
 * containers keep their contents.
 * @param state Current manager state.
 * @param id Id of the character.
 * @returns A plan that saves the re-homed instances and deletes the character.
 * @throws {ManagerError} `not-found` if the character doesn't exist.
 */
export function planDeleteCharacter(
  state: InventoryState,
  id: string,
): OperationPlan<undefined> {
  requireCharacter(state, id);
  const builder = new OperationPlanBuilder();
  // Stored locations, so misplaced instances don't keep a dangling reference.
  for (const instance of state.instances.values()) {
    const location = instance.location;
    if (location.type === "character" && location.characterId === id) {
      const clone = writableInstance(state, instance.id);
      clone.location = UNASSIGNED;
      builder.saveInstance(clone);
    }
  }
  return builder.delete("character", id).build(undefined);
}
