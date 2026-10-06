# 03 – Owlbear SDK Guide and Pitfalls

Reference: **first the local knowledge base [`harness/owlbear/`](../owlbear/README.md)** (per-API pages, recipes, verified limits). The online docs (https://docs.owlbear.rodeo/extensions/) block automated access, so ask the user to paste a page when something is missing there.
All snippets below belong in `src/obr/` only.

## API cheat sheet

| Need | API |
| --- | --- |
| Wait for the SDK | `OBR.onReady(cb)`, `OBR.isReady`; `OBR.isAvailable` = running inside Owlbear (for standalone dev) |
| Am I GM? | `OBR.player.getRole()` → `"GM" \| "PLAYER"`, `OBR.player.onChange` |
| Who am I? | `OBR.player.id` (user id; **throws before `onReady`**), `OBR.player.getConnectionId()` (this tab), `getName()`, `getColor()` |
| Other players | `OBR.party.getPlayers()`, `OBR.party.onChange` (does **not** include the local player) |
| Room state | `OBR.room.getMetadata / setMetadata / onMetadataChange`, `OBR.room.id` |
| Scene state | `OBR.scene.isReady / onReadyChange`, `OBR.scene.getMetadata / setMetadata / onMetadataChange` |
| Items | `OBR.scene.items.getItems(filter) / updateItems(filter, draft => …) / addItems / deleteItems / onChange` |
| Local-only items | `OBR.scene.local.*` (only visible to this client, e.g. previews) |
| Build items | `buildImage`, `buildShape`, `buildText`, `buildLabel`, `buildCurve`, … from `@owlbear-rodeo/sdk`. Only after `onReady` (they read `OBR.player.id`); always set `.layer()` (Image/Effect/Billboard default to `POPOVER`). See `harness/owlbear/reference/builders.md` |
| Selection | `OBR.player.getSelection()`, `OBR.player.select / deselect` |
| Events | `OBR.broadcast.sendMessage(channel, data, { destination })`, `OBR.broadcast.onMessage(channel, cb)` |
| UI | `OBR.contextMenu.create`, `OBR.tool.create`, `OBR.popover.open/close`, `OBR.modal.open/close`, `OBR.action.setBadgeText / setHeight / open` |
| Feedback | `OBR.notification.show(message, variant)` |
| Theme | `OBR.theme.getTheme()`, `OBR.theme.onChange` (mode, primary, secondary, background, text) |
| Viewport | `OBR.viewport.*` (transform, animate to bounds) |

All `on*` functions **return an unsubscribe function**. Always keep and call it. Some unsubscribes act per channel or per iframe (broadcast, `items.onChange`), so keep **one listener per channel per iframe** and dispatch inside it.

**Callbacks live in the iframe that registered them** (context-menu `onClick`, tool and mode handlers). Register menus and tools in the **background** page, or they stop working when the popover closes.

## Metadata keys
- Namespace = reverse-DNS + plugin slug, e.g. `com.example.my-plugin`. It is defined **once** as `PLUGIN_ID` in `src/obr/constants.ts`.
- Keys are `${PLUGIN_ID}/<path>`, e.g. `${PLUGIN_ID}/settings`, `${PLUGIN_ID}/record/${id}`. Build them with constant functions and never write a key literal inline.
- The same namespace prefixes broadcast channels (`${PLUGIN_ID}/broadcast/<topic>`), context-menu ids, tool ids and localStorage keys.
- Never write into another extension's namespace except through an adapter (see [02 §5](02-architecture.md#5-interaction-with-other-extensions)).

## Writing metadata correctly
```ts
// partial update: only the given keys are touched
await OBR.room.setMetadata({ [SETTINGS_KEY]: settings });
// delete a key
await OBR.room.setMetadata({ [recordKey(id)]: undefined });
// items: mutate the draft inside updateItems
await OBR.scene.items.updateItems(ids, (items) => {
  for (const item of items) item.metadata[LINK_KEY] = recordId;
});
```
- **Size limit:** room metadata must be **under 16 kB in total, shared across all extensions** in the room (docs "APIs / Room"). Keep payloads compact, avoid storing derived data, and check the size (`new Blob([JSON.stringify(x)]).size`) before writes that can grow (lists, imports, backups). Split per record (`record/<id>`) instead of one big array. Move bulky data to scene/item metadata or localStorage if it doesn't have to be room-wide.
- **Batch writes:** one `setMetadata` call with several keys is better than many calls.
- **Item updates send whole top-level fields:** `updateItems` transmits each changed field (`metadata`, `position`, …) as a complete value. Changing your key in `item.metadata` re-sends the item's entire metadata, so pass **ids** (fresh read) rather than stale item arrays, and write right after reading. Function filters fetch all items. Details: `harness/owlbear/apis/scene.md`.
- **Debounce** high-frequency writes (typing, sliders) at about 300–500 ms. If callers `await` a debounced save, the debounce must return a promise that resolves **after** the write.

## Reading metadata correctly
- Metadata is typed as `Record<string, unknown>`. **Never** cast with `as` and trust the result. Parse it with a type guard or parser in `src/model/` and fall back to defaults.
- **JSON round-trip:** everything goes through JSON. `Date` becomes an ISO string, `undefined` fields disappear, `Map`/`Set`/class instances lose their prototype. Store dates as ISO strings or epoch ms and parse them explicitly on read.
- `onMetadataChange` delivers the **whole** metadata object of that scope, so filter for your keys and ignore unchanged values (compare a `lastUpdate` or a hash) to avoid useless re-renders.

## Change loops and write responsibility
Every client receives every change. A listener that reacts to a change by **writing** will run on N clients and can loop forever (A writes → B reacts and writes → A reacts …).
Guards, in order of preference:
1. **Only the originator reacts:** for items, `if (item.lastModifiedUserId !== OBR.player.id) continue;`.
2. **Idempotence:** only write if the computed value actually differs from what is stored, and never bump timestamps when nothing changed.
3. **Single writer:** let only the GM (or one elected "master" connection) perform derived writes.
4. **Source tagging:** store a `syncedAt`/`source` marker and skip changes you produced yourself.

## Roles and trust
- `getRole() === "GM"` checks are **UI-only**. Any client can write any room/scene/item metadata and send any broadcast. Do not treat role checks as security. Validate data on every read.
- Context-menu filters support `roles: ["GM"]` to hide entries. Again, this is UX, not protection.

## Broadcast
- `destination`: `"REMOTE"` (others only, the default), `"LOCAL"` (only this client's iframes), `"ALL"` (everyone including self).
- Messages are not persisted and late joiners never see them. Keep payloads small (the documented limit is **16 KB per message**, JSON-serializable), avoid high frequency, and send identifiers instead of full objects where possible.
- The receiver gets `{ data: unknown, connectionId }`. **Validate `data`** (type guard plus allowlist) before acting on it, especially if it ends up in URLs, DOM or metadata.
- If an effect should fire once per client (sound, animation), listen in the **background** iframe only. Otherwise every open iframe will fire it.

## URLs and assets
- In dev, Vite serves from `/`. In production the plugin usually lives under a sub-path (e.g. GitHub Pages `/<repo-name>`). Centralize this in `constants.ts` as `assetUrl(path)`, using `import.meta.env.DEV` to pick the prefix.
- URLs passed **to Owlbear** (context-menu icons, embeds, popover/modal urls, `buildImage` sources) must be absolute paths resolved via `assetUrl` or full URLs. The SDK only prefixes `window.location.origin` to non-`http` paths; it does **not** add the base path.
- Static assets go in `public/`. Import SVGs/images used inside React via Vite imports. Build runtime-selected files (e.g. audio) with `assetUrl`.

## Theme and layout
- Read `OBR.theme` and expose the colors as CSS variables (see `use-obr-theme.hook.ts`), so the plugin matches Owlbear's light and dark modes.
- The manifest sets the **maximum** popover size (`action.width/height`). Use `OBR.action.setHeight` (e.g. via `ResizeObserver`) for dynamic height. Design for about 400 px width and mobile devices.

## Logging
- Use a small logger in `src/utils/logging/` with levels, prefixed with the plugin name. Logs at `debug`/`trace` level are off in production.
- Never log full metadata dumps containing player names or other personal data in production. Optional remote logging to the GM must be opt-in and must not include personal data.
