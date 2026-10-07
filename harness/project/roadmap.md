# Roadmap

Agreed rough plan (2026-10-06): the product-level view. Each phase is one feature with its own branch; its detailed plan and progress live in [current-feature/](current-feature/) while the branch exists (`harness/core/07-workflow.md` §Feature lifecycle). This file only records which phases are done and what comes next.

## Current status and next step
- **Done:** phase 0 and phase 1. Check `git branch` / `git log` whether `feature/model` is merged to `master` yet.
- **Next:** phase 2 (storage). Create `feature/storage`, then write `current-feature/plan.md` with the user (approval before implementing).
- **Open question for phase 2:** the data format at the storage boundary. Per `harness/core/04-conventions.md` §Models the default is to pass class instances (`Item`, `ItemInstance`, `Character`) and let each backend call `serialize()` / `deserialize()`; passing DTOs needs a real reason (then the DTO export must be justified).

## Working mode
- Feature lifecycle, plan and status files: `harness/core/07-workflow.md` §Feature lifecycle. When a phase is finished, mark it **Done** below and update "Current status and next step".
- Format new or changed files with `npx prettier --write <paths>` (Prettier defaults, see `harness/core/01-tech-stack.md`).
- Generic rules the user gives (naming, structure, style) go into `harness/core/`, project facts into `harness/project/`.

## Decisions
| Topic | Decision |
| --- | --- |
| Tabs | **Characters**, created by the GM (name, later more info). No Owlbear player names or ids are stored. A character tab is its own component that contains the inventory component. |
| Item model | `Item` = definition (created once by the GM). `ItemInstance` = one copy owned by a character or inside a container, with alias, player notes, quantity and its own contents. See [data-model.md](data-model.md). |
| Player rights (v1) | View everything, **move instances** (between characters and containers), **write player notes** on instances. Everything else is GM only. UX only, not security. |
| GM notes | Hidden in the UI only (accepted, see [deviations.md](deviations.md)). |
| Owlbear storage | **Hybrid:** compact item, instance and character records in room metadata (one key each). Long texts (description, GM notes, player notes) live in the GM's browser; the GM background answers requests via broadcast, players cache them locally. |
| Start | If Owlbear reports ready → Owlbear storage automatically. Otherwise the storage selection dialog on every start (Owlbear option disabled). |
| Local mode | The user is GM; a "view as player" switch makes player rights testable. |
| Future (not planned yet) | A third storage: standalone tab ↔ Owlbear tab via browser messages to a background receiver. |

## Architecture
```
components → hooks → manager → storage (interface) → storage/local | storage/memory | obr (ObrStorage)
                         ↘ model (classes with serialize/deserialize) ↙
```
- `src/model/`: classes `Item`, `ItemInstance`, `Character` (with `serialize`, `static deserialize`), plain types `ItemLocation` and `Rarity`; size limits.
- `src/storage/`: `interface/` (`InventoryStorage` contract), `document/` (shared serialized format), `backends/local`, `backends/memory`, `registry/`, `testing/` (contract suite, fakes). Layout and API: see the phase 2 plan, later `data-model.md`.
- `src/obr/storage/obr-inventory.storage.ts`: Owlbear backend, loaded via dynamic `import()`.
- `src/manager/inventory-manager.ts`: CRUD, `assignItem` (creates an instance), `moveInstance` with cycle and `hasInventory` checks, role-based rules, tree building, derived values (total weight, instance count), `update…(id, fn)` on clones, a version counter for `useSyncExternalStore`.
- `src/hooks/`: `useInventoryManager`, `useCharacters`, `useItems`, `useInstancesAt`, `useInstance`, `useTexts`.
- `src/components/`: `app`, `storage-select`, `ui`, `character-tab`, `inventory` (recursive `Inventory` + `InstanceRow`), `instance-details`, `dm/item-catalog`, `dm/item-editor`, `dm/assign-dialog`.

## Phases
0. Harness docs, remove template example code. **Done.**
1. Model + Vitest (classes with accessors, `serialize`/`deserialize`, limits, normalization). **Done.**
2. Storage interface, local + memory backends, registry, tests.
3. Manager (CRUD, assign/move, cycle check, rights, tree, weight, subscriptions), tests against the memory backend.
4. UI in the standalone tab with the local backend: start dialog, design tokens, tabs, recursive inventory, details, GM catalog/editor/assign, character management, "view as player". Decide popover size and Playwright for click tests.
5. Owlbear backend: auto detection, room metadata records with budget display, GM background text server, local text cache, JSON export/import.
6. `/harness-review`, live test checklist (GM + player), first release after asking.

## Risks
- Room budget (8 KB): roughly 30 items + 60 instances. Measure in phase 5; the storage interface allows another backend.
- Long texts are bound to one GM browser (known issue #2).
