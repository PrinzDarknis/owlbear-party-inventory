// Public API of the manager layer. Hooks import only from here; state,
// queries, rules and operation builders are internal.
export * from "./inventory-manager";
export * from "./inventory-manager.types";
export * from "./errors";
export type { ManagerAction } from "./rules";
export type { TextEntry } from "./texts";
