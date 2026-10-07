# Status

Snapshot of the current state. **Overwrite** this file after each step; never append history.

- **Current step:** 1. Types and interface (waiting for review and commit by the user)
- **Done last:** step 1 restructured: contract types split by topic into `src/storage/interface/`, target tree for all of `src/storage/` added to `plan.md` → Structure, step paths updated.
- **Next action:** after the user's commit: step 2, `src/storage/document/` (document type, (de)serialization with entry validation, changeset application, `StorageChange` derivation) plus tests.
- **Open questions:** none
- **Blockers:** none
