# Feature: Storage (phase 2)

Branch: `feature/storage` · Rules: `harness/core/07-workflow.md` §Feature lifecycle

## Goal
A storage layer that the manager (phase 3) can use without knowing the backend: the `InventoryStorage` interface, a memory backend (tests, fallback), a localStorage backend (standalone tab) and a registry for selecting the backend at startup. The Owlbear backend (phase 5) will implement the same interface later.

## Scope
- In: interface and types in `src/storage/`, memory backend, local backend (incl. cross-tab sync), registry, a shared contract test suite that every backend must pass, docs.
- Out: Owlbear backend, text server and budget display (phase 5); manager logic such as reference integrity, cycle checks and rights (phase 3); UI for backend selection (phase 4); JSON export/import (phase 5).

## Decisions
| Topic | Decision |
| --- | --- |
| Format at the boundary | **Class instances** (`Item`, `ItemInstance`, `Character`). Each backend calls `serialize()` / `deserialize()` itself, and the DTOs stay unexported. Backends hand out fresh instances (`deserialize`/`clone`), so callers never mutate internal state. |
| Read/write API | **Snapshot + changeset:** `load(): Promise<InventorySnapshot>` returns `{ items, instances, characters }`. `apply(changes: ChangeSet): Promise<void>` takes `{ upsert: { items?, instances?, characters? }, remove: { items?, instances?, characters? } }` (ids). It is atomic per call; in phase 5 this maps to one `setMetadata`. `upsert` replaces the whole record by id. |
| Long texts | Written inside the record; the backend decides where they end up. `load()` may omit texts if `capabilities.lazyTexts`. `loadTexts(ref: TextRef)` (`{ kind: "item" \| "instance", id }`) returns `{ description?, dmNotes? }` or `{ notes? }`. Local and memory store everything together (`lazyTexts: false`). |
| Change notification | `subscribe(listener): () => void`. The listener fires after every successful change, **including your own** `apply` and other tabs. The payload `StorageChange` holds the changed ids per kind, so the manager can reload selectively. |
| Role | `getRole(): Promise<StorageRole>` (`"GM" \| "PLAYER"`, own type in `src/storage`, no import from `src/obr`). Local and memory always return `"GM"`; "view as player" is a manager/UI concern (phase 3/4). |
| Capabilities | `{ persistent, lazyTexts, multiUser }`. Memory: `false/false/false`. Local: `persistent` false if localStorage is unavailable (in-memory fallback). |
| Integrity | Backends store what they are given (after `deserialize`/normalization). Dangling references, cycles and rights are checked by the manager (phase 3). |
| Local layout | One key `STORAGE_KEY("local/inventory")` holds a versioned document `{ version: 1, items: [], instances: [], characters: [] }`. Each entry is validated on read via `deserialize` and invalid entries are dropped (logged without content). Every access is wrapped in try/catch with an in-memory fallback (05 §Privacy). There is a `clear()` method for "Clear local data". |
| Cross-tab | The local backend listens to the `storage` event for its key, reloads and fires `StorageChange`. |
| Testability | The local backend gets a `Storage`-like object and an optional event target injected (default `window.localStorage` / `window`). Tests use a fake, so no jsdom and no new dependency. |
| Registry | `STORAGE_BACKENDS: StorageBackend[]` with `{ id, label, isAvailable(): Promise<boolean>, create(): Promise<InventoryStorage> }`. Phase 2: `local`, `memory`. `owlbear` follows in phase 5 via dynamic `import()`. |
| Async | All read/write methods return promises (the Owlbear backend is async), local/memory too. |

## Steps
Check a step only when it is implemented, tested and documented.
- [ ] 1. Types and interface: `src/storage/storage.types.ts` (`InventoryStorage`, `InventorySnapshot`, `ChangeSet`, `StorageChange`, `TextRef`, `ItemTexts`, `InstanceTexts`, `StorageCapabilities`, `StorageRole`), barrel `src/storage/index.ts`.
- [ ] 2. Shared pure helpers: apply a changeset to a serialized document, derive `StorageChange` from a changeset, (de)serialize a document with entry validation. Tests.
- [ ] 3. Memory backend (`src/storage/memory/`) plus a reusable **contract test suite** (`src/storage/storage.contract.ts`) that every backend runs.
- [ ] 4. Local backend (`src/storage/local/`): versioned document, try/catch + in-memory fallback, quota error → `apply` rejects without changing state, `storage` event, `clear()`. Contract tests + local-specific tests (corrupt JSON, invalid entries, fallback, foreign tab).
- [ ] 5. Registry (`src/storage/storage.registry.ts`) + tests.
- [ ] 6. Docs: `data-model.md` (local key, document version), `overview.md`, `roadmap.md`; lint/build/test green.
- [ ] Finish: lasting knowledge moved to `harness/project/*`, `current-feature/` emptied, merge after asking

## Verification
- `npm run test`: the contract suite runs against memory and local; local special cases are covered.
- `npm run lint` and `npm run build` are green.
- No live test in Owlbear (the UI follows in phase 4); `/harness-review` before finishing.
