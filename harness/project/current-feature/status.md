# Status

Snapshot of the current state. **Overwrite** this file after each step; never append history.

- **Current step:** 1. Contract (waiting for review and commit by the user)
- **Done last:** storage layer replanned as a whole (all three controllers); contract corrected (`StorageChange` without ids, `StorageError`, `RecordKind` removed); obsolete `src/storage/document/` removed; `plan.md` replaced.
- **Next action:** after the user's commit: step 2, shared tools in `src/storage/backends/shared/` (record-set from the removed document code, change-notifier, web-storage) + tests.
- **Open questions:** none
- **Blockers:** none
