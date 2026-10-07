# Feature: <name>

Branch: `feature/<slug>` · Rules: `harness/core/07-workflow.md` §Feature lifecycle

## Goal
<What the feature delivers and why, in a few sentences.>

## Scope
- In: <what belongs to this feature>
- Out: <what explicitly doesn't (later features, known limits)>

## Structure
Target tree of every folder this feature creates or extends, grouped by responsibility (`harness/core/04-conventions.md` §Folder structure rules). One line per file with its purpose.
```
src/<module>/
  index.ts              public API
  <role>/               e.g. interface/, backends/<impl>/, registry/, testing/
    <file>.ts           <purpose>
```

## Decisions
| Topic | Decision |
| --- | --- |
| <topic> | <decision, short reason> |

## Steps
Check a step only when it is implemented, tested and documented. A large step may link a sub-plan `step-<n>-<slug>.md`.
- [ ] 1. <step>
- [ ] 2. <step>
- [ ] Finish: lasting knowledge moved to `harness/project/*`, `current-feature/` emptied, merge after asking

## Verification
<How the feature is checked: tests, lint/build, manual or live checks.>
