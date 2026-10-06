/** D&D item rarities, ordered from lowest to highest. "No rarity" is `undefined`. */
export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "very-rare",
  "legendary",
  "artifact",
] as const;

export type Rarity = (typeof RARITIES)[number];

/** Allowlist check for rarities read from untrusted data. */
export function isRarity(value: unknown): value is Rarity {
  return (RARITIES as readonly unknown[]).includes(value);
}
