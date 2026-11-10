import type { Vec2 } from "@fableon/sprite-motion";

export type Stage2CPartRole =
  | "shoulder-region"
  | "upper-arm"
  | "forearm"
  | "wrist"
  | "hand"
  | "elbow-cover"
  | "pelvis-region"
  | "thigh"
  | "shin"
  | "ankle"
  | "foot";

export interface Stage2CPartSpec {
  readonly id: string;
  readonly characterId: string;
  readonly provider: "openai" | "gemini";
  readonly role: Stage2CPartRole;
  readonly masterAsset: string;
  readonly sourceMaster: string;
  readonly parentJoint: string;
  readonly childJoint: string;
  readonly masterLandmarks: {
    readonly parent: Vec2;
    readonly child: Vec2;
    readonly grip?: Vec2;
    readonly sole?: Vec2;
  };
  /** Master pixels, measured from the master silhouette. */
  readonly expectedSegmentLengthPx: number;
  readonly expectedNeutralLocation: Vec2;
  readonly expectedVisibleRegion: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
  readonly expectedSpriteOrientationDeg: number;
  readonly allowedScaleAdjustment: { readonly min: number; readonly max: number };
  readonly hiddenOverlapZone: {
    readonly parent: number;
    readonly child: number;
  };
  readonly occlusionOwner: "parent-over-child" | "child-over-parent" | "cover-over";
  readonly decorationOwner: readonly string[];
  readonly sourcePixelProvenance: readonly string[];
  readonly providerGenerationReference: string | null;
  readonly approvalStatus: "draft" | "source-preserved" | "needs-editing" | "approved" | "rejected";
  readonly notes: readonly string[];
}

export interface Stage2CAssetContract {
  readonly format: "fableon.rig-first-part-contract";
  readonly version: 1;
  readonly experimentId: "phase-05.1-stage-2c";
  readonly characterId: string;
  readonly provider: "openai" | "gemini";
  readonly master: {
    readonly source: string;
    readonly width: number;
    readonly height: number;
    readonly silhouette: {
      readonly minX: number;
      readonly minY: number;
      readonly maxX: number;
      readonly maxY: number;
    };
    readonly sha256: string;
  };
  readonly parts: readonly Stage2CPartSpec[];
}

export function validateStage2CContract(contract: Stage2CAssetContract): void {
  if (contract.parts.length === 0) throw new Error("Stage 2C contract has no parts.");
  const ids = new Set<string>();
  for (const part of contract.parts) {
    if (ids.has(part.id)) throw new Error(`Duplicate Stage 2C part "${part.id}".`);
    ids.add(part.id);
    if (part.expectedSegmentLengthPx <= 0) {
      throw new Error(`Part "${part.id}" has an invalid segment length.`);
    }
    if (
      part.allowedScaleAdjustment.min <= 0 ||
      part.allowedScaleAdjustment.max < part.allowedScaleAdjustment.min
    ) {
      throw new Error(`Part "${part.id}" has an invalid scale allowance.`);
    }
    if (part.hiddenOverlapZone.parent < 0 || part.hiddenOverlapZone.child < 0) {
      throw new Error(`Part "${part.id}" has a negative hidden overlap.`);
    }
    if (
      !Number.isFinite(part.expectedNeutralLocation.x) ||
      !Number.isFinite(part.expectedNeutralLocation.y)
    ) {
      throw new Error(`Part "${part.id}" has a nonfinite neutral location.`);
    }
  }
}

export function segmentLength(
  master: { minX: number; minY: number; maxX: number; maxY: number },
  a: Vec2,
  b: Vec2,
): number {
  const width = master.maxX - master.minX;
  const height = master.maxY - master.minY;
  return Math.hypot((b.x - a.x) * width, (b.y - a.y) * height);
}

export function landmarkToMasterPixels(
  master: { minX: number; minY: number; maxX: number; maxY: number },
  point: Vec2,
): Vec2 {
  return {
    x: master.minX + point.x * (master.maxX - master.minX),
    y: master.minY + point.y * (master.maxY - master.minY),
  };
}
