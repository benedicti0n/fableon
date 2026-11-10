import { describe, expect, it } from "vitest";

import {
  AnatomicalLandmarkError,
  landmarkError,
  landmarkToMasterPixels,
  observedOnly,
  roundTripLandmark,
  validateLandmarkSet,
  type AnatomicalLandmarkSet,
} from "./anatomy";

const set: AnatomicalLandmarkSet = {
  format: "fableon.anatomical-landmarks",
  version: 1,
  id: "test",
  characterId: "artisan",
  masterPath: "master.png",
  masterWidth: 1000,
  masterHeight: 1200,
  silhouette: { minX: 100, minY: 100, maxX: 900, maxY: 1100 },
  landmarks: [
    { id: "head", semantic: "head-center", x: 0.5, y: 0.1, origin: "observed", confidence: 0.9 },
    { id: "neck", semantic: "neck", x: 0.5, y: 0.25, origin: "inferred", confidence: 0.5 },
    {
      id: "shoulder",
      semantic: "shoulder",
      x: 0.65,
      y: 0.3,
      origin: "manual",
      confidence: 1,
      side: "near",
    },
  ],
};

describe("anatomical landmarks", () => {
  it("converts normalized silhouette landmarks to master pixels and back", () => {
    expect(landmarkToMasterPixels(set, "head")).toEqual({ x: 500, y: 200 });
    const round = roundTripLandmark(set, "head");
    expect(round.error).toBeLessThan(1e-12);
    expect(round.normalized).toEqual({ x: 0.5, y: 0.1 });
  });

  it("keeps observed and inferred landmarks distinct", () => {
    expect(observedOnly(set).map((entry) => entry.id)).toEqual(["head"]);
    expect(set.landmarks.find((entry) => entry.id === "neck")?.origin).toBe("inferred");
  });

  it("validates schema, confidence and bounds", () => {
    expect(() => validateLandmarkSet(set)).not.toThrow();
    expect(() =>
      validateLandmarkSet({
        ...set,
        landmarks: [...set.landmarks, { ...set.landmarks[0]!, id: "head" }],
      }),
    ).toThrow(AnatomicalLandmarkError);
    expect(() =>
      validateLandmarkSet({
        ...set,
        landmarks: [{ ...set.landmarks[0]!, confidence: 2 }],
      }),
    ).toThrow(/confidence/i);
    expect(() =>
      validateLandmarkSet({
        ...set,
        landmarks: [{ ...set.landmarks[0]!, x: 1.2 }],
      }),
    ).toThrow(/normalized/i);
  });

  it("computes weighted landmark error", () => {
    expect(landmarkError({ x: 1, y: 2 }, { x: 4, y: 6 }, 0.5).weighted).toBe(2.5);
  });
});
