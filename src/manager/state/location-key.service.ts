import { ItemLocation } from "../../model";

/** Map key of a location, used to index the contents of a location. */
export type LocationKey = string;

/**
 * Builds a stable map key for a location, so contents can be indexed by it.
 * @param location The location to key.
 * @returns `unassigned`, `character:<id>` or `instance:<id>`.
 */
export function locationKey(location: ItemLocation): LocationKey {
  switch (location.type) {
    case "unassigned":
      return "unassigned";
    case "character":
      return `character:${location.characterId}`;
    case "instance":
      return `instance:${location.instanceId}`;
  }
}
