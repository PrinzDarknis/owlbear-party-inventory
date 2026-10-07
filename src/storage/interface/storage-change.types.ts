import { TextRef } from "./texts.types";

/**
 * What changed, delivered to `subscribe` listeners. Controllers are stateless,
 * so they don't report ids of changed records: on `records` the manager
 * reloads and compares with the state it holds.
 */
export type StorageChange =
  /** Any record may have changed (own `apply`, another tab or user). */
  | { type: "records" }
  /** Long texts changed without a record change (lazy texts, Owlbear). */
  | { type: "texts"; refs: TextRef[] }
  /** The role of the current user changed; call `getRole()` again. */
  | { type: "role" };
