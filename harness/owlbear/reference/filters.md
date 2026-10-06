# Filters (ItemFilter, KeyFilter)

> SDK 3.1.0 · Sources: `lib/types/ItemFilter.d.ts`, `lib/types/KeyFilter.d.ts`, `lib/types/ContextMenu.d.ts`, `lib/types/Tool.d.ts`, SDK source `src/api/scene/SceneItemsApi.ts` (MIT); docs "Reference / Filters" not provided · Updated: 2026-10-06

## Purpose
The SDK has two filter kinds:
1. **`ItemFilter`**: selects items for `scene.items` / `scene.local` calls. It runs as **code** (ids or a function).
2. **`KeyFilter`**: declarative matching on item or metadata properties, used where Owlbear evaluates the filter itself (context-menu icons, tool icons, mode cursors, `preventDrag`).

## ItemFilter
```ts
type ItemFilter<T extends Item> = string[]                      // ids → resolved by Owlbear
                                | ((item: Item) => item is T)   // type guard
                                | ((item: Item) => boolean);    // predicate
```
- Function filters run **in your iframe after fetching all items** (SDK source). Prefer ids for known items.
- Type guards narrow the result type: `getItems((i): i is Image => isImage(i) && i.layer === "CHARACTER")`.

## KeyFilter
```ts
interface KeyFilter {
  key: string | string[];        // property path: "layer", "type", "locked", ["metadata", KEY], ["metadata", KEY, "field"]
  value: unknown;                // compared value (undefined = "not set")
  operator?: "==" | "!=";        // default "=="
  coordinator?: "&&" | "||";     // combines this filter with the next one in the list
}
```
Where it is used:
| Place | Field | Evaluated against |
| --- | --- | --- |
| `ContextMenuIconFilter` | `every` / `some` (+ `min`, `max`, `roles`, `permissions`) | the selected items |
| `ToolFilter` | `metadata` (+ `activeTools`, `activeModes`, `roles`, `permissions`) | the **tool's** metadata |
| `ToolModeFilter` | `target` (+ `dragging`) | the item under the pointer |

Examples:
```ts
// only on tokens that already have our data
every: [{ key: "layer", value: "CHARACTER" }, { key: ["metadata", RECORD_KEY], value: undefined, operator: "!=" }]
// on images OR shapes
every: [{ key: "type", value: "IMAGE", coordinator: "||" }, { key: "type", value: "SHAPE" }]
```

## Implementation in this harness
- Keep KeyFilters next to the menu or tool registration in the service, built from the key constants (never inline strings for metadata keys).
- Use two icons with opposite filters for toggle entries ("Add" vs "Remove").

## Pitfalls and limits
- The exact semantics of chaining `coordinator` across more than two filters are not documented in the provided pages. Keep chains short and test them.
- KeyFilters only show or hide UI. They don't protect data (`harness/core/05-security.md`).

## Claude workflow
- Ask the user for the exact item set (layer, type, metadata state) before writing filters.
- Live test (by the user): select matching and non-matching items, including mixed selections; the entry shows exactly when expected.
