/** The part of the Web Storage API the controllers use; injectable for tests. */
export type WebStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The part of a `storage` event the controllers read. `key` is `null` when another tab cleared the whole storage. */
export interface WebStorageEvent {
  readonly key: string | null;
}

/**
 * Source of `storage` events (fired when another tab of the same origin
 * changes localStorage); `window` in the browser, a fake in tests.
 */
export interface WebStorageEvents {
  addEventListener(
    type: "storage",
    listener: (event: WebStorageEvent) => void,
  ): void;
  removeEventListener(
    type: "storage",
    listener: (event: WebStorageEvent) => void,
  ): void;
}

/** Why a read failed: storage access threw, or the stored text is not JSON. */
export type WebStorageReadError = "unavailable" | "invalid-json";

/** Result of `readJson`. A missing key is `ok` with `value: undefined`. */
export type WebStorageReadResult =
  { ok: true; value: unknown } | { ok: false; error: WebStorageReadError };
