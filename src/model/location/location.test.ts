import { describe, expect, it } from "vitest";

import { parseLocation } from "./location.parse";
import {
  atCharacter,
  copyLocation,
  inInstance,
  locationEquals,
  UNASSIGNED,
} from "./location.service";

describe("locationEquals", () => {
  it("compares type and id", () => {
    expect(locationEquals(UNASSIGNED, { type: "unassigned" })).toBe(true);
    expect(locationEquals(atCharacter("a"), atCharacter("a"))).toBe(true);
    expect(locationEquals(atCharacter("a"), atCharacter("b"))).toBe(false);
    expect(locationEquals(atCharacter("a"), inInstance("a"))).toBe(false);
    expect(locationEquals(inInstance("a"), inInstance("a"))).toBe(true);
  });
});

describe("copyLocation", () => {
  it("returns an independent copy", () => {
    const original = atCharacter("a");
    const copy = copyLocation(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
  });
});

describe("parseLocation", () => {
  it("accepts valid locations", () => {
    expect(parseLocation({ type: "character", characterId: "c1" })).toEqual(
      atCharacter("c1"),
    );
    expect(parseLocation({ type: "instance", instanceId: "i1" })).toEqual(
      inInstance("i1"),
    );
    expect(parseLocation({ type: "unassigned" })).toEqual(UNASSIGNED);
  });

  it("falls back to unassigned for invalid input", () => {
    expect(parseLocation(null)).toEqual(UNASSIGNED);
    expect(parseLocation({ type: "character" })).toEqual(UNASSIGNED);
    expect(parseLocation({ type: "instance", instanceId: "" })).toEqual(
      UNASSIGNED,
    );
    expect(parseLocation({ type: "elsewhere", characterId: "c1" })).toEqual(
      UNASSIGNED,
    );
  });

  it("drops unknown fields", () => {
    expect(
      parseLocation({ type: "character", characterId: "c1", extra: 1 }),
    ).toEqual(atCharacter("c1"));
  });
});
