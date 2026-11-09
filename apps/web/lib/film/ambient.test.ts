import { describe, expect, it } from "vitest";

import { evaluateAmbientState } from "./ambient";

describe("deterministic ambient forest state", () => {
  it("evaluates ambient state from absolute frames without accumulated state", () => {
    const frame0 = evaluateAmbientState(0, 20261110);
    const frame400 = evaluateAmbientState(400, 20261110);
    const frame400Again = evaluateAmbientState(400, 20261110);
    expect(frame400Again).toEqual(frame400);
    expect(frame400).not.toEqual(frame0);
    expect(frame400.particles).toHaveLength(22);
    expect(frame400.leaves).toHaveLength(9);
    for (const particle of frame400.particles) {
      expect(particle.x).toBeGreaterThanOrEqual(0.01);
      expect(particle.x).toBeLessThanOrEqual(0.99);
      expect(particle.y).toBeGreaterThanOrEqual(0.03);
      expect(particle.y).toBeLessThanOrEqual(0.97);
      expect(particle.opacity).toBeGreaterThan(0);
      expect(particle.opacity).toBeLessThan(0.4);
    }
    expect(frame400.sunOpacity).toBeGreaterThan(0);
    expect(frame400.mistOpacity).toBeGreaterThan(0);
  });

  it("changes seeded ambient placement without changing the structure", () => {
    const first = evaluateAmbientState(120, 1);
    const second = evaluateAmbientState(120, 2);
    expect(second).not.toEqual(first);
    expect(second.particles).toHaveLength(first.particles.length);
    expect(second.leaves).toHaveLength(first.leaves.length);
    expect(() => evaluateAmbientState(-1, 1)).toThrow();
    expect(() => evaluateAmbientState(1.5, 1)).toThrow();
  });
});
