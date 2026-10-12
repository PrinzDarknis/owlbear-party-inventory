# Data Model

Namespace constant: `PLUGIN_ID` in `src/obr/constants.ts`.

## Domain model (`src/model/`)

| Entity (class / DTO)                | Fields                                                                                                                                                                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Item` / `ItemData` (definition)    | `id`, `name` (required), `description?`, `categories?` (string[]), `rarity?`, `valueCp?` (copper pieces, integer), `weight?` (lb, 2 decimals), `stackable`, `hasInventory`, `dmNotes?` | Created once by the GM in the catalog.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ItemInstance` / `ItemInstanceData` | `id`, `itemId`, `location`, `alias?`, `notes?` (player notes), `quantity` (integer ≥ 0), `used?` (integer, ≤ quantity, stored only when > 0)                                           | One copy owned by a character or inside a container. The getter `quantity` returns 1 for non-stackable items (stored value stays as `rawQuantity`). The manager binds the definition via `bindItem`. `used` counts used pieces of a stack (player "use", GM undo); its getter is 0 for non-stackable items and clamped to `quantity`; `available = quantity − used` is what the UI shows next to `used`. Data without `used` reads as 0 (no DTO version bump). |
| `Character` / `CharacterData`       | `id`, `name`                                                                                                                                                                           | One tab each. No Owlbear player names or ids are stored.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ItemLocation`                      | `{ type: "unassigned" }` \| `{ type: "character", characterId }` \| `{ type: "instance", instanceId }`                                                                                 | Data is flat; the tree is built in the manager. `instance` requires the target's item to have `hasInventory` and must not create a cycle (manager, phase 3).                                                                                                                                                                                                                                                                                                   |
| `Rarity`                            | `common`, `uncommon`, `rare`, `very-rare`, `legendary`, `artifact` (`RARITIES`)                                                                                                        | `undefined` = no rarity.                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Rules:

- Domain classes `implement` their DTO interface and expose every value via get/set accessors (extension point, e.g. unidentified items). `serialize()` reads private fields, so getter overrides never reach storage. Subclasses override get and set together.
- **Setters correct silently** (trim, truncate, clamp, round). Empty required text or non-finite numbers keep the previous value; `undefined` or empty text clears optional fields. Shared rules: `src/model/common/normalize.service.ts`.
- Limits: `src/model/common/limits.constant.ts`. Texts per item stay below the 16 KB broadcast limit.
- Untrusted JSON is validated by `Item.deserialize`, `ItemInstance.deserialize`, `Character.deserialize` (class models; always `unknown` in, no separate parser) and `parseLocation` (plain type): `undefined` without a valid id (≤ `ID_MAX`) or required name, fields of the wrong type dropped, the rest normalized. DTO interfaces are not exported from the model barrels (`harness/core/04-conventions.md` §Models).

## Storage layer (`src/storage/`)

The manager reaches stored data only through the `InventoryStorage` contract (`src/storage/interface/`) and picks a controller from `STORAGE_BACKENDS` (`src/storage/registry/`). Public API: `src/storage/index.ts` (interface + registry).

| Contract part       | Rule                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format              | Class instances in and out. Controllers call `serialize()` / `deserialize()`; they hand out fresh instances.                                                                |
| `load()`            | All records as `InventorySnapshot`. Long texts are omitted if `capabilities.lazyTexts`.                                                                                     |
| `apply(operations)` | List of `{ op: "save", kind, record }` / `{ op: "delete", kind, id }`, applied **in order**, stored **atomically** (one write, one change event). `apply([])` does nothing. |
| `loadTexts(ref)`    | Long texts of one item (`description`, `dmNotes`) or instance (`notes`).                                                                                                    |
| `subscribe`         | `StorageChange`: `records` (reload), `texts` (refs), `role`. No record ids: controllers are stateless, the manager holds the only in-memory state and compares.             |
| Errors              | `StorageError.code`: `unreadable`, `unsupported-version`, `write-failed`, `too-large`, `unavailable`. Messages never contain stored content.                                |

| Controller          | Folder              | Source                                                                                  | capabilities (persistent / lazyTexts / multiUser) |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `memory`            | `backends/memory/`  | in-memory record set (the only controller holding records)                              | false / false / false                             |
| `local`             | `backends/local/`   | one localStorage key, versioned DTO; read on every call; `storage` event for other tabs | true / false / false                              |
| `owlbear` (phase 5) | `backends/owlbear/` | room metadata records + texts in the GM browser; SDK only via the `src/obr` facade      | true / true / true                                |

Local controller rules: data that can't be read (corrupt JSON, invalid shape, unknown version) is **never overwritten**; `load` and `apply` reject until `clear()` deletes it. Invalid entries inside a valid DTO are dropped on read (only their count is logged) and disappear with the next successful `apply`. Without usable localStorage the registry reports `local` as unavailable and memory is the alternative.

## Room metadata

| Key (constant)                   | Shape (type)                        | Written by         | Notes              |
| -------------------------------- | ----------------------------------- | ------------------ | ------------------ |
| `METADATA_VERSION`               | `number`                            | GM (migrations)    | From the template. |
| _planned:_ `${PLUGIN_ID}/i/<id>` | compact `Item` core (no long texts) | GM                 | Phase 5            |
| _planned:_ `${PLUGIN_ID}/n/<id>` | compact `ItemInstance` (no notes)   | GM, players (move) | Phase 5            |
| _planned:_ `${PLUGIN_ID}/c/<id>` | `Character`                         | GM                 | Phase 5            |

Budget: `ROOM_METADATA_BUDGET_BYTES` (8 KB) for all keys together.

## Scene / item / player metadata

| Scope | Key (constant) | Shape | Notes |
| ----- | -------------- | ----- | ----- |

## Broadcast channels

| Channel (constant)                                | Payload                                  | Destination | Listener (context)      |
| ------------------------------------------------- | ---------------------------------------- | ----------- | ----------------------- |
| _planned:_ text request / response / notes update | one item's or instance's texts (< 16 KB) | REMOTE      | GM background (phase 5) |

## localStorage

| Key                                                    | Content                                                                                                                                   | Deletion path                                                      |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `LOCAL_INVENTORY_KEY` = `${PLUGIN_ID}/local/inventory` | full inventory of the local controller: `LocalInventoryDto` `{ version, items, instances, characters }` (records as `serialize()` output) | `LocalInventoryStorage.clear()` ("Clear local data" UI in phase 4) |
| `LOCAL_PROBE_KEY` = `${PLUGIN_ID}/local/probe`         | `"1"`, written and removed immediately to test availability                                                                               | removed by the probe itself                                        |
| _planned:_ `${PLUGIN_ID}/texts/<roomId>/<i\|n>/<id>`   | long texts (GM browser = source, players = cache)                                                                                         | "Clear local data" action                                          |

## Migrations

| Version                                     | What changes                                                                                                        | Status  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| local DTO 1 (`LOCAL_INVENTORY_DTO_VERSION`) | Initial format of `LOCAL_INVENTORY_KEY`. Other versions are rejected (`unsupported-version`) and never overwritten. | current |

## Foreign extensions (adapters)

| Extension | Foreign key | Read / write | Toggle |
| --------- | ----------- | ------------ | ------ |
