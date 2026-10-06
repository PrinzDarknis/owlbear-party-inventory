# Owlbear Plugin Harness

A reusable working agreement for building **Owlbear Rodeo extensions** with Claude Code.
Fixed stack: **TypeScript + React + `@owlbear-rodeo/sdk`** (Vite, plain CSS).

## Layout
```
harness/
  README.md          this file
  NEW-PLUGIN.md      step-by-step checklist: empty folder → running plugin
  core/              GENERIC rules, the same for every plugin
    01-tech-stack.md        stack, dependencies, scripts
    02-architecture.md      iframe contexts, layering, ready handling, where data lives
    03-obr-sdk-guide.md     SDK cheat sheet and multi-user pitfalls
    04-conventions.md       folders, naming, TS/React/CSS style, git
    05-security.md          security, privacy (GDPR), review checklist
    06-build-release.md     Vite, manifests, versioning, deploy
    07-workflow.md          how Claude works here, definition of done
  owlbear/           GENERIC Owlbear SDK knowledge base (APIs, reference, tutorials, recipes); look up on demand
  templates/         GENERIC copy-ready code and doc skeletons (see templates/README.md)
  claude/            GENERIC Claude Code config (source of truth)
    settings.json           permissions (mirrored to .claude/settings.json)
    skills/                 /new-component, /new-obr-feature, /release, /harness-review, /harness-onboard
  scripts/
    sync-claude.mjs         mirrors harness/claude → .claude
  project/           PROJECT-SPECIFIC knowledge, the only folder that changes per plugin
```

## Precedence
1. Explicit user instructions in the session (within security, privacy and compliance limits).
2. `harness/project/deviations.md`, for the scope it names.
3. `harness/core/*`.

## Using the harness in a new plugin
**Step-by-step checklist with all commands: [NEW-PLUGIN.md](NEW-PLUGIN.md).** Short version:
1. Copy `harness/` and the root `CLAUDE.md` into the new repository.
2. Delete the contents of `harness/project/` and copy the skeletons from `harness/templates/project/` into it.
3. Run `node harness/scripts/sync-claude.mjs` to create `.claude/skills` and `.claude/settings.json`.
4. For a fresh repo: scaffold from `harness/templates/` (config, entries, obr, hooks). For an existing repo: run `/harness-onboard`.
5. Commit `harness/`, `CLAUDE.md` and `.claude/` (but not `.claude/settings.local.json`).

## Maintaining the harness
- Generic lessons go to `core/`, `templates/` or `owlbear/` (SDK facts). Facts about one plugin go to `project/`.
- `owlbear/` is linked, not @-imported, to save context. After an SDK upgrade, update it as described in `owlbear/README.md` → Maintenance.
- Edit skills and settings only in `harness/claude/`, then re-run the sync script.
- Keep core free of project names, keys and features. A quick check:
  `grep -riE "<project-slug>|<namespace>" harness/core harness/templates harness/claude`
