# 07 – Working Agreement for Claude

## Before starting a task
1. Read `harness/project/README.md` and the project files relevant to the task (data model, deviations, known issues).
2. **Project rules override core rules** only where `harness/project/deviations.md` says so explicitly. Everything else follows `harness/core/`.
3. In legacy code that deviates, match the surrounding style for small changes. For new modules or files, follow core. Do not mix both styles within one file.
4. For anything touching persisted data, check `harness/project/data-model.md` first. Never change a key or format without a migration.
5. For any SDK feature, look it up in [`harness/owlbear/`](../owlbear/README.md) (index → topic page → recipe) before writing code. If a page is missing or contradicts the installed `.d.ts`, say so and update the page.

## While working
- Keep changes minimal and focused. No drive-by refactors outside the task. Note them in `harness/project/known-issues.md` instead.
- New OBR access goes through `src/obr/` (or the project's equivalent facade named in deviations).
- Use the skills: `/new-component`, `/new-obr-feature`, `/harness-review`, `/release`.
- Ask the user before:
  - deploying, pushing or creating PRs,
  - adding a runtime dependency,
  - changing persisted data formats or metadata keys,
  - deleting user data, migrations or backups.

## Definition of done
- [ ] `npm run lint` clean (no new warnings).
- [ ] `npm run build` green (includes `tsc -b`).
- [ ] Tests green if the project has tests (`npx vitest run`).
- [ ] Multi-user behavior considered: GM vs player, two clients, no write loops, late joiners.
- [ ] Security checklist from [05](05-security.md#review-checklist-used-by-harness-review) passed.
- [ ] `harness/project/*` updated (new keys/channels in `data-model.md`, new debt in `known-issues.md`, fixed issues removed).
- [ ] A live test checklist was handed to the user (see below). The task is reported as *verified in Owlbear* only after the user confirms it.

## Live testing in Owlbear (user only)
Live tests need an Owlbear account and a room. **Claude never logs in to Owlbear and never asks for or handles credentials, session tokens, room links or player names.** If such data shows up in a message or log, flag it and don't repeat it.

Split of work:
- **Claude:** automated checks (lint, build, tests if present), then a concrete checklist in the final message:
  - setup (dev manifest, roles, required settings, test data),
  - steps per role (GM / player),
  - expected result per step,
  - what to look for in which iframe console (popover, background, embed).
- **User:** runs the checklist and reports pass/fail per step. Console errors are sanitized before sharing (no room URLs, tokens or player names).

Standard setup for the checklist:
1. `npm run dev`.
2. In Owlbear: Profile → Extensions → Add custom extension → `http://localhost:5173/manifest.dev.json`.
3. Test as GM, then as a player in a second browser profile in the same room.
4. Check the browser console of **each iframe** (popover, background) for errors.

## Testing guidance (optional, recommended for logic)
- Use Vitest for `src/model/**` (parsers, defaults, migrations) and `src/utils/**`.
- Do not test the SDK. Test the facade consumers with a mocked `api` object.

## Keeping the harness healthy
- `harness/core`, `harness/templates`, `harness/claude` are **generic**. Never put project names, keys or features there. When you learn a generic lesson, add it to core. Project facts go to `harness/project/`.
- After editing `harness/claude/**`, run `node harness/scripts/sync-claude.mjs` to update `.claude/`.
