import { ARTISAN_RIG, resolveFolkPose } from "@fableon/folk-motion";

import { describe, expect, it } from "vitest";

function pose(nodes: Record<string, { rotation: number }>) {
  return { nodes };
}

function matrixOf(nodes: ReturnType<typeof resolveFolkPose>, id: string) {
  return nodes.find((node) => node.id === id)!.world;
}

describe("Stage 2C.5 independent articulation contract", () => {
  it("keeps the forearm matrix stable when only the paid hand rotates", () => {
    const base = resolveFolkPose(
      ARTISAN_RIG,
      pose({
        nearUpperArm: { rotation: 0 },
        nearForearm: { rotation: 0 },
        handOpen: { rotation: 0 },
      }),
    );
    const rotated = resolveFolkPose(
      ARTISAN_RIG,
      pose({
        nearUpperArm: { rotation: 0 },
        nearForearm: { rotation: 0 },
        handOpen: { rotation: 35 },
      }),
    );
    expect(matrixOf(rotated, "nearForearm")).toEqual(matrixOf(base, "nearForearm"));
    expect(matrixOf(rotated, "handOpen")).not.toEqual(matrixOf(base, "handOpen"));
  });

  it("keeps the shin matrix stable when only the paid foot rotates", () => {
    const base = resolveFolkPose(
      ARTISAN_RIG,
      pose({ nearThigh: { rotation: 0 }, nearShin: { rotation: 0 }, nearFoot: { rotation: 0 } }),
    );
    const rotated = resolveFolkPose(
      ARTISAN_RIG,
      pose({
        nearThigh: { rotation: 0 },
        nearShin: { rotation: 0 },
        nearFoot: { rotation: 25 },
      }),
    );
    expect(matrixOf(rotated, "nearShin")).toEqual(matrixOf(base, "nearShin"));
    expect(matrixOf(rotated, "nearFoot")).not.toEqual(matrixOf(base, "nearFoot"));
  });

  it("uses the exact master joint pivots from the existing rig", () => {
    const byId = new Map(ARTISAN_RIG.nodes.map((node) => [node.id, node]));
    const shoulder = byId.get("nearUpperArm")!.pivot;
    const elbow = byId.get("nearForearm")!.pivot;
    const wrist = byId.get("handOpen")!.pivot;
    const hip = byId.get("nearThigh")!.pivot;
    const knee = byId.get("nearShin")!.pivot;
    const ankle = byId.get("nearFoot")!.pivot;
    expect(Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y)).toBeCloseTo(142.04, 1);
    expect(Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y)).toBeCloseTo(132.97, 1);
    expect(Math.hypot(knee.x - hip.x, knee.y - hip.y)).toBeCloseTo(154.12, 1);
    expect(Math.hypot(ankle.x - knee.x, ankle.y - knee.y)).toBeCloseTo(154.05, 1);
  });
});
