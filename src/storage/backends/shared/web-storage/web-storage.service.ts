// Every access is wrapped in try/catch: storage can be missing or throw in
// private windows, with cookies disabled or in sandboxed iframes
// (harness/core/05-security.md §Privacy).
import { WebStorage, WebStorageReadResult } from "./web-storage.types";

/** The browser's localStorage, or `undefined` if it can't be accessed. */
export function getBrowserStorage(): WebStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** Whether the storage can be written and read back, probed with `probeKey`. */
export function isWebStorageAvailable(
  storage: WebStorage | undefined,
  probeKey: string,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(probeKey, "1");
    const readable = storage.getItem(probeKey) === "1";
    storage.removeItem(probeKey);
    return readable;
  } catch {
    return false;
  }
}

/** Reads and parses a JSON value. The result is untrusted and must be validated. */
export function readJson(
  storage: WebStorage,
  key: string,
): WebStorageReadResult {
  let text: string | null;
  try {
    text = storage.getItem(key);
  } catch {
    return { ok: false, error: "unavailable" };
  }
  if (text === null) return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "invalid-json" };
  }
}

/** Writes a value as JSON. Returns `false` if the write failed (e.g. quota). */
export function writeJson(
  storage: WebStorage,
  key: string,
  value: unknown,
): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Deletes a key. Returns `false` if storage access failed. */
export function removeKey(storage: WebStorage, key: string): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
