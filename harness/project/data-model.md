# Data Model

Namespace constant: `PLUGIN_ID` in `src/obr/constants.ts`.

## Domain model (planned, see [roadmap.md](roadmap.md))
| Entity | Fields | Notes |
| --- | --- | --- |
| `Item` (definition) | `id`, `name` (required), `description?`, `categories[]`, `rarity?`, `value?` (GP), `weight?`, `stackable`, `hasInventory`, `dmNotes?` | Created once by the GM in the catalog. |
| `ItemInstance` | `id`, `itemId`, `location`, `alias?`, `notes?` (player notes), `quantity` | One copy owned by a character or inside a container. `quantity` is only meaningful if the item is `stackable`, otherwise 1. |
| `Character` | `id`, `name` | One tab each. No Owlbear player names or ids are stored. |
| `ItemLocation` | `unassigned` \| `{ character: id }` \| `{ instance: id }` | Data is flat; the tree is built in the manager. `{ instance }` requires the target's item to have `hasInventory`, and must not create a cycle. |

Domain classes expose every value via get/set accessors (extension point, e.g. unidentified items). Storage only sees plain JSON DTOs.

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
