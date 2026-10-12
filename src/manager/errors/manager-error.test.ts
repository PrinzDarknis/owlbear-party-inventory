import { describe, expect, it } from "vitest";

import { ManagerError } from "./manager-error";

describe("ManagerError", () => {
  it("carries its code and is an Error", () => {
    const error = new ManagerError("forbidden", "Not allowed");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ManagerError");
    expect(error.code).toBe("forbidden");
    expect(error.message).toBe("Not allowed");
  });
});
