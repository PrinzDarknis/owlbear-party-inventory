# Metadata (concept)

> SDK 3.1.0 · Sources: docs "Reference / Metadata", "APIs / Room", "APIs / Broadcast" (provided by the user 2026-10-05), `lib/types/Metadata.d.ts`, `lib/api/*Api.d.ts` · Updated: 2026-10-05

## Purpose
`Metadata = Record<string, unknown>` is the SDK's general mechanism for storing and sharing **custom data**. It is attached to several scopes:

| Scope | Read / write | Change event | Persistence | API page |
| --- | --- | --- | --- | --- |
| Room | `OBR.room.getMetadata / setMetadata` | `OBR.room.onMetadataChange` | permanent, all scenes | [apis/room.md](../apis/room.md) |
| Scene | `OBR.scene.getMetadata / setMetadata` | `OBR.scene.onMetadataChange` | with the scene | [apis/scene.md](../apis/scene.md) |
| Item | `item.metadata[key]` via `scene.items.updateItems` | `scene.items.onChange` | with the item | [apis/scene.md](../apis/scene.md) |
| Player | `OBR.player.getMetadata / setMetadata` | `OBR.player.onChange`, others via `OBR.party.onChange` | session | [apis/player.md](../apis/player.md) |
| Tool | `OBR.tool.getMetadata / setMetadata`, `ctx.metadata` | (passed to handlers) | tool settings | [apis/tool.md](../apis/tool.md) |

Decision table (which scope for what): `harness/core/02-architecture.md` §4.

## Official best practice: namespacing
- Metadata is **shared with all other extensions**, so avoid key collisions.
- Prefix every key with an identifier of your extension in **reverse domain name notation** (`com.example.my-plugin`). The official example is the initiative tracker: `{ "com.tutorial.initiative-tracker/metadata": { initiative: number } }`.
- Harness convention: `PLUGIN_ID` constant + `/path` (`harness/core/03-obr-sdk-guide.md` §Metadata keys).

## Writing and reading (summary)
- `setMetadata(update: Partial<Metadata>)` merges at the **top-level key**: only the keys you pass are replaced, and `undefined` deletes a key. Nested objects are replaced as a whole, so read, modify and write the complete value of your key.
- Values go through JSON: no `Date`, `Map`, `Set` or class instances. Parse on read (`harness/templates/model/example/example.parse.ts`).
- Treat everything read as **untrusted** (other clients and extensions can write).

## Size limits
Limits are enforced by the Owlbear server, not the SDK (the SDK source has no size checks).
| Scope | Limit | Source |
| --- | --- | --- |
| Room | **total < 16 kB**, for all extensions together; "intended for small bits of stored data" | docs "APIs / Room" (confirmed 2026-10-05) |
| Broadcast message (not metadata) | **16 KB per message** | docs "APIs / Broadcast" |
| Scene, item, player | not documented yet | check in step 6 ("APIs / Scene") |

Therefore: per-record keys, no growing arrays, size checks before writes (`jsonSize` + `ROOM_METADATA_BUDGET_BYTES` in the templates). Large data goes into scene or item metadata, or stays local.

## Claude workflow
- Before adding a key: check `harness/project/data-model.md`, choose the scope with the decision table, and add the constant plus parser (`/new-obr-feature`).
- Live test (by the user): data survives a reload and is visible to the second player; other extensions in the room keep working.
