import { WebStorageEvent, WebStorageEvents } from "../backends/shared";

type StorageListener = (event: WebStorageEvent) => void;

/** `storage` event source for tests; `fire` simulates a change in another tab. */
export class FakeStorageEvents implements WebStorageEvents {
  // #region Fields
  readonly #listeners = new Set<StorageListener>();
  // #endregion

  // #region Accessors
  /** Number of registered listeners, to check that `dispose` removed them. */
  get listenerCount(): number {
    return this.#listeners.size;
  }
  // #endregion

  // #region Event target API
  addEventListener(_type: "storage", listener: StorageListener): void {
    this.#listeners.add(listener);
  }

  removeEventListener(_type: "storage", listener: StorageListener): void {
    this.#listeners.delete(listener);
  }
  // #endregion

  // #region Test helpers
  /** Delivers a `storage` event for `key` (`null` = whole storage cleared). */
  fire(key: string | null): void {
    for (const listener of [...this.#listeners]) listener({ key });
  }
  // #endregion
}
