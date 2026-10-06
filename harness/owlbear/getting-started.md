# Getting Started: Extension Model

> SDK 3.1.0 · Sources: docs "Getting Started" (pasted by the user 2026-10-05), `lib/index.d.ts`, `owlbear-rodeo/sdk-tutorials/hello-world` (MIT) · Updated: 2026-10-05

## Purpose
How an Owlbear Rodeo extension is structured and loaded, and which UI surfaces it can use. Read this before designing a new plugin or a new surface.

## How an extension is loaded
1. The entry point is a **`manifest.json`**, hosted next to the extension code (see [reference/manifest.md](reference/manifest.md)).
2. The user adds the extension in Owlbear by **URL of that manifest**. A custom extension is loaded by link; store extensions are listed after review (see [tutorials/sharing.md](tutorials/sharing.md)).
3. The manifest names the pages Owlbear embeds as **iframes**: the action popover page and an optional background page. Further iframes are created at runtime (popovers, modals, context-menu embeds).
4. Each iframe talks to Owlbear through the **SDK** (`@owlbear-rodeo/sdk`, TypeScript, ES module) via `postMessage`. Calls are async.

## UI surfaces
| # | Surface | What it is | Declared / created via | Harness page |
| --- | --- | --- | --- | --- |
| 1 | **Action** | Button in the top left of the room | `manifest.action` (initial), `OBR.action` (runtime) | [apis/action.md](apis/action.md) |
| 2 | **Action popover** | Your site in an iframe, opened by clicking the action | `manifest.action.popover` | [apis/action.md](apis/action.md) |
| 3 | **Context menu** | Custom entry when items are selected (optionally with an embedded iframe) | `OBR.contextMenu.create` | [apis/context-menu.md](apis/context-menu.md) |
| 4 | **Popover** | Extra iframe UI opened from code | `OBR.popover.open` | [apis/popover.md](apis/popover.md) |
| 5 | **Tool** | Custom tool in the toolbar | `OBR.tool.create` | [apis/tool.md](apis/tool.md) |
| 6 | **Tool mode** | Left side of the tool menu. Once active, receives click and drag events | `OBR.tool.createMode` | [apis/tool.md](apis/tool.md) |
| 7 | **Tool action** | Button on the right side of the tool menu, `onClick` only | `OBR.tool.createAction` | [apis/tool.md](apis/tool.md) |
| – | Modal | Full-screen-ish iframe dialog | `OBR.modal.open` | [apis/modal.md](apis/modal.md) |
| – | Background | Invisible iframe for the whole session | `manifest.background_url` | `harness/core/02-architecture.md` §1 |

**The toolbar (tools, modes, tool actions) is only shown while a scene is open.** You can register tools right after `onReady` (the official custom-tool tutorial does this in the background page); they appear once a scene is open. Anything a tool does to items still needs a ready scene.

## The SDK entry object
```ts
import OBR from "@owlbear-rodeo/sdk";
OBR.onReady(cb: () => void): void   // run SDK calls only after this fired
OBR.isReady: boolean                // readiness flag
OBR.isAvailable: boolean            // true if the page is embedded in Owlbear
// APIs: action, assets, broadcast, contextMenu, interaction, modal, notification,
//       party, player, popover, room, scene, theme, tool, viewport
// Builders (named exports): buildImage, buildShape, buildText, buildLabel, buildCurve,
//       buildLine, buildPath, buildPointer, buildRuler, buildLight, buildWall,
//       buildEffect, buildBillboard, buildImageUpload, buildSceneUpload
// Types and math helpers are re-exported from the package root.
```

## Implementation in this harness
- `OBR.onReady` is called **once per iframe** in `src/obr/obr.ts` (template `harness/templates/obr/obr.ts`). Everything else awaits `obrReady` or `api.ready`.
- **`OBR.isAvailable`** is useful for developing the UI in a normal browser tab (`npm run dev` without Owlbear): if it is false, render a hint or mock data instead of waiting forever for `onReady`. Put the check in the facade (`api.isAvailable`), never in components.
- One HTML entry and one `main-<context>.tsx` per surface (template `harness/templates/entries/`).
- Asset and page URLs passed to Owlbear go through `assetUrl()` (dev vs production base path).

## Pitfalls and limits
- Every iframe is a separate JS context: no shared memory between popover, background and embeds.
- SDK calls before `onReady` fail or hang. This is the most common beginner bug; the official hello-world code calls `OBR.notification.show` without awaiting readiness, so don't copy it as-is.
- Tools are only visible with an open scene. A room can be open without a scene.
- **Callbacks live in the iframe that registered them** (context-menu `onClick`, tool and mode handlers): the SDK keeps them in that iframe's memory. Register menus and tools in the **background** page, or they stop working when the popover closes.
- **URL normalization:** for icons and embed/popover URLs, the SDK only prefixes `window.location.origin` to paths that don't start with `http`. It does **not** add your hosting base path, and a path without a leading `/` gets glued directly onto the origin. Always pass `assetUrl("…")` (leading slash plus base path) or a full URL.
- Owlbear embeds your page cross-origin. The dev server must allow CORS from `https://www.owlbear.rodeo` (see `harness/core/06-build-release.md`).

## Claude workflow
- New plugin: scaffold from `harness/templates/` (config, entries, obr, hooks), then fill in `harness/project/`.
- New surface: decide the context with the table above, add an HTML entry plus `main-<context>.tsx`, and register it in `vite.config.ts` and, if needed, in the manifest.
- Live test (by the user): load `http://localhost:5173/manifest.dev.json` as a custom extension and check that each surface appears and the iframe consoles are error-free.
