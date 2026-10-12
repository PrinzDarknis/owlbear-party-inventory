# Status

Snapshot of the current state. **Overwrite** this file after each step; never append history.

- **Current step:** 4. `rules/`
- **Done last:** step 3: `queries/` (tree walks along effective placements, weight counts `available` pieces including nested contents and is rounded once, instance count per definition) + tests.
- **Next action:** after the user's review and commit of step 3: permissions table (effective role, actions) and `validateMove` (target exists, `hasInventory`, no cycle via `isWithin`).
- **Open questions:** none
- **Blockers:** none
