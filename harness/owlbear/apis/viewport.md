# Viewport API

> SDK 3.1.0 · Sources: docs "APIs / Viewport" (provided by the user 2026-10-06), `lib/api/ViewportApi.d.ts`, `lib/types/ViewportTransform.d.ts`, `lib/types/BoundingBox.d.ts` · Updated: 2026-10-06

## Purpose
Read and control the local **camera** (pan and zoom) of the scene, and convert points between scene coordinates and screen coordinates. Use it for "focus on token", "show the whole encounter", or anchoring popovers to scene positions.

## API
```ts
OBR.viewport.getPosition(): Promise<Vector2>;   setPosition(p: Vector2): Promise<void>;
OBR.viewport.getScale(): Promise<number>;       setScale(s: number): Promise<void>;
OBR.viewport.getWidth(): Promise<number>;       getHeight(): Promise<number>;   // viewport size in px
OBR.viewport.animateTo(t: ViewportTransform): Promise<void>;   // { position, scale }
OBR.viewport.animateToBounds(b: BoundingBox): Promise<void>;   // fit an area
OBR.viewport.reset(): Promise<ViewportTransform>;
OBR.viewport.transformPoint(p: Vector2): Promise<Vector2>;
OBR.viewport.inverseTransformPoint(p: Vector2): Promise<Vector2>;
```
- `transformPoint`: **viewport coordinate space → screen coordinate space**. `inverseTransformPoint`: **screen → viewport** (docs). *Derived:* "viewport space" means the scene/world coordinates of items and tool events.
- `reset()` fits the view to the map, or to the origin if there is no map. `getScale()` 1 = 1:1.
- Shortcut from the docs: a context menu `onClick` can call `animateToBounds(context.selectionBounds)` directly.

## Implementation in this harness
- **Focus on items:** `const b = await OBR.scene.items.getItemBounds(ids); await OBR.viewport.animateToBounds(b);`, wrapped as `api.viewport.focusItems(ids)`.
- **Popover at a token:** convert the token's position to screen coordinates and open the popover with `anchorReference: "POSITION"` ([popover.md](popover.md)).
- There are no change events, so the camera can't be observed. Read it on demand.

## Pitfalls and limits
- The viewport is **per client**. Moving it affects only the local user (and players who follow via sync view, an Owlbear feature). Don't move other players' cameras without an explicit user action.
- Points from tool events (`ToolEvent.pointerPosition`) are already in scene coordinates.

## Claude workflow
- Ask the user: should the camera move automatically, or only on a click?
- Live test (by the user): "focus" frames the right tokens at different zoom levels; popovers anchored to tokens appear at the token after panning.
