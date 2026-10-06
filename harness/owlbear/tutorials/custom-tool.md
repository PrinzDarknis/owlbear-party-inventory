# Tutorial: Custom Tool (condensed)

> SDK 3.1.0 · Sources: `owlbear-rodeo/sdk-tutorials/custom-tool` (MIT, final code), docs "Tutorial - Custom Tool" (3 pages, provided by the user 2026-10-06) · Updated: 2026-10-05

## What the tutorial builds
A **line-drawing tool** with a color setting:
- Manifest: **only `background_url`** (no action). Everything is registered from the background page in `OBR.onReady`.
- `OBR.tool.create` with `id: "<ns>/tool"`, an icon, and `defaultMetadata: { strokeColor: "red" }`.
- `OBR.tool.createMode` "Line" (icon filter `activeTools: [toolId]`):
  - `onToolDragStart`: `buildLine()` from the pointer position, using the color from `context.metadata`, then `OBR.interaction.startItemInteraction(line)`.
  - `onToolDragMove`: `update(line => { line.endPosition = pointer })`.
  - `onToolDragEnd`: a final `update`, then `OBR.scene.items.addItems([line])`, then `stop()`.
  - `onToolDragCancel`: `stop()`.
- `OBR.tool.createAction` "Color": `onClick(_, elementId)` opens a popover (`color-picker.html`, 80×40) anchored to `elementId` (anchor bottom-center → popover top-center).
- Color picker page: reads `OBR.tool.getMetadata(toolId)`, and on change calls `OBR.tool.setMetadata(toolId, { strokeColor })`.

## Notes from the tutorial text
- The toolbar is on the right side and is only shown when a scene is open and ready. Modes are on the left of the top menu, actions on the right. Actions have no active state.
- Tool metadata is persisted in local storage (per user). That is how the action (color picker) and the mode (drawing) communicate.
- With only one mode, Owlbear hides the mode from the top bar.
- The color picker is its own Vite page (`color-picker.html` registered in `vite.config.js`).
- `addItems` at drag end officially creates the item, stores it in the scene, and adds it to the **undo/redo stack**. Cancel = `stop()` without adding.

## Patterns to reuse
1. **Background-only extension:** if there is no main UI, leave out `action` and register everything in the background.
2. **Settings in tool metadata:** read them via `context.metadata` in handlers, edit them in a popover. No custom storage needed.
3. **Preview with interaction → commit once:** smooth for the drawing user, one write for everyone.
4. **Anchor popovers to the clicked control** with `elementId`.

## Mapping to this harness
| Tutorial | Harness equivalent |
| --- | --- |
| `OBR.*` calls in `main.js` | `src/main-background.ts` → `api.tool.registerLineTool()` in `src/obr/obr-tool.service.ts` |
| Icons `"/line.svg"` | `assetUrl("icons/line.svg")` (base path) |
| `typeof metadata.strokeColor === "string"` | a parser in `src/model/tool-settings.parse.ts` with an allowlist of colors |
| Color picker with `innerHTML` | React component in its own entry `html/tool-settings.html`, using `useObrTheme()` |
| Hard-coded ids | namespaced constants in `src/obr/constants.ts` |

## Claude workflow
- Use this tutorial as the blueprint for any "draw, place or measure on the map" feature (see [apis/tool.md](../apis/tool.md), [apis/interaction.md](../apis/interaction.md)).
- Live test (by the user): the tool appears with an open scene; dragging shows a live line; Esc cancels; the line persists and is visible to the second player; a color change applies to the next line.
