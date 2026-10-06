# Data Model

Namespace constant: `PLUGIN_ID` in `src/obr/constants.ts`.

## Domain model (`src/model/`)
| Entity (class / DTO) | Fields | Notes |
| --- | --- | --- |
| `Item` / `ItemData` (definition) | `id`, `name` (required), `description?`, `categories?` (string[]), `rarity?`, `valueCp?` (copper pieces, integer), `weight?` (lb, 2 decimals), `stackable`, `hasInventory`, `dmNotes?` | Created once by the GM in the catalog. |
| `ItemInstance` / `ItemInstanceData` | `id`, `itemId`, `location`, `alias?`, `notes?` (player notes), `quantity` (integer ≥ 0) | One copy owned by a character or inside a container. The getter `quantity` returns 1 for non-stackable items (stored value stays as `rawQuantity`). The manager binds the definition via `bindItem`. |
| `Character` / `CharacterData` | `id`, `name` | One tab each. No Owlbear player names or ids are stored. |
| `ItemLocation` | `{ type: "unassigned" }` \| `{ type: "character", characterId }` \| `{ type: "instance", instanceId }` | Data is flat; the tree is built in the manager. `instance` requires the target's item to have `hasInventory` and must not create a cycle (manager, phase 3). |
| `Rarity` | `common`, `uncommon`, `rare`, `very-rare`, `legendary`, `artifact` (`RARITIES`) | `undefined` = no rarity. |

Rules:
- Domain classes `implement` their DTO interface and expose every value via get/set accessors (extension point, e.g. unidentified items). `serialize()` reads private fields, so getter overrides never reach storage. Subclasses override get and set together.
- **Setters correct silently** (trim, truncate, clamp, round). Empty required text or non-finite numbers keep the previous value; `undefined` or empty text clears optional fields. Shared rules: `src/model/common/normalize.service.ts`.
- Limits: `src/model/common/limits.constant.ts`. Texts per item stay below the 16 KB broadcast limit.
- Untrusted JSON is validated by `Item.deserialize`, `ItemInstance.deserialize`, `Character.deserialize` (class models; always `unknown` in, no separate parser) and `parseLocation` (plain type): `undefined` without a valid id (≤ `ID_MAX`) or required name, fields of the wrong type dropped, the rest normalized. DTO interfaces are not exported from the model barrels (`harness/core/04-conventions.md` §Models).

## Room metadata
| Key (constant) | Shape (type) | Written by | Notes |
| --- | --- | --- | --- |
| `METADATA_VERSION` | `number` | GM (migrations) | From the template. |
| _planned:_ `${PLUGIN_ID}/i/<id>` | compact `Item` core (no long texts) | GM | Phase 5 |
| _planned:_ `${PLUGIN_ID}/n/<id>` | compact `ItemInstance` (no notes) | GM, players (move) | Phase 5 |
| _planned:_ `${PLUGIN_ID}/c/<id>` | `Character` | GM | Phase 5 |

Budget: `ROOM_METADATA_BUDGET_BYTES` (8 KB) for all keys together.

## Scene / item / player metadata
| Scope | Key (constant) | Shape | Notes |
| --- | --- | --- | --- |

## Broadcast channels
| Channel (constant) | Payload | Destination | Listener (context) |
| --- | --- | --- | --- |
| _planned:_ text request / response / notes update | one item's or instance's texts (< 16 KB) | REMOTE | GM background (phase 5) |

## localStorage
| Key | Content | Deletion path |
| --- | --- | --- |
| _planned:_ local storage backend keys (`STORAGE_KEY(...)`) | full inventory in standalone mode | "Clear local data" action |
| _planned:_ `${PLUGIN_ID}/texts/<roomId>/<i\|n>/<id>` | long texts (GM browser = source, players = cache) | "Clear local data" action |

## Migrations
| Version | What changes | Status |
| --- | --- | --- |

## Foreign extensions (adapters)
| Extension | Foreign key | Read / write | Toggle |
| --- | --- | --- | --- |
