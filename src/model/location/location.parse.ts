import { isRecord, isValidId } from "../common";

import { atCharacter, inInstance, UNASSIGNED } from "./location.service";
import { ItemLocation } from "./location.types";

/** Parses an untrusted location; anything invalid becomes `UNASSIGNED`. */
export function parseLocation(value: unknown): ItemLocation {
  if (!isRecord(value)) return UNASSIGNED;
  if (value.type === "character" && isValidId(value.characterId)) {
    return atCharacter(value.characterId);
  }
  if (value.type === "instance" && isValidId(value.instanceId)) {
    return inInstance(value.instanceId);
  }
  return UNASSIGNED;
}
