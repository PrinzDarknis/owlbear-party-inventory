# Feature: Storage (phase 2)

Branch: `feature/storage` · Rules: `harness/core/07-workflow.md` §Feature lifecycle

## Goal

A storage layer that the manager (phase 3) uses without knowing where data lives: the `InventoryStorage` contract, a memory controller (tests, fallback), a localStorage controller (standalone tab) and a registry for choosing the controller at startup. The layout below covers **all three controllers including Owlbear (phase 5)**, so later phases only fill folders planned here.

## Scope

- In: contract, shared controller tools, memory and local controllers (incl. cross-tab sync), registry, contract test suite, docs.
- Out: Owlbear controller, text server and budget display (phase 5; structure fixed here); manager logic such as integrity, cycles, rights and in-memory state (phase 3); UI for controller selection and "clear local data" (phase 4); JSON export/import (phase 5).

## Principles

1. **One state, held by the manager.** Controllers are **stateless**: `load()` reads from their source, `apply()` writes to it. Only the memory controller holds records, because memory is its source. No cache layer between manager and storage.
2. **Only the contract (`interface/`) sits between manager and controllers.** Everything else in `src/storage/` is a controller detail.
3. **One folder per controller, same pattern for each.** A controller's persisted format (DTO) lives in its own `dto/` folder because only it uses it.
4. **`backends/shared/` holds tools used by at least two controllers.** It is not a layer; the manager never imports it.
5. **All controllers live in `src/storage/backends/`, Owlbear included.** The SDK is still imported only in `src/obr/`: the Owlbear controller uses the `api` facade (thin room metadata and broadcast services). Storage logic (keys, budget, text protocol) stays in the storage layer.

## Structure

```
src/storage/
  index.ts                               public API for the manager: interface/ + registry/
  interface/                             contract manager ↔ controllers
    inventory-storage.types.ts           InventoryStorage, StorageCapabilities, StorageRole
    snapshot.types.ts                    InventorySnapshot
    change-set.types.ts                  ChangeSet, RecordUpserts, RecordRemovals
    storage-change.types.ts              StorageChange
    texts.types.ts                       TextRef, ItemTexts, InstanceTexts, TextsFor
    storage-error.ts                     StorageError, StorageErrorCode
  backends/                              one folder per controller + shared tools
    shared/                              used by ≥ 2 controllers, not public
      record-set/                        whole inventory as maps (memory, local)
        record-set.types.ts              RecordSet
        record-set.service.ts            createEmptyRecordSet, toSnapshot (clones), textsOf
        apply-change-set.service.ts      applyChangeSet (pure, new RecordSet, removal wins)
      change-notifier/                   listener handling (all controllers)
        change-notifier.ts               ChangeNotifier: subscribe, emit, dispose
      web-storage/                       safe localStorage access (local, Owlbear text cache)
        web-storage.service.ts           readJson, writeJson, remove, isWebStorageAvailable
    memory/                              phase 2
      memory-inventory.storage.ts        MemoryInventoryStorage (optional seed snapshot)
    local/                               phase 2
      local-inventory.storage.ts         LocalInventoryStorage (stateless, storage event, clear())
      local-storage.constant.ts          LOCAL_INVENTORY_KEY
      dto/                               persisted format in localStorage
        local-inventory.dto.types.ts     LocalInventoryDto, DtoReadResult
        local-inventory.dto.constant.ts  LOCAL_INVENTORY_DTO_VERSION
        local-inventory.dto.service.ts   toDto, fromDto (per-entry validation)
    owlbear/                             phase 5 (structure fixed now)
      owlbear-inventory.storage.ts       OwlbearInventoryStorage (uses api from src/obr)
      owlbear-storage.constant.ts        metadata keys i/n/c, broadcast channels, budget
      dto/                               compact records per metadata key (no texts)
      texts/                             text cache in the browser (uses shared/web-storage)
      text-server/                       GM text server, runs in the background iframe
      text-protocol/                     broadcast messages: types + parsers
  registry/                              controller selection at startup
    storage-backend.types.ts             StorageBackend { id, label, isAvailable(), create() }
    storage.registry.ts                  STORAGE_BACKENDS (memory, local; owlbear via import() in phase 5)
  testing/                               test-only, never imported by app code
    storage.contract.ts                  contract suite every controller runs
    fake-web-storage.ts                  Storage fake + storage event trigger
```

Every folder has an `index.ts` barrel; tests (`*.test.ts`) sit next to the code. Phase 5 adds only a thin SDK facade to `src/obr/` (`obr-room-metadata.service.ts`, `obr-broadcast.service.ts`), without storage logic.

## Decisions

| Topic                  | Decision                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Format at the boundary | **Class instances** (`Item`, `ItemInstance`, `Character`). Controllers call `serialize()` / `deserialize()` themselves; model DTOs stay unexported. Controllers hand out fresh instances.                                                  |
| Read/write API         | `load(): Promise<InventorySnapshot>`; `apply(changes: ChangeSet)` is atomic (one `setMetadata` in phase 5). `upsert` replaces whole records by id; a removal wins over an upsert of the same id; unknown removal ids are ignored.          |
| Long texts             | Written inside the record; the controller decides where they end up. `load()` omits them if `capabilities.lazyTexts`; `loadTexts(ref)` returns them. Memory and local keep them in the record.                                             |
| Change notification    | `subscribe(listener)` with `StorageChange = { type: "records" } \| { type: "texts"; refs } \| { type: "role" }`. No record ids: controllers are stateless, the manager reloads and compares with its own state. Fires for own `apply` too. |
| Errors                 | `StorageError` with `code: "unreadable" \| "unsupported-version" \| "write-failed" \| "too-large"`. Messages never contain stored content. No `cause` (the TS lib target has no `ErrorOptions`).                                           |
| Role                   | `getRole(): Promise<StorageRole>`; memory and local always `"GM"`. "View as player" is a manager/UI concern.                                                                                                                               |
| Capabilities           | `{ persistent, lazyTexts, multiUser }`. Memory `false/false/false`, local `true/false/false`, Owlbear `true/true/true`.                                                                                                                    |
| Integrity              | Controllers store what they get (normalized via `deserialize(serialize())`). References, cycles and rights: manager (phase 3).                                                                                                             |
| Stored copies          | Incoming records are stored as normalized, unbound copies; a record that fails validation makes `apply` reject.                                                                                                                            |
| Local source           | One key `LOCAL_INVENTORY_KEY` with a versioned DTO `{ version, items, instances, characters }`. Every `load`/`apply` reads it again (no cache). Invalid entries are dropped and counted.                                                   |
| Unreadable local data  | Never overwritten: `load` and `apply` reject with `unreadable` / `unsupported-version` until the user calls `clear()` (UI in phase 4).                                                                                                     |
| No localStorage        | `local.isAvailable()` returns `false` (probe in try/catch); the start dialog offers memory instead ("not saved"). The local controller has no fallback mode of its own; core 05's in-memory fallback is met via the registry.              |
| Cross-tab              | The local controller listens to the `storage` event for its key and emits `{ type: "records" }`.                                                                                                                                           |
| Testability            | The local controller gets a `Storage`-like object and an event target injected; tests use `testing/fake-web-storage.ts` (no jsdom, no new dependency).                                                                                     |
| Registry               | `STORAGE_BACKENDS: StorageBackend[]` with `{ id, label, isAvailable(): Promise<boolean>, create(): Promise<InventoryStorage> }`.                                                                                                           |
| Async                  | All read/write methods return promises.                                                                                                                                                                                                    |
| Lifecycle              | `dispose()` releases listeners (e.g. the `storage` event); the instance is unusable afterwards.                                                                                                                                            |

## Steps

Check a step only when it is implemented, tested and documented. After each step: lint/build/test, update status, propose a commit, wait for the user's review.

- [x] 1. Contract: `StorageChange` (own file, no ids), `StorageError`, `RecordKind` removed; plan replaced by the full layout. Obsolete `document/` removed.
- [ ] 2. Shared tools in `backends/shared/` (record-set, change-notifier, web-storage) + tests.
- [ ] 3. Contract suite `testing/storage.contract.ts` + memory controller `backends/memory/`.
- [ ] 4. Local controller `backends/local/` incl. `dto/` and `testing/fake-web-storage.ts`. Tests: contract suite, corrupt JSON, other version (not overwritten), invalid entries, quota error, storage event, `clear()`.
- [ ] 5. Registry `registry/` (memory, local) + tests.
- [ ] 6. Docs: `data-model.md` (local key, DTO version), `roadmap.md` (architecture, Owlbear controller path), `deviations.md` (row 1: Owlbear controller in `src/storage/backends/owlbear/` via the `src/obr` facade), `overview.md`.
- [ ] Finish: lasting knowledge moved to `harness/project/*`, `current-feature/` emptied, merge after asking

## Verification

- `npm run test`: contract suite against memory and local; tools, DTO, local special cases and registry covered.
- `npm run lint` and `npm run build` green.
- Top level of `src/storage/` contains only `index.ts`, `interface/`, `backends/`, `registry/`, `testing/`.
- No live test in Owlbear in phase 2.
