import { describe, expect, it } from "vitest";

import {
  createAnimationTrack,
  createKeyframe,
  createTransform,
  deserializeProject,
  parseProject,
  serializeProject,
  type Keyframe,
  type Project,
} from "@fableon/scene-schema";
import { SAMPLE_PROJECT } from "@fableon/scene-schema/fixtures";

import {
  easeInOutCubic,
  evaluateKeyframeTrack,
  evaluateProjectFrame,
  evaluateSceneFrame,
  FrameOutOfRangeError,
} from "./index";

type JsonRecord = Record<string, unknown>;

function solidLayer(overrides: JsonRecord = {}): JsonRecord {
  return {
    id: "layer-a",
    type: "solid",
    name: "Solid layer",
    visible: true,
    order: 0,
    transform: createTransform(),
    color: "#102018",
    ...overrides,
  };
}

function makeProject(layers: readonly JsonRecord[], durationFrames = 25): Project {
  return parseProject({
    format: "fableon.project",
    schemaVersion: 1,
    id: "evaluation-test",
    title: "Evaluation Test",
    frameRate: 24,
    canvas: { width: 1920, height: 1080 },
    seed: 99,
    assets: [{ id: "bird-asset", type: "image", name: "Bird", path: "assets/bird.png" }],
    scenes: [
      {
        id: "scene-a",
        name: "Evaluation Scene",
        durationFrames,
        layers,
      },
    ],
  });
}

function track(keyframes: readonly Keyframe[]) {
  return createAnimationTrack(keyframes);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }

  return value;
}

describe("keyframe interpolation", () => {
  it("evaluates linear movement exactly at the midpoint", () => {
    const project = makeProject([
      solidLayer({
        animation: {
          x: track([createKeyframe(0, 0), createKeyframe(24, 240)]),
        },
      }),
    ]);

    expect(evaluateProjectFrame(project, 12).layers[0]?.transform.x).toBe(120);
  });

  it("evaluates frame 0 and the final valid frame", () => {
    const project = makeProject([
      solidLayer({
        animation: {
          x: track([createKeyframe(0, 0), createKeyframe(24, 240)]),
        },
      }),
    ]);

    expect(evaluateProjectFrame(project, 0)).toMatchObject({
      globalFrame: 0,
      sceneId: "scene-a",
      localFrame: 0,
    });
    expect(evaluateProjectFrame(project, 0).layers[0]?.transform.x).toBe(0);
    expect(evaluateProjectFrame(project, 24).layers[0]?.transform.x).toBe(240);
  });

  it("returns exact keyframe values at keyframe frames", () => {
    const project = makeProject([
      solidLayer({
        animation: {
          x: track([createKeyframe(0, 0), createKeyframe(12, 100), createKeyframe(24, 240)]),
        },
      }),
    ]);

    expect(evaluateProjectFrame(project, 12).layers[0]?.transform.x).toBe(100);
  });

  it("holds the left keyframe value through a hold segment", () => {
    const project = makeProject([
      solidLayer({
        animation: {
          x: track([createKeyframe(0, 0, "hold"), createKeyframe(24, 240, "linear")]),
        },
      }),
    ]);

    expect(evaluateProjectFrame(project, 12).layers[0]?.transform.x).toBe(0);
    expect(evaluateProjectFrame(project, 24).layers[0]?.transform.x).toBe(240);
  });

  it("applies cubic easing with documented endpoints and midpoint", () => {
    const project = makeProject([
      solidLayer({
        animation: {
          x: track([createKeyframe(0, 0, "easeInOutCubic"), createKeyframe(24, 240, "linear")]),
        },
      }),
    ]);

    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625, 10);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(0.75)).toBeCloseTo(0.9375, 10);
    expect(easeInOutCubic(1)).toBe(1);

    expect(evaluateProjectFrame(project, 6).layers[0]?.transform.x).toBeCloseTo(15, 10);
    expect(evaluateProjectFrame(project, 12).layers[0]?.transform.x).toBeCloseTo(120, 10);
    expect(evaluateProjectFrame(project, 18).layers[0]?.transform.x).toBeCloseTo(225, 10);
  });

  it("holds the first value before the first keyframe and the last value after the last", () => {
    const project = makeProject(
      [
        solidLayer({
          animation: {
            x: track([createKeyframe(12, 100, "linear"), createKeyframe(24, 200, "linear")]),
          },
        }),
      ],
      30,
    );

    expect(evaluateProjectFrame(project, 0).layers[0]?.transform.x).toBe(100);
    expect(evaluateProjectFrame(project, 28).layers[0]?.transform.x).toBe(200);
  });

  it("evaluates a single-keyframe track as a constant", () => {
    const project = makeProject(
      [
        solidLayer({
          animation: {
            x: track([createKeyframe(8, 42)]),
          },
        }),
      ],
      30,
    );

    expect(evaluateProjectFrame(project, 0).layers[0]?.transform.x).toBe(42);
    expect(evaluateProjectFrame(project, 8).layers[0]?.transform.x).toBe(42);
    expect(evaluateProjectFrame(project, 29).layers[0]?.transform.x).toBe(42);
  });

  it("evaluates multiple animated properties simultaneously", () => {
    const project = makeProject([
      solidLayer({
        animation: {
          x: track([createKeyframe(0, 0), createKeyframe(24, 100)]),
          y: track([createKeyframe(0, 0), createKeyframe(24, 200)]),
          scaleX: track([createKeyframe(0, 1), createKeyframe(24, 2)]),
          scaleY: track([createKeyframe(0, 1), createKeyframe(24, 0.5)]),
          rotation: track([createKeyframe(0, 0), createKeyframe(24, 90)]),
          opacity: track([createKeyframe(0, 0.2), createKeyframe(24, 1)]),
        },
      }),
    ]);

    const transform = evaluateProjectFrame(project, 12).layers[0]?.transform;

    expect(transform?.x).toBe(50);
    expect(transform?.y).toBe(100);
    expect(transform?.scaleX).toBe(1.5);
    expect(transform?.scaleY).toBe(0.75);
    expect(transform?.rotation).toBe(45);
    expect(transform?.opacity).toBeCloseTo(0.6, 10);
  });

  it("keeps unanimated properties at their base transform", () => {
    const base = createTransform({ x: 11, y: 22, opacity: 0.75 });
    const project = makeProject([
      solidLayer({
        transform: base,
        animation: {
          x: track([createKeyframe(0, 50), createKeyframe(24, 100)]),
        },
      }),
    ]);

    expect(evaluateProjectFrame(project, 12).layers[0]?.transform).toEqual({
      ...base,
      x: 75,
    });
  });

  it("rejects negative or non-integer track evaluation frames", () => {
    expect(() =>
      evaluateKeyframeTrack(track([createKeyframe(0, 0), createKeyframe(24, 24)]), -1),
    ).toThrow();
    expect(() =>
      evaluateKeyframeTrack(track([createKeyframe(0, 0), createKeyframe(24, 24)]), 1.5),
    ).toThrow();
  });
});

describe("frame plan evaluation", () => {
  it("returns layers in ascending stacking order and preserves visibility", () => {
    const project = makeProject([
      solidLayer({ id: "top", name: "Top", order: 20 }),
      solidLayer({ id: "bottom", name: "Bottom", order: 0, visible: false }),
      solidLayer({ id: "middle", name: "Middle", order: 10 }),
    ]);

    const plan = evaluateProjectFrame(project, 0);

    expect(plan.layers.map((layer) => layer.id)).toEqual(["bottom", "middle", "top"]);
    expect(plan.layers.map((layer) => layer.visible)).toEqual([false, true, true]);
  });

  it("returns renderer-independent content for each layer type", () => {
    const project = makeProject([
      solidLayer({ id: "solid", order: 0, color: "#112233" }),
      {
        id: "asset",
        type: "asset",
        name: "Bird asset",
        visible: true,
        order: 10,
        transform: createTransform(),
        assetId: "bird-asset",
      },
      {
        id: "text",
        type: "text",
        name: "Title",
        visible: true,
        order: 20,
        transform: createTransform({ x: 100 }),
        text: "A painted title",
        fontFamily: "Georgia, serif",
        fontSize: 64,
        color: "#f5e6c6",
      },
    ]);

    const plan = evaluateProjectFrame(project, 0);

    expect(plan.layers[0]?.content).toEqual({ type: "solid", color: "#112233" });
    expect(plan.layers[1]?.content).toEqual({ type: "asset", assetId: "bird-asset" });
    expect(plan.layers[2]?.content).toEqual({
      type: "text",
      text: "A painted title",
      fontFamily: "Georgia, serif",
      fontSize: 64,
      color: "#f5e6c6",
    });
    expect(JSON.stringify(plan)).not.toContain("animation");
  });

  it("resolves scene transitions across the canonical fixture", () => {
    expect(evaluateProjectFrame(SAMPLE_PROJECT, 215)).toMatchObject({
      sceneId: "dawn",
      localFrame: 215,
    });
    expect(evaluateProjectFrame(SAMPLE_PROJECT, 216)).toMatchObject({
      sceneId: "glide",
      localFrame: 0,
    });
    expect(evaluateProjectFrame(SAMPLE_PROJECT, 527)).toMatchObject({
      sceneId: "glide",
      localFrame: 311,
    });
    expect(evaluateProjectFrame(SAMPLE_PROJECT, 528)).toMatchObject({
      sceneId: "descent",
      localFrame: 0,
    });
    expect(evaluateProjectFrame(SAMPLE_PROJECT, 1151)).toMatchObject({
      sceneId: "landing",
      localFrame: 311,
      frameRate: 24,
    });
  });

  it("evaluates fixture values at meaningful frames", () => {
    const dawn = evaluateProjectFrame(SAMPLE_PROJECT, 0);
    const dawnBird = dawn.layers.find((layer) => layer.id === "dawn-bird");

    expect(dawnBird?.transform).toMatchObject({
      x: 420,
      y: 250,
      scaleX: 0.32,
      rotation: -7,
      opacity: 0.9,
    });

    const landing = evaluateProjectFrame(SAMPLE_PROJECT, 1151);
    const title = landing.layers.find((layer) => layer.id === "end-title");

    expect(title?.transform.opacity).toBe(1);
    expect(landing.layers.map((layer) => layer.order)).toEqual([0, 10, 20, 30]);
  });

  it("rejects project and scene frames outside their valid ranges", () => {
    expect(() => evaluateProjectFrame(SAMPLE_PROJECT, 1152)).toThrow(FrameOutOfRangeError);

    const scene = SAMPLE_PROJECT.scenes[0];
    expect(scene).toBeDefined();
    if (scene) {
      expect(() => evaluateSceneFrame(scene, scene.durationFrames)).toThrow(FrameOutOfRangeError);
    }
  });

  it("is deterministic, immutable, and survives a JSON round trip", () => {
    const project = deepFreeze(SAMPLE_PROJECT);
    const snapshot = JSON.stringify(project);

    const first = evaluateProjectFrame(project, 300);
    const second = evaluateProjectFrame(project, 300);

    expect(second).toEqual(first);
    expect(JSON.stringify(project)).toBe(snapshot);

    const roundTripped = deserializeProject(serializeProject(project));
    expect(evaluateProjectFrame(roundTripped, 300)).toEqual(first);
    expect(evaluateProjectFrame(roundTripped, 900)).toEqual(evaluateProjectFrame(project, 900));
  });
});
