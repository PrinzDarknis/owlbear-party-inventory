// Copy to src/obr/migrations/index.ts. Add one folder per target version (e.g. ./1.0.0/).
import OBR from "@owlbear-rodeo/sdk";

import { METADATA_VERSION } from "../constants";

/** Current persisted data format. Bump together with a new migration step. */
export const DATA_VERSION = 1;

type Migration = { to: number; run: () => Promise<void> };

/** Ordered, idempotent migration steps. */
const MIGRATIONS: Migration[] = [
  // { to: 2, run: migrateTo2 },
];

/**
 * Runs pending migrations. Only the GM writes, to avoid concurrent migrations
 * from several clients. Called from obr.ts before obrReady resolves.
 */
export async function runMigrations(): Promise<void> {
  if ((await OBR.player.getRole()) !== "GM") return;

  const metadata = await OBR.room.getMetadata();
  const stored = metadata[METADATA_VERSION];
  let current = typeof stored === "number" ? stored : DATA_VERSION;

  for (const migration of MIGRATIONS) {
    if (migration.to <= current) continue;
    await migration.run();
    current = migration.to;
    await OBR.room.setMetadata({ [METADATA_VERSION]: current });
  }

  if (stored === undefined) {
    await OBR.room.setMetadata({ [METADATA_VERSION]: DATA_VERSION });
  }
}
