// Shared normalization rules for setters and parsers. Invalid input is
// corrected silently; nonsense (empty required text, NaN) keeps the fallback.

import { CATEGORIES_MAX_COUNT, CATEGORY_MAX, ID_MAX } from "./limits.constant";

/** Trims and truncates; returns `fallback` if the result would be empty or the input is no string. */
export function normalizeRequiredText(
  value: unknown,
  max: number,
  fallback: string,
): string {
  if (typeof value !== "string") return fallback;
  const text = value.trim().slice(0, max).trim();
  return text === "" ? fallback : text;
}

/** Trims and truncates; empty or non-string input becomes `undefined`. */
export function normalizeOptionalText(
  value: unknown,
  max: number,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, max).trim();
  return text === "" ? undefined : text;
}

/** Rounds to an integer and clamps to [min, max]; non-finite input returns `fallback`. */
export function normalizeInt<T extends number | undefined>(
  value: unknown,
  min: number,
  max: number,
  fallback: T,
): number | T {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), min, max);
}

/** Rounds to `decimals` places and clamps to [min, max]; non-finite input returns `fallback`. */
export function normalizeDecimal<T extends number | undefined>(
  value: unknown,
  min: number,
  max: number,
  decimals: number,
  fallback: T,
): number | T {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const factor = 10 ** decimals;
  return clamp(Math.round(value * factor) / factor, min, max);
}

/** Trims, drops empty and duplicate (case-insensitive) entries, truncates and limits the count. */
export function normalizeCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of value) {
    const category = normalizeOptionalText(entry, CATEGORY_MAX);
    if (category === undefined) continue;
    const key = category.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(category);
    if (result.length >= CATEGORIES_MAX_COUNT) break;
  }
  return result;
}

/** Type guard for record ids read from untrusted data. */
export function isValidId(value: unknown): value is string {
  return typeof value === "string" && value !== "" && value.length <= ID_MAX;
}

/** Keeps strings, drops anything else (for reading untrusted optional fields). */
export function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Keeps numbers, drops anything else (for reading untrusted optional fields). */
export function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

/** Type guard for plain JSON objects. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
