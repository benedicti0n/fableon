import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("drops false, null, and undefined values", () => {
    expect(cn("block", false, null, undefined, "text-sm")).toBe("block text-sm");
  });
});
