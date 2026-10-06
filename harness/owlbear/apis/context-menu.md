# Context Menu API

> SDK 3.1.0 · Sources: `lib/api/ContextMenuApi.d.ts`, `lib/types/ContextMenu.d.ts`, `lib/types/KeyFilter.d.ts`, SDK source `src/api/ContextMenuApi.ts` + `src/common/normalize.ts` (MIT) · Updated: 2026-10-05

## Purpose
Adds an entry to the context menu that appears when **items are selected**. It can run code on click (`onClick`) or show a small iframe inside the menu (`embed`), e.g. "link token to record", "apply condition" or a quick editor for the selection.

## API
```ts
OBR.contextMenu.create(item: ContextMenuItem): Promise<void>;
OBR.contextMenu.remove(id: string): Promise<void>;

interface ContextMenuItem {
  id: string;                                   // namespaced
  icons: ContextMenuIcon[];                     // first icon whose filter matches is shown
  onClick?: (context: ContextMenuContext, elementId: string) => void;
  shortcut?: string;                            // keyboard shortcut
  embed?: { url: string; height?: number };     // iframe inside the menu instead of a button
}
interface ContextMenuIcon { icon: string; label: string; filter?: ContextMenuIconFilter }
interface ContextMenuIconFilter {
  min?: number; max?: number;                   // number of selected items
  roles?: ("GM" | "PLAYER")[];
  permissions?: ("CREATE" | "UPDATE" | "DELETE" | Permission)[];
  every?: KeyFilter[];                          // all selected items must match
  some?: KeyFilter[];                           // at least one must match
}
interface KeyFilter {
  key: string | string[];                       // property path, e.g. "layer" or ["metadata", KEY]
  value: unknown;
  operator?: "==" | "!=";                       // default "=="
  coordinator?: "&&" | "||";                    // how this filter combines with the next one
}
interface ContextMenuContext { items: Item[]; selectionBounds: BoundingBox }
```
Several `icons` with different filters let one entry change its label or icon by state (e.g. "Add to tracker" vs "Remove from tracker" via `["metadata", KEY]` `==` / `!=` `undefined`).

## Implementation in this harness
- Register in the **background** page through a service (template `harness/templates/obr/obr-menu.service.ts`). **The `onClick` callback lives in the registering iframe** (SDK source: callbacks are kept in a local map), so it only works while that iframe is alive.
- Ids, icon and embed URLs: namespaced constants plus `assetUrl()`. The SDK only prefixes the origin, not your base path (`src/common/normalize.ts`).
- `onClick` gets fresh `context.items`. Update them with `OBR.scene.items.updateItems(context.items, …)` inside the service.
- **Open a popover next to the menu:** pass `elementId` from `onClick` as `anchorElementId` ([popover.md](popover.md)).
- **Embed:** its own HTML entry + `main-<name>.tsx`. The embed reads the current selection itself (`OBR.player.getSelection()` + `scene.items.getItems`) through the facade. Keep `height` small and fixed.

## Pitfalls and limits
- `roles` and `permissions` filters hide the entry. That is **UX, not security** (`harness/core/03-obr-sdk-guide.md` §Roles).
- Filters run on item properties: `layer`, `type`, `locked`, `metadata.<key>`, etc. Test with mixed selections (`every` vs `some`, `min`/`max`).
- Re-creating an entry with the same id replaces it *(derived: the SDK keys callbacks by id)*. Use this to update entries dynamically and call `remove` when a feature is turned off.
- Embeds are separate iframes. Use `useObrTheme()` there too.

## Claude workflow
- Skill: `/new-obr-feature` (menu service + handler) or `/new-component` (embed UI + HTML entry).
- Ask the user: who may see the entry (role)? Which items (layer, type, metadata state)? Button or embed? Single or multi-select?
- Live test (by the user): the entry appears only for matching selections and roles; the click/embed changes the right items; it also works when the action popover is closed.
