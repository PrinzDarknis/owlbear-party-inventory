---
name: new-component
description: Scaffold a new React function component for an Owlbear plugin from harness/templates/component, following harness/core/04-conventions.md. Use when the user asks to create, add or scaffold a component.
argument-hint: <feature>/<component-name> [short purpose]
---

# New component

Arguments: `$ARGUMENTS` (expected `<feature>/<component-name>` in kebab-case, optionally followed by a purpose).

1. Read `harness/project/deviations.md`. If the project overrides component style or folders, follow it and say so.
2. Derive the names:
   - folder: `src/components/<feature>/<component-name>/`
   - files: `<component-name>.component.tsx`, `<component-name>.css`, `index.ts`
   - export: `PascalCase` of the name, props type `<PascalCase>Props`
   - root CSS class: `<component-name>`, children `<component-name>__<part>`
3. Copy from `harness/templates/component/` and replace `component-name` / `ComponentName` everywhere. Remove the example state if it isn't needed.
4. Add `export * from "./<component-name>";` to `src/components/<feature>/index.ts` (create the barrel, and register it in `src/components/index.ts` if one exists).
5. If the component needs OBR data, **do not import the SDK**. For UI surfaces (popover, modal, context-menu embed, action height) read the matching page in `harness/owlbear/apis/` first. Use or create a hook in `src/hooks/` built on `useObrSubscription` (see `/new-obr-feature`).
6. Use theme variables (`var(--obr-*)`) for colors.
7. Run `npm run lint` and `npm run build`, and report the result.
