// Copy to src/obr/obr-session.service.ts. Generic player/theme access used by the hooks.
import OBR, { Theme } from "@owlbear-rodeo/sdk";

import { obrReady } from "./obr";

export type PlayerRole = "GM" | "PLAYER";

export const sessionService = {
  async getRole(): Promise<PlayerRole> {
    await obrReady;
    return OBR.player.getRole();
  },

  /** Returns the unsubscribe function. Fires when the local player changes (e.g. role). */
  async onRoleChange(handler: (role: PlayerRole) => void): Promise<() => void> {
    await obrReady;
    return OBR.player.onChange((player) => handler(player.role));
  },

  async getTheme(): Promise<Theme> {
    await obrReady;
    return OBR.theme.getTheme();
  },

  async onThemeChange(handler: (theme: Theme) => void): Promise<() => void> {
    await obrReady;
    return OBR.theme.onChange(handler);
  },
};
