import { WebStorage } from "../backends/shared";

/**
 * In-memory `WebStorage` for tests. `failReads` / `failWrites` make the
 * respective calls throw like a blocked storage or a full quota.
 */
export class FakeWebStorage implements WebStorage {
  // #region Fields
  readonly #entries = new Map<string, string>();
  #failReads = false;
  #failWrites = false;
  // #endregion

  // #region Accessors
  /** Makes `getItem` throw. */
  get failReads(): boolean {
    return this.#failReads;
  }
  set failReads(value: boolean) {
    this.#failReads = value;
  }

  /** Makes `setItem` and `removeItem` throw. */
  get failWrites(): boolean {
    return this.#failWrites;
  }
  set failWrites(value: boolean) {
    this.#failWrites = value;
  }
  // #endregion

  // #region Storage API
  getItem(key: string): string | null {
    if (this.#failReads) throw new Error("storage blocked");
    return this.#entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.#failWrites) throw new Error("quota exceeded");
    this.#entries.set(key, value);
  }

  removeItem(key: string): void {
    if (this.#failWrites) throw new Error("storage blocked");
    this.#entries.delete(key);
  }
  // #endregion

  // #region Test helpers
  /** Raw stored text, bypassing the failure switches. */
  peek(key: string): string | undefined {
    return this.#entries.get(key);
  }

  /** Stores raw text, bypassing the failure switches (e.g. corrupt JSON). */
  poke(key: string, value: string): void {
    this.#entries.set(key, value);
  }

  /** Stored keys, bypassing the failure switches. */
  keys(): string[] {
    return [...this.#entries.keys()];
  }
  // #endregion
}
