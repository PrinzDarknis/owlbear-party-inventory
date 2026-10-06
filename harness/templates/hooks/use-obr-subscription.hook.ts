// Copy to src/hooks/use-obr-subscription.hook.ts. Base for all OBR-backed hooks.
import { useEffect, useState } from "react";

/**
 * Loads an initial value and subscribes to changes. Handles the async
 * unsubscribe correctly even if the component unmounts before the
 * subscription is established.
 *
 * `load` and `subscribe` must be stable (module-level functions or useCallback).
 */
export function useObrSubscription<T>(
  load: () => Promise<T>,
  subscribe: (onChange: (value: T) => void) => Promise<() => void>,
  initial: T,
): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    load().then((loaded) => {
      if (active) setValue(loaded);
    });
    subscribe((next) => {
      if (active) setValue(next);
    }).then((unsub) => {
      if (active) unsubscribe = unsub;
      else unsub();
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [load, subscribe]);

  return value;
}
