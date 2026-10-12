/**
 * Why the manager refused a command:
 * - `not-found`: a referenced record doesn't exist (any more).
 * - `forbidden`: the effective role may not run the command (UX, not security).
 * - `invalid-move`: the target location doesn't exist, can't hold items or would create a cycle.
 * - `invalid-quantity`: the quantity is out of range for the command.
 */
export type ManagerErrorCode =
  "not-found" | "forbidden" | "invalid-move" | "invalid-quantity";

/** Rule violation of a manager command. Messages never contain user-entered text. */
export class ManagerError extends Error {
  // #region Fields
  readonly #code: ManagerErrorCode;
  // #endregion

  // #region Construction
  /**
   * Creates a rule violation error.
   * @param code Why the command was refused; the UI reacts to it.
   * @param message Developer-facing description; must not contain user-entered text.
   */
  constructor(code: ManagerErrorCode, message: string) {
    super(message);
    this.name = "ManagerError";
    this.#code = code;
  }
  // #endregion

  // #region Accessors
  get code(): ManagerErrorCode {
    return this.#code;
  }
  // #endregion
}
