---
name: release
description: Prepare and (after explicit confirmation) publish a release of an Owlbear plugin - checks, version bump, build, deploy - following harness/core/06-build-release.md. Use when the user asks to release, deploy or publish the plugin.
argument-hint: [patch|minor|major]
disable-model-invocation: true
---

# Release

Bump type: `$ARGUMENTS` (default `patch`).

## 1. Preflight (read-only, stop and report on any failure)
1. `git status`: the working tree must be clean. Report the current branch (releases normally come from `main`).
2. `npm audit --omit=dev`: report high or critical findings.
3. `npm run lint`, then `npm run build`.
4. Check that `package.json`, `public/manifest.json` and `public/manifest.dev.json` have the same version, and that the production manifest paths match the base path in `harness/project/entries-and-deploy.md`.
5. If persisted data formats changed since the last release (`git log` / `git diff <last release>..HEAD -- src/model src/obr`), make sure a migration exists.
6. Read `harness/project/entries-and-deploy.md` for project-specific release steps.

## 2. Confirm
Summarize the preflight results and the planned new version, then **ask the user for explicit confirmation**. Deploying publishes to all players.

## 3. Publish (only after confirmation)
1. Bump the version: `node ./version-update.mjs <part>`, or the project's `npm run version-update` (see deviations). If the project's `predeploy` already bumps, don't bump twice.
2. `npm run deploy`.
3. Offer to commit `chore(release): vX.Y.Z` (and push only if the user asks).
4. Hand the user a smoke-test checklist for the production manifest (GM and player, expected results per step). The user runs it; Claude never logs in to Owlbear (see `harness/core/07-workflow.md` §Live testing). Report the release as verified only after the user confirms.
