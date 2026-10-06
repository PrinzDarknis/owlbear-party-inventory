# Notification API

> SDK 3.1.0 · Sources: `lib/api/NotificationApi.d.ts`, `sdk-tutorials/hello-world` (MIT) · Updated: 2026-10-05

## Purpose
Shows a short **toast** in Owlbear's UI: feedback for actions ("Saved"), errors ("Storage limit reached") and warnings. Not for persistent information; use your own UI or the action badge for that ([action.md](action.md)).

## API
```ts
OBR.notification.show(
  message: string,
  variant?: "DEFAULT" | "ERROR" | "INFO" | "SUCCESS" | "WARNING",
): Promise<string>;              // returns the notification id
OBR.notification.close(id: string): Promise<void>;
```

## Implementation in this harness
- Service `src/obr/obr-notification.service.ts` → `api.notification.show(message, variant)` / `close(id)` (example in [tutorials/hello-world.md](../tutorials/hello-world.md)).
- Use it in services for **user-relevant failures**, e.g. the metadata size budget in `obr-example.service.ts` and failed imports. Log technical details with the logger, not in the toast.
- For long-running work: `const id = await show("Importing…", "INFO")`, then `close(id)` and show the result.

## Pitfalls and limits
- Notifications are **local** to the client that called `show`. To notify other players, send a broadcast and let each client show its own toast (in the background page, so it also works while their popover is closed).
- Keep messages short and in English (`harness/core/04-conventions.md`). Never include personal data or raw error dumps.
- Don't spam: avoid toasts in loops or for every remote change.

## Claude workflow
- No separate skill needed. Add the service once per plugin, then use `api.notification` in features.
- Live test (by the user): the toast appears with the right variant; remote notifications appear for the other player.
