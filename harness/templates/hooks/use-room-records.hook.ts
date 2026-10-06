// Copy to src/hooks/use-<domain>.hook.ts. Pattern for a domain hook over a facade service.
import { Example } from "../model/example";
import { api } from "../obr";

import { useObrSubscription } from "./use-obr-subscription.hook";

const load = () => api.example.loadAll();
const subscribe = (onChange: (records: Example[]) => void) =>
  api.example.subscribe(onChange);

/** Live list of records stored in room metadata. */
export function useExampleRecords(): Example[] {
  return useObrSubscription<Example[]>(load, subscribe, []);
}
