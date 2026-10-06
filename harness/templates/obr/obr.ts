// Copy to src/obr/obr.ts. The ONLY place that calls OBR.onReady.
import OBR from "@owlbear-rodeo/sdk";

import { runMigrations } from "./migrations";

/**
 * Resolves once the SDK is ready and migrations have run.
 * Every service awaits this before touching the SDK.
 */
export const obrReady: Promise<void> = new Promise((resolve) => {
  OBR.onReady(async () => {
    try {
      await runMigrations();
    } catch (error) {
      console.error("[plugin] migration failed", error);
    }
    resolve();
  });
});

/** Resolves once a scene is open. Await it before scene/item calls. */
export async function sceneReady(): Promise<void> {
  await obrReady;
  if (await OBR.scene.isReady()) return;
  await new Promise<void>((resolve) => {
    const unsubscribe = OBR.scene.onReadyChange((ready) => {
      if (!ready) return;
      unsubscribe();
      resolve();
    });
  });
}

export async function isGM(): Promise<boolean> {
  await obrReady;
  return (await OBR.player.getRole()) === "GM";
}

/** Approximate JSON size in bytes, for checking metadata budgets before writing. */
export function jsonSize(value: unknown): number {
  return new Blob([JSON.stringify(value) ?? ""]).size;
}
