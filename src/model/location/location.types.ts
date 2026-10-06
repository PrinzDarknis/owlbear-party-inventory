/** Where an item instance is: unassigned, owned by a character, or inside another instance (container). */
export type ItemLocation =
  | { type: "unassigned" }
  | { type: "character"; characterId: string }
  | { type: "instance"; instanceId: string };
