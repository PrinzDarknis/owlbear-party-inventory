# Popover API

> SDK 3.1.0 · Sources: docs "APIs / Popover" (provided by the user 2026-10-05), `lib/api/PopoverApi.d.ts`, `lib/types/Popover.d.ts`, docs "Getting Started" · Updated: 2026-10-05

## Purpose
Opens **additional iframe UI** from code, anchored to a position or element, e.g. a detail panel for a token, a picker, or a floating HUD.
- Main extension UI → action popover ([action.md](action.md)).
- Blocking dialog or full screen → [modal.md](modal.md).
- Small UI bound to the selected items → context-menu embed ([context-menu.md](context-menu.md)).

## API
```ts
OBR.popover.open(popover: Popover): Promise<void>;
OBR.popover.close(id: string): Promise<void>;
OBR.popover.getWidth(id) / setWidth(id, width) / getHeight(id) / setHeight(id, height);

interface Popover {
  id: string;                     // namespaced, e.g. `${PLUGIN_ID}/popover/details`
  url: string;                    // page to load (absolute path / URL)
  width: number; height: number;
  anchorReference?: "ELEMENT" | "POSITION";
  anchorElementId?: string;       // with "ELEMENT"
  anchorPosition?: { left: number; top: number };   // with "POSITION", screen px
  anchorOrigin?:    { horizontal: "CENTER"|"LEFT"|"RIGHT"; vertical: "BOTTOM"|"CENTER"|"TOP" };
  transformOrigin?: { horizontal: "CENTER"|"LEFT"|"RIGHT"; vertical: "BOTTOM"|"CENTER"|"TOP" };
  hidePaper?: boolean;            // no background/card; transparent overlay UI
  disableClickAway?: boolean;     // don't close on outside click
  marginThreshold?: number;       // min distance to the window edge
}
```
The docs confirm: `hidePaper` removes the colored background; `disableClickAway` keeps it open on outside clicks; `marginThreshold` = minimum distance to the document borders. *Derived:* the anchor and transform options follow MUI Popover semantics (Owlbear's UI is MUI-based). `anchorOrigin` is the point on the anchor, and `transformOrigin` is the point of the popover placed onto it.

## Implementation in this harness
- Each popover page is its own **HTML entry** plus `main-<name>.tsx`, registered in `vite.config.ts`.
- Service `api.popover.open(name, options)` builds `id` and `url` from constants (`${PLUGIN_ID}/popover/<name>`, `assetUrl("html/<name>.html")`).
- **Passing context** (e.g. which item to show): use URL query parameters with ids only (`?itemId=...`), then read the data inside the popover via the facade. Never put the data itself or personal data in the URL.
- Close from inside the popover with `api.popover.close(id)`. The popover knows its own id from a constant.
- For a position anchor (e.g. near a clicked token), convert scene coordinates to screen coordinates with the Viewport API ([viewport.md](viewport.md)).

## Pitfalls and limits
- What happens when a popover is opened with an id that is already open is **not documented** (docs "APIs / Popover"). Assume it replaces the old one, use stable ids per purpose, and close explicitly before re-opening when it matters.
- The docs list `marginThreshold` as boolean in the table but describe it as a number; the `.d.ts` says `number`, which is authoritative.
- The popover is a new iframe with its own `OBR.onReady`, React tree and state. Share data through metadata, broadcast (`destination: "LOCAL"` for this client's iframes only) or URL params.
- Popovers are local to the client that opened them.
- With `hidePaper`, make sure text stays readable on any map background (use theme colors and a shadow).

## Claude workflow
- Skill: `/new-component` for the content, plus a new HTML entry (`harness/templates/entries/`).
- Ask the user: anchor (element, position or token), size, should it close on outside click?
- Live test (by the user): opens at the right place, closes correctly, shows the right item, no console errors in the new iframe.
