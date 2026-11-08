import { describe, expect, it } from "vitest";

import { BIRD_PART_IDS, BIRD_PART_PIVOTS } from "./bird-art";

describe("storybook bird artwork metadata", () => {
  it("defines every required articulated part", () => {
    expect([...BIRD_PART_IDS]).toEqual([
      "tail",
      "wingFar",
      "legLeft",
      "legRight",
      "body",
      "head",
      "beak",
      "eye",
      "wingNear",
    ]);
    expect(new Set(BIRD_PART_IDS).size).toBe(BIRD_PART_IDS.length);
  });

  it("defines finite, non-overlapping pivots for the layered parts", () => {
    for (const partId of BIRD_PART_IDS) {
      const pivot = BIRD_PART_PIVOTS[partId];
      expect(Number.isFinite(pivot.x)).toBe(true);
      expect(Number.isFinite(pivot.y)).toBe(true);
    }

    expect(BIRD_PART_PIVOTS.wingNear).not.toEqual(BIRD_PART_PIVOTS.body);
    expect(BIRD_PART_PIVOTS.legLeft).toEqual(BIRD_PART_PIVOTS.legRight);
    expect(BIRD_PART_PIVOTS.eye).toEqual({ x: 24, y: 24 });
  });
});
