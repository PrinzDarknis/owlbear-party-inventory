# Templates

Copy-ready starting points. They use neutral placeholders (`com.example.my-plugin`, `/my-plugin`, `Example`, `ComponentName`). Replace them when copying.

| Template | Copy to | Purpose |
| --- | --- | --- |
| `component/` | `src/components/<feature>/<name>/` | Function component + CSS + barrel |
| `hooks/use-obr-subscription.hook.ts` | `src/hooks/` | Load + subscribe + safe async unsubscribe (base for all OBR hooks) |
| `hooks/use-obr-ready.hook.ts` | `src/hooks/` | Gate rendering until the SDK is ready |
| `hooks/use-player-role.hook.ts` | `src/hooks/` | Live GM/player role (UI only) |
| `hooks/use-obr-theme.hook.ts` | `src/hooks/` | Owlbear theme → CSS variables |
| `hooks/use-room-records.hook.ts` | `src/hooks/use-<domain>.hook.ts` | Pattern for a domain hook |
| `obr/obr.ts` | `src/obr/` | `obrReady`, `sceneReady`, `isGM`, `jsonSize` |
| `obr/index.ts` | `src/obr/` | Facade `api` |
| `obr/constants.ts` | `src/obr/` | Namespace, keys, channels, `assetUrl` |
| `obr/obr-session.service.ts` | `src/obr/` | Role + theme access |
| `obr/obr-menu.service.ts` | `src/obr/` | Context-menu registration |
| `obr/obr-example.service.ts` | `src/obr/obr-<domain>.service.ts` | Domain service: validated load/save/subscribe, size budget, broadcast allowlist, item loop guard |
| `obr/migrations/index.ts` | `src/obr/migrations/` | Versioned, GM-only, idempotent migrations |
| `model/example/` | `src/model/<domain>/` | Plain-type model: types + parser/type guard for untrusted data (for class models see `core/04-conventions.md` §Models) |
| `utils/debounce.service.ts` | `src/utils/` | Keyed debounce whose promise resolves after the write |
| `entries/entry.html` | `html/popover.html` (or `html/<context>.html`) | HTML entry for a UI iframe |
| `entries/background.html` | `html/background.html` | HTML entry for the background page |
| `entries/main-popover.tsx` | `src/main-popover.tsx` | UI entry (mounts `App`) |
| `entries/app.component.tsx` | `src/components/app/` | Root component: ready gate, theme, role |
| `entries/main-background.ts` | `src/main-background.ts` | Background entry (menus, listeners) |
| `config/package.json` | `./` | Scripts + dependency versions (tested baseline) |
| `config/tsconfig*.json` | `./` | Strict TS config (app + node) |
| `config/eslint.config.js` | `./` | ESLint 9 flat config |
| `config/gitignore` | `./.gitignore` | Ignores build output, `.env*` and `.claude/settings.local.json` |
| `config/vite-env.d.ts` | `src/` | Vite client types (`import.meta.env`) |
| `config/icon.svg` | `public/` | Placeholder icon (manifest, action, example menu) |
| `config/vite.config.ts` | `./` | Multi-page build, CORS |
| `config/manifest*.json` | `public/` | Production / dev manifest |
| `config/version-update.mjs` | `./` | Cross-platform SemVer bump |
| `config/index.css` | `src/index.css` | Global CSS variables |
| `project/*.md` | `harness/project/` | Empty skeletons for the project-specific docs |
| `project/current-feature/` | `harness/project/current-feature/` (only on a feature branch) | `plan.md` + `status.md` for the feature in progress (`core/07-workflow.md` §Feature lifecycle) |

Setup order and commands: [`harness/NEW-PLUGIN.md`](../NEW-PLUGIN.md). Note: a fresh `npm create vite` scaffold is **not** used, because current Vite templates ship oxlint, TypeScript 6 and Vite 8, which deviate from the harness stack.

The templates are type-checked only after being copied into `src/` (`tsconfig.app.json` includes only `src`). They are linted in place by `npm run lint`.
