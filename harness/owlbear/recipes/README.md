# Recipes (patterns from the official example extensions)

Feature patterns from Owlbear's official example extensions (docs "Examples"), mapped to the harness.

> **License note:** the official examples (`owlbear-rodeo/initiative-tracker`, `colored-rings`, `dice`) are **GPL-3.0**. These recipes describe the **patterns in our own words** and use our own example code. **Do not copy code from those repositories** into a plugin unless that plugin is meant to be GPL-licensed. The `sdk-tutorials` repo is MIT and can be quoted with attribution.

| Recipe | Use it for | Based on |
| --- | --- | --- |
| [token-list-tracker.md](token-list-tracker.md) | per-token state + shared list in the popover (initiative, conditions, turn order) | Initiative Tracker (React + TS) |
| [token-decorations.md](token-decorations.md) | visual markers attached to tokens (rings, auras, badges) via a context-menu embed | Colored Rings (TS) |
| [player-state-sync.md](player-state-sync.md) | live per-player state that others watch (rolls, status, "currently doing") | Dice (React + TS + Three.js) |

Common patterns across all three:
- **Ready gate**: render only if `OBR.isAvailable` and after `onReady` (harness: `useObrReady`).
- **Theme bridging**: the OBR theme feeds the UI theme (they use MUI; the harness uses CSS variables via `useObrTheme`).
- **Plugin id helper** for every key and id (harness: `PLUGIN_ID` constants).
- **Plain-object type guard** before reading metadata (harness: parsers in `src/model`).
- Manifests with `homepage_url` and `icon`, and a small action popover that sets its own height.
