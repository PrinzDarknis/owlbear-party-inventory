# Feature: Manager (phase 3)

Branch: `feature/manager` · Rules: `harness/core/07-workflow.md` §Feature lifecycle

## Goal

`src/manager/` holds the only in-memory inventory state and is the single entry point for the UI hooks (phase 4). It loads from an `InventoryStorage`, keeps a consistent tree (characters → instances → contents), derives values (weight, counts), enforces the role rules (GM / player, "view as player") and turns every UI action into **one** atomic `apply` call. It is designed for all three controllers, including the lazy texts and multi-user behavior of the Owlbear controller (phase 5).

## Scope

- In:
  - Manager lifecycle (open on a registry entry, load, subscribe, dispose), status and error surfacing.
  - Commands: CRUD for characters, items, instances; `assignItem`, `moveInstance` (whole or partial stack), `splitInstance`, `mergeInstances`, `useInstance` / `unuseInstance`; delete with re-homing.
  - Rules: rights per effective role, move validation (target exists, `hasInventory`, no cycle), quantity bounds.
  - Queries: children of a location, path / owner of an instance, total weight, instance counts.
  - Texts: on-demand loading and caching for `lazyTexts` controllers, refetch on `texts` changes, texts kept on update.
  - Model change: `ItemInstance.used` (new persisted field, see Decisions).
  - Known issue #3: "clear local data" via the registry entry.
  - Vitest for every part; manager tests against `MemoryInventoryStorage`, the local controller (fake web storage) and a lazy-texts fake.
- Out:
  - React hooks and UI (phase 4); the API is shaped for `useSyncExternalStore`, but no hook is written here.
  - Owlbear controller (phase 5).
  - Logger module (known issue #4).
  - Automatic repair writes of inconsistent stored data (see Decisions).

## Structure

```
src/model/item-instance/
  item-instance.ts                    + `used` field, `available` getter (extended)
  item-instance.types.ts              + `used?` in the DTO (extended)
  item-instance.test.ts               + used tests (extended)

src/storage/registry/
  storage-backend.types.ts            + optional `clearData()` (extended)
  storage.registry.ts                 local entry implements `clearData()` (extended)
  storage.registry.test.ts            (extended)

src/manager/
  index.ts                            public API: InventoryManager, view types, errors, permissions
  inventory-manager.ts                class: lifecycle, state owner, command queue, subscribe/version
  inventory-manager.test.ts           integration tests (memory, local, lazy-texts fake)
  errors/
    manager-error.ts                  ManagerError with codes (not-found, forbidden, invalid-move, invalid-quantity)
    index.ts
  state/                              immutable in-memory state, built from a snapshot
    inventory-state.types.ts          InventoryState: maps by id, children index, version
    build-state.service.ts            snapshot → state: bind items, index children, resolve orphans/cycles
    build-state.service.test.ts
    index.ts
  queries/                            pure reads on InventoryState
    tree.service.ts                   contentsOf, pathOf, ownerOf, isWithin, descendantsOf
    totals.service.ts                 instanceWeight, totalWeight, instanceCount
    *.test.ts
    index.ts
  rules/                              pure checks, no writes
    permissions.types.ts              ManagerAction union, EffectiveRole
    permissions.service.ts            can(role, action): rights table (GM / player)
    move-rules.service.ts             validateMove: target exists, hasInventory, no cycle
    *.test.ts
    index.ts
  operations/                         pure builders: state + command → StorageOperation[]
    character-operations.service.ts   create/rename/delete character (re-home instances)
    item-operations.service.ts        create/update/delete definition (delete instances, re-home contents)
    instance-operations.service.ts    assign, update, move (whole/partial), split, merge, use/unuse, delete (re-home contents)
    rehome.service.ts                 nearest surviving location for contents of deleted records
    *.test.ts
    index.ts
  texts/
    text-cache.ts                     loaded texts per TextRef, loading state, invalidation on `texts` changes
    text-cache.test.ts
    index.ts
  testing/                            test-only, never imported by app code
    lazy-texts-memory.storage.ts      memory controller with `lazyTexts: true` (stand-in for Owlbear)
    manager-fixtures.ts               sample inventory builders
    index.ts
```

Who uses what: `state/`, `queries/`, `rules/`, `operations/` are pure and used only by `inventory-manager.ts` (and its tests); the manager barrel re-exports only the class, the read-only view types, `ManagerError` and the permission types the UI needs. Phase 4 hooks use only `InventoryManager`. Phase 5 adds nothing here; the manager reacts to `capabilities` (`lazyTexts`, `multiUser`).

## Decisions

| Topic                    | Decision                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State owner              | The manager holds one immutable `InventoryState`. Every change (own `apply`, other tab/user) builds a new state from `load()`; a version counter increases. `getVersion()` + `subscribe()` feed `useSyncExternalStore`; query results are cached per version for stable references.                                                                                    |
| Read-only views          | Queries return `Readonly<Item>` / `Readonly<ItemInstance>` / `Readonly<Character>`. Mutation only via `update…(id, fn)`, which works on a clone and applies the result.                                                                                                                                                                                                |
| Item binding             | `buildState` binds every instance to its item (`bindItem`) after each `load()`.                                                                                                                                                                                                                                                                                        |
| Inconsistent data        | Instances with a missing item, a dangling location or a cycle are shown as **unassigned** in the tree (view-level only). The manager never writes repairs on its own: with N clients that would cause write loops; the next user action on the record stores the corrected location.                                                                                   |
| Command flow             | Commands run **one at a time** (queue). Each: check rights → validate → build operations from the current state → one `apply` → await the reload before the next command. No optimistic state.                                                                                                                                                                         |
| Multi-user conflicts     | Last writer wins per record (Owlbear stores one key per record). Accepted for v1; documented in `known-issues.md` when phase 5 measures it.                                                                                                                                                                                                                            |
| Errors                   | Rule violations reject with `ManagerError` (`not-found`, `forbidden`, `invalid-move`, `invalid-quantity`). Storage failures reject with the original `StorageError`; `load` failures also set status `error` (with the code), never swallowed.                                                                                                                         |
| Delete semantics         | Character → its direct instances become `unassigned` (containers keep their contents). Container instance → its contents move to the container's location. Item definition → all its instances are deleted; their contents move to the **nearest surviving** location (walk up past deleted containers). One `apply` each.                                             |
| Player rights (v1)       | Player: move instances, split, merge, **use**, write player notes. GM: everything, plus unuse, set quantity, delete, assign, catalog, characters. UX only, not security (`harness/core/05-security.md`).                                                                                                                                                               |
| View as player           | Lives in the manager: `effectiveRole` = `PLAYER` if the GM enables it, else the storage role. All rights checks use it; `can(action)` is exposed for the UI. Enabling it as a player is a no-op.                                                                                                                                                                       |
| `used` counter           | New optional field `ItemInstance.used` (integer, stored only when > 0, no DTO version bump: old data reads as 0). Only stackable items; getter clamps to `0..quantity`, `available = quantity − used`. Player `use(n)` up to `available`; GM `unuse(n)` and set quantity (used clamps when quantity drops below it). The UI shows `available` and `used` side by side. |
| `used` in derived values | Total weight counts `available` pieces (used ones are gone). Split moves only available pieces (new instance has `used = 0`); merge adds quantities and used.                                                                                                                                                                                                          |
| Move / merge             | `moveInstance(id, target, quantity?)`: without quantity (or the full available amount) the instance moves; otherwise it is a split into the target. Moves never merge automatically; `mergeInstances` is explicit and requires the same item, a stackable item and the same location.                                                                                  |
| Texts                    | `lazyTexts: false` → texts come with the snapshot. `lazyTexts: true` → `loadTexts(ref)` on demand, cached per ref, refetched on a `texts` change for cached refs, dropped when the record is deleted. `update…` loads the record's texts first and merges them, so saving a record never erases texts it didn't have in state.                                         |
| Clear local data (#3)    | Optional `clearData(): Promise<void>` on the `StorageBackend` registry entry ("delete this backend's data in this browser"); it works even if the data is unreadable. The local entry calls `LocalInventoryStorage.clear()`; Owlbear (phase 5) will clear its text cache. The manager exposes it and reloads afterwards.                                               |

## Steps

Check a step only when it is implemented, tested and documented.

- [x] 1. Model: `ItemInstance.used` / `available` (+ DTO, deserialize, clone, tests); `data-model.md` updated.
- [x] 2. `errors/` + `state/`: `ManagerError`, `buildState` (binding, contents index, orphans/cycles, `misplaced`) + tests; `testing/manager-fixtures.ts` (shared by steps 2–7).
- [x] 3. `queries/`: tree (`contentsOf`, `pathOf`, `ownerOf`, `isWithin`, `descendantsOf`) and totals (`instanceWeight` / `totalWeight` with `available`, rounded once; `instanceCount`) + tests.
- [ ] 4. `rules/`: permissions table, `validateMove` (existence, `hasInventory`, cycle) + tests.
- [ ] 5. `operations/`: builders for all commands incl. re-homing, split/merge, use/unuse + tests.
- [ ] 6. `texts/` + `testing/`: text cache, lazy-texts fake storage + tests.
- [ ] 7. `InventoryManager`: lifecycle, status, version/subscribe, queue, reload on changes, role + view as player, commands, error surfacing + integration tests (memory, local, lazy fake).
- [ ] 8. Registry `clearData()` (#3) and `manager.clearData()` + tests; remove #3 from `known-issues.md`.
- [ ] 9. Docs: `data-model.md` (manager section, `used`), `overview.md`, roadmap status.
- [ ] Finish: lasting knowledge moved to `harness/project/*`, `current-feature/` emptied, merge after asking

## Verification

- `npm run test`, `npm run lint`, `npm run build` green after every step.
- Manager behavior tested end to end against `MemoryInventoryStorage`, `LocalInventoryStorage` (fake web storage) and the lazy-texts fake; `describeStorageContract` stays unchanged.
- No live test in Owlbear in this phase (no UI yet); the live checklist follows in phase 4/6.
