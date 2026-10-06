# Interaction API

> SDK 3.1.0 · Sources: docs "APIs / Interaction" (provided by the user 2026-10-06), `lib/api/InteractionApi.d.ts`, `lib/types/Interaction.d.ts`, SDK source `src/api/InteractionApi.ts` (MIT), `sdk-tutorials/custom-tool` · Updated: 2026-10-06

## Purpose
**High-frequency live updates** of items (dragging, drawing, resizing, animating) without handling networking yourself. Owlbear applies updates locally in real time, samples them at a lower rate for the network, and other players see an interpolated, smooth version.
Use it for anything that changes many times per second. For one-off changes use `scene.items.updateItems`.

## API
```ts
OBR.interaction.startItemInteraction<S extends Item | Item[]>(baseState: S): Promise<InteractionManager<S>>;
type InteractionManager<S> = [update: (recipe: (draft: Draft<S>) => void) => S, stop: () => void];
```
- `baseState`: new items (from builders) **or** existing scene items.
- `update(recipe)`: an Immer recipe on the previous state; it **returns the new state** (use it for the final commit).
- `stop()`: ends the interaction and its network traffic.

## Interactive values
Only these values use the fast path, so only these can change during an interaction (the same list applies to `scene.local.updateItems(…, fastUpdate = true)`):
| Item | Values |
| --- | --- |
| all items | `position`, `rotation`, `scale` |
| Curve | `points` |
| Image | `image.width` / `image.height` only, `grid` |
| Label | `text.plainText` only |
| Line | `startPosition`, `endPosition` |
| Path | `commands` |
| Ruler | `startPosition`, `endPosition`, `measurement` |
| Shape | `width`, `height` |

## Standard pattern (tool mode drag)
```ts
let interaction: InteractionManager<Line> | null = null;
onToolDragStart: async (ctx, e) => {
  const line = buildLine().startPosition(e.pointerPosition).endPosition(e.pointerPosition).build();
  interaction = await OBR.interaction.startItemInteraction(line);
},
onToolDragMove: (_, e) => { interaction?.[0]((l) => { l.endPosition = e.pointerPosition; }); },
onToolDragEnd: (_, e) => {
  if (!interaction) return;
  const [update, stop] = interaction;
  const final = update((l) => { l.endPosition = e.pointerPosition; });
  void OBR.scene.items.addItems([final]);   // commit once (or updateItems for existing items)
  stop(); interaction = null;
},
onToolDragCancel: () => { interaction?.[1](); interaction = null; },
```

## Implementation in this harness
- Keep interaction handling inside the tool or service in `src/obr/` (background page). Pure geometry (snapping, clamping) goes into `src/utils/` and calls `OBR.scene.grid.snapPosition` through the facade only at the start or end, not on every move.
- **Always commit and always stop:** the interaction is only a live preview. Persist the result with `addItems` / `updateItems` at the end (this also puts it on the **undo/redo stack**), then call `stop()`, on drag end **and** on cancel and deactivate.

## Pitfalls and limits
- **Interactions expire after 30 seconds:** network updates stop, but local updates continue. Others then see a frozen state. For longer operations, restart the interaction or commit intermediate states.
- Changing non-interactive values in a recipe won't render as expected. Change them in the final `addItems` / `updateItems`.
- `update` is synchronous and cheap, but don't do async work (SDK calls) inside the recipe.
- `startItemInteraction` is async. Guard against moves arriving before it resolves (`interaction` still `null`).

## Claude workflow
- Use together with [tool.md](tool.md) (modes) and [builders.md](../reference/builders.md).
- Live test (by the user): smooth movement for the actor; the second player sees a smooth (slightly delayed) movement; Esc cancels without leftovers; the final state persists after reload.
