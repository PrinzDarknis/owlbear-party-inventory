# Feature: Storage (phase 2)

Branch: `feature/storage` · Rules: `harness/core/07-workflow.md` §Feature lifecycle

## Goal

A storage layer that the manager (phase 3) can use without knowing the backend: the `InventoryStorage` interface, a memory backend (tests, fallback), a localStorage backend (standalone tab) and a registry for selecting the backend at startup. The Owlbear backend (phase 5) will implement the same interface later.

## Scope

- In: interface and types in `src/storage/`, memory backend, local backend (incl. cross-tab sync), registry, a shared contract test suite that every backend must pass, docs.
- Out: Owlbear backend, text server and budget display (phase 5); manager logic such as reference integrity, cycle checks and rights (phase 3); UI for backend selection (phase 4); JSON export/import (phase 5).

## Structure

Target layout of `src/storage/`, grouped by responsibility. Every folder has an `index.ts` barrel; tests sit next to the code they test.

```
src/storage/
  index.ts                          public API for the manager (re-exports interface/ and registry/)
  interface/                        contract between manager and backends (types only)
    inventory-storage.types.ts      InventoryStorage, StorageCapabilities, StorageRole
    snapshot.types.ts               InventorySnapshot, RecordKind
    change-set.types.ts             ChangeSet, RecordUpserts, RecordRemovals, StorageChange
    texts.types.ts                  TextRef, ItemTexts, InstanceTexts, TextsFor
  document/                         serialized document shared by memory and local (internal)
    storage-document.types.ts       StorageDocument (JSON shape, version)
    storage-document.service.ts     (de)serialize with entry validation
    change-set.service.ts           apply a changeset to a document, derive StorageChange
  backends/                         one folder per backend controller
    memory/
      memory-inventory.storage.ts   MemoryInventoryStorage
    local/
      local-inventory.storage.ts    LocalInventoryStorage
      local-storage.constant.ts     storage key, document version
  registry/                         backend selection at startup
    storage-backend.types.ts        StorageBackend
    storage.registry.ts             STORAGE_BACKENDS
  testing/                          test-only helpers, never imported by app code
    storage.contract.ts             contract test suite every backend runs
    fake-web-storage.ts             in-memory Storage + event target for local tests
```

The Owlbear backend (phase 5) lives in `src/obr/storage/` (SDK imports only in `src/obr/`, see deviations.md) and implements `InventoryStorage` from `src/storage`.

## Decisions

| Topic                  | Decision                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Format at the boundary | **Class instances** (`Item`, `ItemInstance`, `Character`). Each backend calls `serialize()` / `deserialize()` itself, and the DTOs stay unexported. Backends hand out fresh instances (`deserialize`/`clone`), so callers never mutate internal state.                                                                                                                         |
| Read/write API         | **Snapshot + changeset:** `load(): Promise<InventorySnapshot>` returns `{ items, instances, characters }`. `apply(changes: ChangeSet): Promise<void>` takes `{ upsert: { items?, instances?, characters? }, remove: { items?, instances?, characters? } }` (ids). It is atomic per call; in phase 5 this maps to one `setMetadata`. `upsert` replaces the whole record by id.  |
| Long texts             | Written inside the record; the backend decides where they end up. `load()` may omit texts if `capabilities.lazyTexts`. `loadTexts(ref: TextRef)` (`{ kind: "item" \| "instance", id }`) returns `{ description?, dmNotes? }` or `{ notes? }`. Local and memory store everything together (`lazyTexts: false`).                                                                 |
| Change notification    | `subscribe(listener): () => void`. The listener fires after every successful change, **including your own** `apply` and other tabs. The payload `StorageChange` holds the changed ids per kind, so the manager can reload selectively.                                                                                                                                         |
| Role                   | `getRole(): Promise<StorageRole>` (`"GM" \| "PLAYER"`, own type in `src/storage`, no import from `src/obr`). Local and memory always return `"GM"`; "view as player" is a manager/UI concern (phase 3/4).                                                                                                                                                                      |
| Capabilities           | `{ persistent, lazyTexts, multiUser }`. Memory: `false/false/false`. Local: `persistent` false if localStorage is unavailable (in-memory fallback).                                                                                                                                                                                                                            |
| Integrity              | Backends store what they are given (after `deserialize`/normalization). Dangling references, cycles and rights are checked by the manager (phase 3).                                                                                                                                                                                                                           |
| Local layout           | One key `STORAGE_KEY("local/inventory")` holds a versioned document `{ version: 1, items: [], instances: [], characters: [] }`. Each entry is validated on read via `deserialize` and invalid entries are dropped (logged without content). Every access is wrapped in try/catch with an in-memory fallback (05 §Privacy). There is a `clear()` method for "Clear local data". |
| Cross-tab              | The local backend listens to the `storage` event for its key, reloads and fires `StorageChange`.                                                                                                                                                                                                                                                                               |
| Testability            | The local backend gets a `Storage`-like object and an optional event target injected (default `window.localStorage` / `window`). Tests use a fake, so no jsdom and no new dependency.                                                                                                                                                                                          |
| Registry               | `STORAGE_BACKENDS: StorageBackend[]` with `{ id, label, isAvailable(): Promise<boolean>, create(): Promise<InventoryStorage> }`. Phase 2: `local`, `memory`. `owlbear` follows in phase 5 via dynamic `import()`.                                                                                                                                                              |
| Async                  | All read/write methods return promises (the Owlbear backend is async), local/memory too.                                                                                                                                                                                                                                                                                       |
| Changeset conflicts    | A removal wins over an upsert of the same id in the same changeset. Unknown ids in `remove` are ignored.                                                                                                                                                                                                                                                                       |
| Lifecycle              | `dispose()` releases listeners (e.g. the `storage` event); the instance is unusable afterwards.                                                                                                                                                                                                                                                                                |

## Steps

Check a step only when it is implemented, tested and documented.

- [x] 1. Types and interface in `src/storage/interface/` (contract files, see Structure), barrels `src/storage/interface/index.ts` and `src/storage/index.ts`.
- [ ] 2. Shared document in `src/storage/document/`: document type, (de)serialization with entry validation, changeset application, `StorageChange` derivation. Tests.
- [ ] 3. Memory backend in `src/storage/backends/memory/` plus the reusable **contract test suite** in `src/storage/testing/storage.contract.ts`.
- [ ] 4. Local backend in `src/storage/backends/local/`: versioned document, try/catch + in-memory fallback, quota error → `apply` rejects without changing state, `storage` event, `clear()`. Fake storage in `src/storage/testing/`. Contract tests + local-specific tests (corrupt JSON, invalid entries, fallback, foreign tab).
- [ ] 5. Registry in `src/storage/registry/` + tests.
- [ ] 6. Docs: `data-model.md` (local key, document version), `overview.md`, `roadmap.md`; lint/build/test green.
- [ ] Finish: lasting knowledge moved to `harness/project/*`, `current-feature/` emptied, merge after asking

## Verification

- `npm run test`: the contract suite runs against memory and local; local special cases are covered.
- `npm run lint` and `npm run build` are green.
- No live test in Owlbear (the UI follows in phase 4); `/harness-review` before finishing.
