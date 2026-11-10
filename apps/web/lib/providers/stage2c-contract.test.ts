import { describe, expect, it } from "vitest";

import {
  landmarkToMasterPixels,
  segmentLength,
  validateStage2CContract,
  type Stage2CAssetContract,
} from "./stage2c-contract";

const contract: Stage2CAssetContract = {
  format: "fableon.rig-first-part-contract",
  version: 1,
  experimentId: "phase-05.1-stage-2c",
  characterId: "artisan",
  provider: "openai",
  master: {
    source: "master.png",
    width: 1000,
    height: 1000,
    silhouette: { minX: 100, minY: 100, maxX: 900, maxY: 900 },
    sha256: "0".repeat(64),
  },
  parts: [
    {
      id: "nearUpperArm",
      characterId: "artisan",
      provider: "openai",
      role: "upper-arm",
      masterAsset: "master.png",
      sourceMaster: "outputs/master.png",
      parentJoint: "shoulder",
      childJoint: "elbow",
      masterLandmarks: { parent: { x: 0.6, y: 0.3 }, child: { x: 0.6, y: 0.5 } },
      expectedSegmentLengthPx: 160,
      expectedNeutralLocation: { x: 0.5, y: 0.5 },
      expectedVisibleRegion: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      expectedSpriteOrientationDeg: 0,
      allowedScaleAdjustment: { min: 0.9, max: 1.1 },
      hiddenOverlapZone: { parent: 8, child: 10 },
      occlusionOwner: "parent-over-child",
      decorationOwner: ["sleeve-pattern"],
      sourcePixelProvenance: ["master"],
      providerGenerationReference: null,
      approvalStatus: "source-preserved",
      notes: [],
    },
  ],
};

describe("Stage 2C rig-first contract", () => {
  it("validates a source-preserved part contract", () => {
    expect(() => validateStage2CContract(contract)).not.toThrow();
  });

  it("computes master segment length in pixels", () => {
    expect(
      segmentLength(contract.master.silhouette, { x: 0.6, y: 0.3 }, { x: 0.6, y: 0.5 }),
    ).toBeCloseTo(160, 6);
  });

  it("converts normalized landmarks to master pixels", () => {
    expect(landmarkToMasterPixels(contract.master.silhouette, { x: 0.5, y: 0.5 })).toEqual({
      x: 500,
      y: 500,
    });
  });

  it("rejects invalid scale, overlap and duplicate parts", () => {
    expect(() =>
      validateStage2CContract({
        ...contract,
        parts: [
          {
            ...contract.parts[0]!,
            allowedScaleAdjustment: { min: 0, max: 1 },
          },
        ],
      }),
    ).toThrow(/scale/i);
    expect(() =>
      validateStage2CContract({
        ...contract,
        parts: [{ ...contract.parts[0]!, hiddenOverlapZone: { parent: -1, child: 0 } }],
      }),
    ).toThrow(/overlap/i);
    expect(() =>
      validateStage2CContract({
        ...contract,
        parts: [contract.parts[0]!, contract.parts[0]!],
      }),
    ).toThrow(/duplicate/i);
  });
});
