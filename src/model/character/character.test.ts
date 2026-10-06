import { describe, expect, it } from "vitest";

import { CHARACTER_NAME_MAX } from "../common/limits.constant";

import { Character, DEFAULT_CHARACTER_NAME } from "./character";

/** Deserializes test data that is known to be valid. */
function deserializeCharacter(value: unknown): Character {
  const character = Character.deserialize(value);
  if (!character) throw new Error("invalid test data");
  return character;
}

describe("Character", () => {
  it("creates with a fresh id and corrects the name", () => {
    const character = Character.create("  Aria  ");
    expect(character.name).toBe("Aria");
    expect(Character.create("").name).toBe(DEFAULT_CHARACTER_NAME);

    character.name = "";
    expect(character.name).toBe("Aria");
    character.name = "n".repeat(CHARACTER_NAME_MAX + 1);
    expect(character.name).toHaveLength(CHARACTER_NAME_MAX);
  });

  it("round-trips and clones independently", () => {
    const character = deserializeCharacter({ id: "c1", name: "Aria" });
    expect(deserializeCharacter(character.serialize()).serialize()).toEqual({
      id: "c1",
      name: "Aria",
    });
    const copy = character.clone();
    copy.name = "Brom";
    expect(character.name).toBe("Aria");
  });
});

describe("Character.deserialize", () => {
  it("accepts valid and rejects invalid data", () => {
    expect(
      Character.deserialize({ id: "c1", name: " Aria ", x: 1 })?.serialize(),
    ).toEqual({ id: "c1", name: "Aria" });
    expect(Character.deserialize({ id: "c1", name: "" })).toBeUndefined();
    expect(Character.deserialize({ name: "Aria" })).toBeUndefined();
    expect(Character.deserialize([])).toBeUndefined();
  });
});
