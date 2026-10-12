import { StorageOperation, TextRef } from "../../storage";

/**
 * Result of an operation builder: what to hand to one `apply` call, plus what
 * the manager has to do before.
 */
export interface OperationPlan<Result> {
  /** Operations for one atomic `apply`; empty if nothing changes. */
  readonly operations: readonly StorageOperation[];
  /**
   * Saved records whose long texts were copied from the state. With
   * `lazyTexts` the state has no texts, so the manager loads them and calls
   * `fillTexts` before `apply`; otherwise saving would erase them.
   */
  readonly textsFromState: readonly TextRef[];
  /** What the command returns to its caller (e.g. the new record). */
  readonly result: Result;
}
