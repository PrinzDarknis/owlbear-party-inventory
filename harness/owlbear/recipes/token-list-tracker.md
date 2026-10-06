# Recipe: Token list tracker (initiative, conditions, turn order)

> Based on: docs "Examples / Initiative Tracker" (provided by the user 2026-10-06) and the source of `owlbear-rodeo/initiative-tracker` (GPL-3.0: patterns only, no code copied) · SDK 3.1.0 · Updated: 2026-10-06

## Feature
Players or the GM mark tokens (context menu toggle), give them a value (e.g. initiative), and everybody sees a sorted list in the action popover with an "active" marker that can be advanced ("next turn").

## Architecture
| Concern | Where | How |
| --- | --- | --- |
| Data | **item metadata** `${PLUGIN_ID}/metadata` = `{ count: string \| number, active: boolean }` | lives and dies with the token and the scene; synced to everyone |
| Add/remove | context menu with two icons (add when the key is missing, remove otherwise) | filter: (`layer` CHARACTER **or** MOUNT) and `type` IMAGE, plus `permissions: ["UPDATE"]` |
| List | popover: `items.getItems()` + `items.onChange` → guard + map to view models | `useObrSubscription` hook in the harness |
| Edit value / next | popover → **optimistic local state**, then `updateItems([ids], …)` | the UI reacts instantly and the network catches up |
| Size | `ResizeObserver` on the list → `OBR.action.setHeight(listHeight + header)` | reset to the default height on unmount |

## Patterns worth copying
- **Hidden tokens:** the list includes `item.visible`. Only the GM sees entries for hidden tokens (`showHidden={role === "GM"}`). Always respect `visible` when listing tokens, or you leak hidden monsters to players.
- **Display name:** `item.text.plainText || item.name` (the token label first). Display only, never as an identifier.
- **Multi-select add:** when adding several tokens at once, give each an initial value so they are distinct.
- **Menu filter with OR:** `{ key: "layer", value: "CHARACTER", coordinator: "||" }, { key: "layer", value: "MOUNT" }, { key: "type", value: "IMAGE" }`.

## Harness mapping and improvements
- Register the context menu in the **background page** (the example registers it in the popover, so it only works while the popover is open).
- Write by **ids** and change only your key. For "next turn", update exactly two items (old active, new active) instead of rewriting all of them. Determine them by id, never by array index: the order of `updateItems` results is not guaranteed to match your sorted list.
- Store the value as a **number** and validate it with a parser (the example keeps strings and `parseFloat`s them on every sort).
- Turn-advance writes from several clients at the same time can conflict. Consider letting only the GM advance turns (UI) or accept last-write-wins.
- If the tracker must survive scene changes or include tokens from several scenes, use scene or room metadata instead. That is a different design.

## Claude workflow
- Skills: `/new-obr-feature` (item-metadata service + parser + hook), `/new-component` (list + row).
- Ask the user: who may add, edit or advance? Show hidden tokens to the GM only? Should it be sorted ascending or descending? Can values tie?
- Live test (by the user): GM and player add tokens; hidden tokens appear only for the GM; "next" moves the marker on both clients; the popover height follows the list; it works after closing the popover (context menu).
