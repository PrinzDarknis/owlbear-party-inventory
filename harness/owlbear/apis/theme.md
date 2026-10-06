# Theme API

> SDK 3.1.0 · Sources: `lib/api/ThemeApi.d.ts`, `lib/types/Theme.d.ts` · Updated: 2026-10-05

## Purpose
Reads Owlbear's current UI theme (light or dark plus palette) so the extension's iframes look native and follow theme changes.

## API
```ts
OBR.theme.getTheme(): Promise<Theme>;
OBR.theme.onChange(cb: (theme: Theme) => void): () => void;

interface Theme {
  mode: "DARK" | "LIGHT";
  primary:   { light: string; main: string; dark: string; contrastText: string };
  secondary: { light: string; main: string; dark: string; contrastText: string };
  background: { default: string; paper: string };
  text: { primary: string; secondary: string; disabled: string };
}
```

## Implementation in this harness
- Already covered by templates:
  - `harness/templates/obr/obr-session.service.ts` (`getTheme`, `onThemeChange`),
  - `harness/templates/hooks/use-obr-theme.hook.ts`, which writes `--obr-*` CSS variables on `:root` and sets `data-theme="dark|light"`,
  - `harness/templates/config/index.css`, with defaults for the variables before the theme loads.
- Call `useObrTheme()` **once in the root component of every UI iframe** (popover, modal, embeds). Each iframe is a separate document.
- In CSS, use only `var(--obr-*)` for colors. Use `[data-theme="light"]` selectors for the rare mode-specific tweak.

## Pitfalls and limits
- The body background should stay transparent in the action popover; Owlbear draws the paper. Popovers or modals with `hidePaper` need their own background (`var(--obr-paper)`).
- SVG icons: tint them with `currentColor` or CSS filters, and check both modes.
- The theme is per user (their Owlbear setting) and not related to roles.

## Claude workflow
- New UI iframe: always add `useObrTheme()` in its root. `/harness-review` should flag hard-coded colors.
- Live test (by the user): switch Owlbear between light and dark; all extension iframes follow without a reload.
