import { describe, expect, it } from "vitest";

import { PIPELINE_STAGES } from "./pipeline";

describe("PIPELINE_STAGES", () => {
  it("contains ten uniquely identified stages", () => {
    expect(PIPELINE_STAGES).toHaveLength(10);
    expect(new Set(PIPELINE_STAGES.map((stage) => stage.id)).size).toBe(PIPELINE_STAGES.length);
  });

  it("keeps stage order contiguous and one-based", () => {
    expect(PIPELINE_STAGES.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("maps every stage to a valid roadmap phase", () => {
    for (const stage of PIPELINE_STAGES) {
      expect(Number.isInteger(stage.phase)).toBe(true);
      expect(stage.phase).toBeGreaterThanOrEqual(1);
      expect(stage.phase).toBeLessThanOrEqual(11);
    }
  });

  it("runs from idea to export", () => {
    expect(PIPELINE_STAGES[0]?.id).toBe("idea");
    expect(PIPELINE_STAGES.at(-1)?.id).toBe("export");
  });
});
