# Dynamic Fog (lights and walls)

> SDK 3.1.0 · Sources: docs "Reference / Dynamic Fog" (provided by the user 2026-10-06), `lib/types/items/{Light,Wall}.d.ts`, `lib/builders/{Light,Wall}Builder.d.ts` · Updated: 2026-10-06

## Purpose
Owlbear's dynamic fog (line of sight) is driven by two item types: **`LIGHT`** (reveals fog and casts shadows) and **`WALL`** (blocks light, and optionally tokens). Extensions can create and manage them, e.g. torches attached to tokens, light spells, doors that toggle walls, or importers for walls from map files.
Base fog settings (color, filled) are in the Scene API ([apis/scene.md](../apis/scene.md)). Static fog shapes are normal items on layer `FOG`.

## Items
```ts
buildLight()   // layer FOG by default
  .attenuationRadius(px)        // light radius
  .sourceRadius(px)             // > 0 = soft shadows (slower); 0 = hard shadows (fast path)
  .falloff(n)                   // soft edge of the light
  .innerAngle(deg).outerAngle(deg)   // cone lights
  .lightType("PRIMARY" | "SECONDARY" | "AUXILIARY")
buildWall()    // layer FOG by default
  .points(Vector2[])            // polyline, local to the item
  .doubleSided(bool)            // false = single-sided shadows
  .blocking(bool)               // collision with lights and tokens
```

## Rules from the docs
- **Light types:**
  - `PRIMARY` casts shadows and always cuts fog when visible.
  - `SECONDARY` only reveals fog that a primary light can already see (e.g. a campfire becomes visible once a player's light has line of sight to it).
  - `AUXILIARY` casts shadows like a primary light but does **not** trigger secondary lights.
- **Elevation via `zIndex`:** dynamic fog takes over `zIndex` for lights and walls.
  - A light with `zIndex` n is only affected by walls with `zIndex` ≥ n. For negative values the absolute value counts, so a light at −1 only hits walls at ≤ −1. Use this for multi-storey maps.
  - `zIndex` < 0 → dynamic lighting is drawn **below** static fog (hidden by it). `zIndex` ≥ 0 → drawn **above** (it cuts static fog).
- **Performance:** dynamic fog is computed on the GPU.
  - Lights with `sourceRadius: 0` use the **fast path**. Use it for many lights (more than a few dozen), and soft shadows only for key lights. Both kinds can be mixed.
  - **Any `doubleSided` wall forces all lights onto the slow (soft) path.**
  - A visible secondary light needs a second shadow pass over all primary lights (up to about 2× render time). Use secondary lights in small or cheap scenes.

## Implementation in this harness
- A service `obr-lighting.service.ts` creates lights and walls with builders. Mark them with your metadata key so you can find, update and clean up only your own.
- **Light on a token:** `buildLight().attachedTo(token.id).position(token.position)…`. It then moves with the token. Keep `zIndex` consistent with the map's elevation scheme.
- Doors: toggle `blocking` (or remove the wall segment) with `updateItems` by ids, from a single writer (GM).
- Expose performance-relevant options (soft shadows, secondary lights) as settings with fast defaults.

## Pitfalls and limits
- Setting `zIndex` on lights or walls for ordering changes their **elevation** and fog behavior.
- Wall `points` are local to the wall item ([math.md](math.md)).
- Players need the matching permissions (`FOG_*`) to create or change fog items ([permission.md](permission.md)). Usually the GM manages them.

## Claude workflow
- Ask the user: who places lights and walls (GM or players)? Is the map multi-storey? How many lights are expected (performance)?
- Live test (by the user): as a player, fog reveals correctly around the token; walls block sight; a door toggle works for everyone; frame rate stays acceptable with the expected number of lights.
