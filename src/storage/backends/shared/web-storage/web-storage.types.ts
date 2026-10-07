/** The part of the Web Storage API the controllers use; injectable for tests. */
export type WebStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Why a read failed: storage access threw, or the stored text is not JSON. */
export type WebStorageReadError = "unavailable" | "invalid-json";

/** Result of `readJson`. A missing key is `ok` with `value: undefined`. */
export type WebStorageReadResult =
  { ok: true; value: unknown } | { ok: false; error: WebStorageReadError };
