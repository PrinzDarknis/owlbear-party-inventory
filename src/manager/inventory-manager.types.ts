/**
 * Whether the manager's data can be used:
 * - `loading`: the first load hasn't finished.
 * - `ready`: the state reflects the last successful load.
 * - `error`: the last load failed; `error` is usually a `StorageError`
 *   (e.g. `unreadable`). Commands reject with it until a reload succeeds.
 */
export type ManagerStatus =
  | { readonly type: "loading" }
  | { readonly type: "ready" }
  | { readonly type: "error"; readonly error: unknown };
