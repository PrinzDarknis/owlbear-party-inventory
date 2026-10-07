# Status

Snapshot of the current state. **Overwrite** this file after each step; never append history.

- **Current step:** 2. Shared tools (waiting for review and commit by the user)
- **Done last:** write API changed: `apply(operations: readonly StorageOperation[])` replaces the nested `ChangeSet`; `applyOperations` (in order, via `clone()`) replaces `applyChangeSet`. Shared tools `record-set`, `change-notifier`, `web-storage` and `testing/fake-web-storage.ts` are in place.
- **Next action:** after the user's commit: step 3, contract suite `src/storage/testing/storage.contract.ts` and memory controller `src/storage/backends/memory/`.
- **Open questions:** none
- **Blockers:** none
