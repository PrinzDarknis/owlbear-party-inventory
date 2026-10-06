# Modal API

> SDK 3.1.0 · Sources: `lib/api/ModalApi.d.ts`, `lib/types/Modal.d.ts` · Updated: 2026-10-05

## Purpose
Opens an iframe as a **modal dialog** or a **full-screen overlay**: editors that need space, confirmations, onboarding, or visual overlays (e.g. effects over the whole room with `hideBackdrop` + `hidePaper` + `disablePointerEvents`).

## API
```ts
OBR.modal.open(modal: Modal): Promise<void>;
OBR.modal.close(id: string): Promise<void>;

interface Modal {
  id: string;                      // namespaced, e.g. `${PLUGIN_ID}/modal/editor`
  url: string;
  width?: number; height?: number;
  fullScreen?: boolean;            // cover the whole window
  hideBackdrop?: boolean;          // no dimmed background
  hidePaper?: boolean;             // no dialog card (transparent)
  disablePointerEvents?: boolean;  // clicks pass through to Owlbear (overlay-only UI)
}
```
There is no getter or resize API. Close and re-open to change the size.

## Implementation in this harness
- Own HTML entry + `main-<name>.tsx`. Service `api.modal.open(name, options)` / `api.modal.close(name)` with namespaced ids.
- **Returning a result** to the opener (e.g. "confirmed" or "saved"): the modal sends a broadcast with `destination: "LOCAL"` on `${PLUGIN_ID}/broadcast/modal/<name>` and then closes itself. The opener listens, validates the payload and unsubscribes. Persisted results are written to metadata by the modal itself through the facade.
- Close button inside the modal → `api.modal.close(id)`. Also handle `Escape`.

## Pitfalls and limits
- Modals are local to the client that opened them.
- An overlay with `disablePointerEvents` cannot receive clicks, so it can't contain controls. Pair it with a popover or the action for controls.
- Full-screen overlays must stay light (animations, canvas). They render above the whole room for this client.

## Claude workflow
- Skill: `/new-component` for the content, new HTML entry.
- Ask the user: dialog or overlay? Who opens it, and does the result need to be persisted or only returned?
- Live test (by the user): opens and closes (button, Escape), the result reaches the opener, an overlay doesn't block map interaction.
