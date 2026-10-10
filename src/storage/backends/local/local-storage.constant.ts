// Imported from the constants file directly, not from src/obr/index.ts, so the
// SDK stays out of the storage layer. PLUGIN_ID is defined only there.
import { STORAGE_KEY } from "../../../obr/constants";

/** Registry and controller id of the local controller. */
export const LOCAL_STORAGE_ID = "local";

/** localStorage key holding the whole inventory (versioned DTO). */
export const LOCAL_INVENTORY_KEY = STORAGE_KEY("local/inventory");

/** Key written and removed again to check whether localStorage works. */
export const LOCAL_PROBE_KEY = STORAGE_KEY("local/probe");
