import { describe, expect, it } from "vitest";

import { StorageError } from "./storage-error";

describe("StorageError", () => {
  it("carries its code and is an Error", () => {
    const error = new StorageError("write-failed", "Write failed");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("StorageError");
    expect(error.code).toBe("write-failed");
    expect(error.message).toBe("Write failed");
  });
});
