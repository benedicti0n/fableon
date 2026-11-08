import { describe, expect, it } from "vitest";

import {
  createAnimationTrack,
  createKeyframe,
  createTransform,
  DEFAULT_TRANSFORM,
  PROJECT_FORMAT,
  PROJECT_SCHEMA_VERSION,
  ProjectValidationError,
  parseProject,
  validateProject,
  type Project,
} from "./index";

type JsonRecord = Record<string, unknown>;

function validAsset(overrides: JsonRecord = {}): JsonRecord {
  return {
    id: "bird-asset",
    type: "image",
    name: "Bird reference",
    path: "assets/bird.png",
    ...overrides,
  };
}

function validSolidLayer(overrides: JsonRecord = {}): JsonRecord {
  return {
    id: "background",
    type: "solid",
    name: "Background",
    visible: true,
    order: 0,
    transform: createTransform(),
    color: "#102018",
    ...overrides,
  };
}

function validAssetLayer(overrides: JsonRecord = {}): JsonRecord {
  return {
    id: "bird",
    type: "asset",
    name: "Bird",
    visible: true,
    order: 10,
    transform: createTransform({ x: 100, y: 200, scaleX: 0.5, scaleY: 0.5, rotation: 5 }),
    assetId: "bird-asset",
    ...overrides,
  };
}

function validScene(overrides: JsonRecord = {}): JsonRecord {
  return {
    id: "scene-a",
    name: "Scene A",
    durationFrames: 72,
    layers: [validSolidLayer(), validAssetLayer()],
    ...overrides,
  };
}

function validProject(overrides: JsonRecord = {}): JsonRecord {
  return {
    format: PROJECT_FORMAT,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: "project-a",
    title: "A Painted Test",
    frameRate: 24,
    canvas: { width: 1920, height: 1080 },
    seed: 7,
    assets: [
      validAsset(),
      validAsset({ id: "ambience", type: "audio", path: "audio/ambience.mp3" }),
    ],
    scenes: [validScene()],
    ...overrides,
  };
}

function track(frames: number[]): JsonRecord {
  return {
    keyframes: frames.map((frame) => createKeyframe(frame, frame * 2)),
  };
}

describe("versioned project schema", () => {
  it("parses a valid project and exposes inferred types", () => {
    const project = parseProject(validProject());
    const typedProject: Project = project;

    expect(typedProject.schemaVersion).toBe(1);
    expect(typedProject.frameRate).toBe(24);
    expect(typedProject.canvas).toEqual({ width: 1920, height: 1080 });
    expect(typedProject.scenes[0]?.id).toBe("scene-a");
    expect(typedProject.scenes[0]?.layers[1]).toMatchObject({
      type: "asset",
      assetId: "bird-asset",
      order: 10,
    });
  });

  it("accepts text, solid, and asset layers", () => {
    const scene = validScene({
      layers: [
        validSolidLayer(),
        validAssetLayer(),
        {
          id: "title",
          type: "text",
          name: "Title",
          visible: true,
          order: 20,
          transform: createTransform({ x: 960, y: 120 }),
          text: "Where the Light Lands",
          fontFamily: "Georgia, serif",
          fontSize: 64,
          color: "#f5e6c6",
        },
      ],
    });

    expect(validateProject(validProject({ scenes: [scene] })).success).toBe(true);
  });

  it("rejects unsupported schema versions with a clear issue", () => {
    const result = validateProject(validProject({ schemaVersion: 2 }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        path: "$.schemaVersion",
        code: "unsupported_schema_version",
      });
      expect(result.error.message).toContain("supports version 1");
    }
  });

  it("rejects malformed root structures and unknown keys", () => {
    expect(validateProject(null).success).toBe(false);
    expect(validateProject({ ...validProject(), unexpected: true }).success).toBe(false);
    expect(validateProject(validProject({ format: "other-project" })).success).toBe(false);
  });

  it("rejects empty scenes and invalid durations", () => {
    expect(validateProject(validProject({ scenes: [] })).success).toBe(false);
    expect(
      validateProject(validProject({ scenes: [validScene({ durationFrames: 0 })] })).success,
    ).toBe(false);
    expect(
      validateProject(validProject({ scenes: [validScene({ durationFrames: 1.5 })] })).success,
    ).toBe(false);
  });

  it("rejects duplicate scene, asset, layer, and stacking-order IDs", () => {
    const duplicateScene = validScene({ name: "Scene B" });
    const duplicateLayer = validSolidLayer();
    const duplicateOrder = validSolidLayer({ id: "second", order: 0 });
    const duplicateAsset = validAsset({ path: "assets/other.png" });

    expect(validateProject(validProject({ scenes: [validScene(), duplicateScene] })).success).toBe(
      false,
    );
    expect(validateProject(validProject({ assets: [validAsset(), duplicateAsset] })).success).toBe(
      false,
    );
    expect(
      validateProject(
        validProject({ scenes: [validScene({ layers: [validSolidLayer(), duplicateLayer] })] }),
      ).success,
    ).toBe(false);
    expect(
      validateProject(
        validProject({ scenes: [validScene({ layers: [validSolidLayer(), duplicateOrder] })] }),
      ).success,
    ).toBe(false);
  });

  it("rejects broken assets and audio assets used as visual layers", () => {
    const broken = validScene({
      layers: [validAssetLayer({ assetId: "missing" })],
    });
    const audio = validScene({
      layers: [validAssetLayer({ assetId: "ambience" })],
    });

    expect(validateProject(validProject({ scenes: [broken] })).success).toBe(false);
    expect(validateProject(validProject({ scenes: [audio] })).success).toBe(false);
  });

  it("rejects unsafe asset paths", () => {
    for (const path of [
      "/absolute/bird.png",
      "assets/../bird.png",
      "https://example.com/bird.png",
      "assets\\bird.png",
      "assets/bird.png?cache=1",
      "",
    ]) {
      expect(validateProject(validProject({ assets: [validAsset({ path })] })).success).toBe(false);
    }
  });

  it("rejects invalid transform values with an actionable path", () => {
    const invalid = validProject({
      scenes: [
        validScene({
          layers: [
            validSolidLayer({
              transform: { ...createTransform(), opacity: 1.2 },
            }),
          ],
        }),
      ],
    });
    const result = validateProject(invalid);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path === "$.scenes[0].layers[0].transform.opacity",
        ),
      ).toBe(true);
    }
    expect(() => createTransform({ opacity: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => createTransform({ x: Number.NaN })).toThrow();
  });

  it("rejects duplicate, unsorted, and out-of-range keyframes", () => {
    const duplicate = validScene({
      layers: [
        validAssetLayer({
          animation: {
            x: {
              keyframes: [createKeyframe(0, 0), createKeyframe(0, 100)],
            },
          },
        }),
      ],
    });
    const unsorted = validScene({
      layers: [
        validAssetLayer({
          animation: {
            x: {
              keyframes: [createKeyframe(24, 240), createKeyframe(12, 120)],
            },
          },
        }),
      ],
    });
    const outOfRange = validScene({
      durationFrames: 48,
      layers: [
        validAssetLayer({
          animation: {
            x: { keyframes: [createKeyframe(48, 480)] },
          },
        }),
      ],
    });

    expect(validateProject(validProject({ scenes: [duplicate] })).success).toBe(false);
    expect(validateProject(validProject({ scenes: [unsorted] })).success).toBe(false);
    expect(validateProject(validProject({ scenes: [outOfRange] })).success).toBe(false);
  });

  it("rejects invalid animation property names and opacity values", () => {
    const invalidProperty = validScene({
      layers: [
        validAssetLayer({
          animation: {
            blur: track([0, 12]),
          },
        }),
      ],
    });
    const invalidOpacity = validScene({
      layers: [
        validAssetLayer({
          animation: {
            opacity: {
              keyframes: [createKeyframe(0, 0), createKeyframe(12, 2)],
            },
          },
        }),
      ],
    });

    expect(validateProject(validProject({ scenes: [invalidProperty] })).success).toBe(false);
    expect(validateProject(validProject({ scenes: [invalidOpacity] })).success).toBe(false);
  });

  it("throws a ProjectValidationError from parseProject", () => {
    expect(() => parseProject(validProject({ id: "not a valid id!" }))).toThrow(
      ProjectValidationError,
    );
  });
});

describe("construction helpers", () => {
  it("builds a complete transform from explicit defaults", () => {
    expect(createTransform()).toEqual(DEFAULT_TRANSFORM);
    expect(createTransform({ x: 40, opacity: 0.5 })).toEqual({
      ...DEFAULT_TRANSFORM,
      x: 40,
      opacity: 0.5,
    });
  });

  it("creates keyframes and ordered tracks without repairing invalid input", () => {
    expect(createKeyframe(0, 10)).toEqual({
      frame: 0,
      value: 10,
      interpolation: "linear",
    });
    expect(createAnimationTrack([createKeyframe(0, 0), createKeyframe(24, 240)])).toEqual({
      keyframes: [
        { frame: 0, value: 0, interpolation: "linear" },
        { frame: 24, value: 240, interpolation: "linear" },
      ],
    });
    expect(() => createAnimationTrack([createKeyframe(24, 240), createKeyframe(0, 0)])).toThrow();
    expect(() => createAnimationTrack([createKeyframe(0, 0), createKeyframe(0, 10)])).toThrow();
  });
});
