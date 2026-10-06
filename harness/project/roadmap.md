# Roadmap

Agreed rough plan (2026-10-06). Details are planned at the start of each phase. One feature branch per phase; commits only after asking.

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
- `src/storage/`: `InventoryStorage` interface (CRUD for items, instances and characters; exact data format at the boundary decided in phase 2, `loadTexts/saveTexts`, `subscribe`, `getRole`, `capabilities`), storage registry `{ id, label, isAvailable(), create() }`, local and memory backends.
- `src/obr/obr-inventory.storage.ts`: Owlbear backend, loaded via dynamic `import()`.
- `src/manager/inventory-manager.ts`: CRUD, `assignItem` (creates an instance), `moveInstance` with cycle and `hasInventory` checks, role-based rules, tree building, derived values (total weight, instance count), `update…(id, fn)` on clones, a version counter for `useSyncExternalStore`.
- `src/hooks/`: `useInventoryManager`, `useCharacters`, `useItems`, `useInstancesAt`, `useInstance`, `useTexts`.
- `src/components/`: `app`, `storage-select`, `ui`, `character-tab`, `inventory` (recursive `Inventory` + `InstanceRow`), `instance-details`, `dm/item-catalog`, `dm/item-editor`, `dm/assign-dialog`.

## Phases
0. Harness docs, remove template example code. **Done.**
1. Model + Vitest (parsers, accessors). **Done.**
2. Storage interface, local + memory backends, registry, tests.
3. Manager (CRUD, assign/move, cycle check, rights, tree, weight, subscriptions), tests against the memory backend.
4. UI in the standalone tab with the local backend: start dialog, design tokens, tabs, recursive inventory, details, GM catalog/editor/assign, character management, "view as player". Decide popover size and Playwright for click tests.
5. Owlbear backend: auto detection, room metadata records with budget display, GM background text server, local text cache, JSON export/import.
6. `/harness-review`, live test checklist (GM + player), first release after asking.

## Risks
- Room budget (8 KB): roughly 30 items + 60 instances. Measure in phase 5; the storage interface allows another backend.
- Long texts are bound to one GM browser (known issue #2).
