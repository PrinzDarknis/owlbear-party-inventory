/** Reverse-DNS namespace of this plugin. Prefix for every key, channel and id. */
export const PLUGIN_ID = "de.prinzdarknis.party-inventory";

/** Path the production build is hosted under (must match public/manifest.json). */
export const PROD_BASE_PATH = "/owlbear-party-inventory";

export const DEV_MODE: boolean = import.meta.env.DEV ?? false;

/** Absolute URL path for a file in public/ that works in dev and production. */
export const assetUrl = (path: string): string =>
  `${DEV_MODE ? "" : PROD_BASE_PATH}/${path.replace(/^\/+/, "")}`;

// metadata keys
export const METADATA_VERSION = `${PLUGIN_ID}/version`;

// broadcast channels
export const BROADCAST = `${PLUGIN_ID}/broadcast`;

// local storage
export const STORAGE_KEY = (name: string): string => `${PLUGIN_ID}/${name}`;

/** Soft limit for this plugin's share of room metadata (OBR total must be < 16 kB for all extensions). */
export const ROOM_METADATA_BUDGET_BYTES = 8 * 1024;
