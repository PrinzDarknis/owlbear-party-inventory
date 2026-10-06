# Action API

> SDK 3.1.0 · Sources: `lib/api/ActionApi.d.ts`, docs nav "APIs / Action" (page not pasted) · Updated: 2026-10-05

## Purpose
Controls the extension's **action**, the button in the top left of the room, and its **popover** at runtime. The initial values come from `manifest.action` ([reference/manifest.md](../reference/manifest.md)).
Use it to show status on the button (badge), resize the popover to its content, or open and close the popover from code.

## API
```ts
OBR.action.getTitle(): Promise<string>;               setTitle(title: string): Promise<void>;
OBR.action.getIcon(): Promise<string>;                setIcon(icon: string): Promise<void>;
OBR.action.getBadgeText(): Promise<string | undefined>;   setBadgeText(text?: string): Promise<void>;   // undefined clears it
OBR.action.getBadgeBackgroundColor(): Promise<string | undefined>;  setBadgeBackgroundColor(color: string): Promise<void>;
OBR.action.getWidth(): Promise<number | undefined>;   setWidth(width: number): Promise<void>;
OBR.action.getHeight(): Promise<number | undefined>;  setHeight(height: number): Promise<void>;
OBR.action.isOpen(): Promise<boolean>;  open(): Promise<void>;  close(): Promise<void>;
OBR.action.onOpenChange(cb: (isOpen: boolean) => void): () => void;
```

## Implementation in this harness
- Service `src/obr/obr-action.service.ts` → `api.action`, with methods like `setBadge(count)`, `fitHeight(px)` and `onOpenChange(cb)` (returns the unsubscribe).
- **Badge for unseen events:** the background page counts events (e.g. via broadcast) while `isOpen()` is false and sets `setBadgeText(String(n))`. It clears the badge on `onOpenChange(true)`. This must run in the background, because the popover iframe is not loaded while it's closed.
- **Dynamic height:** measure the root element in the popover (`ResizeObserver`) and call `setHeight(...)`, debounced. The manifest width and height are the **maximum**.
- Icons passed at runtime must be absolute URLs (`assetUrl("icons/x.svg")`).

## Pitfalls and limits
- Changes are **per client** (local UI state), not synced to other players. To show the same badge for everyone, sync the underlying state (metadata or broadcast) and let every background set its own badge.
- The popover iframe is unloaded when it is closed: its React state is lost. Persist UI state that must survive (selected tab, drafts) in localStorage or metadata.
- `open()` from the background can be intrusive. Only use it in response to an explicit user event.

## Claude workflow
- Skill: `/new-obr-feature` (action service + hook `useActionOpen()` if the UI needs it).
- Ask the user: should badges count per player or globally, and when should they reset?
- Live test (by the user): badge appears while the popover is closed and clears on open; the popover height follows the content.
