import { describe, expect, it } from "vitest";

import { crossfadePasses } from "./transition-plan";

describe("film crossfade pass plan", () => {
  it("omits the outgoing character while keeping the environment pass", () => {
    expect(crossfadePasses(true)).toEqual([
      { source: "previous", includeCharacter: false },
      { source: "current", includeCharacter: true },
    ]);
  });

  it("draws the only character once when there is no previous shot", () => {
    expect(crossfadePasses(false)).toEqual([{ source: "current", includeCharacter: true }]);
  });
});
