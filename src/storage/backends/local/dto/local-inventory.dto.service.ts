import { Character, isRecord, Item, ItemInstance } from "../../../../model";
import { RecordSet } from "../../shared";

import { LOCAL_INVENTORY_DTO_VERSION } from "./local-inventory.dto.constant";
import { DtoReadResult, LocalInventoryDto } from "./local-inventory.dto.types";

/** Stored form of a record set, in the current DTO version. */
export function toDto(records: RecordSet): LocalInventoryDto {
  return {
    version: LOCAL_INVENTORY_DTO_VERSION,
    items: [...records.items.values()].map((item) => item.serialize()),
    instances: [...records.instances.values()].map((instance) =>
      instance.serialize(),
    ),
    characters: [...records.characters.values()].map((character) =>
      character.serialize(),
    ),
  };
}

/**
 * Reads an untrusted DTO (parsed JSON). Entries are validated one by one via
 * the model's `deserialize`; invalid entries are dropped and counted, and for
 * duplicate ids the last entry wins. A missing list counts as empty. The whole
 * DTO is rejected if its shape or version is unusable, so the controller can
 * refuse to overwrite data it can't read.
 */
export function fromDto(value: unknown): DtoReadResult {
  if (!isRecord(value) || typeof value.version !== "number") {
    return { ok: false, error: "invalid" };
  }
  if (value.version !== LOCAL_INVENTORY_DTO_VERSION) {
    return { ok: false, error: "unsupported-version" };
  }

  let dropped = 0;
  function readList<T extends { readonly id: string }>(
    list: unknown,
    deserialize: (entry: unknown) => T | undefined,
  ): Map<string, T> | undefined {
    const records = new Map<string, T>();
    if (list === undefined) return records;
    if (!Array.isArray(list)) return undefined;
    for (const entry of list) {
      const record = deserialize(entry);
      if (record) records.set(record.id, record);
      else dropped++;
    }
    return records;
  }

  const items = readList(value.items, (entry) => Item.deserialize(entry));
  const instances = readList(value.instances, (entry) =>
    ItemInstance.deserialize(entry),
  );
  const characters = readList(value.characters, (entry) =>
    Character.deserialize(entry),
  );
  if (!items || !instances || !characters) {
    return { ok: false, error: "invalid" };
  }
  return { ok: true, records: { items, instances, characters }, dropped };
}
