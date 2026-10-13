# Roadmap

Agreed rough plan (2026-10-06): the product-level view. Each phase is one feature with its own branch; its detailed plan and progress live in [current-feature/](current-feature/) while the branch exists (`harness/core/07-workflow.md` §Feature lifecycle). This file only records which phases are done and what comes next.

## Current status and next step

- **Done:** phases 0–3 (all merged to `master`; `current-feature/` is empty).
- **Next:** phase 4 (UI in the standalone tab). Create `feature/ui` from `master`, then write `current-feature/plan.md` with the user (approval before implementing). Plan the hooks and components as a whole, including what the Owlbear popover (phase 5) needs.
- **Inputs from phase 3** (details: [data-model.md](data-model.md) §Manager layer):
  - Hooks talk only to `InventoryManager` (`src/manager/index.ts`): `getVersion()` + `subscribe()` for `useSyncExternalStore`; queries keep their identity per version, so selectors can return them directly.
  - Start: `InventoryManager.open(entry)` with an entry from `STORAGE_BACKENDS`; show `status` (`loading` / `error` with the `StorageError` code). In status `error` offer "Clear local data" (`canClearData`, `clearData()`).
  - Controls follow `manager.can(action)` (effective role incl. "view as player", `setViewAsPlayer`). Drop targets: `checkMove(id, target)`.
  - Commands reject with `ManagerError` (`not-found`, `forbidden`, `invalid-move`, `invalid-quantity`, `invalid-merge`) or `StorageError`; show them, never swallow them.
  - Texts: `loadTexts(ref)` on demand, `texts(ref)` for status and content; hide `dmNotes` unless `can("viewDmNotes")`.
  - Stacks: show `available` and `used` side by side; partial moves via the quantity argument of `moveInstance`; warn before a merge drops the source's alias and notes.
  - Misplaced instances (`isMisplaced`) appear under unassigned; consider a hint.
- **Open questions for the phase 4 plan:** popover size and layout; Playwright for click tests; how partial moves and merges are offered (dialog vs. drag and drop); where "Clear local data" lives besides the error screen.

## Working mode

- Feature lifecycle, plan and status files: `harness/core/07-workflow.md` §Feature lifecycle. When a phase is finished, mark it **Done** below and update "Current status and next step".
- Format new or changed files with `npx prettier --write <paths>` (Prettier defaults, see `harness/core/01-tech-stack.md`).
- Generic rules the user gives (naming, structure, style) go into `harness/core/`, project facts into `harness/project/`.

## Decisions

| Topic                    | Decision                                                                                                                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tabs                     | **Characters**, created by the GM (name, later more info). No Owlbear player names or ids are stored. A character tab is its own component that contains the inventory component.                                                                  |
| Item model               | `Item` = definition (created once by the GM). `ItemInstance` = one copy owned by a character or inside a container, with alias, player notes, quantity and its own contents. See [data-model.md](data-model.md).                                   |
| Player rights (v1)       | View everything, **move instances** (between characters and containers), **write player notes** on instances. Everything else is GM only. UX only, not security.                                                                                   |
| GM notes                 | Hidden in the UI only (accepted, see [deviations.md](deviations.md)).                                                                                                                                                                              |
| Owlbear storage          | **Hybrid:** compact item, instance and character records in room metadata (one key each). Long texts (description, GM notes, player notes) live in the GM's browser; the GM background answers requests via broadcast, players cache them locally. |
| Start                    | If Owlbear reports ready → Owlbear storage automatically. Otherwise the storage selection dialog on every start (Owlbear option disabled).                                                                                                         |
| Local mode               | The user is GM; a "view as player" switch makes player rights testable.                                                                                                                                                                            |
| Future (not planned yet) | A third storage: standalone tab ↔ Owlbear tab via browser messages to a background receiver.                                                                                                                                                       |

## Architecture

```
components → hooks → manager → storage (contract + registry) → controllers: memory | local | owlbear
                         ↘ model (classes with serialize/deserialize) ↙          owlbear → src/obr (SDK facade)
```

- `src/model/`: classes `Item`, `ItemInstance`, `Character` (with `serialize`, `static deserialize`), plain types `ItemLocation` and `Rarity`; size limits.
- `src/storage/`: `interface/` (`InventoryStorage` contract), `backends/` (one folder per controller: `memory/`, `local/`, `owlbear/` in phase 5; `shared/` for tools used by several), `registry/` (`STORAGE_BACKENDS`), `testing/` (contract suite, fakes). Details: [data-model.md](data-model.md) §Storage layer.
- `src/storage/backends/owlbear/`: Owlbear controller (phase 5) with its `dto/`, `texts/` (cache), `text-server/` (GM background) and `text-protocol/`; loaded via dynamic `import()`. SDK access only through thin services in `src/obr/`.
- `src/manager/inventory-manager.ts`: CRUD, `assignItem` (creates an instance), `moveInstance` with cycle and `hasInventory` checks, role-based rules, tree building, derived values (total weight, instance count), `update…(id, fn)` on clones, a version counter for `useSyncExternalStore`.
- `src/hooks/`: `useInventoryManager`, `useCharacters`, `useItems`, `useInstancesAt`, `useInstance`, `useTexts`.
- `src/components/`: `app`, `storage-select`, `ui`, `character-tab`, `inventory` (recursive `Inventory` + `InstanceRow`), `instance-details`, `dm/item-catalog`, `dm/item-editor`, `dm/assign-dialog`.

## Phases

0. Harness docs, remove template example code. **Done.**
1. Model + Vitest (classes with accessors, `serialize`/`deserialize`, limits, normalization). **Done.**
2. Storage interface, local + memory backends, registry, tests. **Done.**
3. Manager (CRUD, assign/move/split/merge/use, cycle check, rights, view as player, tree, weight, subscriptions, lazy texts, clear local data), tests against memory, local and a lazy-texts fake. **Done.**
4. UI in the standalone tab with the local backend: start dialog, design tokens, tabs, recursive inventory, details, GM catalog/editor/assign, character management, "view as player". Decide popover size and Playwright for click tests.
5. Owlbear backend: auto detection, room metadata records with budget display, GM background text server, local text cache, JSON export/import.
6. `/harness-review`, live test checklist (GM + player), first release after asking.

## Risks

- Room budget (8 KB): roughly 30 items + 60 instances. Measure in phase 5; the storage contract allows another controller.
- Long texts are bound to one GM browser (known issue #2).
