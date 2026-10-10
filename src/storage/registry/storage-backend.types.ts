import { InventoryStorage } from "../interface";

/** A selectable storage controller, listed in `STORAGE_BACKENDS`. */
export interface StorageBackend {
  /** Equals the `id` of the controller it creates. */
  readonly id: string;
  /** Name shown in the storage selection. */
  readonly label: string;
  /** Whether the controller can run here; the selection disables it otherwise. */
  isAvailable(): Promise<boolean>;
  /** Creates the controller; rejects with `StorageError` `unavailable` if it can't run. */
  create(): Promise<InventoryStorage>;
}
