import { ItemLocation } from "./location.types";

export const UNASSIGNED: ItemLocation = Object.freeze({ type: "unassigned" });

/** Location for an instance owned directly by a character. */
export function atCharacter(characterId: string): ItemLocation {
  return { type: "character", characterId };
}

/** Location for an instance inside another instance (container). */
export function inInstance(instanceId: string): ItemLocation {
  return { type: "instance", instanceId };
}

/** Structural equality of two locations. */
export function locationEquals(a: ItemLocation, b: ItemLocation): boolean {
  switch (a.type) {
    case "unassigned":
      return b.type === "unassigned";
    case "character":
      return b.type === "character" && a.characterId === b.characterId;
    case "instance":
      return b.type === "instance" && a.instanceId === b.instanceId;
  }
}

/** Independent copy, so callers can't mutate a stored location. */
export function copyLocation(location: ItemLocation): ItemLocation {
  switch (location.type) {
    case "unassigned":
      return UNASSIGNED;
    case "character":
      return atCharacter(location.characterId);
    case "instance":
      return inInstance(location.instanceId);
  }
}
