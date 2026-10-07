/**
 * Why a storage operation failed:
 * - `unreadable`: stored data can't be parsed; it is never overwritten.
 * - `unsupported-version`: stored data has a format version this build can't read.
 * - `write-failed`: the underlying write failed (e.g. browser quota).
 * - `too-large`: the write would exceed a size budget (e.g. room metadata).
 */
export type StorageErrorCode =
  "unreadable" | "unsupported-version" | "write-failed" | "too-large";

/** Error with a code the manager and UI can react to. Messages never contain stored content. */
export class StorageError extends Error {
  // #region Fields
  readonly #code: StorageErrorCode;
  // #endregion

  // #region Construction
  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = "StorageError";
    this.#code = code;
  }
  // #endregion

  // #region Accessors
  get code(): StorageErrorCode {
    return this.#code;
  }
  // #endregion
}
