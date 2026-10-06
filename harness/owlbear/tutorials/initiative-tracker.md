# Tutorial: Initiative Tracker (condensed)

> SDK 3.1.0 · Sources: docs "Tutorial - Initiative Tracker" (3 pages, provided by the user 2026-10-06), `owlbear-rodeo/sdk-tutorials/initiative-tracker` (MIT, final code) · Updated: 2026-10-06

## What the tutorial builds
An action popover that lists all characters with an initiative value, sorted from highest to lowest, plus a context-menu entry to add or remove characters.
1. **Context menu** (`contextMenu.js`), id `com.tutorial.initiative-tracker/context-menu`, with two icons:
   - "Add to Initiative": `every: [{ key: "layer", value: "CHARACTER" }, { key: ["metadata", KEY], value: undefined }]`
   - "Remove from Initiative": `every: [{ key: "layer", value: "CHARACTER" }]` (shown when the first doesn't match, so the first matching icon wins).
   - `onClick`: if all selected items lack the key → `window.prompt` for a value → `updateItems(context.items, …)` sets `item.metadata[KEY] = { initiative }`; otherwise `delete item.metadata[KEY]`.
2. **Item metadata** as storage: it is saved with the scene and synced to every player. The key is prefixed with the extension id (reverse domain notation).
3. **List** (`initiativeList.js`): `OBR.scene.items.onChange(renderList)` → collect items with the key → sort with `parseFloat(b) - parseFloat(a)` → render `<li>` entries.
4. `main.js` calls both setups inside `OBR.onReady`.

## Patterns to reuse
- **Toggle menu entry** via two icons and a metadata-existence filter ([apis/context-menu.md](../apis/context-menu.md)).
- **Per-token state in item metadata** when the data belongs to a token and the scene (initiative, conditions, markers).
- **Derived list from `items.onChange`**: the UI is a pure function of the scene items.
- Remove data with `delete item.metadata[KEY]` inside the update draft.

## What the harness does differently (and why)
| Tutorial | Problem | Harness |
| --- | --- | --- |
| Context menu registered in the **popover** iframe | `onClick` lives in that iframe and only works while the popover is open | register in the **background** page (`harness/owlbear/apis/context-menu.md`) |
| `node.innerHTML = \`${item.name} …\`` | item names are editable by any player → **HTML injection (XSS)** | React rendering, never `innerHTML` with data (`harness/core/05-security.md`) |
| `window.prompt` | blocking, poor UX, may be blocked in iframes | context-menu **embed** or popover with an input (anchored to `elementId`) |
| initiative stored as an unvalidated string | NaN sorting, arbitrary content from other clients | parser with number validation and bounds (`model/*.parse.ts`) |
| `updateItems(context.items, …)` | stale items as base; the whole `metadata` object is re-sent | update by **ids** (fresh read), touch only your key (`harness/owlbear/apis/scene.md`) |
| `onChange` without unsubscribe | listener leak on unmount | `useObrSubscription` hook with cleanup |
| no role checks | – | decide with the user whether players may add or remove (filter `roles`, UX only) |

## Claude workflow
- Blueprint for "track something per token and show a list": item metadata + context menu (background) + list hook + popover UI (`/new-obr-feature`, `/new-component`).
- Live test (by the user): add and remove via the context menu for GM and player (as intended); the list updates on both clients; a token with a malicious name (e.g. containing `<img>`) renders as plain text; it still works after closing the popover.
