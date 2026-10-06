# Entries and Deployment

## Iframe contexts
| Context | HTML | TS entry | Registered via |
| --- | --- | --- | --- |
| Action popover | `html/<file>.html` | `src/main-<x>.tsx` | `manifest.action.popover` |
| Background | `html/background.html` | `src/main-background.ts` | `manifest.background_url` |

## Hosting
- Host: <GitHub Pages / other>
- Production base path: `<path>`. It must match `public/manifest.json` and the base-path constant.
- Production manifest URL: `<https://…/manifest.json>`
- Dev manifest URL: `http://localhost:5173/manifest.dev.json`

## Release specifics
<Anything that differs from core/06-build-release.md.>
