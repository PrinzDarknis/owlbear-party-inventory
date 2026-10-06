// Copy to src/hooks/use-player-role.hook.ts.
import { api, PlayerRole } from "../obr";

import { useObrSubscription } from "./use-obr-subscription.hook";

const load = () => api.session.getRole();
const subscribe = (onChange: (role: PlayerRole) => void) =>
  api.session.onRoleChange(onChange);

/** Live role of the local player. UI-only: never use it as a security check. */
export function usePlayerRole(): { role: PlayerRole; isGM: boolean } {
  const role = useObrSubscription<PlayerRole>(load, subscribe, "PLAYER");
  return { role, isGM: role === "GM" };
}
