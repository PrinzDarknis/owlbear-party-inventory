import { afterEach, describe, expect, it, vi } from "vitest";

import { StorageError } from "../interface";
import { LOCAL_INVENTORY_KEY, LOCAL_STORAGE_ID } from "../backends/local";
import { MEMORY_STORAGE_ID } from "../backends/memory";
import { FakeWebStorage } from "../testing";

import { findStorageBackend, STORAGE_BACKENDS } from "./storage.registry";

describe("STORAGE_BACKENDS", () => {
  it("lists local and memory with unique ids and labels", () => {
    const ids = STORAGE_BACKENDS.map((backend) => backend.id);

    expect(ids).toEqual([LOCAL_STORAGE_ID, MEMORY_STORAGE_ID]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const backend of STORAGE_BACKENDS) {
      expect(backend.label).not.toBe("");
    }
  });

  it("creates controllers whose id matches their entry", async () => {
    for (const backend of STORAGE_BACKENDS) {
      if (!(await backend.isAvailable())) continue;
      const storage = await backend.create();
      expect(storage.id).toBe(backend.id);
      storage.dispose();
    }
  });

  it("always offers memory", async () => {
    const memory = findStorageBackend(MEMORY_STORAGE_ID);

    expect(await memory?.isAvailable()).toBe(true);
  });

  it("reports local as unavailable without localStorage and refuses to create it", async () => {
    const local = findStorageBackend(LOCAL_STORAGE_ID);

    expect(await local?.isAvailable()).toBe(false);
    const error = await local?.create().then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(StorageError);
    expect(error instanceof StorageError && error.code).toBe("unavailable");
  });
});

describe("clearData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes the local inventory, even if it can't be read", async () => {
    const web = new FakeWebStorage();
    web.poke(LOCAL_INVENTORY_KEY, "{not json");
    vi.stubGlobal("window", {
      localStorage: web,
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    await findStorageBackend(LOCAL_STORAGE_ID)?.clearData?.();

    expect(web.peek(LOCAL_INVENTORY_KEY)).toBeUndefined();
  });

  it("rejects without localStorage", async () => {
    const local = findStorageBackend(LOCAL_STORAGE_ID);

    const error = await local?.clearData?.().then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(error instanceof StorageError && error.code).toBe("unavailable");
  });

  it("is not offered by memory, which keeps nothing in the browser", () => {
    expect(findStorageBackend(MEMORY_STORAGE_ID)?.clearData).toBeUndefined();
  });
});

describe("findStorageBackend", () => {
  it("returns undefined for unknown ids", () => {
    expect(findStorageBackend("unknown")).toBeUndefined();
  });
});
