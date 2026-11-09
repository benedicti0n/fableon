import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { transformPoint } from "@fableon/sprite-motion";

import {
  createImportedCharacterRig,
  evaluateImportedCharacterRig,
  parseIllustrationPack,
  validateRigCompatibility,
} from "@fableon/illustration-pipeline";

import {
  createPremiumBaseRig,
  evaluatePremiumRig,
  PREMIUM_CONTACT_FRAME,
  PREMIUM_FRAME_COUNT,
  premiumFootPoints,
} from "./premium-rig";

const ROOT = resolve(process.cwd());
const manifest = JSON.parse(
  readFileSync(join(ROOT, "apps/web/public/assets/premium-bird-v1/manifest.json"), "utf8"),
) as unknown;
const pack = parseIllustrationPack(manifest);

function images(): Map<string, CanvasImageSource> {
  return new Map(pack.parts.map((part) => [part.id, {} as CanvasImageSource]));
}

describe("Gate 2 premium rig conversion", () => {
  it("maps every imported part onto the base rig with no pivot offset", () => {
    const base = createPremiumBaseRig();
    const report = validateRigCompatibility(base, pack);
    expect(report.ready).toBe(true);
    expect(report.issues.some((issue) => issue.severity === "error")).toBe(false);

    const adapter = createImportedCharacterRig(base, pack, images());
    expect(adapter.rig.nodes.map((node) => node.id)).toEqual([
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
    for (const part of adapter.partsByNodeId.values()) {
      expect(part.drawOffsetX).toBe(0);
      expect(part.drawOffsetY).toBe(0);
    }
  });

  it("preserves the intended 1920x1080 body and head registration", () => {
    const evaluated = evaluatePremiumRig(47);
    const body = evaluated.find((node) => node.id === "body");
    const head = evaluated.find((node) => node.id === "head");
    expect(body).toBeDefined();
    expect(head).toBeDefined();
    if (!body || !head) return;

    expect(transformPoint(body.world, { x: 0, y: 0 })).toEqual({ x: 600, y: 494 });
    expect(transformPoint(body.world, body.pivot)).toEqual({ x: 866, y: 654 });
    expect(transformPoint(head.world, { x: 0, y: 0 })).toEqual({ x: 902, y: 426 });
  });

  it("keeps both feet locked from contact through the final frame", () => {
    const contact = premiumFootPoints(PREMIUM_CONTACT_FRAME);
    expect(contact.left.y).toBeCloseTo(935.2, 1);
    expect(contact.right.y).toBeCloseTo(935.1, 1);

    let maxDrift = 0;
    for (let frame = PREMIUM_CONTACT_FRAME; frame < PREMIUM_FRAME_COUNT; frame += 1) {
      const feet = premiumFootPoints(frame);
      maxDrift = Math.max(
        maxDrift,
        Math.abs(feet.left.x - contact.left.x),
        Math.abs(feet.left.y - contact.left.y),
        Math.abs(feet.right.x - contact.right.x),
        Math.abs(feet.right.y - contact.right.y),
      );
    }
    expect(maxDrift).toBeLessThan(1e-6);
  });

  it("evaluates all 48 frames deterministically", () => {
    for (let frame = 0; frame < PREMIUM_FRAME_COUNT; frame += 1) {
      const first = evaluatePremiumRig(frame);
      const second = evaluatePremiumRig(frame);
      expect(second).toEqual(first);
    }
    expect(() => evaluatePremiumRig(-1)).toThrow();
    expect(() => evaluatePremiumRig(48)).toThrow();
  });

  it("keeps the imported rig identical to the base rig transform output", () => {
    const adapter = createImportedCharacterRig(createPremiumBaseRig(), pack, images());
    for (const frame of [0, 8, 16, 24, 30, 38, 47]) {
      expect(evaluateImportedCharacterRig(adapter, frame)).toEqual(evaluatePremiumRig(frame));
    }
  });
});
