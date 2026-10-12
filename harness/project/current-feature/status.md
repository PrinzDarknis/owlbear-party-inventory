# Status

Snapshot of the current state. **Overwrite** this file after each step; never append history.

- **Current step:** 7. `InventoryManager`
- **Done last:** step 6: `TextCache` and `LazyTextsMemoryStorage` (+ tests); the storage contract suite no longer expects instance notes from `load()` of lazy controllers.
- **Next action:** after the user's review and commit of step 6: the `InventoryManager` class (lifecycle, status, version/subscribe, command queue, reload on changes, role + view as player, commands with text loading, error surfacing) and its integration tests; `src/manager/index.ts`.
- **Open questions:** none
- **Blockers:** none
