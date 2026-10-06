// Copy to src/obr/constants.ts and replace the placeholders.

/** Reverse-DNS namespace of this plugin. Prefix for every key, channel and id. */
export const PLUGIN_ID = "com.example.my-plugin";

/** Path the production build is hosted under (must match public/manifest.json). */
export const PROD_BASE_PATH = "/my-plugin";

export const DEV_MODE: boolean = import.meta.env.DEV ?? false;

/** Absolute URL path for a file in public/ that works in dev and production. */
export const assetUrl = (path: string): string =>
  `${DEV_MODE ? "" : PROD_BASE_PATH}/${path.replace(/^\/+/, "")}`;

// metadata keys
export const METADATA_VERSION = `${PLUGIN_ID}/version`;
export const METADATA_EXAMPLE = `${PLUGIN_ID}/example`;
export const METADATA_RECORD = (id: string): string =>
  `${PLUGIN_ID}/record/${id}`;

// broadcast channels
export const BROADCAST = `${PLUGIN_ID}/broadcast`;
export const BROADCAST_EXAMPLE = `${BROADCAST}/example`;

// ui ids
export const CONTEXT_MENU_EXAMPLE = `${PLUGIN_ID}/context-menu/example`;

// local storage
export const STORAGE_KEY = (name: string): string => `${PLUGIN_ID}/${name}`;

/** Soft limit for this plugin's share of room metadata (OBR total must be < 16 kB for all extensions). */
export const ROOM_METADATA_BUDGET_BYTES = 8 * 1024;
