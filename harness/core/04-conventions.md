# 04 – Conventions

## Language
- **Code, identifiers, comments, commit messages, UI strings: English.** Spell identifiers correctly. Public identifiers are hard to rename later.
- UI strings live next to the component. If i18n is introduced later, extract them then; do not prepare half an i18n layer.

## Project layout
```
html/
  <context>.html                        one per Owlbear iframe context (see 02-architecture)
public/
  manifest.json, manifest.dev.json      production / local dev manifest
  icons/, sounds/, …                    static assets
src/
  main-<context>.tsx
  index.css                             global CSS variables and resets
  components/<feature>/<name>/          one folder per component
    <name>.component.tsx
    <name>.css
    index.ts                            export * from "./<name>.component";
  components/<feature>/index.ts         barrel of the feature
  components/ui/                        generic reusable UI (buttons, inputs, tabs, tooltip)
  hooks/use-<name>.hook.ts
  obr/                                  SDK facade (see 02-architecture)
  model/<domain>/
    <name>.types.ts                     types/interfaces
    <name>.default.ts                   default values
    <name>.parse.ts                     type guards / parsers for untrusted data
  utils/<name>.service.ts               one pure function (or tightly related group) per file
```

## File naming
- **kebab-case** file and folder names.
- Suffixes: `.component.tsx`, `.hook.ts`, `.service.ts`, `.types.ts`, `.default.ts`, `.parse.ts`, `.constant.ts`, `.enum.ts`, `.test.ts`, `.mockdata.ts`.
- Every folder that is imported from elsewhere has an `index.ts` barrel.

## TypeScript
- **Named exports only.** No `export default` in `src/` (config files like `vite.config.ts` excepted).
- `type` for unions, mapped and utility types. `interface` for object shapes (props, models). **No `I` prefix.**
- Props type: `<ComponentName>Props`. Hook return types are explicit.
- Constants: `SCREAMING_SNAKE_CASE`. Functions and variables: `camelCase`. Components, types and classes: `PascalCase`. Hooks: `useXxx`.
- No `any`. Use `unknown` plus a type guard. No non-null `!` except for `document.getElementById("root")!` in entries.
- Relative imports, ordered: external packages → blank line → CSS import → blank line → assets → blank line → internal modules (farther first).

## React
- **Function components + hooks only.** Template: [`templates/component`](../templates/component/).
- State close to its use. Lift it only when shared. For cross-iframe sharing use metadata or broadcast, not React context.
- Every effect that subscribes to OBR **returns the unsubscribe**:
  ```ts
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    api.example.subscribe(setValue).then((unsub) => {
      if (active) unsubscribe = unsub;
      else unsub();
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  ```
- Prefer controlled inputs. For inputs that also receive remote updates, keep a local draft and commit it on blur or debounced, so remote updates don't overwrite the user's typing.
- Never use `key={Math.random()}` to force re-renders. Derive keys from data ids.
- Components stay presentational where possible. OBR access goes through hooks that use the facade.
- Generic hooks (OBR ready, role, theme, room metadata) are in [`templates/hooks`](../templates/hooks/). Copy them to `src/hooks/` at project start.

## CSS
- One CSS file per component, imported at the top of the component.
- Class names: kebab-case, root class = component folder name (`.dice-roller`), children BEM-like (`.dice-roller__result`, `.dice-roller--active`).
- Colors and spacings come from CSS variables in `src/index.css` (fed by `OBR.theme`). No inline styles except dynamic values.
- Icons: SVG in `public/icons/`. Tint them with CSS filters or `currentColor`.

## Comments and docs
- Comment the **why**, not the what. JSDoc on every exported function of `src/obr/` and `src/model/`.
- Short section markers in larger files are fine (`// handlers`, `// render`).
- Every feature that adds metadata keys, broadcast channels or storage keys updates `harness/project/data-model.md`.

## Git
- Branch per feature or fix: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`. `main` stays deployable.
- Commit messages: `type(scope): summary` (Conventional Commits). Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `build`. Imperative, lowercase summary, ≤ 72 chars.
- Version bump commits: `chore(release): vX.Y.Z`.
