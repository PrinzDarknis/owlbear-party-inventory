# Broadcast API

> SDK 3.1.0 · Sources: docs "APIs / Broadcast" (provided by the user 2026-10-05), `lib/api/BroadcastApi.d.ts`, SDK source `src/api/BroadcastApi.ts` (MIT) · Updated: 2026-10-05

## Purpose
Sends **ephemeral messages** between clients (or between iframes of the same client) on named channels: events, "play this now", live sync of transient state, modal results. Nothing is persisted, and late joiners don't get old messages. For state, use [metadata](../reference/metadata.md).

## API
```ts
OBR.broadcast.sendMessage(channel: string, data: unknown,
  options?: { destination: "REMOTE" | "LOCAL" | "ALL" }): Promise<void>;
OBR.broadcast.onMessage(channel: string,
  cb: (event: { data: unknown; connectionId: string }) => void): () => void;
```
| destination | Reaches |
| --- | --- |
| `REMOTE` (default) | all **other** clients |
| `LOCAL` | only the iframes of **this** client (popover ↔ background ↔ modal) |
| `ALL` | everyone, including this client |

## Implementation in this harness
- Channels: `${PLUGIN_ID}/broadcast/<topic>` constants. One service method each for send and listen (template `obr-example.service.ts`: `sendEvent` / `onEvent` with a parser and allowlist).
- `connectionId` in the event identifies the sender's tab. Use it for master/slave patterns or to ignore your own messages.
- **Once per client** effects (sound, toast) → listen in the background only. **Per view** updates → listen in the UI iframe and unsubscribe on unmount.
- `LOCAL` is the standard way to talk between your own iframes (e.g. modal → opener).

## Pitfalls and limits
- **Unsubscribe is per channel** (the docs say the returned function "will unsubscribe from message events for this channel"; SDK source: `onMessage` subscribes the channel, and the returned function sends `OBR_BROADCAST_UNSUBSCRIBE` for the whole channel). With two listeners on the same channel in **one** iframe, unsubscribing one may stop delivery to the other. Use one listener per channel per iframe and dispatch inside it.
- Validate `data` (type guard + allowlist), because any room member can send.
- **`data` must be JSON-serializable and is limited to 16 KB per message** (docs). A rate limit is not documented, so don't send in pointer-move loops anyway. Send ids, not objects.
- Not reliable for state: a client that reloads misses messages. Combine with metadata for anything that must converge.

## Claude workflow
- Skill: `/new-obr-feature` (channel constant + parser + service + hook).
- Ask the user: who should receive it (others, everyone, only my iframes)? What happens for a player who joins later?
- Live test (by the user): with two players the message arrives exactly once per client; nothing happens after a reload (expected) unless state is also in metadata.
