import { describe, expect, it } from "vitest";

import { solveTwoBone } from "./ik";
import {
  artisanPose,
  bellPose,
  cartPose,
  horsePose,
  type ArtisanMotionConfig,
  type HorseMotionConfig,
} from "./motion";
import { resolveFolkPose } from "./rig";
import { ARTISAN_RIG, BELL_RIG, CART_RIG, HORSE_RIG } from "./rigs";

const artisanConfig: ArtisanMotionConfig = {
  walkSpeed: 90,
  cycleSeconds: 1.1,
  bob: 5,
  armSwingDeg: 26,
  stepLift: 26,
  idleSwayDeg: 3,
  blinkIntervalFrames: 72,
  blinkDurationFrames: 3,
  headTurnDeg: 16,
};

const horseConfig: HorseMotionConfig = {
  walkSpeed: 95,
  cycleSeconds: 1.15,
  bob: 6,
  stepLift: 34,
  headNodDeg: 7,
  tailSwayDeg: 9,
  legOffsets: { nearFront: 0, farFront: 0.5, nearHind: 0.5, farHind: 0 },
};

describe("folk rig resolution", () => {
  it("resolves every artisan part exactly once", () => {
    const pose = artisanPose({
      action: "idle",
      frame: 0,
      globalFrame: 0,
      scale: 0.52,
      config: artisanConfig,
    });
    const resolved = resolveFolkPose(ARTISAN_RIG, pose);
    expect(resolved).toHaveLength(ARTISAN_RIG.nodes.length);
    expect(new Set(resolved.map((node) => node.partId)).size).toBe(ARTISAN_RIG.nodes.length);
    expect(resolved.find((node) => node.id === "handOpen")?.visible).toBe(true);
    expect(resolved.find((node) => node.id === "handGrip")?.visible).toBe(false);
  });

  it("keeps the grip hand exclusive during a reach", () => {
    const pose = artisanPose({
      action: "reach",
      frame: 60,
      globalFrame: 60,
      scale: 0.52,
      config: artisanConfig,
      reach: {
        target: { x: 540, y: 520 },
        startFrame: 20,
        endFrame: 80,
        gripFrame: 55,
      },
    });
    const resolved = resolveFolkPose(ARTISAN_RIG, pose);
    expect(resolved.find((node) => node.id === "handOpen")?.visible).toBe(false);
    expect(resolved.find((node) => node.id === "handGrip")?.visible).toBe(true);
  });

  it("hides the eye behind the eyelid during a blink", () => {
    const pose = artisanPose({
      action: "idle",
      frame: 0,
      globalFrame: 0,
      scale: 0.52,
      config: artisanConfig,
    });
    const resolved = resolveFolkPose(ARTISAN_RIG, pose);
    expect(resolved.find((node) => node.id === "eyelid")?.visible).toBe(true);
  });
});

describe("two-bone IK", () => {
  it("reaches a target within the chain length", () => {
    const solution = solveTwoBone({ x: 0, y: 0 }, { x: 100, y: 120 }, 120, 120, -1);
    expect(Number.isFinite(solution.upper)).toBe(true);
    expect(Number.isFinite(solution.lower)).toBe(true);
    expect(Math.abs(solution.lower)).toBeGreaterThan(0);
  });
});

describe("folk motion", () => {
  it("is deterministic for the same frame and config", () => {
    const options = {
      action: "walk" as const,
      frame: 37,
      globalFrame: 37,
      scale: 0.52,
      config: artisanConfig,
    };
    expect(artisanPose(options)).toEqual(artisanPose(options));
  });

  it("changes walking speed when the config changes without changing rig code", () => {
    const slow = artisanPose({
      action: "walk",
      frame: 18,
      globalFrame: 18,
      scale: 0.52,
      config: { ...artisanConfig, walkSpeed: 60 },
    });
    const fast = artisanPose({
      action: "walk",
      frame: 18,
      globalFrame: 18,
      scale: 0.52,
      config: { ...artisanConfig, walkSpeed: 140 },
    });
    expect(slow.nodes.nearThigh?.rotation).not.toBe(fast.nodes.nearThigh?.rotation);
  });

  it("keeps all four horse hooves attached to the leg chain", () => {
    const pose = horsePose({
      action: "walk",
      frame: 25,
      globalFrame: 25,
      scale: 0.58,
      config: horseConfig,
    });
    const resolved = resolveFolkPose(HORSE_RIG, pose);
    for (const id of ["nearFrontHoof", "farFrontHoof", "nearHindHoof", "farHindHoof"]) {
      expect(resolved.find((node) => node.id === id)).toBeDefined();
    }
  });

  it("rotates both cart wheels by the same distance-derived angle", () => {
    const pose = cartPose({ frame: 12, wheelDegrees: 184, bounce: 2 });
    const resolved = resolveFolkPose(CART_RIG, pose);
    const near = resolved.find((node) => node.id === "nearWheel");
    const far = resolved.find((node) => node.id === "farWheel");
    expect(near?.world.a).toBeCloseTo(far?.world.a ?? 0, 8);
    expect(near?.world.b).toBeCloseTo(far?.world.b ?? 0, 8);
  });

  it("resolves a hanging bell", () => {
    const resolved = resolveFolkPose(BELL_RIG, bellPose(6));
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.visible).toBe(true);
  });
});
