import { describe, expect, it } from "vitest";

import {
  STAGE2B_BASE_CONFIG,
  STAGE2B_FRAMES,
  STAGE2B_VARIATION_CONFIG,
  stage2bFrameState,
  stage2bFrameStates,
} from "./stage2b-animation";

describe("Stage 2B config-driven animation", () => {
  it("covers the full eight-second timeline at 24 fps", () => {
    expect(STAGE2B_FRAMES).toBe(192);
    expect(stage2bFrameState(STAGE2B_BASE_CONFIG, 0).phase).toBe("walk");
    expect(stage2bFrameState(STAGE2B_BASE_CONFIG, 59).phase).toBe("walk");
    expect(stage2bFrameState(STAGE2B_BASE_CONFIG, 60).phase).toBe("reach");
    expect(stage2bFrameState(STAGE2B_BASE_CONFIG, 108).phase).toBe("grip");
    expect(stage2bFrameState(STAGE2B_BASE_CONFIG, 144).phase).toBe("release");
    expect(stage2bFrameState(STAGE2B_BASE_CONFIG, 168).phase).toBe("idle");
    expect(stage2bFrameState(STAGE2B_BASE_CONFIG, 191).phase).toBe("idle");
  });

  it("swaps the gripping hand only during the grip window", () => {
    const grip = stage2bFrameState(STAGE2B_BASE_CONFIG, 120);
    expect(grip.nodes.find((node) => node.id === "handGrip")?.visible).toBe(true);
    expect(grip.nodes.find((node) => node.id === "handOpen")?.visible).toBe(false);
    expect(grip.bellAttached).toBe(true);
    const idle = stage2bFrameState(STAGE2B_BASE_CONFIG, 180);
    expect(idle.nodes.find((node) => node.id === "handGrip")?.visible).toBe(false);
    expect(idle.nodes.find((node) => node.id === "handOpen")?.visible).toBe(true);
    expect(idle.bellAttached).toBe(false);
  });

  it("keeps the feet on the configured ground and the same deterministic pose", () => {
    const first = stage2bFrameState(STAGE2B_BASE_CONFIG, 37);
    const second = stage2bFrameState(STAGE2B_BASE_CONFIG, 37);
    expect(first.pose).toEqual(second.pose);
    expect(first.nodes).toEqual(second.nodes);
    expect(first.placement.y + 1020 * first.placement.scale).toBeCloseTo(
      STAGE2B_BASE_CONFIG.groundY,
      6,
    );
  });

  it("moves the bell with the gripping hand and leaves it on the pedestal otherwise", () => {
    const reach = stage2bFrameState(STAGE2B_BASE_CONFIG, 80);
    const grip = stage2bFrameState(STAGE2B_BASE_CONFIG, 120);
    const release = stage2bFrameState(STAGE2B_BASE_CONFIG, 160);
    expect(reach.bellWorld).toEqual(STAGE2B_BASE_CONFIG.bell.pedestal);
    expect(grip.bellWorld).toEqual(grip.handWorld);
    expect(release.bellWorld).toEqual(STAGE2B_BASE_CONFIG.bell.pedestal);
  });

  it("changes motion from configuration data without changing the engine", () => {
    const base = stage2bFrameState(STAGE2B_BASE_CONFIG, 40);
    const variation = stage2bFrameState(STAGE2B_VARIATION_CONFIG, 40);
    expect(variation.placement.x).not.toBe(base.placement.x);
    expect(variation.pose.nodes.nearThigh?.rotation).not.toBe(base.pose.nodes.nearThigh?.rotation);
    expect(variation.phase).toBe("walk");
  });

  it("evaluates all 192 frames without a provider or network call", () => {
    const states = stage2bFrameStates(STAGE2B_BASE_CONFIG);
    expect(states).toHaveLength(192);
    expect(states[0]?.frame).toBe(0);
    expect(states[191]?.frame).toBe(191);
  });

  it("rejects frames outside the eight-second contract", () => {
    expect(() => stage2bFrameState(STAGE2B_BASE_CONFIG, -1)).toThrow(/frame/i);
    expect(() => stage2bFrameState(STAGE2B_BASE_CONFIG, 192)).toThrow(/frame/i);
    expect(() => stage2bFrameState(STAGE2B_BASE_CONFIG, 1.5)).toThrow(/frame/i);
  });
});
