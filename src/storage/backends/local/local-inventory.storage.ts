import {
  InventorySnapshot,
  InventoryStorage,
  StorageCapabilities,
  StorageChange,
  StorageError,
  StorageOperation,
  StorageRole,
  TextRef,
  TextsFor,
} from "../../interface";
import {
  applyOperations,
  ChangeNotifier,
  createEmptyRecordSet,
  getBrowserStorage,
  readJson,
  RecordSet,
  removeKey,
  textsOf,
  toSnapshot,
  WebStorage,
  WebStorageEvent,
  WebStorageEvents,
  writeJson,
} from "../shared";

import { fromDto, toDto } from "./dto";
import {
  LOCAL_INVENTORY_KEY,
  LOCAL_STORAGE_ID,
} from "./local-storage.constant";

/**
 * Keeps the inventory in this browser's localStorage, as one versioned DTO
 * under `LOCAL_INVENTORY_KEY`. Stateless: every call reads the key again, so
 * changes from other tabs are never missed. Data that can't be read is never
 * overwritten; `load` and `apply` reject until `clear()` removes it.
 */
export class LocalInventoryStorage implements InventoryStorage {
  // #region Fields
  readonly #storage: WebStorage;
  readonly #events: WebStorageEvents | undefined;
  readonly #notifier = new ChangeNotifier();
  readonly #onStorageEvent = (event: WebStorageEvent): void => {
    // `null` = another tab cleared the whole storage.
    if (event.key === null || event.key === LOCAL_INVENTORY_KEY) {
      this.#notifier.emit({ type: "records" });
    }
  };
  readonly id = LOCAL_STORAGE_ID;
  readonly capabilities: StorageCapabilities = {
    persistent: true,
    lazyTexts: false,
    multiUser: false,
  };
  // #endregion

  // #region Construction
  /** `events` delivers changes from other tabs; omit it to ignore them. */
  constructor(storage: WebStorage, events?: WebStorageEvents) {
    this.#storage = storage;
    this.#events = events;
    events?.addEventListener("storage", this.#onStorageEvent);
  }

  /** Controller on the browser's localStorage, or `undefined` if it can't be accessed. */
  static fromBrowser(): LocalInventoryStorage | undefined {
    const storage = getBrowserStorage();
    return storage ? new LocalInventoryStorage(storage, window) : undefined;
  }
  // #endregion

  // #region Records
  async load(): Promise<InventorySnapshot> {
    return toSnapshot(this.#read());
  }

  async apply(operations: readonly StorageOperation[]): Promise<void> {
    if (operations.length === 0) return;
    // Reading first also refuses to overwrite data that can't be read.
    const records = applyOperations(this.#read(), operations);
    if (!writeJson(this.#storage, LOCAL_INVENTORY_KEY, toDto(records))) {
      throw new StorageError("write-failed", "Local storage write failed");
    }
    this.#notifier.emit({ type: "records" });
  }

  async loadTexts<Ref extends TextRef>(ref: Ref): Promise<TextsFor<Ref>> {
    return textsOf(this.#read(), ref);
  }

  /** Deletes the stored inventory, including data that can't be read ("clear local data"). */
  async clear(): Promise<void> {
    if (!removeKey(this.#storage, LOCAL_INVENTORY_KEY)) {
      throw new StorageError("write-failed", "Local storage delete failed");
    }
    this.#notifier.emit({ type: "records" });
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
    this.#events?.removeEventListener("storage", this.#onStorageEvent);
    this.#notifier.dispose();
  }
  // #endregion

  // #region Helpers
  /** Current records from storage; throws a `StorageError` if they can't be read. */
  #read(): RecordSet {
    const stored = readJson(this.#storage, LOCAL_INVENTORY_KEY);
    if (!stored.ok) {
      throw new StorageError("unreadable", `Local storage ${stored.error}`);
    }
    if (stored.value === undefined) return createEmptyRecordSet();

    const result = fromDto(stored.value);
    if (!result.ok) {
      const code =
        result.error === "unsupported-version"
          ? "unsupported-version"
          : "unreadable";
      throw new StorageError(code, `Local inventory ${result.error}`);
    }
    if (result.dropped > 0) {
      // Count only: entries may contain user-entered text.
      console.warn(
        `[party-inventory] dropped ${result.dropped} invalid local entries`,
      );
    }
    return result.records;
  }
  // #endregion
}
