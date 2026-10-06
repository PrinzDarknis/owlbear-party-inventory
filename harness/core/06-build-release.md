# 06 – Build, Manifest and Release

## Vite multi-page build
- `base: ""` makes the built asset paths relative, so the same build works under any sub-path.
- Register every HTML entry in `build.rollupOptions.input`. Entries live in `html/` (sub-folders like `html/context-menu/` are allowed).
- Dev server: `server.cors.origin = "https://www.owlbear.rodeo"`.
- Template: [`templates/config/vite.config.ts`](../templates/config/vite.config.ts).

## Manifests
There are two manifests in `public/`:

| File | Used for | URL prefix |
| --- | --- | --- |
| `manifest.json` | Production (hosted) | `/<base-path>` (e.g. GitHub Pages repo name) |
| `manifest.dev.json` | Local dev (`npm run dev`, add `http://localhost:5173/manifest.dev.json` in Owlbear) | none |

Fields: `name` (≤ 45 chars), `version`, `manifest_version: 1`, `author`, `description` (≤ 128 chars), `icon`, `homepage_url`, `action { title, icon, popover, width, height }`, `background_url`, `permissions` (browser permissions such as `autoplay` or `clipboard-write`, each with a reason). Details: [`harness/owlbear/reference/manifest.md`](../owlbear/reference/manifest.md).
- The production prefix must match the hosting path **and** the `PROD_BASE_PATH` constant in `src/obr/constants.ts`.
- Keep `version` identical in `package.json`, `manifest.json` and `manifest.dev.json`.
- `author` is a public display name or handle. Never put an email or other private contact data in it.
- Templates: [`templates/config/manifest.json`](../templates/config/manifest.json), [`manifest.dev.json`](../templates/config/manifest.dev.json).

## Versioning
- SemVer. `npm run version-update` bumps the **patch** version in all three files ([`templates/config/version-update.mjs`](../templates/config/version-update.mjs); pass `minor` or `major` as an argument).
- A version bump that changes the persisted data format requires a migration (see [02 §6](02-architecture.md#6-data-versioning-and-migrations)).

## Release flow (default: GitHub Pages)
1. Work is merged to `main`, and `git status` is clean.
2. `npm audit` shows no high or critical issues, or they are documented.
3. `npm run lint` and `npm run build` are green.
4. `npm run deploy`: `predeploy` bumps the version and builds, then `gh-pages -d dist` pushes `dist/` to the `gh-pages` branch.
5. Commit the version bump: `chore(release): vX.Y.Z`.
6. Smoke test in a real Owlbear room with the production manifest URL, as GM **and** as player (a second browser profile).

Deploying and pushing are **outward-facing actions**. Claude asks before running them (enforced in `.claude/settings.json`).
