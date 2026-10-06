# Items (types and common fields)

> SDK 3.1.0 · Sources: `lib/types/items/*.d.ts`, docs "APIs / Scene / Items" (provided by the user 2026-10-06); the Reference / Items category was not expanded · Updated: 2026-10-06

## Purpose
An **item** is the basic building block of everything shown in a scene. All items share a base shape; each `type` adds its own fields. Create items with [builders](builders.md), and read and update them through the [Scene API](../apis/scene.md).

## Base `Item`
| Field | Notes |
| --- | --- |
| `id` (ro), `type` (ro) | `type` is the discriminator (`"IMAGE"`, `"SHAPE"`, …) |
| `name`, `description?` | user-visible name and description |
| `visible`, `locked` | hidden items are visible only to the GM *(Owlbear behavior)*; locked = not selectable for players |
| `position`, `rotation`, `scale` | `Vector2`, degrees, `Vector2` |
| `layer` | `MAP`, `GRID`, `DRAWING`, `PROP`, `MOUNT`, `CHARACTER`, `ATTACHMENT`, `NOTE`, `TEXT`, `RULER`, `FOG`, `POINTER`, `POST_PROCESS`, `CONTROL`, `POPOVER` |
| `zIndex`, `disableAutoZIndex?` | ordering within the layer |
| `attachedTo?` | parent item id (attachments follow the parent) |
| `disableAttachmentBehavior?` | subset of `VISIBLE`, `SCALE`, `ROTATION`, `POSITION`, `DELETE`, `LOCKED`, `COPY` that should **not** be inherited from the parent |
| `disableHit?` | not clickable or selectable (good for decorations) |
| `metadata` | your data under your namespaced key ([metadata.md](metadata.md)) |
| `createdUserId`, `lastModified` (ro), `lastModifiedUserId` (ro) | authorship; `lastModifiedUserId` is the loop guard |

## Item types
| type | Guard | Key fields |
| --- | --- | --- |
| `IMAGE` | `isImage` | `image { url, mime, width, height }`, `grid { dpi, offset }`, `text`, `textItemType` (tokens, maps, props) |
| `SHAPE` | `isShape` | `width`, `height`, `shapeType` (`RECTANGLE`/`CIRCLE`/`TRIANGLE`/`HEXAGON`), `style` (fill/stroke color, opacity, width, dash) |
| `TEXT` | `isText` | `text: TextContent` ([text-content.md](text-content.md)) |
| `LABEL` | `isLabel` | `text`, `style { backgroundColor, backgroundOpacity, cornerRadius, pointer*, min/maxViewScale }` |
| `CURVE` | `isCurve` | `points[]`, `style { …, tension, closed? }` |
| `LINE` | `isLine` | `startPosition`, `endPosition`, `style` |
| `PATH` | `isPath` | `commands` (MOVE/LINE/QUAD/CONIC/CUBIC/CLOSE), `fillRule`, `style` |
| `POINTER` | `isPointer` | `color`, `radius` |
| `RULER` | `isRuler` | `startPosition`, `endPosition`, `measurement`, `style.variant` |
| `LIGHT` | `isLight` | `attenuationRadius`, `sourceRadius`, `falloff`, `inner/outerAngle`, `lightType` ([dynamic-fog.md](dynamic-fog.md)) |
| `WALL` | `isWall` | `points[]`, `doubleSided`, `blocking` ([dynamic-fog.md](dynamic-fog.md)) |
| `EFFECT` | `isEffect` | shader effect: `effectType`, `uniforms`, `blendMode` … ([effects.md](effects.md)) |
| `BILLBOARD` | `isBillboard` | image that keeps its screen size, `style { min/maxViewScale }` |

Typical meanings: **tokens** = `IMAGE` on layer `CHARACTER` (or `MOUNT`/`PROP`); **maps** = `IMAGE` on `MAP`; **attachments** = items on `ATTACHMENT` with `attachedTo`.

## Implementation in this harness
- Filter with guards plus layer, e.g. `(i): i is Image => isImage(i) && i.layer === "CHARACTER"`. Re-export the guards from `src/obr` so components don't import the SDK.
- Your data goes into `item.metadata[KEY]`, parsed on read. Never trust `name` or `text` for logic (users edit them).
- Decorations your extension adds (rings, labels) → `attachedTo` the token + `disableHit: true` + your metadata marker, so you can find and clean them up.

## Pitfalls and limits
- Images reference uploaded assets (`image.url`). Don't build image items from arbitrary external URLs; use the [Assets API](../apis/assets.md) or your own hosted `assetUrl()` files.
- Fields can change across SDK versions. Check the `.d.ts` when touching less common types (`PATH`, `EFFECT`).

## Claude workflow
- Ask the user: which tokens exactly (layer, type, marked by metadata)? Should added decorations be visible to players?
- Live test (by the user): only the intended items are affected; attachments follow the token, and their cleanup works when the token is deleted.
