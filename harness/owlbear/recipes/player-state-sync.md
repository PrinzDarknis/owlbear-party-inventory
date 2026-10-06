# Recipe: Live per-player state (rolls, status, "what I'm doing")

> Based on: docs "Examples / Dice" (provided by the user 2026-10-06) and the source of `owlbear-rodeo/dice` (`src/plugin/*`, GPL-3.0: patterns only, no code copied) · SDK 3.1.0 · Updated: 2026-10-06

## Feature
Each player has some live state (here: their current dice roll, from throw to final values) that **all other players can watch in real time**, including players who open the popover later. Private rolls hide the details from others.

## Architecture: player metadata as a per-player channel
| Concern | Where | How |
| --- | --- | --- |
| Own state | local store in the popover (Zustand in the example) | the physics simulation runs **only on the roller's client** |
| Publish | `OBR.player.setMetadata({ [id("roll")]: …, [id("rollValues")]: …, … })` | only when something **meaningful changed** (new roll, different dice, roll finished), not every frame |
| Privacy | if the roll is private, publish the roll shell but leave values and transforms `undefined` | others see that someone rolled, not the result |
| Watch others | `OBR.party.getPlayers()` + `party.onChange` → read each `player.metadata[...]` | small previews of other players' trays; expandable |
| Late joiners | automatic: player metadata is current state, not an event | the advantage over broadcast |

## Why player metadata (and not broadcast or room metadata)
- **Broadcast** would be lost for players who join or open the popover later, and needs its own catch-up logic.
- **Room metadata** is shared by everyone and capped (< 16 kB). Per-player keys there would race and pile up.
- **Player metadata** is owned by one player, so there are no write conflicts. It is visible to the party via `party.onChange` and disappears when the player leaves. Ideal for "my current X".

## Harness mapping
- Service `api.playerState.publish(state)` (debounced, change-detected) and `api.playerState.subscribeParty(cb)` → hook `usePartyState()` built on `useObrSubscription`. Parse every other player's metadata (untrusted).
- Publish compact data: ids, numbers, final transforms. Never stream per-frame physics over metadata. If you need smooth live motion of **scene items**, use the Interaction API instead ([apis/interaction.md](../apis/interaction.md)).
- Private mode: decide in the service what is published, and never rely on the UI to hide it, because other clients can read the raw metadata.
- Heavy UI (3D, physics) is fine **inside your iframe**. Keep it out of the background page.

## Pitfalls
- Player metadata is session-scoped: it is gone after the player leaves. Persist history elsewhere if needed (e.g. room metadata summary, size-checked).
- `party.onChange` fires for every player change (selection etc.), so memoize per player and compare your keys only.
- Dependencies like Three.js or physics engines are large. Justify them in `harness/project/deviations.md` (`harness/core/01-tech-stack.md` dependency policy).

## Claude workflow
- Skill: `/new-obr-feature` with scope = player metadata.
- Ask the user: what exactly should others see (and when)? Is there a private mode? Should history persist?
- Live test (by the user): with two players, A's state appears for B live; B opening the popover later still sees A's current state; private mode shows no values to B; A leaving clears A's entry.
