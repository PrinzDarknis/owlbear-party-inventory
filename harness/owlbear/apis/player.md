# Player API (+ Player type)

> SDK 3.1.0 · Sources: `lib/api/PlayerApi.d.ts`, `lib/types/Player.d.ts`, SDK source `src/api/PlayerApi.ts` (MIT) · Updated: 2026-10-05

## Purpose
Information about and control over the **local player** (this client): identity, role, selection, color, name, view sync, player metadata and permissions.

## API
```ts
OBR.player.id: string;                         // user id; getter THROWS before onReady
OBR.player.getId(): Promise<string>;           // async alternative
OBR.player.getConnectionId(): Promise<string>; // this browser tab/connection
OBR.player.getRole(): Promise<"GM" | "PLAYER">;
OBR.player.getName() / setName(name);  getColor() / setColor(color);
OBR.player.getSyncView() / setSyncView(bool);
OBR.player.getSelection(): Promise<string[] | undefined>;  select(ids, replace?);  deselect(ids?);
OBR.player.getMetadata(): Promise<Metadata>;   setMetadata(update: Partial<Metadata>);
OBR.player.hasPermission(p: Permission): Promise<boolean>;
OBR.player.onChange(cb: (player: Player) => void): () => void;

interface Player {
  id: string; connectionId: string; role: "GM" | "PLAYER";
  selection?: string[]; name: string; color: string; syncView: boolean; metadata: Metadata;
}
```

## Implementation in this harness
- Role and theme are already in the templates (`obr-session.service.ts`, `use-player-role.hook.ts`). Extend the session service for selection and player metadata as needed.
- **id vs connectionId:** `id` identifies the user (the same in several tabs), `connectionId` identifies one tab. Use `connectionId` for "exactly one client does X" (master election), and `id` for authorship (`item.lastModifiedUserId === OBR.player.id` loop guard).
- **Player metadata** = presence and status that others see via `party.onChange` (e.g. "ready", "current turn"). It lives only for the session. Namespace the keys.
- **Selection-driven UI:** subscribe to `onChange` and compare `player.selection`, then load items via `scene.items.getItems(selection)`.

## Pitfalls and limits
- `OBR.player.id` throws if it is used before ready (SDK source). Inside the facade it is safe after `obrReady`.
- `onChange` fires on **any** change of the local player (selection, color, metadata …). Filter for what you need, to avoid re-render storms.
- Name and color are **personal data**: don't persist or log them unless the feature needs it (`harness/core/05-security.md`).
- Role checks are UI-only.

## Claude workflow
- Skill: `/new-obr-feature` for player metadata features. Hooks such as `useSelection()` are built on `useObrSubscription`.
- Live test (by the user): selection-based UI updates on selecting or deselecting; player status is visible to the second player and disappears after they leave.
