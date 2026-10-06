# Permission

> SDK 3.1.0 · Sources: `lib/types/Permission.d.ts`, `lib/api/RoomApi.d.ts`, `lib/api/PlayerApi.d.ts`, `lib/types/ContextMenu.d.ts`, `lib/types/Tool.d.ts` · Updated: 2026-10-05

## Purpose
Room permissions are set by the GM. They control what **players** may do per item category. Extensions can read them to adapt the UI, and filter menus and tools by them.

## Values
`<CATEGORY>_<ACTION>` with
- categories: `MAP`, `PROP`, `MOUNT`, `CHARACTER`, `ATTACHMENT`, `NOTE`, `DRAWING`, `RULER`, `POINTER`, `TEXT`, `FOG`,
- actions: `CREATE`, `UPDATE`, `DELETE`,
- plus `CHARACTER_OWNER_ONLY` (players may only change characters they own).

Context-menu filters additionally accept the generic `"CREATE" | "UPDATE" | "DELETE"`. *(Derived: these refer to the selected items' own categories.)*

## Where they are used
| API | Use |
| --- | --- |
| `OBR.room.getPermissions()` / `onPermissionsChange` | current list of granted permissions |
| `OBR.player.hasPermission(p)` | does the local player have `p`? (GMs can do everything) |
| `ContextMenuIconFilter.permissions` | show an entry only if allowed |
| `ToolFilter.permissions` | show or enable tools, modes and actions only if allowed |

## Implementation in this harness
- Before offering an action that creates or changes items in a layer, check `hasPermission(<LAYER>_<ACTION>)` in the facade and hide or disable the control. Otherwise the player clicks and Owlbear rejects the change.
- React to `onPermissionsChange`. The GM can change permissions during a session.

## Pitfalls and limits
- Permissions govern **item operations in Owlbear's UI and API**, not your metadata. Room metadata stays writable by every client. Your own "GM only" data is still only protected by UI (`harness/core/05-security.md` §4).

## Claude workflow
- Ask the user: which item layer does the feature touch, and should players be able to use it?
- Live test (by the user): as a player with and without the matching permission (the GM toggles it in the room settings): controls appear or disappear and no failed changes occur.
