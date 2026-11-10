import { describe, expect, it } from "vitest";

import { ARTISAN_V2_JOINTS, ARTISAN_V2_REQUIRED_PARTS, ARTISAN_V2_RIG } from "./artisan-v2";
import {
  clampJointRotation,
  jointForNode,
  jointOverlapCorners,
  rotationWithinJointLimits,
} from "./joints";
import { artisanPose, type ArtisanMotionConfig } from "./motion";
import { resolveFolkPose, type FolkRig, type FolkRigNode } from "./rig";
import { ARTISAN_RIG, CART_RIG, HORSE_RIG } from "./rigs";

const config: ArtisanMotionConfig = {
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

function node(id: string, parentId: string | null, drawOrder: number): FolkRigNode {
  return { id, partId: id, parentId, pivot: { x: 0, y: 0 }, drawOrder };
}

describe("Stage 2B artisan rig contract", () => {
  it("keeps the same node and part inventory as the existing artisan rig", () => {
    expect(
      ARTISAN_V2_RIG.nodes.slice(0, ARTISAN_RIG.nodes.length).map((entry) => entry.id),
    ).toEqual(ARTISAN_RIG.nodes.map((entry) => entry.id));
    expect(ARTISAN_V2_REQUIRED_PARTS).toHaveLength(31);
    expect(new Set(ARTISAN_V2_REQUIRED_PARTS).size).toBe(31);
  });

  it("has unique draw order and a valid joint on every articulated chain", () => {
    const orders = ARTISAN_V2_RIG.nodes.map((entry) => entry.drawOrder);
    expect(new Set(orders).size).toBe(orders.length);
    expect(ARTISAN_V2_JOINTS).toHaveLength(15);
    expect(ARTISAN_V2_RIG.nodes.filter((entry) => entry.joint)).toHaveLength(15);
    expect(resolveFolkPose(ARTISAN_V2_RIG, { nodes: {} })).toHaveLength(
      ARTISAN_V2_RIG.nodes.length,
    );
  });

  it("draws the torso above the upper arm and the forearm above the upper arm", () => {
    const byId = new Map(ARTISAN_V2_RIG.nodes.map((entry) => [entry.id, entry]));
    expect(byId.get("torso")!.drawOrder).toBeGreaterThan(byId.get("nearUpperArm")!.drawOrder);
    expect(byId.get("nearForearm")!.drawOrder).toBeGreaterThan(byId.get("nearUpperArm")!.drawOrder);
    expect(byId.get("nearDhoti")!.drawOrder).toBeGreaterThan(byId.get("nearThigh")!.drawOrder);
    expect(byId.get("necklace")!.drawOrder).toBeGreaterThan(byId.get("neck")!.drawOrder);
  });

  it("records the shoulder, elbow, wrist, hip, knee and ankle joints", () => {
    const kinds = new Set(ARTISAN_V2_JOINTS.map((entry) => entry.kind));
    expect(kinds).toEqual(new Set(["shoulder", "elbow", "wrist", "hip", "knee", "ankle", "neck"]));
    expect(jointForNode(ARTISAN_V2_RIG, "nearForearm")?.kind).toBe("elbow");
    expect(jointForNode(ARTISAN_V2_RIG, "nearFoot")?.kind).toBe("ankle");
    expect(jointForNode(ARTISAN_V2_RIG, "nearUpperArm")?.occlusion).toBe("parent-over-child");
    expect(jointForNode(ARTISAN_V2_RIG, "nearForearm")?.occlusion).toBe("cover-over");
  });

  it("clamps and checks rotation limits without changing the evaluator", () => {
    expect(rotationWithinJointLimits(ARTISAN_V2_RIG, "nearForearm", -90)).toBe(true);
    expect(rotationWithinJointLimits(ARTISAN_V2_RIG, "nearForearm", 45)).toBe(false);
    expect(clampJointRotation(ARTISAN_V2_RIG, "nearForearm", 45)).toBe(5);
    expect(clampJointRotation(ARTISAN_V2_RIG, "nearForearm", -180)).toBe(-140);
    expect(clampJointRotation(ARTISAN_V2_RIG, "torso", 180)).toBe(180);
  });

  it("resolves the same poses as the existing rig while adding joint metadata", () => {
    const pose = artisanPose({
      action: "walk",
      frame: 37,
      globalFrame: 37,
      scale: 0.52,
      config,
    });
    const base = resolveFolkPose(ARTISAN_RIG, pose);
    const v2 = resolveFolkPose(ARTISAN_V2_RIG, pose);
    const baseById = new Map(base.map((entry) => [entry.id, entry.world]));
    for (const entry of v2) {
      if (!baseById.has(entry.id)) continue;
      expect(entry.world).toEqual(baseById.get(entry.id));
    }
    expect(v2.find((entry) => entry.id === "nearForearm")?.joint?.kind).toBe("elbow");
    expect(v2.find((entry) => entry.id === "torso")?.joint).toBeNull();
  });

  it("keeps joint covers above their joint child", () => {
    const byId = new Map(ARTISAN_V2_RIG.nodes.map((entry) => [entry.id, entry]));
    for (const entry of ARTISAN_V2_RIG.nodes) {
      if (!entry.joint?.coverNodeId) continue;
      expect(byId.get(entry.joint.coverNodeId)!.drawOrder).toBeGreaterThan(entry.drawOrder);
    }
  });

  it("maps the hidden overlap into rig space", () => {
    const resolved = resolveFolkPose(ARTISAN_V2_RIG, {
      nodes: { nearForearm: { rotation: -30 } },
    });
    const forearm = resolved.find((entry) => entry.id === "nearForearm")!;
    const corners = jointOverlapCorners(forearm);
    expect(corners).toHaveLength(4);
    expect(corners.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))).toBe(
      true,
    );
  });
});

describe("joint contract validation", () => {
  it("rejects a joint whose parent does not match the rig hierarchy", () => {
    const rig: FolkRig = {
      id: "bad-parent",
      nodes: [
        node("root", null, 1),
        {
          ...node("child", "root", 2),
          joint: {
            kind: "elbow",
            parentNodeId: "other",
            overlap: { x: -1, y: -1, width: 2, height: 2 },
            occlusion: "child-over-parent",
            limits: { min: -90, max: 0 },
          },
        },
      ],
    };
    expect(() => resolveFolkPose(rig, { nodes: {} })).toThrow(/parent/i);
  });

  it("rejects a missing cover and invalid limits", () => {
    const missingCover: FolkRig = {
      id: "missing-cover",
      nodes: [
        node("root", null, 1),
        {
          ...node("child", "root", 2),
          joint: {
            kind: "hip",
            parentNodeId: "root",
            overlap: { x: -1, y: -1, width: 2, height: 2 },
            occlusion: "cover-over",
            limits: { min: -45, max: 45 },
            coverNodeId: "absent",
          },
        },
      ],
    };
    expect(() => resolveFolkPose(missingCover, { nodes: {} })).toThrow(/cover/i);

    const badLimits: FolkRig = {
      id: "bad-limits",
      nodes: [
        node("root", null, 1),
        {
          ...node("child", "root", 2),
          joint: {
            kind: "knee",
            parentNodeId: "root",
            overlap: { x: -1, y: -1, width: 2, height: 2 },
            occlusion: "child-over-parent",
            limits: { min: 20, max: 20 },
          },
        },
      ],
    };
    expect(() => resolveFolkPose(badLimits, { nodes: {} })).toThrow(/limits/i);
  });

  it("does not change the existing horse or cart rigs", () => {
    expect(HORSE_RIG.nodes.every((entry) => entry.joint === undefined)).toBe(true);
    expect(CART_RIG.nodes.every((entry) => entry.joint === undefined)).toBe(true);
  });
});
