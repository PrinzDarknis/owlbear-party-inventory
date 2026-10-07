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
    <name>.ts                           domain class (optional, see "Models" below)
    <name>.types.ts                     types/interfaces (with a class: the JSON DTO)
    <name>.default.ts                   default values
    <name>.parse.ts                     type guards / parsers for untrusted data (only without a class)
  utils/<name>.service.ts               one pure function (or tightly related group) per file
```

### Folder structure rules
- **Group by responsibility, never by "everything of this module".** A module folder (e.g. a storage or manager layer) gets one sub-folder per role: contracts/interfaces, shared internals, one folder per implementation (controller, backend, adapter), wiring (registry, factory) and test-only helpers. A flat catch-all folder is not acceptable.
- **Plan the structure before the first file.** Every feature plan (`current-feature/plan.md` → Structure) shows the target tree of the folders it creates or extends. Files are created in their final place from the start, not moved there later.
- **Plan a layer as a whole.** Design the structure and contract of a layer for **all** implementations known from the roadmap (including later phases), not only for the step at hand. For each part, name who uses it: code used by one implementation lives in that implementation's folder (e.g. its persisted format under `dto/`); only code used by several goes to a `shared/` folder. Decide where state lives (exactly one owner) before adding caches or change events.
- One topic per file. Split type files by topic (contract, snapshot, changeset, …) instead of collecting every type of a module in one file.
- Each layer exposes a public barrel (`<module>/index.ts`). Internal folders (shared helpers, test helpers) are not re-exported from it.
- Test-only helpers (contract suites, fakes) live in a `testing/` folder of their module and are never imported by app code.

## File naming
- **kebab-case** file and folder names.
- Suffixes: `.component.tsx`, `.hook.ts`, `.service.ts`, `.types.ts`, `.default.ts`, `.parse.ts`, `.constant.ts`, `.enum.ts`, `.test.ts`, `.mockdata.ts`, `.storage.ts` (a class implementing a storage/backend interface), `.registry.ts` (list of selectable implementations).
- Every folder that is imported from elsewhere has an `index.ts` barrel.

## TypeScript
- **Named exports only.** No `export default` in `src/` (config files like `vite.config.ts` excepted).
- `type` for unions, mapped and utility types. `interface` for object shapes (props, models). **No `I` prefix.**
- Props type: `<ComponentName>Props`. Hook return types are explicit.
- Constants: `SCREAMING_SNAKE_CASE`. Functions and variables: `camelCase`. Components, types and classes: `PascalCase`. Hooks: `useXxx`.
- No `any`. Use `unknown` plus a type guard. No non-null `!` except for `document.getElementById("root")!` in entries.
- Relative imports, ordered: external packages → blank line → CSS import → blank line → assets → blank line → internal modules (farther first).
- **Class internals use ECMAScript private fields** (`#name`), not TypeScript `private _name`. `#` fields are private at runtime too: they can't be reached via casts or bracket access, and they don't appear in `JSON.stringify`, `Object.keys` or spread, so data leaves an object only through its accessors and `serialize()`. Subclasses go through the accessors (`super.name`); if a subclass really needs raw access, expose a `protected` accessor instead of a `protected _field`. The same applies to private methods (`#helper()`).
- **Member order in classes** (logical, top to bottom):
  1. static constants and static fields,
  2. instance fields (private `#fields` first),
  3. constructor, then static factories (`create…`),
  4. accessors (get/set pairs together, in the order of the fields or the DTO),
  5. public methods, grouped by topic (related methods next to each other),
  6. serialization: `serialize`, `static deserialize`, `clone`,
  7. private helper methods (`#helper()`).
- **Region comments** group the members of every class that has several of the groups above: `// #region <Name>` … `// #endregion` (e.g. `Fields`, `Accessors`, `<topic>`, `Serialization`, `Helpers`). Rules:
  - The order above applies to all classes, small ones included.
  - Once a class uses regions, **every member is in a region**. A group with a single member that sits between other regions gets its own region too (e.g. `Construction` for a lone constructor); loose members between regions break the IDE folding view.
  - Constructor and factories form the `Construction` region between `Fields` and `Accessors`.
  - Regions are only for IDE folding and readability; they don't nest and don't replace splitting a class that has grown too large.
- A class that corresponds to an interface **always declares it with `implements`** (`class Item implements ItemData`), so the compiler keeps both in sync. Fields that the class only exposes read-only are `readonly` in the interface.

## Models
A model is either a **plain type** (interface/type plus a parser) or a **class** (with a JSON DTO interface). Choose the class when the model has behavior, invariants or accessors; otherwise keep the plain type.

Naming: plain types are **parsed** (`parse<Name>(value: unknown)`), class objects are **serialized** (`serialize()` / `static deserialize(value: unknown)`).

- **Plain type:** `<name>.types.ts` plus `<name>.parse.ts` with `parse<Name>(value: unknown): <Name>` (falling back to defaults) or a type guard `is<Name>(value: unknown)`. Both are exported from `index.ts`.
- **Class:** the class is the model and `implements` its DTO interface. Everything outside the model folder works with class instances.
  - Exactly one pair of methods converts to and from JSON:
    - `serialize(): <Name>Data` returns the plain DTO. It reads the private fields, so getter overrides in subclasses never reach storage.
    - `static deserialize(value: unknown): <Class> | undefined` **always takes `unknown`** and validates and normalizes. It returns `undefined` if required fields are missing.
  - There are no other conversion paths: **no separate `.parse.ts`**, no parser that returns the DTO, no typed `fromData`/`parse` next to `deserialize`. Tests use a small local helper that throws if `deserialize` returns `undefined`. `clone()` copies the private fields directly.
  - **Use the model's own methods; don't rebuild them outside.** A copy is always `instance.clone()`, never a helper like `copyX(x)` or `X.deserialize(x.serialize())`. Validation already happened in the constructor and setters, so code outside the model doesn't re-validate class instances. `deserialize` is only for untrusted data.
  - The DTO interface (`<name>.types.ts`) is **not exported from `index.ts` by default**. Export it only when a place really needs the plain shape and can't use the class. Name the reason in a comment at the export.
  - Storage, sync and import code hand raw data to `<Class>.deserialize` and write `instance.serialize()`.

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
- Branch per feature or fix: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`. The default branch (`main`/`master`) stays deployable.
- A feature branch holds a **complete feature** with all its steps; it is merged only when the feature is finished and `harness/project/current-feature/` is empty again (see [07 §Feature lifecycle](07-workflow.md#feature-lifecycle-harnessprojectcurrent-feature)).
- Commit messages: `type(scope): summary` (Conventional Commits). Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `build`. Imperative, lowercase summary, ≤ 72 chars.
- Version bump commits: `chore(release): vX.Y.Z`.
