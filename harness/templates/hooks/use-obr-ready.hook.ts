// Copy to src/hooks/use-obr-ready.hook.ts.
import { useEffect, useState } from "react";

import { api } from "../obr";

/** True once the SDK is ready (and migrations ran). Gate rendering with it. */
export function useObrReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    api.ready.then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready;
}
