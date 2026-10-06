# 01 – Tech Stack

The stack below is **fixed** for every Owlbear Rodeo plugin built with this harness. Deviations need an explicit entry in `harness/project/deviations.md`.

| Area | Choice | Notes |
| --- | --- | --- |
| Language | **TypeScript** (`strict: true`) | Additional flags: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`. No `any`; use `unknown` and narrow it. |
| UI | **React 19** | **Function components + hooks only.** No new class components. |
| Platform SDK | **`@owlbear-rodeo/sdk`** (≥ 3.x) | Imported **only** inside `src/obr/` (see [02-architecture](02-architecture.md)). |
| Bundler / dev server | **Vite** (≥ 6) + `@vitejs/plugin-react` | Multi-page build: one HTML entry per Owlbear iframe context. |
| Styling | **Plain CSS**, one file per component | Global tokens in `src/index.css`. Prefer Owlbear theme colors (`OBR.theme`) over hard-coded colors. No CSS-in-JS, Tailwind or UI kits unless listed in project deviations. |
| Linting | **ESLint 9 flat config** + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` | `npm run lint` must be clean. |
| Formatting | Prettier defaults (double quotes, trailing commas, 2 spaces, ~80 cols) | Format before committing. |
| Tests (optional) | **Vitest** | For pure logic (models, parsers, migrations). Mock the `src/obr/` facade, never the SDK internals. |
| Hosting | Static hosting (default: **GitHub Pages** via `gh-pages`) | Owlbear loads the plugin from `manifest.json` by URL. |
| Runtime | Node LTS (≥ 20) for tooling | All scripts must be cross-platform (Node scripts, no shell-specific paths). |

## Dependency policy
- Runtime dependencies: keep to `react`, `react-dom`, `@owlbear-rodeo/sdk`. Each additional runtime dependency must be justified in `project/deviations.md` (bundle size, maintenance, license, security).
- Pin major versions with `^`. TypeScript uses `~`.
- Run `npm audit` before every release. Never commit `.env` files or credentials.
- **Licenses of reused code:** Owlbear's official example extensions (dice, initiative-tracker, colored-rings, …) are **GPL-3.0**. Learn from their patterns (`harness/owlbear/recipes/`), but don't copy their code unless the plugin is GPL-licensed. `owlbear-rodeo/sdk` and `sdk-tutorials` are MIT (attribution required).

## Minimal `package.json` scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "version-update": "node ./version-update.mjs",
    "predeploy": "npm run version-update && npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```
Templates for `vite.config.ts`, the manifests and `version-update.mjs` are in [`harness/templates/config/`](../templates/config/).
