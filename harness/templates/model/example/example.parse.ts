// Copy to src/model/<domain>/<domain>.parse.ts. Every untrusted read goes through a parser.
import { Example } from "./example.types";

export const EXAMPLE_LABEL_MAX_LENGTH = 100;

export const DEFAULT_EXAMPLE: Example = {
  id: "",
  label: "",
  count: 0,
  updatedAt: new Date(0).toISOString(),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses untrusted data (metadata, broadcast, import) into an Example.
 * Returns undefined if the data is unusable. Missing fields fall back to defaults.
 */
export function parseExample(value: unknown): Example | undefined {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    return undefined;
  }
  const count = Number(value.count);
  const updatedAt =
    typeof value.updatedAt === "string" && !isNaN(Date.parse(value.updatedAt))
      ? value.updatedAt
      : DEFAULT_EXAMPLE.updatedAt;

  return {
    id: value.id,
    label:
      typeof value.label === "string"
        ? value.label.slice(0, EXAMPLE_LABEL_MAX_LENGTH)
        : DEFAULT_EXAMPLE.label,
    count: Number.isFinite(count) ? count : DEFAULT_EXAMPLE.count,
    updatedAt,
  };
}
