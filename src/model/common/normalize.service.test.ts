import { describe, expect, it } from "vitest";

import { CATEGORIES_MAX_COUNT, CATEGORY_MAX, ID_MAX } from "./limits.constant";
import {
  isRecord,
  isValidId,
  normalizeCategories,
  normalizeDecimal,
  normalizeInt,
  normalizeOptionalText,
  normalizeRequiredText,
} from "./normalize.service";

describe("normalizeRequiredText", () => {
  it("trims and truncates", () => {
    expect(normalizeRequiredText("  Sword  ", 100, "x")).toBe("Sword");
    expect(normalizeRequiredText("abcdef", 3, "x")).toBe("abc");
  });

  it("keeps the fallback for empty or non-string input", () => {
    expect(normalizeRequiredText("   ", 100, "old")).toBe("old");
    expect(normalizeRequiredText(42, 100, "old")).toBe("old");
    expect(normalizeRequiredText(undefined, 100, "old")).toBe("old");
  });

  it("does not leave trailing whitespace after truncating", () => {
    expect(normalizeRequiredText("ab cd", 3, "x")).toBe("ab");
  });
});

describe("normalizeOptionalText", () => {
  it("returns undefined for empty or non-string input", () => {
    expect(normalizeOptionalText("", 10)).toBeUndefined();
    expect(normalizeOptionalText("   ", 10)).toBeUndefined();
    expect(normalizeOptionalText(null, 10)).toBeUndefined();
  });

  it("trims and truncates", () => {
    expect(normalizeOptionalText(" note ", 10)).toBe("note");
    expect(normalizeOptionalText("0123456789abc", 10)).toBe("0123456789");
  });
});

describe("normalizeInt", () => {
  it("rounds and clamps", () => {
    expect(normalizeInt(2.6, 0, 10, 0)).toBe(3);
    expect(normalizeInt(-5, 0, 10, 0)).toBe(0);
    expect(normalizeInt(50, 0, 10, 0)).toBe(10);
  });

  it("returns the fallback for non-finite input", () => {
    expect(normalizeInt(Number.NaN, 0, 10, 7)).toBe(7);
    expect(normalizeInt(Number.POSITIVE_INFINITY, 0, 10, 7)).toBe(7);
    expect(normalizeInt("5", 0, 10, undefined)).toBeUndefined();
  });
});

describe("normalizeDecimal", () => {
  it("rounds to the given decimals and clamps", () => {
    expect(normalizeDecimal(1.236, 0, 10, 2, 0)).toBe(1.24);
    expect(normalizeDecimal(-1, 0, 10, 2, 0)).toBe(0);
    expect(normalizeDecimal(11, 0, 10, 2, 0)).toBe(10);
  });

  it("returns the fallback for non-finite input", () => {
    expect(normalizeDecimal(Number.NaN, 0, 10, 2, 3)).toBe(3);
  });
});

describe("normalizeCategories", () => {
  it("trims, drops empty entries and case-insensitive duplicates", () => {
    expect(
      normalizeCategories([" Weapon ", "", "weapon", "Ammo", 5, "AMMO"]),
    ).toEqual(["Weapon", "Ammo"]);
  });

  it("truncates entries and limits the count", () => {
    const long = "x".repeat(CATEGORY_MAX + 10);
    expect(normalizeCategories([long])[0]).toHaveLength(CATEGORY_MAX);

    const many = Array.from(
      { length: CATEGORIES_MAX_COUNT + 5 },
      (_, i) => `c${i}`,
    );
    expect(normalizeCategories(many)).toHaveLength(CATEGORIES_MAX_COUNT);
  });

  it("returns an empty list for non-arrays", () => {
    expect(normalizeCategories("Weapon")).toEqual([]);
  });
});

describe("guards", () => {
  it("isValidId", () => {
    expect(isValidId("abc")).toBe(true);
    expect(isValidId("")).toBe(false);
    expect(isValidId("x".repeat(ID_MAX + 1))).toBe(false);
    expect(isValidId(1)).toBe(false);
  });

  it("isRecord", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });
});
