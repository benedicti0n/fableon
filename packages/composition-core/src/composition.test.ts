import { describe, expect, it } from "vitest";

import {
  CompositionError,
  evaluateCompositionFrame,
  shotAtFrame,
  totalFrames,
  validateComposition,
  type FilmComposition,
} from "./index";

const COMPOSITION: FilmComposition = {
  id: "test-film",
  title: "Test Film",
  fps: 24,
  width: 1920,
  height: 1080,
  seed: 20261110,
  shots: [
    {
      id: "shot-1",
      title: "Awakening Forest",
      startFrame: 0,
      frameCount: 144,
      sceneId: "forest",
      renderingMethod: "local-canvas",
      cameraTrackId: "camera-1",
      characterMotionId: null,
      transitionIn: { type: "fadeFromBlack", frames: 12 },
      transitionOut: null,
      notes: "",
    },
    {
      id: "shot-2",
      title: "Little Bird in Flight",
      startFrame: 144,
      frameCount: 216,
      sceneId: "flight",
      renderingMethod: "local-canvas",
      cameraTrackId: "camera-2",
      characterMotionId: "flight",
      transitionIn: { type: "crossfade", frames: 12 },
      transitionOut: null,
      notes: "",
    },
    {
      id: "shot-3",
      title: "The Landing",
      startFrame: 360,
      frameCount: 168,
      sceneId: "landing",
      renderingMethod: "local-canvas",
      cameraTrackId: "camera-3",
      characterMotionId: "landing",
      transitionIn: { type: "crossfade", frames: 12 },
      transitionOut: null,
      notes: "",
    },
    {
      id: "shot-4",
      title: "A Place to Rest",
      startFrame: 528,
      frameCount: 192,
      sceneId: "rest",
      renderingMethod: "local-canvas",
      cameraTrackId: "camera-4",
      characterMotionId: "idle",
      transitionIn: { type: "crossfade", frames: 12 },
      transitionOut: { type: "fadeToBlack", frames: 24 },
      notes: "",
    },
  ],
  titles: [
    {
      id: "opening",
      text: "Where the Light Lands",
      startFrame: 24,
      endFrame: 108,
      fadeInFrames: 18,
      fadeOutFrames: 18,
      x: 960,
      y: 260,
      maxWidth: 700,
      fontSize: 64,
      color: "#f8f5ed",
      align: "center",
    },
    {
      id: "ending",
      text: "Sometimes, the smallest journeys lead us home.",
      startFrame: 600,
      endFrame: 688,
      fadeInFrames: 18,
      fadeOutFrames: 18,
      x: 960,
      y: 860,
      maxWidth: 900,
      fontSize: 38,
      color: "#f8f5ed",
      align: "center",
    },
  ],
};

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

describe("composition timeline", () => {
  it("calculates exactly 720 frames and maps every required boundary", () => {
    expect(totalFrames(COMPOSITION)).toBe(720);
    const boundaries = [
      [0, "shot-1", 0],
      [143, "shot-1", 143],
      [144, "shot-2", 0],
      [359, "shot-2", 215],
      [360, "shot-3", 0],
      [527, "shot-3", 167],
      [528, "shot-4", 0],
      [719, "shot-4", 191],
    ] as const;
    for (const [frame, shotId, localFrame] of boundaries) {
      const evaluated = evaluateCompositionFrame(COMPOSITION, frame);
      expect(evaluated.shot.id).toBe(shotId);
      expect(evaluated.localFrame).toBe(localFrame);
    }
  });

  it("resolves shot lookup and rejects invalid frames", () => {
    expect(shotAtFrame(COMPOSITION, 143).shot.id).toBe("shot-1");
    expect(shotAtFrame(COMPOSITION, 144).shot.id).toBe("shot-2");
    expect(() => evaluateCompositionFrame(COMPOSITION, -1)).toThrow(CompositionError);
    expect(() => evaluateCompositionFrame(COMPOSITION, 720)).toThrow(CompositionError);
    expect(() => evaluateCompositionFrame(COMPOSITION, 1.5)).toThrow(CompositionError);
  });

  it("evaluates deterministic and immutable output", () => {
    const frozen = deepFreeze(COMPOSITION);
    const before = JSON.stringify(frozen);
    const first = evaluateCompositionFrame(frozen, 240);
    const second = evaluateCompositionFrame(frozen, 240);
    expect(second).toEqual(first);
    expect(JSON.stringify(frozen)).toBe(before);
  });

  it("holds the previous shot during a crossfade without changing total duration", () => {
    const start = evaluateCompositionFrame(COMPOSITION, 144);
    expect(start.shot.id).toBe("shot-2");
    expect(start.previousShot?.id).toBe("shot-1");
    expect(start.previousLocalFrame).toBe(143);
    expect(start.incomingOpacity).toBe(0);
    expect(start.previousOpacity).toBe(1);

    const middle = evaluateCompositionFrame(COMPOSITION, 149);
    expect(middle.incomingOpacity).toBeCloseTo(5 / 11, 8);
    expect(middle.previousOpacity).toBeCloseTo(6 / 11, 8);

    const end = evaluateCompositionFrame(COMPOSITION, 155);
    expect(end.incomingOpacity).toBe(1);
    expect(end.previousOpacity).toBe(0);
  });

  it("fades from black at the opening and to black at the ending", () => {
    const first = evaluateCompositionFrame(COMPOSITION, 0);
    expect(first.blackOpacity).toBe(1);
    const last = evaluateCompositionFrame(COMPOSITION, 719);
    expect(last.blackOpacity).toBe(1);
    const visible = evaluateCompositionFrame(COMPOSITION, 200);
    expect(visible.blackOpacity).toBe(0);
  });

  it("evaluates title visibility and fades", () => {
    const opening = evaluateCompositionFrame(COMPOSITION, 24);
    expect(opening.titles[0]?.id).toBe("opening");
    expect(opening.titles[0]?.opacity).toBeCloseTo(1 / 18, 8);
    const middle = evaluateCompositionFrame(COMPOSITION, 60);
    expect(middle.titles[0]?.opacity).toBe(1);
    const ending = evaluateCompositionFrame(COMPOSITION, 650);
    expect(ending.titles[0]?.id).toBe("ending");
  });

  it("rejects gaps, duplicate IDs, invalid transitions, and out-of-range titles", () => {
    expect(() =>
      validateComposition({
        ...COMPOSITION,
        shots: [COMPOSITION.shots[0]!, { ...COMPOSITION.shots[1]!, startFrame: 145 }],
      }),
    ).toThrow(CompositionError);

    expect(() =>
      validateComposition({
        ...COMPOSITION,
        shots: [COMPOSITION.shots[0]!, COMPOSITION.shots[0]!],
      }),
    ).toThrow(CompositionError);

    expect(() =>
      validateComposition({
        ...COMPOSITION,
        shots: [
          {
            ...COMPOSITION.shots[0]!,
            transitionIn: { type: "crossfade", frames: 0 },
          },
        ],
      }),
    ).toThrow(CompositionError);

    expect(() =>
      validateComposition({
        ...COMPOSITION,
        titles: [{ ...COMPOSITION.titles[0]!, endFrame: 800 }],
      }),
    ).toThrow(CompositionError);
  });
});
