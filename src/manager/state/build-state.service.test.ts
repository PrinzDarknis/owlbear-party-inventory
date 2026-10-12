import { describe, expect, it } from "vitest";

import {
  atCharacter,
  Character,
  inInstance,
  ItemInstance,
  UNASSIGNED,
} from "../../model";
import { makeInstance, makeItem, stateOf } from "../testing";

import { buildState, createEmptyState } from "./build-state.service";
import { locationKey } from "./location-key.service";

describe("locationKey", () => {
  it("distinguishes location types and ids", () => {
    expect(locationKey(UNASSIGNED)).toBe("unassigned");
    expect(locationKey(atCharacter("a"))).toBe("character:a");
    expect(locationKey(inInstance("a"))).toBe("instance:a");
  });
});

describe("createEmptyState", () => {
  it("has no records and the given version", () => {
    const state = createEmptyState(3);

    expect(state.version).toBe(3);
    expect(state.items.size + state.instances.size).toBe(0);
    expect(state.contents.size).toBe(0);
  });
});

describe("buildState", () => {
  it("indexes records and binds instances to their items", () => {
    const arrows = makeItem("Arrow", { stackable: true });
    const mira = Character.create("Mira");
    const stack = makeInstance(arrows, atCharacter(mira.id), 20);

    const state = stateOf({
      items: [arrows],
      instances: [stack],
      characters: [mira],
    });

    expect(state.items.get(arrows.id)?.name).toBe("Arrow");
    expect(state.characters.get(mira.id)?.name).toBe("Mira");
    expect(state.instances.get(stack.id)?.item?.id).toBe(arrows.id);
    expect(state.instances.get(stack.id)?.quantity).toBe(20);
  });

  it("takes ownership of the snapshot records", () => {
    const arrows = makeItem("Arrow", { stackable: true });
    const stack = makeInstance(arrows);

    const state = buildState(
      { items: [arrows], instances: [stack], characters: [] },
      7,
    );

    expect(state.version).toBe(7);
    expect(state.instances.get(stack.id)).toBe(stack);
    expect(stack.item).toBe(arrows);
  });

  it("groups contents by location in load order", () => {
    const backpack = makeItem("Backpack", { hasInventory: true });
    const rope = makeItem("Rope");
    const mira = Character.create("Mira");
    const pack = makeInstance(backpack, atCharacter(mira.id));
    const rope1 = makeInstance(rope, inInstance(pack.id));
    const rope2 = makeInstance(rope, inInstance(pack.id));
    const loose = makeInstance(rope);

    const state = stateOf({
      items: [backpack, rope],
      instances: [pack, rope1, rope2, loose],
      characters: [mira],
    });

    expect(state.contents.get(locationKey(atCharacter(mira.id)))).toEqual([
      pack.id,
    ]);
    expect(state.contents.get(locationKey(inInstance(pack.id)))).toEqual([
      rope1.id,
      rope2.id,
    ]);
    expect(state.contents.get(locationKey(UNASSIGNED))).toEqual([loose.id]);
    expect(state.misplaced.size).toBe(0);
  });

  it("shows instances with dangling references as unassigned", () => {
    const rope = makeItem("Rope");
    const atMissingCharacter = makeInstance(rope, atCharacter("gone"));
    const inMissingContainer = makeInstance(rope, inInstance("gone"));
    const withoutItem = ItemInstance.create("gone", atCharacter("gone"));

    const state = stateOf({
      items: [rope],
      instances: [atMissingCharacter, inMissingContainer, withoutItem],
    });

    for (const instance of [
      atMissingCharacter,
      inMissingContainer,
      withoutItem,
    ]) {
      expect(state.placements.get(instance.id)).toEqual(UNASSIGNED);
      expect(state.misplaced.has(instance.id)).toBe(true);
    }
    expect(state.contents.get(locationKey(UNASSIGNED))).toHaveLength(3);
    expect(state.instances.get(withoutItem.id)?.item).toBeUndefined();
  });

  it("keeps the stored location of misplaced instances unchanged", () => {
    const rope = makeItem("Rope");
    const instance = makeInstance(rope, atCharacter("gone"));

    const state = stateOf({ items: [rope], instances: [instance] });

    expect(state.instances.get(instance.id)?.location).toEqual(
      atCharacter("gone"),
    );
  });

  it("does not place contents in an instance that can't hold items", () => {
    const rope = makeItem("Rope");
    const coil = makeInstance(rope);
    const inside = makeInstance(rope, inInstance(coil.id));

    const state = stateOf({ items: [rope], instances: [coil, inside] });

    expect(state.placements.get(inside.id)).toEqual(UNASSIGNED);
    expect(state.misplaced.has(inside.id)).toBe(true);
  });

  it("breaks container cycles and keeps contents of cycle members", () => {
    const bag = makeItem("Bag", { hasInventory: true });
    const rope = makeItem("Rope");
    const a = makeInstance(bag);
    const b = makeInstance(bag, inInstance(a.id));
    a.location = inInstance(b.id);
    const self = makeInstance(bag);
    self.location = inInstance(self.id);
    const outer = makeInstance(bag, inInstance(a.id));
    const content = makeInstance(rope, inInstance(outer.id));

    const state = stateOf({
      items: [bag, rope],
      instances: [a, b, self, outer, content],
    });

    expect(state.placements.get(a.id)).toEqual(UNASSIGNED);
    expect(state.placements.get(b.id)).toEqual(UNASSIGNED);
    expect(state.placements.get(self.id)).toEqual(UNASSIGNED);
    expect(state.placements.get(outer.id)).toEqual(inInstance(a.id));
    expect(state.placements.get(content.id)).toEqual(inInstance(outer.id));
    expect([...state.misplaced].sort()).toEqual([a.id, b.id, self.id].sort());
  });
});
