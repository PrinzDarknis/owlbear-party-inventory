import { Character, Item, ItemInstance, ItemLocation } from "../model";
import {
  InventoryStorage,
  StorageBackend,
  StorageCapabilities,
  StorageChange,
  StorageError,
  StorageRole,
  TextRef,
  TextsFor,
} from "../storage";

import { ManagerError } from "./errors";
import { ManagerStatus } from "./inventory-manager.types";
import {
  fillTexts,
  OperationPlan,
  planAssignItem,
  planCreateCharacter,
  planCreateItem,
  planDeleteCharacter,
  planDeleteInstance,
  planDeleteItem,
  planMergeInstances,
  planMoveInstance,
  planSplitInstance,
  planUnuseInstance,
  planUpdateCharacter,
  planUpdateInstance,
  planUpdateItem,
  planUseInstance,
  planWriteNotes,
} from "./operations";
import {
  contentsOf,
  instanceCount,
  instanceWeight,
  ownerOf,
  pathOf,
  totalWeight,
} from "./queries";
import { can, checkMove, effectiveRole, ManagerAction } from "./rules";
import {
  buildState,
  createEmptyState,
  InventoryState,
  locationKey,
} from "./state";
import {
  instanceTexts,
  itemTexts,
  TextCache,
  TextEntry,
  textsInState,
} from "./texts";

/**
 * The only owner of the in-memory inventory and the single entry point for
 * the UI hooks. Loads from an `InventoryStorage`, reloads on every storage
 * change, checks rights and rules, and turns each command into one atomic
 * `apply`. Commands run one at a time; there is no optimistic state, so a
 * command resolves after the state shows its result.
 *
 * Read access is synchronous and versioned for `useSyncExternalStore`: every
 * change bumps `getVersion()` and notifies `subscribe` listeners, and query
 * results are cached per version, so they keep their identity until the next
 * change. Returned records are read-only views; change them only through
 * commands.
 */
export class InventoryManager {
  // #region Fields
  readonly #storage: InventoryStorage;
  readonly #backend: StorageBackend | undefined;
  readonly #texts: TextCache;
  readonly #listeners = new Set<() => void>();
  readonly #memo = new Map<string, unknown>();
  readonly #unsubscribe: () => void;
  #state: InventoryState = createEmptyState();
  #status: ManagerStatus = { type: "loading" };
  #role: StorageRole = "PLAYER";
  #viewAsPlayer = false;
  #version = 0;
  #loadSequence = 0;
  #latestLoad: Promise<void> = Promise.resolve();
  #commandTail: Promise<unknown> = Promise.resolve();
  #disposed = false;
  // #endregion

  // #region Construction
  /**
   * Wraps a storage controller and subscribes to its changes. Call `start()`
   * (or use `open`) before using the manager.
   * @param storage Controller to read from and write to; the manager disposes it.
   * @param backend Registry entry `storage` was created from; enables
   *   `clearData` if the entry offers it.
   */
  constructor(storage: InventoryStorage, backend?: StorageBackend) {
    this.#storage = storage;
    this.#backend = backend;
    this.#texts = new TextCache(
      (ref) => this.#storage.loadTexts(ref),
      () => this.#bump(),
    );
    this.#unsubscribe = storage.subscribe((change) => this.#onChange(change));
  }

  /**
   * Creates the controller of a registry entry and loads it.
   * @param backend Registry entry of the chosen storage.
   * @returns A started manager; its status is `error` if the first load failed.
   * @throws {StorageError} `unavailable` if the controller can't run here (rejects).
   */
  static async open(backend: StorageBackend): Promise<InventoryManager> {
    const manager = new InventoryManager(await backend.create(), backend);
    await manager.start();
    return manager;
  }
  // #endregion

  // #region Accessors
  /** Whether the data can be used; see `ManagerStatus`. */
  get status(): ManagerStatus {
    return this.#status;
  }

  /** Id of the storage controller (registry id). */
  get storageId(): string {
    return this.#storage.id;
  }

  /** What the storage can do (persistent, lazy texts, multi-user). */
  get capabilities(): StorageCapabilities {
    return this.#storage.capabilities;
  }

  /** Whether `clearData` can delete this storage's data in this browser. */
  get canClearData(): boolean {
    return this.#backend?.clearData !== undefined;
  }

  /** Role reported by the storage. */
  get role(): StorageRole {
    return this.#role;
  }

  /** Role all rights checks use: `PLAYER` while "view as player" is on. */
  get effectiveRole(): StorageRole {
    return effectiveRole(this.#role, this.#viewAsPlayer);
  }

  /** Whether the GM looks at the inventory with player rights. */
  get viewAsPlayer(): boolean {
    return this.#viewAsPlayer;
  }
  // #endregion

  // #region Store
  /**
   * Version of everything the manager exposes; increases with every change.
   * @returns The current version (snapshot value for `useSyncExternalStore`).
   */
  getVersion(): number {
    return this.#version;
  }

  /**
   * Registers a listener that is called after every change.
   * @param listener Called without arguments; read the new values from the manager.
   * @returns The unsubscribe.
   */
  subscribe(listener: () => void): () => void {
    if (this.#disposed) return () => {};
    // Wrap so the same function can be subscribed twice and removed separately.
    const entry = () => listener();
    this.#listeners.add(entry);
    return () => {
      this.#listeners.delete(entry);
    };
  }
  // #endregion

  // #region Role
  /**
   * Switches "view as player" on or off. For players nothing changes.
   * @param on `true` to use player rights.
   */
  setViewAsPlayer(on: boolean): void {
    if (this.#viewAsPlayer === on) return;
    this.#viewAsPlayer = on;
    this.#bump();
  }

  /**
   * Checks whether the effective role may perform an action, to show or hide
   * controls. UX only, not security.
   * @param action Action to check.
   * @returns `true` if allowed.
   */
  can(action: ManagerAction): boolean {
    return can(this.effectiveRole, action);
  }
  // #endregion

  // #region Queries
  /**
   * Lists all characters.
   * @returns The characters in load order (stable until the next change).
   */
  characters(): readonly Readonly<Character>[] {
    return this.#memoize("characters", () => [
      ...this.#state.characters.values(),
    ]);
  }

  /**
   * Lists all item definitions (the catalog).
   * @returns The definitions in load order (stable until the next change).
   */
  items(): readonly Readonly<Item>[] {
    return this.#memoize("items", () => [...this.#state.items.values()]);
  }

  /**
   * Looks up a character.
   * @param id Id of the character.
   * @returns The character, or `undefined` if unknown.
   */
  character(id: string): Readonly<Character> | undefined {
    return this.#state.characters.get(id);
  }

  /**
   * Looks up an item definition.
   * @param id Id of the definition.
   * @returns The definition, or `undefined` if unknown.
   */
  item(id: string): Readonly<Item> | undefined {
    return this.#state.items.get(id);
  }

  /**
   * Looks up an instance.
   * @param id Id of the instance.
   * @returns The bound instance, or `undefined` if unknown.
   */
  instance(id: string): Readonly<ItemInstance> | undefined {
    return this.#state.instances.get(id);
  }

  /**
   * Lists the instances shown directly at a location.
   * @param location Character, container instance or `unassigned`.
   * @returns The instances in load order (stable until the next change).
   */
  contentsOf(location: ItemLocation): readonly Readonly<ItemInstance>[] {
    return this.#memoize(`contents:${locationKey(location)}`, () =>
      contentsOf(this.#state, location),
    );
  }

  /**
   * Lists the containers an instance is in.
   * @param id Id of the instance.
   * @returns Containers from the outermost to the direct one (stable until the next change).
   */
  pathOf(id: string): readonly Readonly<ItemInstance>[] {
    return this.#memoize(`path:${id}`, () => pathOf(this.#state, id));
  }

  /**
   * Finds the character that carries an instance at any depth.
   * @param id Id of the instance.
   * @returns The character, or `undefined` if the instance is unassigned or unknown.
   */
  ownerOf(id: string): Readonly<Character> | undefined {
    return ownerOf(this.#state, id);
  }

  /**
   * Weight of an instance including its contents (available pieces only).
   * @param id Id of the instance.
   * @returns Weight in pounds; 0 if unknown.
   */
  instanceWeight(id: string): number {
    return this.#memoize(`weight:instance:${id}`, () =>
      instanceWeight(this.#state, id),
    );
  }

  /**
   * Weight of everything at a location, including nested contents.
   * @param location Character, container instance or `unassigned`.
   * @returns Weight in pounds.
   */
  totalWeight(location: ItemLocation): number {
    return this.#memoize(`weight:${locationKey(location)}`, () =>
      totalWeight(this.#state, location),
    );
  }

  /**
   * Counts the instances of an item definition.
   * @param itemId Id of the definition.
   * @returns Number of instances, wherever they are.
   */
  instanceCount(itemId: string): number {
    return instanceCount(this.#state, itemId);
  }

  /**
   * Checks whether the stored location of an instance is invalid and it is
   * shown as unassigned instead.
   * @param id Id of the instance.
   * @returns `true` if the instance is misplaced.
   */
  isMisplaced(id: string): boolean {
    return this.#state.misplaced.has(id);
  }

  /**
   * Checks a move without performing it, e.g. to mark drop targets. Rights
   * are not part of it; use `can("moveInstance")`.
   * @param id Id of the instance.
   * @param target Destination.
   * @returns `undefined` if valid, else the `ManagerError` the move would reject with.
   */
  checkMove(id: string, target: ItemLocation): ManagerError | undefined {
    return checkMove(this.#state, id, target);
  }
  // #endregion

  // #region Texts
  /**
   * Returns the long texts of a record as far as they are known. With lazy
   * texts call `loadTexts` first; GM notes are included for every role, so
   * hide them in the UI with `can("viewDmNotes")`.
   * @param ref Record whose texts are requested.
   * @returns The entry (stable until the next change), or `undefined` if the
   *   texts were never requested (lazy) or the record doesn't exist.
   */
  texts<Ref extends TextRef>(ref: Ref): TextEntry<Ref> | undefined {
    if (this.capabilities.lazyTexts) return this.#texts.get(ref);
    return this.#memoize(`texts:${ref.kind}:${ref.id}`, () => {
      const texts = textsInState(this.#state, ref);
      return texts ? { status: "loaded" as const, texts } : undefined;
    });
  }

  /**
   * Makes sure the long texts of a record are available in `texts(ref)`.
   * @param ref Record whose texts are needed.
   * @returns The texts once loaded.
   * @throws {StorageError} If the storage can't load them (rejects); the entry
   *   then has status `error`.
   */
  async loadTexts<Ref extends TextRef>(ref: Ref): Promise<TextsFor<Ref>> {
    if (!this.capabilities.lazyTexts) {
      // An empty object is valid texts of either kind.
      return textsInState(this.#state, ref) ?? ({} as TextsFor<Ref>);
    }
    return this.#texts.ensure(ref);
  }
  // #endregion

  // #region Character commands
  /**
   * Creates a character (GM).
   * @param name Name; normalized by the model.
   * @returns The new character.
   * @throws {ManagerError} `forbidden` (rejects).
   * @throws {StorageError} If loading failed before or the write fails (rejects).
   */
  createCharacter(name: string): Promise<Character> {
    return this.#run("createCharacter", () => planCreateCharacter(name));
  }

  /**
   * Changes a character (GM).
   * @param id Id of the character.
   * @param edit Changes a clone; must not keep a reference to it.
   * @returns The changed character.
   * @throws {ManagerError} `forbidden` or `not-found` (rejects).
   * @throws {StorageError} If loading failed before or the write fails (rejects).
   */
  updateCharacter(
    id: string,
    edit: (character: Character) => void,
  ): Promise<Character> {
    return this.#run("updateCharacter", () =>
      planUpdateCharacter(this.#state, id, edit),
    );
  }

  /**
   * Deletes a character (GM); its direct instances become unassigned.
   * @param id Id of the character.
   * @returns Resolves when the state shows the deletion.
   * @throws {ManagerError} `forbidden` or `not-found` (rejects).
   * @throws {StorageError} If loading failed before or the write fails (rejects).
   */
  async deleteCharacter(id: string): Promise<void> {
    await this.#run("deleteCharacter", () =>
      planDeleteCharacter(this.#state, id),
    );
  }
  // #endregion

  // #region Item commands
  /**
   * Creates an item definition (GM).
   * @param name Name; normalized by the model.
   * @param edit Optional initial values.
   * @returns The new definition.
   * @throws {ManagerError} `forbidden` (rejects).
   * @throws {StorageError} If loading failed before or the write fails (rejects).
   */
  createItem(name: string, edit?: (item: Item) => void): Promise<Item> {
    return this.#run("createItem", () => planCreateItem(name, edit));
  }

  /**
   * Changes an item definition (GM). With lazy texts the stored texts are
   * loaded first, so `edit` sees and keeps them.
   * @param id Id of the definition.
   * @param edit Changes a clone; must not keep a reference to it.
   * @returns The changed definition.
   * @throws {ManagerError} `forbidden` or `not-found` (rejects).
   * @throws {StorageError} If loading failed before, texts can't be loaded or
   *   the write fails (rejects).
   */
  updateItem(id: string, edit: (item: Item) => void): Promise<Item> {
    return this.#run("updateItem", async () => {
      const texts = this.capabilities.lazyTexts
        ? await this.#texts.ensure({ kind: "item", id })
        : undefined;
      return planUpdateItem(this.#state, id, edit, texts);
    });
  }

  /**
   * Deletes an item definition with all its instances (GM); their contents
   * move to the nearest surviving location.
   * @param id Id of the definition.
   * @returns Resolves when the state shows the deletion.
   * @throws {ManagerError} `forbidden` or `not-found` (rejects).
   * @throws {StorageError} If loading failed before, texts can't be loaded or
   *   the write fails (rejects).
   */
  async deleteItem(id: string): Promise<void> {
    await this.#run("deleteItem", () => planDeleteItem(this.#state, id));
  }
  // #endregion

  // #region Instance commands
  /**
   * Creates an instance of a definition at a location (GM).
   * @param itemId Id of the definition.
   * @param target Where the instance goes.
   * @param quantity Pieces; defaults to 1, always 1 for non-stackable items.
   * @returns The new instance.
   * @throws {ManagerError} `forbidden`, `not-found`, `invalid-move` or `invalid-quantity` (rejects).
   * @throws {StorageError} If loading failed before or the write fails (rejects).
   */
  assignItem(
    itemId: string,
    target: ItemLocation,
    quantity?: number,
  ): Promise<ItemInstance> {
    return this.#run("assignItem", () =>
      planAssignItem(this.#state, itemId, target, quantity),
    );
  }

  /**
   * Changes an instance (GM): alias, quantity, used pieces, notes. With lazy
   * texts the stored notes are loaded first.
   * @param id Id of the instance.
   * @param edit Changes a bound clone; must not keep a reference to it.
   * @returns The changed instance.
   * @throws {ManagerError} `forbidden`, `not-found` or `invalid-move` (rejects).
   * @throws {StorageError} If loading failed before, texts can't be loaded or
   *   the write fails (rejects).
   */
  updateInstance(
    id: string,
    edit: (instance: ItemInstance) => void,
  ): Promise<ItemInstance> {
    return this.#run("updateInstance", async () => {
      const texts = this.capabilities.lazyTexts
        ? await this.#texts.ensure({ kind: "instance", id })
        : undefined;
      return planUpdateInstance(this.#state, id, edit, texts);
    });
  }

  /**
   * Replaces the player notes of an instance (GM and players).
   * @param id Id of the instance.
   * @param notes New notes; `undefined` or empty text clears them.
   * @returns The changed instance.
   * @throws {ManagerError} `forbidden` or `not-found` (rejects).
   * @throws {StorageError} If loading failed before or the write fails (rejects).
   */
  writeNotes(id: string, notes: string | undefined): Promise<ItemInstance> {
    return this.#run("writeNotes", () =>
      planWriteNotes(this.#state, id, notes),
    );
  }

  /**
   * Moves an instance, or splits fewer pieces off into the target.
   * @param id Id of the instance.
   * @param target Destination.
   * @param quantity Pieces to move; defaults to the whole instance.
   * @returns The instance at the target.
   * @throws {ManagerError} `forbidden`, `not-found`, `invalid-move` or `invalid-quantity` (rejects).
   * @throws {StorageError} If loading failed before, texts can't be loaded or
   *   the write fails (rejects).
   */
  moveInstance(
    id: string,
    target: ItemLocation,
    quantity?: number,
  ): Promise<ItemInstance> {
    return this.#run("moveInstance", () =>
      planMoveInstance(this.#state, id, target, quantity),
    );
  }

  /**
   * Splits available pieces of a stack off into a new instance.
   * @param id Id of the stack.
   * @param quantity Pieces to split off.
   * @param target Where the new instance goes; defaults to the stack's location.
   * @returns The new instance.
   * @throws {ManagerError} `forbidden`, `not-found`, `invalid-move` or `invalid-quantity` (rejects).
   * @throws {StorageError} If loading failed before, texts can't be loaded or
   *   the write fails (rejects).
   */
  splitInstance(
    id: string,
    quantity: number,
    target?: ItemLocation,
  ): Promise<ItemInstance> {
    return this.#run("splitInstance", () =>
      planSplitInstance(this.#state, id, quantity, target),
    );
  }

  /**
   * Merges a stack into another one at the same location.
   * @param targetId Id of the stack that stays.
   * @param sourceId Id of the stack that is merged and deleted (with its alias and notes).
   * @returns The merged stack.
   * @throws {ManagerError} `forbidden`, `not-found`, `invalid-merge` or `invalid-quantity` (rejects).
   * @throws {StorageError} If loading failed before, texts can't be loaded or
   *   the write fails (rejects).
   */
  mergeInstances(targetId: string, sourceId: string): Promise<ItemInstance> {
    return this.#run("mergeInstances", () =>
      planMergeInstances(this.#state, targetId, sourceId),
    );
  }

  /**
   * Counts available pieces of a stack as used.
   * @param id Id of the stack.
   * @param quantity Pieces to use.
   * @returns The changed stack.
   * @throws {ManagerError} `forbidden`, `not-found` or `invalid-quantity` (rejects).
   * @throws {StorageError} If loading failed before, texts can't be loaded or
   *   the write fails (rejects).
   */
  useInstance(id: string, quantity: number): Promise<ItemInstance> {
    return this.#run("useInstance", () =>
      planUseInstance(this.#state, id, quantity),
    );
  }

  /**
   * Restores used pieces of a stack (GM).
   * @param id Id of the stack.
   * @param quantity Pieces to restore.
   * @returns The changed stack.
   * @throws {ManagerError} `forbidden`, `not-found` or `invalid-quantity` (rejects).
   * @throws {StorageError} If loading failed before, texts can't be loaded or
   *   the write fails (rejects).
   */
  unuseInstance(id: string, quantity: number): Promise<ItemInstance> {
    return this.#run("unuseInstance", () =>
      planUnuseInstance(this.#state, id, quantity),
    );
  }

  /**
   * Deletes an instance (GM); its contents move to its location.
   * @param id Id of the instance.
   * @returns Resolves when the state shows the deletion.
   * @throws {ManagerError} `forbidden` or `not-found` (rejects).
   * @throws {StorageError} If loading failed before, texts can't be loaded or
   *   the write fails (rejects).
   */
  async deleteInstance(id: string): Promise<void> {
    await this.#run("deleteInstance", () =>
      planDeleteInstance(this.#state, id),
    );
  }
  // #endregion

  // #region Lifecycle
  /**
   * Loads the role and the records for the first time.
   * @returns Resolves when both are loaded; a failed load sets status `error`
   *   instead of rejecting.
   */
  async start(): Promise<void> {
    await Promise.all([this.#refreshRole(), this.#reload()]);
  }

  /**
   * Loads all records again, e.g. after the user fixed an `error` status.
   * @returns Resolves when the state reflects a load started at or after this
   *   call; a failure sets status `error` instead of rejecting.
   */
  reload(): Promise<void> {
    return this.#reload();
  }

  /**
   * Deletes this storage's data in this browser ("clear local data") and
   * reloads. Allowed for every role and in status `error`: it is the way out
   * of unreadable data and only affects this browser. Runs after pending
   * commands.
   * @returns Resolves when the state reflects the cleared storage.
   * @throws {StorageError} `unavailable` if the storage offers no deletion
   *   (see `canClearData`), or the error of the deletion (rejects).
   * @throws {Error} If the manager is disposed (rejects).
   */
  clearData(): Promise<void> {
    return this.#enqueue(async () => {
      if (this.#disposed) throw new Error("Inventory manager disposed");
      const clear = this.#backend?.clearData;
      if (!clear) {
        throw new StorageError("unavailable", "Storage has no local data");
      }
      await clear.call(this.#backend);
      this.#texts.clear();
      await this.#reload();
    });
  }

  /** Stops listening, disposes the storage and rejects later commands. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#unsubscribe();
    this.#texts.dispose();
    this.#storage.dispose();
    this.#listeners.clear();
  }
  // #endregion

  // #region Helpers
  /**
   * Runs a command after the previous one has settled: checks status and
   * rights, builds the plan, fills lazy texts, applies it and waits for the
   * reload.
   * @param action Right the command needs.
   * @param build Builds the plan from the current state; may load texts first.
   * @returns The plan's result once the state shows it.
   * @throws {ManagerError} `forbidden` or a rule violation from `build` (rejects).
   * @throws {StorageError} The load error while the status is `error`, or a
   *   failed text load or write (rejects).
   * @throws {Error} If the manager is disposed (rejects).
   */
  #run<Result>(
    action: ManagerAction,
    build: () => OperationPlan<Result> | Promise<OperationPlan<Result>>,
  ): Promise<Result> {
    const command = async (): Promise<Result> => {
      if (this.#disposed) throw new Error("Inventory manager disposed");
      if (this.#status.type === "loading") {
        await this.#awaitLatestLoad(this.#latestLoad);
      }
      if (this.#status.type === "error") throw this.#status.error;
      if (!this.can(action)) {
        throw new ManagerError("forbidden", `Not allowed: ${action}`);
      }
      const plan = await build();
      if (plan.operations.length === 0) return plan.result;

      const lazy = this.capabilities.lazyTexts;
      if (lazy) {
        await Promise.all(
          plan.textsFromState.map((ref) => this.#texts.ensure(ref)),
        );
        fillTexts(plan, (ref) => this.#texts.loadedTexts(ref));
      }
      await this.#storage.apply(plan.operations);
      if (lazy) this.#rememberWrittenTexts(plan);
      await this.#reload();
      return plan.result;
    };
    return this.#enqueue(command);
  }

  /**
   * Runs a task after every previously queued task has settled, so commands
   * never build on a state another command is about to change.
   * @param task Work to run; its failure doesn't stop later tasks.
   * @returns The task's result.
   * @throws {unknown} Whatever the task rejects with (rejects).
   */
  #enqueue<Result>(task: () => Promise<Result>): Promise<Result> {
    const run = this.#commandTail.then(task);
    this.#commandTail = run.catch(() => undefined);
    return run;
  }

  /**
   * Puts the texts a plan just wrote into the text cache, so they aren't
   * loaded again.
   * @param plan Applied plan; every save carries its real texts.
   */
  #rememberWrittenTexts(plan: OperationPlan<unknown>): void {
    for (const operation of plan.operations) {
      if (operation.op !== "save") continue;
      if (operation.kind === "item") {
        this.#texts.remember(
          { kind: "item", id: operation.record.id },
          itemTexts(operation.record),
        );
      } else if (operation.kind === "instance") {
        this.#texts.remember(
          { kind: "instance", id: operation.record.id },
          instanceTexts(operation.record),
        );
      }
    }
  }

  /**
   * Starts a load. Concurrent loads may finish in any order; only the latest
   * one updates the state.
   * @returns Resolves when the state reflects the latest load started so far.
   */
  #reload(): Promise<void> {
    const load = this.#loadOnce(++this.#loadSequence);
    this.#latestLoad = load;
    return this.#awaitLatestLoad(load);
  }

  /**
   * Waits for a load and for every load started after it.
   * @param load Load to wait for.
   * @returns Resolves when no newer load is running.
   */
  async #awaitLatestLoad(load: Promise<void>): Promise<void> {
    let current = load;
    for (;;) {
      await current;
      if (this.#latestLoad === current) return;
      current = this.#latestLoad;
    }
  }

  /**
   * Loads all records and replaces the state, unless a newer load started.
   * @param sequence Number of this load.
   * @returns Resolves after the state or status was updated; never rejects.
   */
  async #loadOnce(sequence: number): Promise<void> {
    try {
      const snapshot = await this.#storage.load();
      if (this.#disposed || sequence !== this.#loadSequence) return;
      this.#state = buildState(snapshot, this.#version + 1);
      this.#status = { type: "ready" };
      this.#texts.retain((ref) =>
        ref.kind === "item"
          ? this.#state.items.has(ref.id)
          : this.#state.instances.has(ref.id),
      );
    } catch (error) {
      if (this.#disposed || sequence !== this.#loadSequence) return;
      this.#status = { type: "error", error };
    }
    this.#bump();
  }

  /**
   * Asks the storage for the role again.
   * @returns Resolves after the role was updated; a failure keeps the old role.
   */
  async #refreshRole(): Promise<void> {
    try {
      const role = await this.#storage.getRole();
      if (this.#disposed || role === this.#role) return;
      this.#role = role;
      this.#bump();
    } catch (error) {
      // Keep the previous role; the next `role` change asks again.
      console.warn("[party-inventory] role refresh failed", error);
    }
  }

  /**
   * Reacts to a storage change.
   * @param change What changed.
   */
  #onChange(change: StorageChange): void {
    if (this.#disposed) return;
    switch (change.type) {
      case "records":
        void this.#reload();
        break;
      case "texts":
        this.#texts.refresh(change.refs);
        break;
      case "role":
        void this.#refreshRole();
        break;
    }
  }

  /**
   * Returns a value cached for the current version.
   * @param key Cache key of the query.
   * @param compute Computes the value on a miss.
   * @returns The cached or computed value.
   */
  #memoize<Value>(key: string, compute: () => Value): Value {
    // Each key is only ever filled by the same query, so the type matches.
    if (this.#memo.has(key)) return this.#memo.get(key) as Value;
    const value = compute();
    this.#memo.set(key, value);
    return value;
  }

  /** Marks everything as changed: new version, empty query cache, listeners notified. */
  #bump(): void {
    if (this.#disposed) return;
    this.#version++;
    this.#memo.clear();
    for (const listener of [...this.#listeners]) {
      try {
        listener();
      } catch (error) {
        console.error("[party-inventory] manager listener failed", error);
      }
    }
  }
  // #endregion
}
