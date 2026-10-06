# Tutorial: Hello World (condensed)

> SDK 3.1.0 (tutorial code targets SDK 1.x / Vite 3) · Sources: docs "Tutorial - Hello World" (category not expanded; final code only), `owlbear-rodeo/sdk-tutorials/hello-world` (MIT) · Updated: 2026-10-05

## What the tutorial builds
A minimal extension: a Vite vanilla-JS site with a manifest whose **action** opens the site as a popover. A counter button calls `OBR.notification.show("count is N")` on each click.

Final code, in short:
- `public/manifest.json`: `name`, `version`, `manifest_version: 1`, `action { title, icon: "/icon.svg", popover: "/", width: 400, height: 600 }`. No background page.
- `counter.js`: `import OBR from "@owlbear-rodeo/sdk"` and a call to `OBR.notification.show(...)` in a click handler.
- `npm run dev`, then add `http://localhost:5173/manifest.json` in Owlbear as a custom extension.

## Mapping to this harness
| Tutorial | Harness equivalent |
| --- | --- |
| Vanilla JS + `innerHTML` | React function components (`harness/templates/component/`). Never use `innerHTML` with data |
| `OBR.*` called directly in UI code | Facade `api.*` in `src/obr/`, React access via hooks |
| No `OBR.onReady` before the first call | `obrReady` / `useObrReady()` gate (`harness/templates/obr/obr.ts`) |
| One manifest, popover `/` | `manifest.json` + `manifest.dev.json`, entry `html/popover.html`, multi-page Vite config |
| SDK `^1.3.4`, Vite 3 | SDK ≥ 3.1, Vite ≥ 6, React 19, TS strict (`harness/core/01-tech-stack.md`) |

Harness version of the counter (with a `notification` service added to the facade):
```ts
// src/obr/obr-notification.service.ts
export const notificationService = {
  async show(message: string, variant?: "DEFAULT" | "ERROR" | "INFO" | "SUCCESS" | "WARNING") {
    await obrReady;
    return OBR.notification.show(message, variant);
  },
};
// component
const [count, setCount] = useState(0);
const handleClick = () => {
  const next = count + 1;
  setCount(next);
  void api.notification.show(`count is ${next}`);
};
```

## Takeaways
- The smallest useful extension needs **only a manifest plus one page**. Add a background page only when you need session-long listeners or menus.
- Dev workflow: Vite dev server + manifest URL in Owlbear. Changes hot-reload inside the iframe; manifest changes need the extension to be re-added.

## Claude workflow
- Use this as the reference for "bootstrap a new plugin": copy `harness/templates/config/*` and `entries/*`, add `obr/` and `hooks/`, then run `npm run dev`.
- Live test (by the user): action button visible, popover opens, notification appears on click.
