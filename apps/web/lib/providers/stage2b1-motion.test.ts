import { describe, expect, it } from "vitest";

import {
  STAGE2B1_BASE_CONFIG,
  STAGE2B1_FRAMES,
  STAGE2B1_VARIATION_CONFIG,
  fitCamera,
  stage2b1CameraBounds,
  stage2b1FrameState,
  stage2b1FrameStates,
} from "./stage2b1-motion";

function contactSpan(states: ReturnType<typeof stage2b1FrameStates>, foot: "near" | "far") {
  const spans: number[] = [];
  let values: number[] = [];
  states.forEach((state) => {
    if (state.feet[foot].stance) {
      values.push(state.feet[foot].contactWorld.x);
    } else if (values.length > 0) {
      spans.push(Math.max(...values) - Math.min(...values));
      values = [];
    }
  });
  if (values.length > 0) spans.push(Math.max(...values) - Math.min(...values));
  return spans;
}

describe("Stage 2B.1 motion", () => {
  it("covers the timeline with walk, reach, contact, grip, carry and release phases", () => {
    expect(stage2b1FrameState(STAGE2B1_BASE_CONFIG, 0).phase).toBe("walk");
    expect(stage2b1FrameState(STAGE2B1_BASE_CONFIG, 60).phase).toBe("reach");
    expect(stage2b1FrameState(STAGE2B1_BASE_CONFIG, 100).phase).toBe("contact");
    expect(stage2b1FrameState(STAGE2B1_BASE_CONFIG, 108).phase).toBe("grip");
    expect(stage2b1FrameState(STAGE2B1_BASE_CONFIG, 126).phase).toBe("carry");
    expect(stage2b1FrameState(STAGE2B1_BASE_CONFIG, 144).phase).toBe("release");
    expect(stage2b1FrameState(STAGE2B1_BASE_CONFIG, 168).phase).toBe("settled");
    expect(STAGE2B1_FRAMES).toBe(192);
  });

  it("locks each stance foot to a stable world contact point", () => {
    const states = stage2b1FrameStates(STAGE2B1_BASE_CONFIG);
    const near = contactSpan(states, "near");
    const far = contactSpan(states, "far");
    expect(near.length).toBeGreaterThan(0);
    expect(far.length).toBeGreaterThan(0);
    expect(Math.max(...near)).toBeLessThan(1.5);
    expect(Math.max(...far)).toBeLessThan(1.5);
  });

  it("lifts the swing foot clear of the ground", () => {
    const states = stage2b1FrameStates(STAGE2B1_BASE_CONFIG);
    const swingHeights = states
      .flatMap((state) => [state.feet.near, state.feet.far])
      .filter((foot) => foot.swing > 0.4)
      .map((foot) => STAGE2B1_BASE_CONFIG.groundY - foot.contactWorld.y);
    expect(swingHeights.length).toBeGreaterThan(0);
    expect(Math.max(...swingHeights)).toBeGreaterThan(10);
  });

  it("advances the root during walk and holds it for reach/grip", () => {
    const start = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 0);
    const end = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 59);
    const reach = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 108);
    expect(end.placement.x).toBeGreaterThan(start.placement.x);
    expect(reach.placement.x).toBeCloseTo(end.placement.x, 6);
  });

  it("places the hand grip point on the bell target at contact", () => {
    const state = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 104);
    expect(state.contactError).toBeLessThanOrEqual(STAGE2B1_BASE_CONFIG.reach.contactTolerance);
    expect(
      Math.hypot(
        state.placement.x +
          state.handGripWorld.x * state.placement.scale -
          STAGE2B1_BASE_CONFIG.reach.target.x,
        state.placement.y +
          state.handGripWorld.y * state.placement.scale -
          STAGE2B1_BASE_CONFIG.reach.target.y,
      ),
    ).toBeLessThanOrEqual(STAGE2B1_BASE_CONFIG.reach.contactTolerance);
    expect(state.nodes.find((node) => node.id === "handOpen")?.visible).toBe(true);
  });

  it("attaches the bell only during a valid grip and keeps the grip hand exclusive", () => {
    const grip = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 120);
    expect(grip.bellAttached).toBe(true);
    expect(grip.nodes.find((node) => node.id === "handGrip")?.visible).toBe(true);
    expect(grip.nodes.find((node) => node.id === "handOpen")?.visible).toBe(false);
    const reach = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 90);
    expect(reach.bellAttached).toBe(false);
    expect(reach.bellWorld).toEqual({
      x: (STAGE2B1_BASE_CONFIG.bell.pedestal.x - reach.placement.x) / reach.placement.scale,
      y: (STAGE2B1_BASE_CONFIG.bell.pedestal.y - reach.placement.y) / reach.placement.scale,
    });
  });

  it("blocks the attachment when the target is unreachable", () => {
    const config = {
      ...STAGE2B1_BASE_CONFIG,
      reach: {
        ...STAGE2B1_BASE_CONFIG.reach,
        target: { x: 2200, y: 200 },
        contactTolerance: 10,
      },
    };
    const state = stage2b1FrameState(config, 120);
    expect(state.contactError).toBeGreaterThan(10);
    expect(state.bellAttached).toBe(false);
    expect(state.interaction).toBe("blocked");
  });

  it("returns the bell to the pedestal without a teleport", () => {
    const release = stage2b1FrameStates(STAGE2B1_BASE_CONFIG).slice(132, 176);
    for (let index = 1; index < release.length; index += 1) {
      const previous = release[index - 1]!;
      const current = release[index]!;
      expect(
        Math.hypot(
          current.bellWorld.x - previous.bellWorld.x,
          current.bellWorld.y - previous.bellWorld.y,
        ),
      ).toBeLessThan(90);
    }
    const settled = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 180);
    expect(settled.bellWorld).toEqual({
      x: (STAGE2B1_BASE_CONFIG.bell.pedestal.x - settled.placement.x) / settled.placement.scale,
      y: (STAGE2B1_BASE_CONFIG.bell.pedestal.y - settled.placement.y) / settled.placement.scale,
    });
  });

  it("is deterministic and provider-independent through metadata", () => {
    const first = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 37);
    const second = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 37);
    expect(first).toEqual(second);
    const variation = stage2b1FrameState(STAGE2B1_VARIATION_CONFIG, 37);
    expect(variation.placement.x).not.toBe(first.placement.x);
    expect(variation.pose.nodes.nearThigh?.rotation).not.toBe(first.pose.nodes.nearThigh?.rotation);
  });

  it("computes animated bounds and a camera fit with margins", () => {
    const states = stage2b1FrameStates(STAGE2B1_BASE_CONFIG);
    const partBounds = Object.fromEntries(
      states[0]!.nodes.map((node) => [
        node.partId,
        { offsetX: -40, offsetY: -40, width: 80, height: 80 },
      ]),
    );
    const bounds = stage2b1CameraBounds(states, partBounds);
    expect(bounds.maxX).toBeGreaterThan(bounds.minX);
    expect(bounds.maxY).toBeGreaterThan(bounds.minY);
    const camera = fitCamera(bounds, 1280, 720, 36);
    const screenX1 = bounds.minX * camera.scale + camera.x;
    const screenY1 = bounds.minY * camera.scale + camera.y;
    const screenX2 = bounds.maxX * camera.scale + camera.x;
    const screenY2 = bounds.maxY * camera.scale + camera.y;
    expect(screenX1).toBeGreaterThanOrEqual(35);
    expect(screenY1).toBeGreaterThanOrEqual(35);
    expect(screenX2).toBeLessThanOrEqual(1280 - 35);
    expect(screenY2).toBeLessThanOrEqual(720 - 35);
  });

  it("rejects invalid frames", () => {
    expect(() => stage2b1FrameState(STAGE2B1_BASE_CONFIG, -1)).toThrow(/frame/i);
    expect(() => stage2b1FrameState(STAGE2B1_BASE_CONFIG, 192)).toThrow(/frame/i);
    expect(() => stage2b1FrameState(STAGE2B1_BASE_CONFIG, 1.5)).toThrow(/frame/i);
  });
});
