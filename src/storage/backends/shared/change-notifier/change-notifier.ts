import { StorageChange } from "../../../interface";

type ChangeListener = (change: StorageChange) => void;

/**
 * Listener handling for `InventoryStorage.subscribe`. A failing listener is
 * logged and doesn't stop the others. After `dispose()` nothing is delivered
 * and new subscriptions are ignored.
 */
export class ChangeNotifier {
  // #region Fields
  readonly #listeners = new Set<ChangeListener>();
  #disposed = false;
  // #endregion

  // #region Listeners
  /** Registers a listener; returns the unsubscribe. */
  subscribe(listener: ChangeListener): () => void {
    if (this.#disposed) return () => {};
    // Wrap so the same function can be subscribed twice and removed separately.
    const entry: ChangeListener = (change) => listener(change);
    this.#listeners.add(entry);
    return () => {
      this.#listeners.delete(entry);
    };
  }

  /** Delivers a change to every current listener. */
  emit(change: StorageChange): void {
    for (const listener of [...this.#listeners]) {
      try {
        listener(change);
      } catch (error) {
        console.error("[party-inventory] storage listener failed", error);
      }
    }
  }

  /** Removes all listeners; later `subscribe` and `emit` calls do nothing. */
  dispose(): void {
    this.#disposed = true;
    this.#listeners.clear();
  }
  // #endregion
}
