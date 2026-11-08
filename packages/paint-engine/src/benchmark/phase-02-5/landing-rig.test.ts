import { describe, expect, it } from "vitest";

import { evaluateSpriteRig, transformPoint } from "@fableon/sprite-motion";

import {
  BIRD_FOOT_LOCAL,
  createLandingRig,
  evaluateLandingRig,
  LANDING_CONTACT_FRAME,
  LANDING_FRAME_COUNT,
  landingPhaseForFrame,
} from "./landing-rig";

function footPoint(frames: ReturnType<typeof evaluateLandingRig>, legId: string) {
  const leg = frames.find((node) => node.id === legId);
  if (!leg) throw new Error(`Missing ${legId}`);
  return transformPoint(leg.world, BIRD_FOOT_LOCAL);
}

describe("landing rig", () => {
  it("evaluates all 48 frames independently and deterministically", () => {
    for (let frame = 0; frame < LANDING_FRAME_COUNT; frame += 1) {
      const first = evaluateLandingRig(frame);
      const second = evaluateLandingRig(frame);
      expect(second).toEqual(first);
      expect(first.map((node) => node.id)).toEqual([
        "tail",
        "wingFar",
        "legLeft",
        "legRight",
        "body",
        "wingNear",
        "head",
        "beak",
        "eye",
      ]);
    }

    expect(() => evaluateLandingRig(LANDING_FRAME_COUNT)).toThrow();
    expect(() => evaluateLandingRig(-1)).toThrow();
  });

  it("progresses the body into the landing composition with constant scale", () => {
    const first = evaluateLandingRig(0);
    const approach = evaluateLandingRig(24);
    const final = evaluateLandingRig(47);
    const firstBody = first.find((node) => node.id === "body");
    const approachBody = approach.find((node) => node.id === "body");
    const finalBody = final.find((node) => node.id === "body");

    expect(firstBody?.transform.x).toBeLessThan(approachBody?.transform.x ?? 0);
    expect(approachBody?.transform.x).toBeLessThan(finalBody?.transform.x ?? 0);
    expect(firstBody?.transform.y).toBeLessThan(approachBody?.transform.y ?? 0);
    expect(approachBody?.transform.y).toBeLessThan(finalBody?.transform.y ?? 0);
    expect(finalBody?.transform).toMatchObject({
      x: 960,
      y: 647,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });

    for (let frame = 0; frame < LANDING_FRAME_COUNT; frame += 1) {
      const body = evaluateLandingRig(frame).find((node) => node.id === "body");
      expect(body?.transform.scaleX).toBe(1);
      expect(body?.transform.scaleY).toBe(1);
    }
  });

  it("articulates wings with genuinely different poses", () => {
    const raised = evaluateLandingRig(0);
    const lowered = evaluateLandingRig(4);
    const nearRaised = raised.find((node) => node.id === "wingNear");
    const nearLowered = lowered.find((node) => node.id === "wingNear");
    const farRaised = raised.find((node) => node.id === "wingFar");
    const farLowered = lowered.find((node) => node.id === "wingFar");

    expect(nearRaised?.transform.rotation).not.toBe(nearLowered?.transform.rotation);
    expect(farRaised?.transform.rotation).not.toBe(farLowered?.transform.rotation);
    expect(
      Math.abs((nearLowered?.transform.rotation ?? 0) - (nearRaised?.transform.rotation ?? 0)),
    ).toBeGreaterThan(30);
  });

  it("keeps both feet planted after contact", () => {
    const contact = evaluateLandingRig(LANDING_CONTACT_FRAME);
    const leftContact = footPoint(contact, "legLeft");
    const rightContact = footPoint(contact, "legRight");

    expect(leftContact.y).toBeCloseTo(930, 5);
    expect(rightContact.y).toBeCloseTo(930, 5);

    for (let frame = LANDING_CONTACT_FRAME; frame < LANDING_FRAME_COUNT; frame += 1) {
      const evaluated = evaluateLandingRig(frame);
      const left = footPoint(evaluated, "legLeft");
      const right = footPoint(evaluated, "legRight");
      expect(left.x).toBeCloseTo(leftContact.x, 5);
      expect(left.y).toBeCloseTo(leftContact.y, 5);
      expect(right.x).toBeCloseTo(rightContact.x, 5);
      expect(right.y).toBeCloseTo(rightContact.y, 5);
    }
  });

  it("labels the four animation phases", () => {
    expect(landingPhaseForFrame(0)).toBe("flight");
    expect(landingPhaseForFrame(15)).toBe("flight");
    expect(landingPhaseForFrame(16)).toBe("approach");
    expect(landingPhaseForFrame(29)).toBe("approach");
    expect(landingPhaseForFrame(30)).toBe("contact");
    expect(landingPhaseForFrame(37)).toBe("contact");
    expect(landingPhaseForFrame(38)).toBe("settle");
    expect(landingPhaseForFrame(47)).toBe("settle");
  });

  it("resolves the same foot world positions through the generic evaluator", () => {
    const rig = createLandingRig();
    const frameThirty = evaluateSpriteRig(rig, LANDING_CONTACT_FRAME);
    const left = footPoint(frameThirty, "legLeft");

    expect(left.x).toBeCloseTo(910, 5);
    expect(left.y).toBeCloseTo(930, 5);
  });
});
