export interface Example {
  id: string;
  label: string;
  count: number;
  /** ISO 8601 string. Dates do not survive the JSON round-trip of metadata. */
  updatedAt: string;
}
