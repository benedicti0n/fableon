import { describe, expect, it } from "vitest";

import {
  BIRD_PART_IDS,
  createLittleBirdBaseRig,
  flightPose,
  footPointsForPose,
  glidePose,
  idlePose,
  landingPose,
  rigForPose,
  solveFootContact,
  type CharacterPose,
} from "./index";

const BASE = {
  startFrame: 0,
  endFrame: 100,
  start: { x: 200, y: 500 },
  end: { x: 1200, y: 700 },
  scale: 2.2,
  seed: 17,
};

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

describe("Little Bird motion presets", () => {
  it("builds the reusable nine-part rig with stable draw order and pivots", () => {
    const rig = createLittleBirdBaseRig();
    expect(rig.nodes.map((node) => node.id)).toEqual([...BIRD_PART_IDS]);
    expect(rig.nodes).toHaveLength(9);
    expect(new Set(rig.nodes.map((node) => node.drawOrder)).size).toBe(9);
    const body = rig.nodes.find((node) => node.id === "body");
    const head = rig.nodes.find((node) => node.id === "head");
    expect(body?.pivot).toEqual({ x: 133, y: 80 });
    expect(head?.parentId).toBe("body");
  });

  it("articulates wings and moves the character through a flight path", () => {
    const start = flightPose({ ...BASE, frame: 0 });
    const flap = flightPose({ ...BASE, frame: 7 });
    const end = flightPose({ ...BASE, frame: 100 });
    expect(end.x).toBeCloseTo(1200, 5);
    expect(end.y).toBeCloseTo(700, 5);
    expect(Math.abs(start.wingNear - flap.wingNear)).toBeGreaterThan(2);
    expect(Math.abs(start.wingFar - flap.wingFar)).toBeGreaterThan(2);
    expect(start.contact).toBe(false);
  });

  it("produces a quieter glide than the flapping flight preset", () => {
    const flight = flightPose({ ...BASE, frame: 24 });
    const glide = glidePose({ ...BASE, frame: 24 });
    expect(Math.abs(glide.wingNear - 62)).toBeLessThan(10);
    expect(Math.abs(glide.wingFar - 48)).toBeLessThan(10);
    expect(glide.wingNear).not.toBe(flight.wingNear);
  });

  it("extends legs before contact and folds wings after contact", () => {
    const options = {
      ...BASE,
      contactFrame: 80,
      settleFrame: 130,
      contactPoint: { x: 1350, y: 930 },
    };
    const approach = landingPose({ ...options, frame: 78 });
    const contact = landingPose({ ...options, frame: 80 });
    const settled = landingPose({ ...options, frame: 130 });
    expect(approach.contact).toBe(false);
    expect(approach.legLeftOffset).toBeGreaterThan(0);
    expect(contact.contact).toBe(true);
    expect(settled.wingNear).toBeLessThan(contact.wingNear);
    expect(settled.wingFar).toBeLessThan(contact.wingFar);
  });

  it("solves exact foot contact and keeps it stable across settle frames", () => {
    const options = {
      ...BASE,
      contactFrame: 80,
      settleFrame: 130,
      contactPoint: { x: 1350, y: 930 },
    };
    for (const frame of [80, 90, 100, 110, 120, 130]) {
      const pose = landingPose({ ...options, frame });
      const solved = solveFootContact(pose, 950);
      expect(Math.max(solved.left.y, solved.right.y)).toBeCloseTo(950, 6);
      expect(Math.abs(solved.left.y - solved.right.y)).toBeLessThan(40);
    }
  });

  it("keeps feet on the branch while idle and produces a deterministic blink", () => {
    const pose = idlePose({
      frame: 0,
      position: { x: 1350, y: 930 },
      scale: 2.2,
      seed: 0,
    });
    const solved = solveFootContact(pose, 950);
    expect(Math.max(solved.left.y, solved.right.y)).toBeCloseTo(950, 6);
    const blink = idlePose({
      frame: 2,
      position: { x: 1350, y: 930 },
      scale: 2.2,
      seed: 0,
    });
    expect(blink.eyeOpen).toBeLessThan(0.2);
    const open = idlePose({
      frame: 8,
      position: { x: 1350, y: 930 },
      scale: 2.2,
      seed: 0,
    });
    expect(open.eyeOpen).toBe(1);
  });

  it("is deterministic and does not mutate its pose or input options", () => {
    const frozen = deepFreeze({ ...BASE, frame: 42 });
    const first = flightPose(frozen);
    const second = flightPose(frozen);
    const frozenPose = deepFreeze(first);
    const rigOne = rigForPose(frozenPose);
    const rigTwo = rigForPose(frozenPose);
    expect(second).toEqual(first);
    expect(rigTwo).toEqual(rigOne);
  });

  it("produces finite poses throughout all presets", () => {
    const poses: CharacterPose[] = [
      flightPose({ ...BASE, frame: 0 }),
      glidePose({ ...BASE, frame: 50 }),
      landingPose({
        ...BASE,
        frame: 60,
        contactFrame: 80,
        settleFrame: 130,
        contactPoint: { x: 1350, y: 930 },
      }),
      idlePose({ frame: 30, position: { x: 1350, y: 930 }, scale: 2.2 }),
    ];
    for (const pose of poses) {
      for (const value of Object.values(pose)) {
        if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      }
    }
    expect(Number.isFinite(footPointsForPose(poses[0]!).left.y)).toBe(true);
  });
});
