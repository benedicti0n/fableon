import { describe, expect, it } from "vitest";

import { parseProject, type Project } from "@fableon/scene-schema";
import { SAMPLE_PROJECT } from "@fableon/scene-schema/fixtures";

import {
  buildTimeline,
  formatTimestamp,
  FrameOutOfRangeError,
  framesToSeconds,
  InvalidFrameError,
  resolveGlobalFrame,
  resolveProjectFrame,
  TimelineError,
} from "./index";

function makeProject(durations: readonly number[]): Project {
  return parseProject({
    format: "fableon.project",
    schemaVersion: 1,
    id: "timeline-test",
    title: "Timeline Test",
    frameRate: 24,
    canvas: { width: 1920, height: 1080 },
    seed: 1,
    assets: [],
    scenes: durations.map((durationFrames, index) => ({
      id: `scene-${index}`,
      name: `Scene ${index + 1}`,
      durationFrames,
      layers: [],
    })),
  });
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

describe("global timeline", () => {
  it("calculates total duration and half-open scene intervals", () => {
    const timeline = buildTimeline(makeProject([72, 96]));

    expect(timeline.totalFrames).toBe(168);
    expect(timeline.scenes).toEqual([
      {
        sceneId: "scene-0",
        sceneName: "Scene 1",
        sceneIndex: 0,
        startFrame: 0,
        endFrame: 72,
        durationFrames: 72,
      },
      {
        sceneId: "scene-1",
        sceneName: "Scene 2",
        sceneIndex: 1,
        startFrame: 72,
        endFrame: 168,
        durationFrames: 96,
      },
    ]);
  });

  it.each([
    [0, 0, 0],
    [71, 0, 71],
    [72, 1, 0],
    [167, 1, 95],
  ])(
    "resolves global frame %i to scene %i at local frame %i",
    (globalFrame, sceneIndex, localFrame) => {
      const resolution = resolveGlobalFrame(buildTimeline(makeProject([72, 96])), globalFrame);

      expect(resolution.globalFrame).toBe(globalFrame);
      expect(resolution.sceneIndex).toBe(sceneIndex);
      expect(resolution.sceneId).toBe(`scene-${sceneIndex}`);
      expect(resolution.localFrame).toBe(localFrame);
    },
  );

  it("rejects frame 168 for a 168-frame project", () => {
    const timeline = buildTimeline(makeProject([72, 96]));

    expect(() => resolveGlobalFrame(timeline, 168)).toThrow(FrameOutOfRangeError);
    try {
      resolveGlobalFrame(timeline, 168);
    } catch (error) {
      expect(error).toBeInstanceOf(FrameOutOfRangeError);
      if (error instanceof FrameOutOfRangeError) {
        expect(error.frame).toBe(168);
        expect(error.limit).toBe(168);
        expect(error.scope).toBe("project");
      }
    }
  });

  it("rejects negative and non-integer frame indices", () => {
    const timeline = buildTimeline(makeProject([72]));

    expect(() => resolveGlobalFrame(timeline, -1)).toThrow(InvalidFrameError);
    expect(() => resolveGlobalFrame(timeline, 1.5)).toThrow(InvalidFrameError);
    expect(() => resolveGlobalFrame(timeline, Number.NaN)).toThrow(InvalidFrameError);
  });

  it("resolves the canonical fixture boundaries exactly", () => {
    const timeline = buildTimeline(SAMPLE_PROJECT);

    expect(timeline.totalFrames).toBe(1152);
    expect(timeline.scenes.map((scene) => scene.startFrame)).toEqual([0, 216, 528, 840]);
    expect(timeline.scenes.map((scene) => scene.endFrame)).toEqual([216, 528, 840, 1152]);

    expect(resolveGlobalFrame(timeline, 216)).toMatchObject({
      sceneId: "glide",
      localFrame: 0,
    });
    expect(resolveGlobalFrame(timeline, 839)).toMatchObject({
      sceneId: "descent",
      localFrame: 311,
    });
    expect(resolveGlobalFrame(timeline, 840)).toMatchObject({
      sceneId: "landing",
      localFrame: 0,
    });
    expect(resolveGlobalFrame(timeline, 1151)).toMatchObject({
      sceneId: "landing",
      localFrame: 311,
    });
  });

  it("resolves directly from a project", () => {
    expect(resolveProjectFrame(SAMPLE_PROJECT, 528)).toMatchObject({
      sceneId: "descent",
      sceneIndex: 2,
      localFrame: 0,
      sceneStartFrame: 528,
      sceneEndFrame: 840,
    });
  });

  it("rejects empty and malformed timelines defensively", () => {
    const emptyProject = { ...makeProject([72]), scenes: [] } as unknown as Project;
    const zeroDurationProject = {
      ...makeProject([72]),
      scenes: [{ id: "bad", name: "Bad", durationFrames: 0, layers: [] }],
    } as unknown as Project;

    expect(() => buildTimeline(emptyProject)).toThrow(TimelineError);
    expect(() => buildTimeline(zeroDurationProject)).toThrow(TimelineError);
  });

  it("does not mutate input and is deterministic across calls", () => {
    const project = deepFreeze(makeProject([72, 96]));
    const snapshot = JSON.stringify(project);

    const first = buildTimeline(project);
    const second = buildTimeline(project);
    const firstResolution = resolveGlobalFrame(first, 100);
    const secondResolution = resolveGlobalFrame(second, 100);

    expect(firstResolution).toEqual(secondResolution);
    expect(JSON.stringify(project)).toBe(snapshot);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.scenes)).toBe(true);
  });

  it("derives deterministic display time from frames", () => {
    expect(framesToSeconds(0, 24)).toBe(0);
    expect(framesToSeconds(12, 24)).toBe(0.5);
    expect(framesToSeconds(1152, 24)).toBe(48);
    expect(formatTimestamp(0, 24)).toBe("0:00.000");
    expect(formatTimestamp(12, 24)).toBe("0:00.500");
    expect(formatTimestamp(1151, 24)).toBe("0:47.958");
    expect(formatTimestamp(1152, 24)).toBe("0:48.000");
    expect(() => framesToSeconds(1, 0)).toThrow(TimelineError);
  });
});
