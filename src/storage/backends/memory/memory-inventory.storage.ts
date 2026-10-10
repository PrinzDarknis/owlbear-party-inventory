import {
  InventorySnapshot,
  InventoryStorage,
  StorageCapabilities,
  StorageChange,
  StorageOperation,
  StorageRole,
  TextRef,
  TextsFor,
} from "../../interface";
import {
  applyOperations,
  ChangeNotifier,
  createEmptyRecordSet,
  RecordSet,
  textsOf,
  toSnapshot,
} from "../shared";

import { MEMORY_STORAGE_ID } from "./memory-storage.constant";

/**
 * Keeps the inventory in memory only; nothing survives a reload. Used by
 * tests and as the choice when localStorage is unavailable. Memory is its
 * source, so this is the only controller that holds records itself.
 */
export class MemoryInventoryStorage implements InventoryStorage {
  // #region Fields
  #records: RecordSet = createEmptyRecordSet();
  readonly #notifier = new ChangeNotifier();
  readonly id = MEMORY_STORAGE_ID;
  readonly capabilities: StorageCapabilities = {
    persistent: false,
    lazyTexts: false,
    multiUser: false,
  };
  // #endregion

  // #region Records
  async load(): Promise<InventorySnapshot> {
    return toSnapshot(this.#records);
  }

  async apply(operations: readonly StorageOperation[]): Promise<void> {
    if (operations.length === 0) return;
    this.#records = applyOperations(this.#records, operations);
    this.#notifier.emit({ type: "records" });
  }

  async loadTexts<Ref extends TextRef>(ref: Ref): Promise<TextsFor<Ref>> {
    return textsOf(this.#records, ref);
  }
  // #endregion

  // #region Session
  async getRole(): Promise<StorageRole> {
    return "GM";
  }

  subscribe(listener: (change: StorageChange) => void): () => void {
    return this.#notifier.subscribe(listener);
  }

  dispose(): void {
    this.#notifier.dispose();
  }
  // #endregion
}
