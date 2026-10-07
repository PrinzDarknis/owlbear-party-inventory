import { describe, expect, it } from "vitest";

import { FakeWebStorage } from "../../../testing";

import {
  getBrowserStorage,
  isWebStorageAvailable,
  readJson,
  removeKey,
  writeJson,
} from "./web-storage.service";

const KEY = "test/key";
const PROBE = "test/probe";

describe("getBrowserStorage", () => {
  it("returns undefined without a browser window", () => {
    expect(getBrowserStorage()).toBeUndefined();
  });
});

describe("isWebStorageAvailable", () => {
  it("is true for a working storage and leaves no probe behind", () => {
    const storage = new FakeWebStorage();

    expect(isWebStorageAvailable(storage, PROBE)).toBe(true);
    expect(storage.keys()).toEqual([]);
  });

  it("is false without a storage or when access throws", () => {
    const blocked = new FakeWebStorage();
    blocked.failWrites = true;

    expect(isWebStorageAvailable(undefined, PROBE)).toBe(false);
    expect(isWebStorageAvailable(blocked, PROBE)).toBe(false);
  });
});

describe("readJson", () => {
  it("returns the parsed value", () => {
    const storage = new FakeWebStorage();
    storage.poke(KEY, '{"a":1}');

    expect(readJson(storage, KEY)).toEqual({ ok: true, value: { a: 1 } });
  });

  it("returns undefined for a missing key", () => {
    expect(readJson(new FakeWebStorage(), KEY)).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it("reports corrupt JSON", () => {
    const storage = new FakeWebStorage();
    storage.poke(KEY, "{not json");

    expect(readJson(storage, KEY)).toEqual({
      ok: false,
      error: "invalid-json",
    });
  });

  it("reports blocked access", () => {
    const storage = new FakeWebStorage();
    storage.failReads = true;

    expect(readJson(storage, KEY)).toEqual({
      ok: false,
      error: "unavailable",
    });
  });
});

describe("writeJson", () => {
  it("stores the value as JSON", () => {
    const storage = new FakeWebStorage();

    expect(writeJson(storage, KEY, { a: 1 })).toBe(true);
    expect(storage.peek(KEY)).toBe('{"a":1}');
  });

  it("returns false and keeps the old value when the write fails", () => {
    const storage = new FakeWebStorage();
    storage.poke(KEY, '"old"');
    storage.failWrites = true;

    expect(writeJson(storage, KEY, "new")).toBe(false);
    expect(storage.peek(KEY)).toBe('"old"');
  });
});

describe("removeKey", () => {
  it("deletes the key", () => {
    const storage = new FakeWebStorage();
    storage.poke(KEY, "1");

    expect(removeKey(storage, KEY)).toBe(true);
    expect(storage.peek(KEY)).toBeUndefined();
  });

  it("returns false when access fails", () => {
    const storage = new FakeWebStorage();
    storage.failWrites = true;

    expect(removeKey(storage, KEY)).toBe(false);
  });
});
