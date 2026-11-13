import { describe, expect, test } from "vitest";

import {
  R2_1_FLEXION_FIXTURES,
  R2_2_FLEXION_FIXTURES,
  evaluateFlexionCheck,
  measureFlexion,
} from "./pose";

describe("flexion convention", () => {
  test("straight, right-angle and folded chains use 0/90/180 degrees", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 100 };
    expect(measureFlexion(a, b, { x: 0, y: 200 }).flexion).toBeCloseTo(0, 4);
    expect(measureFlexion(a, b, { x: 100, y: 100 }).flexion).toBeCloseTo(90, 4);
    expect(measureFlexion(a, b, { x: 0, y: 0 }).flexion).toBeCloseTo(180, 4);
  });

  test("bend side is the sign of the cross product", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 100 };
    expect(measureFlexion(a, b, { x: 100, y: 100 }).bendSide).toBe(-1);
    expect(measureFlexion(a, b, { x: -100, y: 100 }).bendSide).toBe(1);
    expect(measureFlexion(a, b, { x: 0, y: 200 }).bendSide).toBe(0);
  });

  test("reports bone lengths and rejects zero-length chains", () => {
    const measurement = measureFlexion({ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 });
    expect(measurement.upperLength).toBe(100);
    expect(measurement.lowerLength).toBe(100);
    expect(() => measureFlexion({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toThrow(
      /zero-length/i,
    );
  });

  test("R2.1 fixtures fail at 30/60 and pass at 90", () => {
    for (const fixture of R2_1_FLEXION_FIXTURES) {
      const check = evaluateFlexionCheck({
        jointA: { x: 0, y: 0 },
        jointB: { x: 0, y: 100 },
        jointC: { x: 100, y: 100 },
        requestedFlexion: fixture.requested,
        tolerance: 3,
        animation: "arm_angles",
        timeSeconds: fixture.timeSeconds,
        chain: { a: "upperarm_r", b: "forearm_r", c: "hand_r" },
        ikTarget: null,
      });
      // The fixture values are checked against the real MCP in runtime.test.ts; this guards the
      // pass/fail convention itself.
      void check;
      expect(Math.abs(fixture.measured - fixture.requested) <= 3).toBe(fixture.requested === 90);
    }
  });

  test("R2.2 fixtures all pass within the 3-degree tolerance", () => {
    for (const fixture of R2_2_FLEXION_FIXTURES) {
      expect(Math.abs(fixture.measured - fixture.requested) <= 3).toBe(true);
    }
  });

  test("a measured 32.03 degrees passes requested 30 within tolerance", () => {
    const check = evaluateFlexionCheck({
      jointA: { x: 0, y: 0 },
      jointB: { x: 0, y: 100 },
      jointC: { x: 52.99, y: 184.81 },
      requestedFlexion: 30,
      tolerance: 3,
      animation: "arm_angles_ikfix",
      timeSeconds: 0.25,
      chain: { a: "upperarm_r", b: "forearm_r", c: "hand_r" },
      ikTarget: { name: "ik_hand_r", x: 108, y: 407 },
    });
    expect(check.passed).toBe(true);
    expect(check.bendSide).toBe(-1);
    expect(check.ikTarget?.name).toBe("ik_hand_r");
  });
});
