# Party API

> SDK 3.1.0 · Sources: `lib/api/PartyApi.d.ts`, `lib/types/Player.d.ts` · Updated: 2026-10-05

## Purpose
Lists the **other players** connected to the room, with role, selection, color, name and **player metadata**, and notifies about joins, leaves and changes.

## API
```ts
OBR.party.getPlayers(): Promise<Player[]>;              // other players, NOT including yourself
OBR.party.onChange(cb: (players: Player[]) => void): () => void;
```
`Player` type: see [player.md](player.md).

## Implementation in this harness
- Service `api.party.getPlayers()` / `subscribe()` → hook `useParty()` via `useObrSubscription`.
- **Full player list** = `party.getPlayers()` + the local player (`player.getConnectionId`, `getRole` …). Merge them in the service, never in components.
- **Presence-based logic:** "is the GM online?", "is the master connection still here?" → check `connectionId`s in `party.onChange`. Re-elect a master when it leaves (e.g. the lowest `connectionId` among the GMs).
- Read other players' **player metadata** here (status sharing without room metadata writes).

## Pitfalls and limits
- One user can appear with several connections (tabs). Deduplicate by `id` when showing "players".
- `onChange` fires often (selection changes of others). Compare only the fields you need.
- Names and colors are personal data: show them, don't persist them.

## Claude workflow
- Ask the user: per user or per connection? Should the GM be included?
- Live test (by the user): a second browser profile joins or leaves → the list updates; master re-election works when the master tab closes.
