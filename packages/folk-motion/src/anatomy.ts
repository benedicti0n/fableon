import type { Vec2 } from "@fableon/sprite-motion";

export type LandmarkOrigin = "observed" | "inferred" | "manual";

export interface AnatomicalLandmark {
  readonly id: string;
  readonly semantic:
    | "head-center"
    | "neck"
    | "chin"
    | "eye"
    | "nose"
    | "headwear"
    | "shoulder"
    | "elbow"
    | "wrist"
    | "palm"
    | "grip"
    | "chest"
    | "waist"
    | "pelvis"
    | "hip"
    | "knee"
    | "ankle"
    | "heel"
    | "toe"
    | "sole";
  /** Normalized against the master silhouette bounds, not the raw image. */
  readonly x: number;
  readonly y: number;
  readonly origin: LandmarkOrigin;
  readonly confidence: number;
  readonly side?: "near" | "far" | "center";
  readonly notes?: string;
}

export interface AnatomicalLandmarkSet {
  readonly format: "fableon.anatomical-landmarks";
  readonly version: 1;
  readonly id: string;
  readonly characterId: string;
  readonly masterPath: string;
  readonly masterWidth: number;
  readonly masterHeight: number;
  readonly silhouette: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
  readonly landmarks: readonly AnatomicalLandmark[];
}

export class AnatomicalLandmarkError extends Error {
  override readonly name = "AnatomicalLandmarkError";
}

export function validateLandmarkSet(set: AnatomicalLandmarkSet): void {
  if (set.landmarks.length === 0) throw new AnatomicalLandmarkError("Landmark set is empty.");
  const ids = new Set<string>();
  for (const landmark of set.landmarks) {
    if (ids.has(landmark.id)) {
      throw new AnatomicalLandmarkError(`Duplicate landmark "${landmark.id}".`);
    }
    ids.add(landmark.id);
    if (!Number.isFinite(landmark.x) || !Number.isFinite(landmark.y)) {
      throw new AnatomicalLandmarkError(`Landmark "${landmark.id}" is nonfinite.`);
    }
    if (landmark.x < 0 || landmark.x > 1 || landmark.y < 0 || landmark.y > 1) {
      throw new AnatomicalLandmarkError(
        `Landmark "${landmark.id}" must be normalized to the silhouette bounds.`,
      );
    }
    if (
      !Number.isFinite(landmark.confidence) ||
      landmark.confidence < 0 ||
      landmark.confidence > 1
    ) {
      throw new AnatomicalLandmarkError(
        `Landmark "${landmark.id}" confidence must be between 0 and 1.`,
      );
    }
    if (!["observed", "inferred", "manual"].includes(landmark.origin)) {
      throw new AnatomicalLandmarkError(`Landmark "${landmark.id}" has an invalid origin.`);
    }
  }
  const silhouette = set.silhouette;
  if (
    silhouette.maxX <= silhouette.minX ||
    silhouette.maxY <= silhouette.minY ||
    silhouette.minX < 0 ||
    silhouette.minY < 0 ||
    silhouette.maxX > set.masterWidth ||
    silhouette.maxY > set.masterHeight
  ) {
    throw new AnatomicalLandmarkError("Master silhouette bounds are invalid.");
  }
}

export function landmarkToMasterPixels(set: AnatomicalLandmarkSet, landmarkId: string): Vec2 {
  const landmark = set.landmarks.find((entry) => entry.id === landmarkId);
  if (!landmark) throw new AnatomicalLandmarkError(`Missing landmark "${landmarkId}".`);
  return {
    x: set.silhouette.minX + landmark.x * (set.silhouette.maxX - set.silhouette.minX),
    y: set.silhouette.minY + landmark.y * (set.silhouette.maxY - set.silhouette.minY),
  };
}

export function masterPixelToLandmarkNormalized(set: AnatomicalLandmarkSet, point: Vec2): Vec2 {
  return {
    x: (point.x - set.silhouette.minX) / (set.silhouette.maxX - set.silhouette.minX),
    y: (point.y - set.silhouette.minY) / (set.silhouette.maxY - set.silhouette.minY),
  };
}

export function roundTripLandmark(
  set: AnatomicalLandmarkSet,
  landmarkId: string,
): { readonly pixels: Vec2; readonly normalized: Vec2; readonly error: number } {
  const pixels = landmarkToMasterPixels(set, landmarkId);
  const normalized = masterPixelToLandmarkNormalized(set, pixels);
  const landmark = set.landmarks.find((entry) => entry.id === landmarkId)!;
  return {
    pixels,
    normalized,
    error: Math.hypot(normalized.x - landmark.x, normalized.y - landmark.y),
  };
}

export function observedOnly(set: AnatomicalLandmarkSet): readonly AnatomicalLandmark[] {
  return set.landmarks.filter((landmark) => landmark.origin === "observed");
}

export function landmarkError(
  actual: Vec2,
  expected: Vec2,
  weight = 1,
): {
  readonly dx: number;
  readonly dy: number;
  readonly distance: number;
  readonly weighted: number;
} {
  const dx = actual.x - expected.x;
  const dy = actual.y - expected.y;
  const distance = Math.hypot(dx, dy);
  return { dx, dy, distance, weighted: distance * weight };
}
