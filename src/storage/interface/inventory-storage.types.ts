import { InventorySnapshot } from "./snapshot.types";
import { StorageChange } from "./storage-change.types";
import { StorageOperation } from "./storage-operation.types";
import { TextRef, TextsFor } from "./texts.types";

/** Role reported by a controller. Own type so `src/storage` doesn't depend on `src/obr`. */
export type StorageRole = "GM" | "PLAYER";

/** What a controller can do; the UI and manager adapt to it. */
export interface StorageCapabilities {
  /** Data survives a reload. `false` for memory. */
  readonly persistent: boolean;
  /** `load()` omits long texts; fetch them with `loadTexts`. */
  readonly lazyTexts: boolean;
  /** Other users can change the data (Owlbear). */
  readonly multiUser: boolean;
}

/**
 * Backend-independent access to the inventory: the contract between the
 * manager and the storage controllers. The manager only knows this interface
 * and holds the only in-memory state; controllers read from and write to
 * their source on every call. Implementations hand out fresh instances, so
 * callers may mutate returned objects without affecting stored data.
 * Integrity (dangling references, cycles) and rights are checked by the
 * manager, not here.
 */
export interface InventoryStorage {
  /** Stable controller id, matching its registry entry. */
  readonly id: string;
  readonly capabilities: StorageCapabilities;

  /**
   * All records. Long texts may be omitted if `capabilities.lazyTexts`.
   * Rejects with a `StorageError` if the stored data can't be read.
   */
  load(): Promise<InventorySnapshot>;

  /**
   * Applies the operations in order and stores the result atomically: either
   * all of them or none. Records are written with their long texts; the
   * controller decides where they end up. Rejects with a `StorageError`
   * without changing anything if the write fails. One successful call emits
   * one change, however many operations it holds.
   */
  apply(operations: readonly StorageOperation[]): Promise<void>;

  /** Long texts of one record; empty object if unknown. */
  loadTexts<Ref extends TextRef>(ref: Ref): Promise<TextsFor<Ref>>;

  /** Role of the current user. Local backends always return `"GM"`. */
  getRole(): Promise<StorageRole>;

  /**
   * Notifies after every successful change, including this client's own
   * `apply` and changes from other tabs or users, and after role changes.
   * Returns the unsubscribe.
   */
  subscribe(listener: (change: StorageChange) => void): () => void;

  /** Releases listeners and resources. The instance must not be used afterwards. */
  dispose(): void;
}
