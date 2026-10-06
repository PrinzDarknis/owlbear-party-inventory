# Recipe: Token decorations (rings, auras, badges)

> Based on: docs "Examples / Colored Rings" (provided by the user 2026-10-06) and the source of `owlbear-rodeo/colored-rings` (GPL-3.0: patterns only, no code copied) · SDK 3.1.0 · Updated: 2026-10-06

## Feature
Select a token → context menu → a small embedded panel with color buttons → toggle colored rings around the token. Several rings stack inward.

## Architecture
| Concern | Where | How |
| --- | --- | --- |
| Entry | **background page only** (manifest has `background_url`, **no action**) | registers a context menu with an **embed** (`url` = the extension's page, small fixed height) |
| Filter | `type` IMAGE + `layer` CHARACTER, `permissions: ["UPDATE"]` | |
| UI | the embed page reads `player.getSelection()` and shows which colors are already applied (`items.onChange`) | |
| Data | the decorations **are items**: `SHAPE` circles on layer `ATTACHMENT`, `attachedTo` = token id, marked with `${PLUGIN_ID}/metadata: { enabled: true }` | no separate state needed; the scene is the source of truth |
| Toggle | add: build and `addItems`; remove: find own items with `attachedTo` = token and the color → `deleteItems`, then re-scale the remaining ones | |

## Sizing a decoration to a token (the key formula)
A token image has its own grid (`item.grid.dpi`, `item.grid.offset`), and the scene has `scene.grid.getDpi()`. The size and center of the token in scene units:
```ts
// own code, harness style
const sceneDpi = await api.scene.gridDpi();                 // OBR.scene.grid.getDpi()
const k = sceneDpi / token.grid.dpi;                        // image px → scene px
const w = token.image.width * k, h = token.image.height * k;
const offset = { x: token.grid.offset.x * k, y: token.grid.offset.y * k };   // offset is in image px
const center = { x: token.position.x - offset.x + w / 2, y: token.position.y - offset.y + h / 2 };
const diameter = Math.min(w, h);                            // then apply token.scale
```
Build the decoration at `center` with `width = height = diameter` and `scale` = token scale (× a factor for stacking).

## Decoration item checklist
`.attachedTo(token.id)` · `.layer("ATTACHMENT")` · `.locked(true)` · `.disableHit(true)` (not selectable or clickable) · `.visible(token.visible)` (hidden tokens keep hidden rings) · `.name("…")` · `.metadata({ [MARKER_KEY]: {...} })` (find your own items) · fill opacity 0 for rings.

## Harness mapping and improvements
- The embed is its own HTML entry and React root (`useObrTheme` included). The menu lives in `src/main-background.ts` via `api.menu`.
- Find your decorations with **one** `getItems` filter on your marker key + `attachedTo`. Avoid repeated full-scene scans in loops.
- Batch: one `addItems` call for all new items, one `deleteItems` call, and one `updateItems` call for re-scaling.
- Keep the visual parameters (colors, stroke width, step factor) as constants or settings, and validate any user-chosen color against an allowlist.
- Attachments inherit delete, so they disappear with the token. Don't disable `DELETE` in `disableAttachmentBehavior`.

## Claude workflow
- Skills: `/new-obr-feature` (decoration service + marker parser), `/new-component` (embed UI + HTML entry).
- Ask the user: shape and look? Visible to everyone? Who may add or remove (permissions)? Stacking behavior?
- Live test (by the user): rings fit tokens of different sizes and grid settings (square/hex, different DPI); they move, rotate and delete with the token; hidden tokens keep hidden rings; players without UPDATE permission don't see the menu.
