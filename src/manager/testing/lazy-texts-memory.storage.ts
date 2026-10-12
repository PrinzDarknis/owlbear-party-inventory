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
} from "../../storage";
import {
  applyOperations,
  ChangeNotifier,
  createEmptyRecordSet,
  RecordSet,
  textsOf,
  toSnapshot,
} from "../../storage/backends/shared";

/**
 * Test stand-in for the Owlbear controller (phase 5): keeps records in memory
 * but behaves like a lazy, multi-user storage. `load()` omits long texts,
 * `loadTexts` is recorded and can be held or failed, and tests can simulate
 * changes of other users (texts, role).
 */
export class LazyTextsMemoryStorage implements InventoryStorage {
  // #region Fields
  #records: RecordSet = createEmptyRecordSet();
  #role: StorageRole = "GM";
  #textsHold: Promise<void> | undefined;
  #textsFailure: StorageError | undefined;
  readonly #textRequests: TextRef[] = [];
  readonly #notifier = new ChangeNotifier();
  readonly id = "lazy-memory";
  readonly capabilities: StorageCapabilities = {
    persistent: false,
    lazyTexts: true,
    multiUser: true,
  };
  // #endregion

  // #region Records
  /**
   * Returns all records without their long texts.
   * @returns Fresh clones of all records.
   */
  async load(): Promise<InventorySnapshot> {
    const snapshot = toSnapshot(this.#records);
    for (const item of snapshot.items) {
      item.description = undefined;
      item.dmNotes = undefined;
    }
    for (const instance of snapshot.instances) instance.notes = undefined;
    return snapshot;
  }

  /**
   * Applies the operations and emits one `records` change.
   * @param operations Operations in order.
   */
  async apply(operations: readonly StorageOperation[]): Promise<void> {
    if (operations.length === 0) return;
    this.#records = applyOperations(this.#records, operations);
    this.#notifier.emit({ type: "records" });
  }

  /**
   * Returns the stored texts of a record, after `holdTexts` is released.
   * @param ref Record whose texts are requested; recorded in `textRequests`.
   * @returns The stored texts; empty if the record is unknown.
   * @throws {StorageError} The error set with `failTexts` (rejects).
   */
  async loadTexts<Ref extends TextRef>(ref: Ref): Promise<TextsFor<Ref>> {
    this.#textRequests.push(ref);
    await this.#textsHold;
    if (this.#textsFailure) throw this.#textsFailure;
    return textsOf(this.#records, ref);
  }
  // #endregion

  // #region Session
  /**
   * Returns the role set with `setRole`.
   * @returns `"GM"` unless changed.
   */
  async getRole(): Promise<StorageRole> {
    return this.#role;
  }

  /**
   * Registers a change listener.
   * @param listener Receives every change.
   * @returns The unsubscribe.
   */
  subscribe(listener: (change: StorageChange) => void): () => void {
    return this.#notifier.subscribe(listener);
  }

  /** Stops all notifications. */
  dispose(): void {
    this.#notifier.dispose();
  }
  // #endregion

  // #region Test controls
  /** Every ref passed to `loadTexts`, in call order. */
  get textRequests(): readonly TextRef[] {
    return [...this.#textRequests];
  }

  /**
   * Makes `loadTexts` wait until the returned function is called.
   * @returns Releases all waiting and later `loadTexts` calls.
   */
  holdTexts(): () => void {
    let release = () => {};
    this.#textsHold = new Promise<void>((resolve) => {
      release = () => {
        this.#textsHold = undefined;
        resolve();
      };
    });
    return release;
  }

  /**
   * Makes `loadTexts` reject.
   * @param error Error to reject with; `undefined` restores normal loading.
   */
  failTexts(error: StorageError | undefined): void {
    this.#textsFailure = error;
  }

  /**
   * Simulates another user changing a role: emits a `role` change.
   * @param role The new role.
   */
  setRole(role: StorageRole): void {
    this.#role = role;
    this.#notifier.emit({ type: "role" });
  }

  /**
   * Simulates another user editing the texts of an item: stores them and
   * emits only a `texts` change, like the Owlbear text server.
   * @param id Id of the item definition.
   * @param description New description.
   */
  changeItemDescription(id: string, description: string): void {
    const item = this.#records.items.get(id)?.clone();
    if (!item) return;
    item.description = description;
    this.#records = applyOperations(this.#records, [
      { op: "save", kind: "item", record: item },
    ]);
    this.#notifier.emit({ type: "texts", refs: [{ kind: "item", id }] });
  }
  // #endregion
}
