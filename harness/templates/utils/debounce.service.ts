// Copy to src/utils/debounce.service.ts.

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const pending = new Map<string, Array<(error?: unknown) => void>>();

/**
 * Debounces calls per key. The returned promise resolves after the
 * (last) call has actually run, so `await save()` is meaningful.
 */
export function debounce(
  key: string,
  fn: () => Promise<void> | void,
  delayMs = 400,
): Promise<void> {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);

  return new Promise<void>((resolve, reject) => {
    const waiters = pending.get(key) ?? [];
    waiters.push((error) => (error === undefined ? resolve() : reject(error)));
    pending.set(key, waiters);

    timers.set(
      key,
      setTimeout(async () => {
        timers.delete(key);
        const settled = pending.get(key) ?? [];
        pending.delete(key);
        try {
          await fn();
          settled.forEach((settle) => settle());
        } catch (error) {
          settled.forEach((settle) => settle(error ?? new Error(String(error))));
        }
      }, delayMs),
    );
  });
}
