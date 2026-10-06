# Room API

> SDK 3.1.0 · Sources: docs "APIs / Room" (provided by the user 2026-10-05), `lib/api/RoomApi.d.ts`, `lib/types/Permission.d.ts` · Updated: 2026-10-05

## Purpose
Access to the **room**: its id, **room metadata** (persistent, shared by all players, independent of the open scene) and the **permissions** the GM has granted to players.

## API
```ts
OBR.room.id: string;                                   // getter, available after onReady
OBR.room.getMetadata(): Promise<Metadata>;
OBR.room.setMetadata(update: Partial<Metadata>): Promise<void>;
OBR.room.onMetadataChange(cb: (metadata: Metadata) => void): () => void;
OBR.room.getPermissions(): Promise<Permission[]>;
OBR.room.onPermissionsChange(cb: (permissions: Permission[]) => void): () => void;
```

## Implementation in this harness
- Domain services read and write room metadata (template `harness/templates/obr/obr-example.service.ts`): per-record keys, parser on read, size budget on write, debounced saves.
- `onMetadataChange` delivers the **whole** room metadata (all extensions). Filter for your prefix and skip unchanged values.
- `OBR.room.id` scopes local data per room, e.g. localStorage keys `${PLUGIN_ID}/backup/${roomId}`. It is an identifier, not secret, but don't send it anywhere external.
- Permissions: see [reference/permission.md](../reference/permission.md). Use them to **adapt the UI** (e.g. hide "create" when players can't create in the target layer).

## Pitfalls and limits
- Size: **the total room metadata must be under 16 kB**, shared by all extensions (docs "APIs / Room"). It is meant for small bits of data. Keep your share well below that (the template budget is 8 KB).
- Every client can write room metadata. Validate on read, and do derived writes from a single writer (`harness/core/03` §Loops).
- Writes are merged at the top-level key. Concurrent edits of the **same** key → last write wins. Split data so that different players write different keys where possible.

## Claude workflow
- Skill: `/new-obr-feature`. Document every new key in `harness/project/data-model.md`.
- Live test (by the user): a change by player A appears for player B without a reload; data survives reload and scene change.
