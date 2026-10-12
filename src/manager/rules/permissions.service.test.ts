import { describe, expect, it } from "vitest";

import { can, effectiveRole } from "./permissions.service";
import { ManagerAction } from "./permissions.types";

const ALL_ACTIONS: ManagerAction[] = [
  "createCharacter",
  "updateCharacter",
  "deleteCharacter",
  "createItem",
  "updateItem",
  "deleteItem",
  "viewDmNotes",
  "assignItem",
  "updateInstance",
  "deleteInstance",
  "moveInstance",
  "splitInstance",
  "mergeInstances",
  "useInstance",
  "unuseInstance",
  "writeNotes",
];

describe("can", () => {
  it("allows the GM everything", () => {
    for (const action of ALL_ACTIONS) expect(can("GM", action)).toBe(true);
  });

  it("allows players only to rearrange, use and write notes", () => {
    const allowed = ALL_ACTIONS.filter((action) => can("PLAYER", action));

    expect(allowed.sort()).toEqual(
      [
        "moveInstance",
        "splitInstance",
        "mergeInstances",
        "useInstance",
        "writeNotes",
      ].sort(),
    );
  });
});

describe("effectiveRole", () => {
  it("turns the GM into a player while viewing as player", () => {
    expect(effectiveRole("GM", true)).toBe("PLAYER");
    expect(effectiveRole("GM", false)).toBe("GM");
  });

  it("keeps players players", () => {
    expect(effectiveRole("PLAYER", true)).toBe("PLAYER");
    expect(effectiveRole("PLAYER", false)).toBe("PLAYER");
  });
});
