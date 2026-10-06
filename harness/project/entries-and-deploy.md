# Entries and Deployment

## Iframe contexts
| Context | HTML | TS entry | Registered via |
| --- | --- | --- | --- |
| Action popover (also the standalone tab) | `html/popover.html` | `src/main-popover.tsx` | `manifest.action.popover` |
| Background | `html/background.html` | `src/main-background.ts` | `manifest.background_url` |

The popover page must also work **outside Owlbear** (opened directly in a browser tab). It must not block on `OBR.onReady` there; the storage selection handles this (see [roadmap.md](roadmap.md)).

## Hosting
- Host: GitHub Pages (`gh-pages` branch)
- Production base path: `/owlbear-party-inventory`. It must match `public/manifest.json` and `PROD_BASE_PATH` in `src/obr/constants.ts`.
- Production manifest URL: `https://prinzdarknis.github.io/owlbear-party-inventory/manifest.json` (not deployed yet)
- Dev manifest URL: `http://localhost:5173/manifest.dev.json`
- Standalone tab (dev): `http://localhost:5173/html/popover.html`

## Release specifics
None yet. Follows `harness/core/06-build-release.md`.
