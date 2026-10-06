# Math, Matrix, Vector2/3, BoundingBox

> SDK 3.1.0 · Sources: `lib/math/Math2.d.ts`, `lib/math/MathM.d.ts`, `lib/types/{Vector2,Vector3,Matrix,BoundingBox}.d.ts`; docs "Reference / Math …" not provided · Updated: 2026-10-06

## Purpose
Geometry helpers that ship with the SDK. Use them instead of writing your own vector and matrix code.

## Types
```ts
interface Vector2 { x: number; y: number }
interface Vector3 { x: number; y: number; z: number }
type Matrix = [n, n, n, n, n, n, n, n, n];       // 3×3 affine matrix (9 numbers)
type BoundingBox = { min: Vector2; max: Vector2; width: number; height: number; center: Vector2 };
```

## `Math2` (Vector2 helpers, static)
`add`, `subtract`, `multiply`, `divide`, `dot`, `magnitude`, `magnitudeSquared`, `normalize`, `distance`, `lerp`, `rotate`, `min`/`max`, `componentMin`/`componentMax`, `abs`, `sign`, `pow`, `clamp`, `roundTo`, `floorTo`, `compare`, `centroid`, `boundingBox(points)`, `pointInPolygon(point, polygon)`.
`multiply(a, b: Vector2 | number)` scales component-wise or by a scalar. `rotate(point, origin, angle)` uses degrees.

## `MathM` (Matrix helpers, static)
`fromPosition`, `fromRotation`, `fromScale`, `fromItem(item)` (the item's transform), `multiply`, `inverse`, `decompose(matrix)` → position, rotation and scale.
Typical use (from the SDK's JSDoc): **point coordinates of lines, curves and paths are local to the item**, so their world position is `MathM.decompose(MathM.multiply(MathM.fromItem(line), MathM.fromPosition(line.startPosition))).position`. Relative transform of B to A: `multiply(inverse(fromItem(a)), fromItem(b))`. Also: compute an attachment's world transform (`multiply(fromItem(parent), local)`), or convert a world point into an item's local space (`inverse(fromItem(item))`).

## Implementation in this harness
- Import from `@owlbear-rodeo/sdk` only inside `src/obr/` or pure helpers in `src/utils/geometry.service.ts`. These are pure functions, so they're easy to unit test.
- `Math2.pointInPolygon` + `Math2.distance` cover most "is the token inside the area or within range" features. Combine them with `OBR.scene.grid.getDistance` for grid-aware ranges ([scene.md](../apis/scene.md)).

## Pitfalls and limits
- Scene coordinates are pixels at grid DPI. Convert to grid units with `grid.getDpi()` / `getDistance`, not with hard-coded cell sizes.
- Rotation values on items are in **degrees**.

## Claude workflow
- Prefer the SDK helpers and put feature logic into pure, tested functions.
