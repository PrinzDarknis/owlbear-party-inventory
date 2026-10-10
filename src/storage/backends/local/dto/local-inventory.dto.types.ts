import { Character, Item, ItemInstance } from "../../../../model";
import { RecordSet } from "../../shared";

// Record shapes are derived from `serialize()`, so the model DTOs stay
// unexported (harness/core/04-conventions.md §Models).
type SerializedItem = ReturnType<Item["serialize"]>;
type SerializedInstance = ReturnType<ItemInstance["serialize"]>;
type SerializedCharacter = ReturnType<Character["serialize"]>;

/** The whole inventory as stored under one localStorage key. */
export interface LocalInventoryDto {
  version: number;
  items: SerializedItem[];
  instances: SerializedInstance[];
  characters: SerializedCharacter[];
}

/** Why a stored DTO can't be used as a whole. */
export type DtoReadError = "invalid" | "unsupported-version";

/** Result of reading an untrusted DTO. */
export type DtoReadResult =
  | {
      ok: true;
      records: RecordSet;
      /** Entries dropped because they failed validation. */
      dropped: number;
    }
  | { ok: false; error: DtoReadError };
