# Scene API (scene, items, local, grid, fog, history)

> SDK 3.1.0 · Sources: docs "APIs / Scene" + sub-pages Items, Local, Grid, Fog, History (provided by the user 2026-10-06), `lib/api/scene/*.d.ts`, `lib/types/Grid.d.ts`, SDK source `src/api/scene/SceneItemsApi.ts` (MIT) · Updated: 2026-10-06

## Purpose
A scene is the infinite canvas with maps, tokens, drawings, fog and so on. `OBR.scene` gives access to its readiness, **scene metadata**, the **items** in it, **local items** (visible only to this user), the **grid**, the base **fog** settings and the **undo/redo** history.
A room can be open **without** a scene, and the scene can change while the extension runs.

## API
```ts
// scene
OBR.scene.isReady(): Promise<boolean>;  onReadyChange(cb: (ready: boolean) => void): () => void;
OBR.scene.getMetadata() / setMetadata(update: Partial<Metadata>) / onMetadataChange(cb)

// items (shared with everyone)          // local (only this user, same API)
OBR.scene.items.getItems(filter?)        OBR.scene.local.getItems(filter?)
OBR.scene.items.updateItems(filterOrItems, draft => void)
                                         OBR.scene.local.updateItems(filterOrItems, draft => void, fastUpdate?: boolean)
OBR.scene.items.addItems(items) / deleteItems(ids) / getItemAttachments(ids) / getItemBounds(ids) / onChange(cb)
// filter: string[] (ids) | (item) => boolean | type guard (isImage, isShape, …)

// grid
OBR.scene.grid.getDpi(); getScale() → { raw: "5ft", parsed: { multiplier, unit, digits } }; setScale(raw)
OBR.scene.grid.get/setType("SQUARE"|"HEX_VERTICAL"|"HEX_HORIZONTAL"|"DIMETRIC"|"ISOMETRIC")
OBR.scene.grid.get/setMeasurement("CHEBYSHEV"|"ALTERNATING"|"EUCLIDEAN"|"MANHATTAN")
OBR.scene.grid.get/setColor("DARK"|"LIGHT"|"HIGHLIGHT"|string); get/setOpacity(0..1); get/setLineType("SOLID"|"DASHED"|"DOTTED"); get/setLineWidth(>0)
OBR.scene.grid.snapPosition(pos, snappingSensitivity?: 0..1, useCorners = true, useCenter = true): Promise<Vector2>
OBR.scene.grid.getDistance(from, to): Promise<number>   // EUCLIDEAN: exact distance; otherwise integer count of grid cells traversed
OBR.scene.grid.onChange(cb: (grid: Grid) => void)

// fog (base settings; fog shapes are items on layer FOG)
OBR.scene.fog.get/setColor(); get/setStrokeWidth(); get/setFilled(bool); onChange(cb: (fog: { filled; style: { color; strokeWidth } }) => void)

// history
OBR.scene.history.undo() / redo() / canUndo() / canRedo()
```

## How items calls really work (SDK source)
- **Filter by ids** (`string[]`) → Owlbear returns only those items. **Filter by function** → the SDK fetches **all** items and filters in your iframe. In big scenes, prefer ids.
- **`updateItems`** runs your Immer draft, then sends only the **top-level fields** that changed per item (`position`, `visible`, `metadata`, …). The value of a changed field is sent **as a whole**:
  - Changing one key in `item.metadata` sends the **entire `metadata` object** of that item. If another extension or client changed a different key of the same item's metadata in the meantime, your write can overwrite it.
  - Passing an **items array** (e.g. `context.items` or items from an earlier `onChange`) uses those possibly stale objects as the base. Passing **ids** (`string[]`) or a filter re-fetches fresh items first.
  - Updates without changes are dropped (no message is sent). This makes idempotent updates cheap and helps against write loops.
- `onChange` delivers **all** items of the scene on every change, not just the changed ones.
- `items.onChange` unsubscribe sends a global unsubscribe for this iframe *(derived from the source, same pattern as broadcast)*. Keep **one** items listener per iframe and dispatch inside it.

## Implementation in this harness
- Every scene-dependent service awaits `sceneReady()` (template `obr.ts`). Long-lived listeners also handle `onReadyChange(false)` (scene closed): clear caches and re-subscribe when ready again.
- Item reads go through type guards (`isImage`, …) plus parsers for **your** metadata key. Writes use **ids** for freshness and touch only your key: `item.metadata[KEY] = value`.
- **Scene vs room metadata:** data that belongs to one map (initiative order, encounter state) → scene metadata; campaign-wide → room metadata. The docs give no size limit for scene metadata. Assume it is small as well.
- **Local items** for per-user feedback (hover labels, previews, measurement text). Clean them up on tool deactivate or unmount. `fastUpdate` for high-frequency position updates, but only for values listed as "interactive values" (see [interaction.md](interaction.md)).
- Grid: use `snapPosition` for placing, and `getDistance` × `getScale().parsed.multiplier` + `unit` for displaying distances (`getDistance` counts cells and is exact only for `EUCLIDEAN`; `dpi` = pixel size of one cell, with per-grid-type meaning). Don't re-implement grid math (hex, isometric).
- History: item changes via `addItems` end up on the undo/redo stack (docs, Custom Tool tutorial). Whether metadata-only changes do is not documented, so don't rely on undo for those.

## Pitfalls and limits
- Changing the scene removes all items and invalidates cached ids. Reload on `onReadyChange`.
- Item metadata is shared with other extensions (e.g. stat or initiative extensions): write only your key, never replace `item.metadata` wholesale, and write soon after reading.
- `onChange` handlers that write → loop guard (`item.lastModifiedUserId === OBR.player.id`, idempotence). See `harness/core/03` §Loops.
- Locked items: players can't select them. Your extension can still update them, so respect `locked` in your UX.

## Claude workflow
- Skill: `/new-obr-feature` (scene/item service + parser + hook `useSceneReady()` / `useItems(filter)`).
- Ask the user: scene-bound or campaign-wide data? Which layer or item type? Visible to everyone or only locally?
- Live test (by the user): works after switching scenes and with no scene open; a change on one client shows on the other; other extensions' data on the same token stays intact.
