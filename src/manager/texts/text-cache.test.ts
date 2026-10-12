import { describe, expect, it, vi } from "vitest";

import {
  InstanceTexts,
  ItemTexts,
  StorageError,
  TextRef,
  TextsFor,
} from "../../storage";

import { TextCache } from "./text-cache";

const ROPE: TextRef = { kind: "item", id: "rope" };
const COIL: TextRef = { kind: "instance", id: "coil" };

interface PendingLoad {
  ref: TextRef;
  resolve: (texts: object) => void;
  reject: (error: unknown) => void;
}

// Loader whose calls stay pending until the test settles them.
function controlledLoader() {
  const calls: PendingLoad[] = [];
  const loader = <Ref extends TextRef>(ref: Ref) =>
    new Promise<TextsFor<Ref>>((resolve, reject) => {
      calls.push({
        ref,
        // The test passes texts of the matching kind.
        resolve: (texts) => resolve(texts as TextsFor<Ref>),
        reject,
      });
    });
  return { calls, loader };
}

// Loader that always resolves with the same texts and records its calls.
function fixedLoader(texts: ItemTexts | InstanceTexts = {}) {
  const calls: TextRef[] = [];
  const loader = <Ref extends TextRef>(ref: Ref) => {
    calls.push(ref);
    // The test passes texts of the kind it requests.
    return Promise.resolve(texts as TextsFor<Ref>);
  };
  return { calls, loader };
}

// Lets pending promise callbacks run.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("TextCache", () => {
  it("loads on demand, shares concurrent loads and reports changes", async () => {
    const { calls, loader } = controlledLoader();
    const onChange = vi.fn();
    const cache = new TextCache(loader, onChange);

    expect(cache.get(ROPE)).toBeUndefined();
    const first = cache.ensure(ROPE);
    const second = cache.ensure(ROPE);
    await flush();

    expect(calls).toHaveLength(1);
    expect(cache.get(ROPE)?.status).toBe("loading");
    calls[0]?.resolve({ description: "Hempen." });

    await expect(first).resolves.toEqual({ description: "Hempen." });
    await expect(second).resolves.toEqual({ description: "Hempen." });
    expect(cache.get(ROPE)).toEqual({
      status: "loaded",
      texts: { description: "Hempen." },
    });
    expect(cache.loadedTexts(ROPE)).toEqual({ description: "Hempen." });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("returns loaded texts without loading again", async () => {
    const { calls, loader } = fixedLoader({ notes: "Knotted." });
    const cache = new TextCache(loader, () => {});

    await cache.ensure(COIL);
    await cache.ensure(COIL);

    expect(calls).toHaveLength(1);
  });

  it("keeps the entry stable until it changes", async () => {
    const cache = new TextCache(fixedLoader().loader, () => {});
    await cache.ensure(ROPE);

    expect(cache.get(ROPE)).toBe(cache.get(ROPE));
  });

  it("reports failures, keeps old texts and retries on the next ensure", async () => {
    const { calls, loader } = controlledLoader();
    const cache = new TextCache(loader, () => {});
    const failure = new StorageError("unavailable", "GM offline");

    const first = cache.ensure(ROPE);
    await flush();
    calls[0]?.reject(failure);
    await expect(first).rejects.toBe(failure);
    expect(cache.get(ROPE)?.status).toBe("error");
    expect(cache.get(ROPE)?.error).toBe(failure);

    const retry = cache.ensure(ROPE);
    await flush();
    calls[1]?.resolve({ description: "Hempen." });
    await expect(retry).resolves.toEqual({ description: "Hempen." });
  });

  it("refreshes cached refs only and keeps old texts while loading", async () => {
    const { calls, loader } = controlledLoader();
    const cache = new TextCache(loader, () => {});
    cache.remember(ROPE, { description: "Old." });

    cache.refresh([ROPE, COIL]);
    await flush();

    expect(calls.map((call) => call.ref)).toEqual([ROPE]);
    expect(cache.get(ROPE)).toEqual({
      status: "loading",
      texts: { description: "Old." },
    });
    calls[0]?.resolve({ description: "New." });
    await flush();
    expect(cache.get(ROPE)?.texts).toEqual({ description: "New." });
  });

  it("ignores a load result overtaken by a write", async () => {
    const { calls, loader } = controlledLoader();
    const cache = new TextCache(loader, () => {});

    const pending = cache.ensure(ROPE);
    await flush();
    cache.remember(ROPE, { description: "Written." });
    calls[0]?.resolve({ description: "Stale." });

    await expect(pending).resolves.toEqual({ description: "Written." });
    expect(cache.get(ROPE)?.texts).toEqual({ description: "Written." });
  });

  it("waits for a newer load when a refresh overtakes ensure", async () => {
    const { calls, loader } = controlledLoader();
    const cache = new TextCache(loader, () => {});

    const pending = cache.ensure(ROPE);
    await flush();
    cache.refresh([ROPE]);
    await flush();
    calls[0]?.resolve({ description: "Stale." });
    await flush();
    calls[1]?.resolve({ description: "Fresh." });

    await expect(pending).resolves.toEqual({ description: "Fresh." });
  });

  it("drops entries of records that no longer exist", async () => {
    const onChange = vi.fn();
    const cache = new TextCache(fixedLoader().loader, onChange);
    cache.remember(ROPE, {});
    cache.remember(COIL, {});
    onChange.mockClear();

    cache.retain((ref) => ref.kind === "instance");

    expect(cache.get(ROPE)).toBeUndefined();
    expect(cache.get(COIL)).toBeDefined();
    expect(onChange).toHaveBeenCalledTimes(1);
    cache.retain(() => true);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("throws for texts that are not loaded", () => {
    const cache = new TextCache(fixedLoader().loader, () => {});

    expect(() => cache.loadedTexts(ROPE)).toThrow(Error);
  });

  it("ignores everything after dispose", async () => {
    const { calls, loader } = controlledLoader();
    const onChange = vi.fn();
    const cache = new TextCache(loader, onChange);
    const pending = cache.ensure(ROPE);
    await flush();
    onChange.mockClear();

    cache.dispose();
    calls[0]?.resolve({ description: "Late." });
    cache.remember(COIL, {});

    await expect(pending).rejects.toThrow("Text cache disposed");
    expect(cache.get(ROPE)).toBeUndefined();
    expect(cache.get(COIL)).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });
});
