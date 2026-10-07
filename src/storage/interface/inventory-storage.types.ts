import { ChangeSet, StorageChange } from "./change-set.types";
import { InventorySnapshot } from "./snapshot.types";
import { TextRef, TextsFor } from "./texts.types";

/** Role reported by a backend. Own type so `src/storage` doesn't depend on `src/obr`. */
export type StorageRole = "GM" | "PLAYER";

/** What a backend can do; the UI and manager adapt to it. */
export interface StorageCapabilities {
  /** Data survives a reload. `false` for memory and for local without localStorage. */
  readonly persistent: boolean;
  /** `load()` omits long texts; fetch them with `loadTexts`. */
  readonly lazyTexts: boolean;
  /** Other users can change the data (Owlbear). */
  readonly multiUser: boolean;
}

/**
 * Backend-independent access to the inventory: the contract between the
 * manager and the storage backends. The manager only knows this interface.
 * Implementations hand out fresh instances, so callers may mutate returned
 * objects without affecting stored state. Integrity (dangling references,
 * cycles) and rights are checked by the manager, not here.
 */
export interface InventoryStorage {
  /** Stable backend id, matching its registry entry. */
  readonly id: string;
  readonly capabilities: StorageCapabilities;

  /** All records. Long texts may be omitted if `capabilities.lazyTexts`. */
  load(): Promise<InventorySnapshot>;

  /**
   * Stores a changeset atomically. Records are written with their long texts;
   * the backend decides where they end up. Rejects without changing anything
   * if the write fails (e.g. quota or size limit).
   */
  apply(changes: ChangeSet): Promise<void>;

  /** Long texts of one record; empty object if unknown. */
  loadTexts<Ref extends TextRef>(ref: Ref): Promise<TextsFor<Ref>>;

  /** Role of the current user. Local backends always return `"GM"`. */
  getRole(): Promise<StorageRole>;

  /**
   * Notifies after every successful change, including this client's own
   * `apply` and changes from other tabs or users. Returns the unsubscribe.
   */
  subscribe(listener: (change: StorageChange) => void): () => void;

  /** Releases listeners and resources. The instance must not be used afterwards. */
  dispose(): void;
}
