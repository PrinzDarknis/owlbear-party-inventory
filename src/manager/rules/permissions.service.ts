import { StorageRole } from "../../storage";

import { ManagerAction } from "./permissions.types";

// Player rights v1 (roadmap): rearrange and use what the party carries, write
// player notes. Nothing a player does creates or destroys pieces.
const PLAYER_ACTIONS: ReadonlySet<ManagerAction> = new Set<ManagerAction>([
  "moveInstance",
  "splitInstance",
  "mergeInstances",
  "useInstance",
  "writeNotes",
]);

/**
 * Checks whether a role may perform an action. This is UX, not security: any
 * client can write the storage directly (`harness/core/05-security.md`).
 * @param role Effective role of the current user (see `effectiveRole`).
 * @param action Action to check.
 * @returns `true` if the action is allowed; the GM may do everything.
 */
export function can(role: StorageRole, action: ManagerAction): boolean {
  return role === "GM" || PLAYER_ACTIONS.has(action);
}

/**
 * Derives the role all rights checks use, so a GM can test player rights.
 * @param role Role reported by the storage.
 * @param viewAsPlayer Whether "view as player" is switched on; a no-op for players.
 * @returns `"PLAYER"` if the switch is on, else `role`.
 */
export function effectiveRole(
  role: StorageRole,
  viewAsPlayer: boolean,
): StorageRole {
  return viewAsPlayer ? "PLAYER" : role;
}
