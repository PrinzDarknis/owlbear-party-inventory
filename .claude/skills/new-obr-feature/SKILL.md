---
name: new-obr-feature
description: Add a new data-backed feature to an Owlbear plugin (metadata keys, broadcast channel, facade service, parser, React hook) following harness/core/02-architecture.md and 03-obr-sdk-guide.md. Use when a feature needs to store, sync or broadcast data via the Owlbear SDK.
argument-hint: <domain> <what it stores/syncs>
---

# New OBR-backed feature

Arguments: `$ARGUMENTS`.

## 0. Look it up
Open `harness/owlbear/README.md` and read the topic pages for every SDK API the feature touches (e.g. `apis/scene.md`, `apis/broadcast.md`, `reference/metadata.md`) and a matching recipe in `harness/owlbear/recipes/` if one exists. Follow their "Implementation in this harness" and "Pitfalls" sections. Don't copy code from GPL-licensed example repos.

## 1. Design (before writing code; show it to the user briefly)
- **Where does the data live?** Use the decision table in `harness/core/02-architecture.md` §4: room / scene / item / player metadata, broadcast, or localStorage.
- **Size:** estimate the JSON size. Room metadata must stay under 16 kB in total, shared across all extensions. Store per-record keys, not one growing array.
- **Who writes?** Name the writer. If a listener writes, choose a loop guard (`harness/core/03-obr-sdk-guide.md` §Change loops).
- **Which context?** UI iframe vs background (global listeners and menus go in the background).
- Check `harness/project/data-model.md` for existing keys and do not collide or duplicate.

## 2. Implement (copy patterns from `harness/templates/`)
1. `src/model/<domain>/`: `<domain>.types.ts` (ISO strings for dates), `<domain>.parse.ts` (type guard/parser with defaults, length limits), `index.ts`.
2. `src/obr/constants.ts`: new key/channel constants under the plugin namespace.
3. `src/obr/obr-<domain>.service.ts` (from `obr-example.service.ts`):
   - every method awaits `obrReady` (and `sceneReady()` for scene/items),
   - reads go through the parser,
   - writes are partial, debounced if high-frequency, and size-checked,
   - `subscribe`/`on*` return the unsubscribe function,
   - broadcast payloads are validated against an allowlist.
4. Register the service in the `api` facade (`src/obr/index.ts`).
5. Hook `src/hooks/use-<domain>.hook.ts` via `useObrSubscription`, with stable `load`/`subscribe` at module level.
6. If the data format of an existing key changes: add a migration in `src/obr/migrations/` and bump `DATA_VERSION`.

## 3. Finish
- Update `harness/project/data-model.md` (keys, channels, writers, migrations).
- Run `npm run lint` and `npm run build`.
- Hand the user a live-test checklist (GM + player, expected results). Use the "Claude workflow" section of the topic pages; Claude never logs in to Owlbear.
