# Manifest

> SDK 3.1.0 · Sources: docs "Reference / Manifest" (pasted by the user 2026-10-05), `sdk-tutorials/hello-world/public/manifest.json` (MIT) · Updated: 2026-10-05

## Purpose
`manifest.json` describes the extension and tells Owlbear what to load. It is required. The user adds an extension by the manifest's URL.

## Fields
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | **max 45 characters** |
| `version` | string | yes | Keep it in sync with `package.json` (see `harness/core/06-build-release.md`) |
| `manifest_version` | number | yes | Currently `1` |
| `description` | string | – | **max 128 characters** |
| `icon` | string | – | Path to the extension icon |
| `author` | string | – | Public display name or handle. **Never an email** (privacy) |
| `homepage_url` | string | – | Link to a homepage (e.g. repo or README) |
| `action` | ManifestAction | – | Toolbar action + popover (below) |
| `background_url` | string | – | Page loaded as an invisible background iframe |
| `permissions` | ManifestPermission[] | – | Browser permissions for **all** iframes of the extension (below) |

### ManifestAction
The initial state only. Change it at runtime with the Action API ([apis/action.md](../apis/action.md)).
| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Initial title (tooltip) |
| `icon` | string | Initial icon |
| `popover` | string | URL of the popover page |
| `width` | number | Optional **max** width of the popover |
| `height` | number | Optional **max** height of the popover |

### ManifestPermission
Maps to the iframe [`allow`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLIFrameElement/allow) attribute.
```json
{ "name": "<ManifestPermissionName>", "reason": "why the extension needs it" }
```
Allowed names: `clipboard-write`, `clipboard-read`, `autoplay`, `bluetooth`, `camera`, `microphone`, `usb`, `display-capture`, `hid`.

## Implementation in this harness
- Two manifests in `public/`: `manifest.json` (production, with base path) and `manifest.dev.json` (dev, no prefix). Templates are in `harness/templates/config/`.
- Paths inside the manifest are absolute from the host root (`/my-plugin/html/popover.html`). In production they include the hosting base path, which must match `PROD_BASE_PATH`.
- `version` is bumped by `version-update.mjs` in all three files.

## Pitfalls and limits
- **Request only the permissions you need** (data minimization, store review). Each one needs a meaningful `reason`. Typical cases:
  - `clipboard-write` for "copy to clipboard" buttons,
  - `autoplay` if audio or video should start without a click inside the iframe (e.g. sounds played from the background page after a broadcast),
  - `camera` / `microphone` / `display-capture` only for media features, and say so in the description.
- Permissions apply to **all** iframes of the extension, not to individual pages.
- Name and description limits are enforced. Keep them short and test in the UI.
- A changed manifest is only picked up after the extension is reloaded or re-added in Owlbear.

## Claude workflow
- When a feature needs a browser capability (audio autoplay, clipboard, media), add the permission with a reason to **both** manifests and tell the user why.
- Ask the user for `author` and `homepage_url`. Do not invent them, and never use personal contact data.
- Live test (by the user): re-add the dev manifest, check that name, icon and popover size look right, and that features which need permissions work without browser prompts or errors.
