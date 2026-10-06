/** Random unique id for new records (requires a secure context: https or localhost). */
export function createId(): string {
  return crypto.randomUUID();
}
