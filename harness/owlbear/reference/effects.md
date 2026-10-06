# Effects (custom shaders) and Billboards

> SDK 3.1.0 · Sources: docs "Reference / Effects" (provided by the user 2026-10-06), `lib/types/items/{Effect,Billboard}.d.ts`, `lib/builders/{Effect,Billboard}Builder.d.ts`, SDK source `src/builders/*` (MIT) · Updated: 2026-10-06

## Purpose
**Effects** are items that render a custom shader written in **SkSL** (Skia's shading language, similar to GLSL). Use them for auras, weather, vignettes, highlights, animated markers, or post-processing such as color filters over an area.
**Billboards** are images that keep their screen size regardless of zoom (`minViewScale` / `maxViewScale`), e.g. markers or icons that must stay readable.

## API
```ts
buildEffect()                    // default layer POPOVER: set .layer(...)
  .effectType("STANDALONE" | "ATTACHMENT" | "VIEWPORT")
  .width(px).height(px)          // STANDALONE size
  .sksl(source)                  // shader code
  .uniforms([{ name, value }])   // value: number | Vector2 | Vector3 | Matrix
  .blendMode("SRC_OVER" | "MULTIPLY" | "SCREEN" | …)   // Skia blend modes
buildBillboard(image, grid).minViewScale(n).maxViewScale(n)   // default layer POPOVER: set .layer(...)
```
Effect types:
- `STANDALONE`: a rectangle at the item's `position` with `width` × `height`.
- `ATTACHMENT`: fills the bounds of the item named in `attachedTo`.
- `VIEWPORT`: fills the whole viewport.

## Shader basics
```glsl
uniform vec2 size;                 // built-in
half4 main(float2 coord) {         // coord in pixels, origin at the TOP LEFT (unlike WebGL)
  vec2 p = coord / size;
  return half4(p, 0.0, 1.0);
}
```
Built-in uniforms (declare only what you use): `size` (vec2), `position` (vec2, world), `scale` (vec2), `rotation` (float, degrees), `model` (mat3, local transform), `view` (mat3, viewport transform), `modelView` (mat3, full transform), `time` (float, unix seconds → animations).
**Post-processing:** on layer **`POST_PROCESS`** an extra `uniform shader scene;` is available, and `scene.eval(uv)` samples the rendered scene. Combine it with `modelView` to map coordinates, e.g. to recolor everything under an attached item.

## Implementation in this harness
- Keep SkSL sources as constants in `src/obr/effects/<name>.sksl.ts` (string export) with a header comment listing the uniforms they expect.
- Custom uniforms carry parameters (colors as `Vector3` 0..1, intensity as number). Change them with `updateItems` on `uniforms` and avoid rebuilding the item.
- Mark effect items with your metadata key and attach them (`ATTACHMENT` + `attachedTo`) so they move and delete with the token.
- `VIEWPORT` effects are visible to everyone who sees the item. For per-user visuals add them as **local** items (`scene.local.addItems`).

## Pitfalls and limits
- The default layer is `POPOVER`. Set a meaningful layer (`ATTACHMENT`, `PROP`, `POST_PROCESS` …), see [builders.md](builders.md).
- Shader compile errors only show at runtime. Test every shader in Owlbear, and keep a simple fallback.
- Effects run every frame on every client. `time`-based animation, many effects or post-processing over large areas cost GPU time, especially on weaker devices.
- Never build SkSL from user input or synced metadata. Use fixed shader sources and pass only validated numbers as uniforms.

## Claude workflow
- Ask the user: what should it look like (a reference image)? Is it animated? Who sees it (everyone or local)? Attached to what?
- Live test (by the user): the effect looks right at different zoom levels and in light and dark maps; it follows the token; performance is acceptable; it's removed together with the token.
