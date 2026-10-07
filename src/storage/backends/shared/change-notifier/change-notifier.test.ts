import { describe, expect, it, vi } from "vitest";

import { StorageChange } from "../../../interface";

import { ChangeNotifier } from "./change-notifier";

const RECORDS: StorageChange = { type: "records" };

describe("ChangeNotifier", () => {
  it("delivers a change to every listener", () => {
    const notifier = new ChangeNotifier();
    const first = vi.fn();
    const second = vi.fn();
    notifier.subscribe(first);
    notifier.subscribe(second);

    notifier.emit(RECORDS);

    expect(first).toHaveBeenCalledWith(RECORDS);
    expect(second).toHaveBeenCalledWith(RECORDS);
  });

  it("stops delivering after unsubscribe", () => {
    const notifier = new ChangeNotifier();
    const listener = vi.fn();
    const unsubscribe = notifier.subscribe(listener);

    unsubscribe();
    notifier.emit(RECORDS);

    expect(listener).not.toHaveBeenCalled();
  });

  it("removes only one registration of a listener subscribed twice", () => {
    const notifier = new ChangeNotifier();
    const listener = vi.fn();
    const unsubscribe = notifier.subscribe(listener);
    notifier.subscribe(listener);

    unsubscribe();
    notifier.emit(RECORDS);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps delivering when a listener throws", () => {
    const notifier = new ChangeNotifier();
    const after = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    notifier.subscribe(() => {
      throw new Error("listener failed");
    });
    notifier.subscribe(after);

    notifier.emit(RECORDS);

    expect(after).toHaveBeenCalledWith(RECORDS);
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it("delivers nothing after dispose and ignores new subscriptions", () => {
    const notifier = new ChangeNotifier();
    const before = vi.fn();
    notifier.subscribe(before);

    notifier.dispose();
    const after = vi.fn();
    notifier.subscribe(after);
    notifier.emit(RECORDS);

    expect(before).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });
});
