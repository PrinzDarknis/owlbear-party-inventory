# 02 – Architecture

## 1. Owlbear runs a plugin as several iframes
Owlbear Rodeo loads a plugin from its `manifest.json`. **Each surface is its own iframe with its own JS context.** They share no memory. Module singletons, React state and caches exist **once per iframe**.

| Context | Declared in | Lifetime | Typical use |
| --- | --- | --- | --- |
| **Action popover** | `manifest.action.popover` | While the popover is open | Main UI |
| **Background** | `manifest.background_url` | Whole session, invisible | Register context menus/tools, global listeners (scene items, broadcast), sync logic. One per client. |
| **Context-menu embed** | `OBR.contextMenu.create({ embed })` | While the menu is open | Small inline UI for selected items |
| **Modal / popover** | `OBR.modal.open` / `OBR.popover.open` | Until closed | Dialogs, larger editors |
| **Tool / tool mode** | `OBR.tool.create` | Session | Custom canvas interaction |

Rules:
- Each context gets **one HTML entry** in `html/` and **one TS entry** `src/main-<context>.tsx`. Both are registered in `vite.config.ts` → `build.rollupOptions.input`.
- **Long-lived side effects live in the background.** This covers context-menu registration, `scene.items.onChange` handlers and broadcast receivers that act on the scene. UI iframes only subscribe to what they render and clean up on unmount.
- Every client (GM and each player) runs its own background. A listener that **writes** must make sure only one client reacts (see [03 §Loops](03-obr-sdk-guide.md#change-loops-and-write-responsibility)).

## 2. Layering
```
src/
  main-<context>.tsx      entry: mount React (UI) or call setup (background)
  components/             React function components (presentation + local UI state)
  hooks/                  React hooks bridging components ↔ OBR facade (subscribe/unsubscribe)
  obr/                    THE ONLY PLACE that imports @owlbear-rodeo/sdk
    obr.ts                ready promise (`obrReady`)
    index.ts              facade object `api` (api.<domain>.load/save/subscribe) + re-exported types
    obr-<domain>.service.ts  one service per domain (load / save / subscribe / validate)
    constants.ts          namespace, metadata keys, broadcast channels, URL prefix
    adapters/<ext>/       read/write metadata owned by OTHER extensions
    migrations/<semver>/  data migrations, run once after OBR is ready
  model/                  types or domain classes, defaults, parsers/type guards (no SDK, no React)
  utils/                  pure helpers (no SDK, no React)
```
Dependency direction: `components → hooks → obr → model/utils`. `model` and `utils` depend on nothing in the app. Components **never** import `@owlbear-rodeo/sdk` directly. The only exception is pure SDK *types* used in props, and even those should be re-exported from `src/obr`.

## 3. Ready handling
- Call `OBR.onReady` **once** per iframe, in `src/obr/obr.ts`. Wrap it in a promise (`obrReady`). Every service method awaits it first, so callers never have to care about readiness.
- Run migrations inside the ready step, **before** resolving, so no reader sees old data.
- Scene-dependent calls (`OBR.scene.items.*`, scene metadata) also await `OBR.scene.isReady()` and react to `OBR.scene.onReadyChange`. A room can be open without a scene.
- In React, use the `useObrReady()` hook ([template](../templates/hooks/use-obr-ready.hook.ts)) to gate rendering.

## 4. Where data lives

| Store | Scope | Persistence | Use for | Avoid for |
| --- | --- | --- | --- | --- |
| **Room metadata** `OBR.room.*Metadata` | All players in the room, all scenes | Persistent | Campaign-wide state and settings | Large or high-frequency data (**< 16 kB total for all extensions**, see `harness/owlbear/apis/room.md`) |
| **Scene metadata** `OBR.scene.*Metadata` | Current scene | Persistent with the scene | Scene-bound state | Data that must survive a scene change |
| **Item metadata** `item.metadata[key]` | One item (token, shape …) | Persistent with the item | Per-token state, links item → record | Data that has no item |
| **Player metadata** `OBR.player.*Metadata` | The local player, visible to the party | Session | Presence and per-player status | Anything that must persist |
| **Broadcast** `OBR.broadcast.*` | Live clients | None (fire-and-forget) | Events, ephemeral sync, "play effect now" | State. Late joiners miss it. |
| **localStorage** | This browser only | Persistent locally | Personal preferences, local backups (key scoped by `OBR.room.id`) | Shared state, secrets |

Decision rule: **shared and must persist** → metadata (room or scene by scope). **Shared but momentary** → broadcast. **Personal** → localStorage.

## 5. Interaction with other extensions
Some plugins read or write metadata owned by another extension (e.g. a stat-bubble or initiative extension). Encapsulate this in `src/obr/adapters/<extension-name>/`:
- one file with the foreign key constant and a typed, **validated** view of their data,
- pure functions `fromForeign(...)` / `toForeign(...)`,
- a user setting that turns the integration on and off,
- the foreign data format treated as untrusted and subject to change.

## 6. Data versioning and migrations
- Store a `version` (or `schemaVersion`) with every persisted record or keep a global one under `<namespace>/version`.
- Migrations live in `src/obr/migrations/<target-version>/` and are idempotent. Only the GM client runs a migration that writes, to avoid concurrent writes.
- Never delete old keys before the new data has been written successfully.
