# Builders

> SDK 3.1.0 · Sources: `lib/builders/*.d.ts`, `lib/index.d.ts`, SDK source `src/builders/*.ts` (MIT); docs "Reference / Builders" (overview only, not needed) · Updated: 2026-10-06

## Purpose
Builders create **valid new items** with sensible defaults (fluent API, `.build()` at the end). Use them for every new item instead of hand-writing objects. Then add the result with `OBR.scene.items.addItems([...])` (shared) or `OBR.scene.local.addItems([...])` (only this user). Item fields: [items.md](items.md).

## Factory functions
```ts
import { buildImage, buildShape, buildText, buildLabel, buildCurve, buildLine, buildPath,
         buildPointer, buildRuler, buildLight, buildWall, buildEffect, buildBillboard,
         buildImageUpload, buildSceneUpload } from "@owlbear-rodeo/sdk";

buildImage(image: ImageContent, grid: ImageGrid)       // image = { url, mime, width, height }, grid = { dpi, offset }
buildBillboard(image: ImageContent, grid: ImageGrid)
buildImageUpload(file: File | Blob) / buildSceneUpload() // → upload objects for the Assets API, not items
buildShape() buildText() buildLabel() buildCurve() buildLine() buildPath()
buildPointer() buildRuler() buildLight() buildWall() buildEffect()
```

## Common methods (all item builders)
`id`, `name`, `description`, `position`, `rotation`, `scale`, `visible`, `locked`, `layer`, `zIndex`, `disableAutoZIndex`, `attachedTo`, `disableAttachmentBehavior`, `disableHit`, `metadata`, `createdUserId`, `lastModified`, `lastModifiedUserId`, then `build()`.

Defaults set by the base builder (SDK source): new `uuid` id, `name: "Item"`, `zIndex: Date.now()`, `createdUserId` / `lastModifiedUserId` = **`OBR.player.id`**, position 0/0, scale 1, visible, unlocked, empty metadata, **layer `POPOVER`**.

## Type-specific methods and default layer
| Builder | Specific methods | Default layer |
| --- | --- | --- |
| Image | `text`, `textItemType`, `textWidth/Height`, `plainText`, `richText`, `textType`, `textPadding`, font and text style setters (`fontFamily`, `fontSize`, `fontWeight`, `textAlign*`, `textFill*`, `textStroke*`, `textLineHeight`) | **`POPOVER` → set it explicitly** (`CHARACTER`, `PROP`, `MAP` …) |
| Shape | `width`, `height`, `shapeType`, `style`, `fillColor/Opacity`, `strokeColor/Opacity/Width/Dash` | `DRAWING` |
| Text | `text`, `width`, `height` (`"AUTO"` or px), `plainText`, `richText`, `textType`, `padding`, font setters, `fill*`, `stroke*`, `lineHeight` | `TEXT` |
| Label | Text setters (plain only) + `style`, `backgroundColor/Opacity`, `cornerRadius`, `pointerWidth/Height/Direction`, `min/maxViewScale` | `TEXT` |
| Curve | `points`, `style`, `fill*`, `stroke*`, `tension`, `closed` | `DRAWING` |
| Line | `startPosition`, `endPosition`, `style`, `stroke*` | `DRAWING` |
| Path | `commands`, `fillRule`, `style`, `fill*`, `stroke*` | `DRAWING` |
| Pointer | `color`, `radius` | `POINTER` |
| Ruler | `startPosition`, `endPosition`, `measurement`, `variant` | `RULER` |
| Light | `sourceRadius`, `attenuationRadius`, `falloff`, `innerAngle`, `outerAngle`, `lightType` | `FOG` |
| Wall | `points`, `doubleSided`, `blocking` | `FOG` |
| Effect | `width`, `height`, `sksl` (shader), `effectType`, `uniforms`, `blendMode` | **`POPOVER` → set it** ([effects.md](effects.md)) |
| Billboard | `minViewScale`, `maxViewScale` | **`POPOVER` → set it** |
| ImageUpload | `grid`, `dpi`, `offset`, name/description/rotation/scale/locked/visible, text setters | upload object ([apis/assets.md](../apis/assets.md)) |
| SceneUpload | `name`, `fog*`, `grid*`, `items`, `baseMap`, `thumbnail` | upload object ([apis/assets.md](../apis/assets.md)) |

## Implementation in this harness
- **Builders need the SDK to be ready:** the constructor reads `OBR.player.id`, which throws before `onReady` (SDK source). Call builders only inside facade services after `obrReady`.
- Put item creation in a service (e.g. `obr-marker.service.ts`) with a small factory per item kind. Always set `layer`, `name` and your **metadata marker** (`metadata({ [MARKER_KEY]: {...} })`) so the extension can find and clean up its own items.
- Decorations on a token: `.attachedTo(token.id).position(token.position).disableHit(true).locked(true)`. Choose `disableAttachmentBehavior` deliberately (e.g. keep `DELETE` inherited so they disappear with the token).
- Previews and feedback: build the same item but add it with `scene.local.addItems` or use the Interaction API ([apis/interaction.md](../apis/interaction.md)).
- Image URLs: your own assets via `assetUrl()` with full `ImageContent` (`width`, `height`, `mime`), or uploads via the Assets API.

## Pitfalls and limits
- A forgotten `.layer(...)` on Image, Billboard or Effect puts the item on the `POPOVER` layer, where it behaves unlike a token or prop.
- `zIndex` defaults to `Date.now()`. Builders created in a loop get increasing values, so order matters.
- `addItems` with many items: batch them into one call.
- Players can create items only if room permissions allow it for that layer ([permission.md](permission.md)). Check before offering the action.

## Claude workflow
- Ask the user: which layer, visible to all or local only, attached to what, can players edit or delete it?
- Live test (by the user): the item appears on the right layer for both clients, attachments follow and are removed with the token, a player without permission gets no broken action.
