# Tool API (tools, modes, actions)

> SDK 3.1.0 · Sources: docs "Tutorial - Custom Tool" (provided by the user 2026-10-06), `lib/api/ToolApi.d.ts`, `lib/types/Tool.d.ts`, SDK source `src/api/ToolApi.ts` (MIT), `sdk-tutorials/custom-tool` (MIT) · Updated: 2026-10-05

## Purpose
Adds custom canvas interaction to the toolbar:
- **Tool**: an entry in the toolbar. It groups modes and actions and holds **tool metadata** (settings such as a color).
- **Tool mode**: left side of the tool menu. When active, it receives pointer and keyboard events on the map (click, drag, keys). Use it for drawing, measuring, placing or picking.
- **Tool action**: right side of the tool menu. A button with `onClick` only, e.g. open settings or clear.

Tools are only visible while a scene is open.

## API
```ts
OBR.tool.create(tool: Tool) / remove(id) / activateTool(id) / getActiveTool() / onToolChange(cb)
OBR.tool.getMetadata(toolId): Promise<Metadata | undefined>;  setMetadata(toolId, update: Partial<Metadata>)
OBR.tool.createMode(mode: ToolMode) / removeMode(id) / activateMode(toolId, modeId) / getActiveToolMode() / onToolModeChange(cb)
OBR.tool.createAction(action: ToolAction) / removeAction(id)

interface Tool {
  id: string; icons: ToolIcon[]; disabled?: ToolFilter; shortcut?: string;
  defaultMode?: string; defaultMetadata?: Metadata;
  onClick?: (ctx, elementId) => boolean | void | Promise<boolean | void>;   // truthy ⇒ activate the tool
}
interface ToolMode {
  id: string; icons: ToolIcon[]; disabled?: ToolFilter; shortcut?: string;
  cursors?: { cursor: string; filter?: ToolModeFilter }[];   // CSS cursor, first match wins
  preventDrag?: ToolModeFilter;                               // stop Owlbear's default drag for matches
  onClick?: (ctx, elementId) => boolean | void | Promise<…>;  // truthy ⇒ activate the mode
  onToolClick?: (ctx, e: ToolEvent) => boolean | void | Promise<…>;  // truthy ⇒ select e.target (if not locked)
  onToolDoubleClick?: (ctx, e) => boolean | void | Promise<…>;
  onToolDown / onToolMove / onToolUp?: (ctx, e: ToolEvent) => void;
  onToolDragStart / onToolDragMove / onToolDragEnd / onToolDragCancel?: (ctx, e: ToolEvent) => void;
  onKeyDown / onKeyUp?: (ctx, e: KeyEvent) => void;
  onActivate / onDeactivate?: (ctx) => void;
}
interface ToolAction { id: string; icons: ToolIcon[]; disabled?: ToolFilter; shortcut?: string;
  onClick?: (ctx, elementId) => void }

interface ToolIcon { icon: string; label: string; filter?: ToolFilter }
interface ToolFilter { activeTools?: string[]; activeModes?: string[]; permissions?: Permission[];
  roles?: ("GM"|"PLAYER")[]; metadata?: KeyFilter[] }          // metadata = tool metadata
interface ToolModeFilter extends ToolFilter { target?: KeyFilter[]; dragging?: boolean }
interface ToolContext { activeTool: string; activeMode?: string; metadata: Metadata }
type ToolEvent = { pointerPosition: Vector2; target?: Item; transformer?: boolean;
  altKey; shiftKey; ctrlKey; metaKey: boolean }
interface KeyEvent { code; key: string; altKey; shiftKey; ctrlKey; metaKey; repeat: boolean }
```
Linking modes and actions to a tool: give their icons `filter: { activeTools: [TOOL_ID] }`. That is how they appear in that tool's menu.

## Implementation in this harness
- Register tool, modes and actions in the **background** page (`obr-tool.service.ts` → `api.tool.register…`). Handlers live in the registering iframe (SDK source).
- Ids: `${PLUGIN_ID}/tool`, `${PLUGIN_ID}/tool/mode/<name>`, `${PLUGIN_ID}/tool/action/<name>`. Icons via `assetUrl()`.
- **Tool settings** (color, size): store them in **tool metadata** (`defaultMetadata` + `setMetadata`). Every handler gets them as `ctx.metadata`, so validate them like any metadata. Edit them in a popover anchored to the action's `elementId` (see the custom-tool tutorial).
- **Live preview while dragging:** use `OBR.interaction.startItemInteraction` ([interaction.md](interaction.md)) instead of writing to the scene on every move. Write once on drag end with `scene.items.addItems/updateItems`, and always `stop()` on end **and** cancel.
- Keep handlers small. Delegate the logic to pure functions in `src/model` or `src/utils` so it can be tested.

## Pitfalls and limits
- `onToolMove` and `onToolDragMove` fire very often. No metadata writes or broadcasts there; throttle if you must.
- Handle `onToolDragCancel` (Esc). Otherwise previews and interactions remain.
- `preventDrag` is needed when your mode drags on items that Owlbear would otherwise move.
- **Tool metadata is persisted in the user's local storage** (docs, Custom Tool tutorial): it is per user and per browser, not shared. Use it for UI settings only; shared results go into scene or item metadata.
- **If a tool has only one mode, Owlbear hides the mode bar.** Your single mode is active but not visible as a button (docs).
- `roles` and `permissions` in filters are UX only.

## Claude workflow
- Skill: `/new-obr-feature` (tool service in the background + pure logic) and `/new-component` for the settings popover.
- Ask the user: which mode interactions (click, drag, keys)? Who may use the tool? Which settings? What gets created, and in which layer?
- Live test (by the user): tool/mode/action visible only with an open scene and the right role; drag preview smooth; Esc cancels cleanly; the result is visible to other players after drag end.
