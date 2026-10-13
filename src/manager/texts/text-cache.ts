import { TextRef, TextsFor } from "../../storage";

import { TextEntry, TextLoader } from "./text-entry.types";

/** Cache slot of one record. `generation` identifies the latest load or write. */
interface Slot {
  readonly ref: TextRef;
  readonly view: TextEntry<TextRef>;
  readonly generation: number;
  readonly pending?: Promise<unknown>;
}

/**
 * Long texts of records for storages with `lazyTexts`, loaded on demand and
 * kept per record. Every change replaces the entry object and calls
 * `onChange`, so the manager can bump its version for `useSyncExternalStore`.
 * A load result that was overtaken by a newer load or write is ignored.
 */
export class TextCache {
  // #region Fields
  readonly #slots = new Map<string, Slot>();
  readonly #loader: TextLoader;
  readonly #onChange: () => void;
  #generation = 0;
  #disposed = false;
  // #endregion

  // #region Construction
  /**
   * Creates an empty cache.
   * @param loader Loads the stored texts of one record.
   * @param onChange Called after every change of an entry.
   */
  constructor(loader: TextLoader, onChange: () => void) {
    this.#loader = loader;
    this.#onChange = onChange;
  }
  // #endregion

  // #region Reading
  /**
   * Returns the cached state of a record's texts without loading them.
   * @param ref Record whose texts are requested.
   * @returns The entry (a stable object until it changes), or `undefined` if
   *   the texts were never requested.
   */
  get<Ref extends TextRef>(ref: Ref): TextEntry<Ref> | undefined {
    // The key contains the kind, so the stored texts match `Ref`.
    return this.#slots.get(keyOf(ref))?.view as TextEntry<Ref> | undefined;
  }

  /**
   * Returns the texts of a record, loading them if they aren't loaded yet.
   * Concurrent calls share one load; a failed load is retried on the next call.
   * @param ref Record whose texts are needed.
   * @returns The current texts once loaded.
   * @throws {StorageError} If the storage can't load them (rejects).
   * @throws {Error} If the cache is disposed while waiting (rejects).
   */
  async ensure<Ref extends TextRef>(ref: Ref): Promise<TextsFor<Ref>> {
    const key = keyOf(ref);
    for (;;) {
      if (this.#disposed) throw new Error("Text cache disposed");
      const slot = this.#slots.get(key);
      if (slot?.view.status === "loaded") return this.loadedTexts(ref);
      const pending =
        slot?.view.status === "loading" && slot.pending
          ? slot.pending
          : this.#load(ref);
      const generation = this.#slots.get(key)?.generation;
      try {
        await pending;
      } catch (error) {
        if (this.#slots.get(key)?.generation === generation) throw error;
      }
      // Overtaken by a newer load or write: check again.
    }
  }

  /**
   * Returns texts that are known to be loaded, e.g. right after `ensure`.
   * @param ref Record whose texts are needed.
   * @returns The loaded texts.
   * @throws {Error} If the texts are not loaded (a programming error).
   */
  loadedTexts<Ref extends TextRef>(ref: Ref): TextsFor<Ref> {
    const entry = this.get(ref);
    if (entry?.status !== "loaded" || !entry.texts) {
      throw new Error(`Texts of ${ref.kind} not loaded`);
    }
    return entry.texts;
  }
  // #endregion

  // #region Updates
  /**
   * Stores texts this client just wrote, so they don't have to be reloaded.
   * Overtakes a running load of the same record.
   * @param ref Record that was written.
   * @param texts The texts that were written with it.
   */
  remember<Ref extends TextRef>(ref: Ref, texts: TextsFor<Ref>): void {
    if (this.#disposed) return;
    this.#slots.set(keyOf(ref), {
      ref,
      view: { status: "loaded", texts },
      generation: ++this.#generation,
    });
    this.#onChange();
  }

  /**
   * Reloads the texts of records that are in the cache (a `texts` change of
   * the storage). Refs that were never requested are ignored.
   * @param refs Records whose texts changed.
   */
  refresh(refs: readonly TextRef[]): void {
    for (const ref of refs) {
      if (this.#slots.has(keyOf(ref))) {
        // Failures end up in the entry; nobody awaits this load.
        this.#load(ref).catch(() => undefined);
      }
    }
  }

  /**
   * Drops the entries of records that no longer exist (after a reload).
   * @param exists Whether the record of a ref still exists.
   */
  retain(exists: (ref: TextRef) => boolean): void {
    let changed = false;
    for (const [key, slot] of this.#slots) {
      if (!exists(slot.ref)) {
        this.#slots.delete(key);
        changed = true;
      }
    }
    if (changed) this.#onChange();
  }

  /** Drops all entries and ignores running loads, e.g. after local data was cleared. */
  clear(): void {
    if (this.#slots.size === 0) return;
    // Running loads find no slot with their generation and are ignored.
    this.#slots.clear();
    this.#onChange();
  }

  /** Drops all entries and ignores running loads. Later calls do nothing. */
  dispose(): void {
    this.#disposed = true;
    this.#slots.clear();
  }
  // #endregion

  // #region Helpers
  /**
   * Starts a load and marks the entry as loading, keeping the previous texts.
   * @param ref Record to load.
   * @returns The load; resolves or rejects after the entry was updated.
   */
  #load(ref: TextRef): Promise<unknown> {
    const key = keyOf(ref);
    const generation = ++this.#generation;
    const isCurrent = () =>
      !this.#disposed && this.#slots.get(key)?.generation === generation;
    const previous = this.#slots.get(key)?.view.texts;

    const pending = this.#loader(ref).then(
      (texts) => {
        if (isCurrent()) {
          this.#slots.set(key, {
            ref,
            view: { status: "loaded", texts },
            generation,
          });
          this.#onChange();
        }
      },
      (error: unknown) => {
        if (isCurrent()) {
          this.#slots.set(key, {
            ref,
            view: { status: "error", texts: previous, error },
            generation,
          });
          this.#onChange();
        }
        throw error;
      },
    );
    this.#slots.set(key, {
      ref,
      view: { status: "loading", texts: previous },
      generation,
      pending,
    });
    this.#onChange();
    return pending;
  }
  // #endregion
}

/**
 * Builds the map key of a ref.
 * @param ref Record reference.
 * @returns `<kind>:<id>`.
 */
function keyOf(ref: TextRef): string {
  return `${ref.kind}:${ref.id}`;
}
