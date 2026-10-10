# Status

Snapshot of the current state. **Overwrite** this file after each step; never append history.

- **Current step:** 4. Local controller (waiting for review and commit by the user)
- **Done last:** step 4: `src/storage/backends/local/` (`LocalInventoryStorage`, constants, `dto/` with `toDto` / `fromDto`), `WebStorageEvents` in `shared/web-storage`, `testing/fake-storage-events.ts`; 37 new tests.
- **Next action:** after the user's commit: step 5, registry `src/storage/registry/` (memory, local) + tests.
- **Open questions:** none
- **Blockers:** none
