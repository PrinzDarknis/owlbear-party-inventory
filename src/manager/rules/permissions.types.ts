/**
 * Everything a user can do through the manager. The UI asks `can(action)` to
 * show or hide controls; the manager checks the same action before a command.
 */
export type ManagerAction =
  // characters
  | "createCharacter"
  | "updateCharacter"
  | "deleteCharacter"
  // item definitions (catalog)
  | "createItem"
  | "updateItem"
  | "deleteItem"
  | "viewDmNotes"
  // instances
  | "assignItem"
  | "updateInstance"
  | "deleteInstance"
  | "moveInstance"
  | "splitInstance"
  | "mergeInstances"
  | "useInstance"
  | "unuseInstance"
  | "writeNotes";
