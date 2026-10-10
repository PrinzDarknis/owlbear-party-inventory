import { StorageError } from "../interface";
import { LOCAL_STORAGE_ID, LocalInventoryStorage } from "../backends/local";
import { MEMORY_STORAGE_ID, MemoryInventoryStorage } from "../backends/memory";

import { StorageBackend } from "./storage-backend.types";

const LOCAL_BACKEND: StorageBackend = {
  id: LOCAL_STORAGE_ID,
  label: "Browser storage",
  isAvailable: async () => LocalInventoryStorage.isAvailableInBrowser(),
  create: async () => {
    const storage = LocalInventoryStorage.fromBrowser();
    if (!storage) {
      throw new StorageError("unavailable", "localStorage is not available");
    }
    return storage;
  },
};

const MEMORY_BACKEND: StorageBackend = {
  id: MEMORY_STORAGE_ID,
  label: "Temporary (not saved)",
  isAvailable: async () => true,
  create: async () => new MemoryInventoryStorage(),
};

/**
 * Selectable controllers in display order. Memory is always available and is
 * the choice when localStorage is blocked. The Owlbear controller is added in
 * phase 5 and loaded via dynamic `import()`.
 */
export const STORAGE_BACKENDS: readonly StorageBackend[] = [
  LOCAL_BACKEND,
  MEMORY_BACKEND,
];

/** Registry entry with the given id, or `undefined` if unknown. */
export function findStorageBackend(id: string): StorageBackend | undefined {
  return STORAGE_BACKENDS.find((backend) => backend.id === id);
}
