# Owlbear SDK Knowledge Base

A local, condensed reference for the Owlbear Rodeo extension SDK, written for working with Claude.
**Look things up here first.** Fall back to the online docs (https://docs.owlbear.rodeo/extensions/) only when a topic is missing or marked outdated. The online docs block automated access, so ask the user to paste the page.

- SDK baseline: `@owlbear-rodeo/sdk` **3.1.0** · knowledge base completed 2026-10-06 (analysis log: the plugin's `harness/project/openTasks/owlbear-docs-analysis.md`)
- Exact signatures always come from `node_modules/@owlbear-rodeo/sdk/lib/**/*.d.ts`. If this base disagrees with the installed `.d.ts`, the `.d.ts` wins. Update the page in that case.
- Architecture, conventions and security rules live in `harness/core/`. These pages explain **how to use an SDK feature within those rules**.

## Index
Status: ☐ planned · ◐ partial · ☑ done

| Topic | File | Docs section | Status |
| --- | --- | --- | --- |
| Extension model, lifecycle, dev setup | [getting-started.md](getting-started.md) | Getting Started | ☑ |
| Manifest | [reference/manifest.md](reference/manifest.md) | Reference / Manifest | ☑ |
| **UI** | | | |
| Action (toolbar button + popover) | [apis/action.md](apis/action.md) | APIs / Action | ☑ |
| Popover | [apis/popover.md](apis/popover.md) | APIs / Popover | ☑ |
| Modal | [apis/modal.md](apis/modal.md) | APIs / Modal | ☑ |
| Notification | [apis/notification.md](apis/notification.md) | APIs / Notification | ☑ |
| Theme | [apis/theme.md](apis/theme.md) | APIs / Theme | ☑ |
| **Interaction** | | | |
| Context menu | [apis/context-menu.md](apis/context-menu.md) | APIs / Context Menu | ☑ |
| Tools, modes, actions | [apis/tool.md](apis/tool.md) | APIs / Tool | ☑ |
| Interaction (live drag/preview) | [apis/interaction.md](apis/interaction.md) | APIs / Interaction | ☑ |
| Viewport | [apis/viewport.md](apis/viewport.md) | APIs / Viewport | ☑ |
| **Data and session** | | | |
| Room (metadata, permissions) | [apis/room.md](apis/room.md) | APIs / Room | ☑ |
| Player (+ Player type) | [apis/player.md](apis/player.md) | APIs / Player, Reference / Player | ☑ |
| Party | [apis/party.md](apis/party.md) | APIs / Party | ☑ |
| Broadcast | [apis/broadcast.md](apis/broadcast.md) | APIs / Broadcast | ☑ |
| Assets (+ upload builders) | [apis/assets.md](apis/assets.md) | APIs / Assets | ☑ |
| Metadata (scopes, limits) | [reference/metadata.md](reference/metadata.md) | Reference / Metadata | ☑ |
| Permission | [reference/permission.md](reference/permission.md) | Reference / Permission | ☑ |
| **Scene** | | | |
| Scene API (items, local, grid, fog, history) | [apis/scene.md](apis/scene.md) | APIs / Scene | ☑ |
| Items (types, common fields) | [reference/items.md](reference/items.md) | Reference / Items | ☑ |
| Filters (item and key filters) | [reference/filters.md](reference/filters.md) | Reference / Filters | ☑ |
| Builders | [reference/builders.md](reference/builders.md) | Reference / Builders | ☑ |
| TextContent | [reference/text-content.md](reference/text-content.md) | Reference / TextContent | ☑ |
| Dynamic Fog (lights, walls) | [reference/dynamic-fog.md](reference/dynamic-fog.md) | Reference / Dynamic Fog | ☑ |
| Effects | [reference/effects.md](reference/effects.md) | Reference / Effects | ☑ |
| Math, Matrix, Vector2/3, BoundingBox | [reference/math.md](reference/math.md) | Reference / Math, Matrix, Vector*, BoundingBox | ☑ |
| **Tutorials (condensed, mapped to the harness)** | | | |
| Hello World | [tutorials/hello-world.md](tutorials/hello-world.md) | Tutorial - Hello World | ☑ |
| Initiative Tracker | [tutorials/initiative-tracker.md](tutorials/initiative-tracker.md) | Tutorial - Initiative Tracker | ☑ |
| Custom Tool | [tutorials/custom-tool.md](tutorials/custom-tool.md) | Tutorial - Custom Tool | ☑ |
| Sharing your extension (store, hosting) | [tutorials/sharing.md](tutorials/sharing.md) | Tutorial - Sharing your Extension | ☑ |
| **Recipes** (from official extensions) | [recipes/](recipes/) | Examples | ☑ |

## Quick lookup: "I want to …"

| Goal | Read |
| --- | --- |
| start a new plugin / understand the extension model | [getting-started.md](getting-started.md), [reference/manifest.md](reference/manifest.md), [tutorials/hello-world.md](tutorials/hello-world.md) |
| show the main UI, a badge, or resize the popover | [apis/action.md](apis/action.md), [apis/theme.md](apis/theme.md) |
| open an extra panel or dialog | [apis/popover.md](apis/popover.md), [apis/modal.md](apis/modal.md) |
| add an action for selected tokens | [apis/context-menu.md](apis/context-menu.md), [reference/filters.md](reference/filters.md) |
| draw, place or measure on the map | [apis/tool.md](apis/tool.md), [apis/interaction.md](apis/interaction.md), [tutorials/custom-tool.md](tutorials/custom-tool.md) |
| store campaign-wide data | [apis/room.md](apis/room.md), [reference/metadata.md](reference/metadata.md) |
| store data per scene or per token | [apis/scene.md](apis/scene.md), [reference/items.md](reference/items.md), [recipes/token-list-tracker.md](recipes/token-list-tracker.md) |
| share live per-player status | [apis/player.md](apis/player.md), [apis/party.md](apis/party.md), [recipes/player-state-sync.md](recipes/player-state-sync.md) |
| send events / play an effect for everyone | [apis/broadcast.md](apis/broadcast.md), [apis/notification.md](apis/notification.md) |
| create items (tokens, shapes, text, labels) | [reference/builders.md](reference/builders.md), [reference/text-content.md](reference/text-content.md), [reference/items.md](reference/items.md) |
| attach markers, rings or auras to tokens | [recipes/token-decorations.md](recipes/token-decorations.md), [reference/effects.md](reference/effects.md) |
| lights, walls, line of sight | [reference/dynamic-fog.md](reference/dynamic-fog.md) |
| shaders, visual effects, post-processing | [reference/effects.md](reference/effects.md) |
| grid distances, snapping, geometry | [apis/scene.md](apis/scene.md) (grid), [reference/math.md](reference/math.md) |
| move or zoom the camera, anchor UI to a token | [apis/viewport.md](apis/viewport.md), [apis/popover.md](apis/popover.md) |
| let users pick or upload images and scenes | [apis/assets.md](apis/assets.md) |
| respect GM/player permissions | [reference/permission.md](reference/permission.md), [apis/room.md](apis/room.md) |
| publish to the extension store / get verified | [tutorials/sharing.md](tutorials/sharing.md) |

## Page template
Every topic page follows this structure. Keep pages short (about ≤ 150 lines) and link instead of repeating.

````markdown
# <Topic>

> SDK 3.1.0 · Sources: <docs URL>, <.d.ts path>, <repo links> · Updated: <YYYY-MM-DD>

## Purpose
What it is for, when to use it, and when to use something else instead (link).

## API
```ts
// signatures from the .d.ts (condensed)
```
Notes on important options and defaults.

## Implementation in this harness
- Facade: `src/obr/obr-<domain>.service.ts` → `api.<domain>.*`
- Hook / template / skill to use
- Minimal example (through `api.*`, not raw `OBR.*` in components)

## Pitfalls and limits
- Multi-user, permissions, size limits, iframe context, cleanup

## Claude workflow
- Skill: `/new-obr-feature` | `/new-component` | …
- Ask the user: …
- Live test (by the user): checklist items
````

## Maintenance
- After an SDK upgrade, diff the `.d.ts` files and update the affected pages and the version header.
- Write in your own words; do not copy doc pages verbatim. Short MIT code excerpts are fine, with attribution.
- Generic only: nothing project-specific here (use `harness/project/`).
