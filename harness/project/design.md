# Design Rules

A simplified dark theme inspired by classic D&D styling. Deviation from "prefer Owlbear theme colors", see [deviations.md](deviations.md).

## Look
- Dark surfaces in a few elevation steps, a red accent for primary actions and active tabs, gold for highlights (headings, selected items, borders of special elements).
- Serif font for headings and item names, sans-serif for body text and inputs. **System font stacks only**, no web fonts (no external requests, see `harness/core/05-security.md`).
- Rarity is shown by color (text or a small marker), following the usual D&D convention: common gray, uncommon green, rare blue, very rare purple, legendary orange, artifact red/gold.
- Simple and dense: the popover is about 400 px wide. No decorative images or textures in v1.

## Tokens (`src/index.css`)
**Every** color, spacing, radius, font, shadow and transition comes from a CSS variable on `:root`. Component CSS contains no literal values except `0`, `100%` and similar neutral values.

Planned token groups (final values are set in phase 4):
| Group | Examples |
| --- | --- |
| Surfaces | `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-border` |
| Text | `--color-text`, `--color-text-muted`, `--color-text-disabled` |
| Accents | `--color-accent`, `--color-accent-hover`, `--color-accent-contrast`, `--color-gold` |
| States | `--color-danger`, `--color-success`, `--color-focus` |
| Rarity | `--rarity-common`, `--rarity-uncommon`, `--rarity-rare`, `--rarity-very-rare`, `--rarity-legendary`, `--rarity-artifact` |
| Typography | `--font-heading`, `--font-body`, `--font-size-s/m/l`, `--line-height` |
| Spacing / shape | `--space-xs/s/m/l`, `--radius-s/m`, `--shadow-raised` |

## Rules
- The `body` has its own background (`--color-bg`); the page looks the same in Owlbear and in the standalone tab.
- Layout is responsive: narrow popover (≈ 400 px) and wide standalone tab. Nested inventories use indentation plus a guide line, not ever-growing boxes.
- Interactive elements have a visible focus state (`--color-focus`) and at least 4.5:1 text contrast.
- Generic controls (button, input, tabs, dialog, tag input, collapsible) live in `src/components/ui/` and are reused everywhere.
