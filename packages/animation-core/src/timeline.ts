import type { Project } from "@fableon/scene-schema";

/**
 * Scene timing on the global project timeline. Intervals are half-open:
 * [startFrame, endFrame). A 72-frame scene starting at frame 0 contains local
 * frames 0..71 and ends at frame 72.
 */
export interface SceneTiming {
  readonly sceneId: string;
  readonly sceneName: string;
  readonly sceneIndex: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly durationFrames: number;
}

export interface Timeline {
  readonly frameRate: number;
  readonly totalFrames: number;
  readonly scenes: readonly SceneTiming[];
}

export interface ResolvedFrame {
  readonly globalFrame: number;
  readonly sceneId: string;
  readonly sceneName: string;
  readonly sceneIndex: number;
  readonly localFrame: number;
  readonly sceneStartFrame: number;
  readonly sceneEndFrame: number;
}

export type FrameRangeScope = "project" | "scene";

export class TimelineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineError";
  }
}

export class InvalidFrameError extends Error {
  readonly frame: number;

  constructor(frame: number) {
    super(`Frame must be a non-negative integer; received ${frame}.`);
    this.name = "InvalidFrameError";
    this.frame = frame;
  }
}

export class FrameOutOfRangeError extends Error {
  readonly frame: number;
  readonly limit: number;
  readonly scope: FrameRangeScope;

  constructor(frame: number, limit: number, scope: FrameRangeScope = "project") {
    super(`Frame ${frame} is outside the valid ${scope} range 0..${Math.max(limit - 1, 0)}.`);
    this.name = "FrameOutOfRangeError";
    this.frame = frame;
    this.limit = limit;
    this.scope = scope;
  }
}

function assertFrameIndex(frame: number): void {
  if (!Number.isInteger(frame) || frame < 0) {
    throw new InvalidFrameError(frame);
  }
}

/**
 * Builds a deterministic timeline from a validated project. Scene durations are
 * summed in declared order; no per-frame array is allocated.
 */
export function buildTimeline(project: Project): Timeline {
  if (project.scenes.length === 0) {
    throw new TimelineError("A project must contain at least one scene.");
  }

  let startFrame = 0;
  const scenes: SceneTiming[] = project.scenes.map((scene, sceneIndex) => {
    if (!Number.isSafeInteger(scene.durationFrames) || scene.durationFrames <= 0) {
      throw new TimelineError(
        `Scene "${scene.id}" has an invalid durationFrames value: ${scene.durationFrames}.`,
      );
    }

    const endFrame = startFrame + scene.durationFrames;
    if (!Number.isSafeInteger(endFrame)) {
      throw new TimelineError(
        `Timeline exceeds the safe integer frame range at scene "${scene.id}".`,
      );
    }

    const timing = Object.freeze({
      sceneId: scene.id,
      sceneName: scene.name,
      sceneIndex,
      startFrame,
      endFrame,
      durationFrames: scene.durationFrames,
    });

    startFrame = endFrame;
    return timing;
  });

  if (startFrame <= 0) {
    throw new TimelineError("A project timeline must contain at least one frame.");
  }

  return Object.freeze({
    frameRate: project.frameRate,
    totalFrames: startFrame,
    scenes: Object.freeze(scenes),
  });
}

/**
 * Resolves a global project frame to its half-open scene interval and local
 * frame. Out-of-range and malformed indices throw typed errors rather than
 * clamping silently.
 */
export function resolveGlobalFrame(timeline: Timeline, globalFrame: number): ResolvedFrame {
  assertFrameIndex(globalFrame);

  if (globalFrame >= timeline.totalFrames) {
    throw new FrameOutOfRangeError(globalFrame, timeline.totalFrames, "project");
  }

  for (const scene of timeline.scenes) {
    if (globalFrame >= scene.startFrame && globalFrame < scene.endFrame) {
      return Object.freeze({
        globalFrame,
        sceneId: scene.sceneId,
        sceneName: scene.sceneName,
        sceneIndex: scene.sceneIndex,
        localFrame: globalFrame - scene.startFrame,
        sceneStartFrame: scene.startFrame,
        sceneEndFrame: scene.endFrame,
      });
    }
  }

  throw new TimelineError(`Timeline has no scene covering global frame ${globalFrame}.`);
}

/** Resolves a global frame directly from a project. */
export function resolveProjectFrame(project: Project, globalFrame: number): ResolvedFrame {
  return resolveGlobalFrame(buildTimeline(project), globalFrame);
}

/** Converts an integer frame index to seconds using the declared frame rate. */
export function framesToSeconds(frame: number, frameRate: number): number {
  assertFrameIndex(frame);

  if (!Number.isFinite(frameRate) || frameRate <= 0) {
    throw new TimelineError(`Frame rate must be a positive finite number; received ${frameRate}.`);
  }

  return frame / frameRate;
}

/**
 * Formats a frame as m:ss.sss for display. Formatting is plain string math and
 * does not consult the locale or wall clock.
 */
export function formatTimestamp(frame: number, frameRate: number): string {
  const totalMilliseconds = Math.round(framesToSeconds(frame, frameRate) * 1000);
  const minutes = Math.floor(totalMilliseconds / 60_000);
  const seconds = (totalMilliseconds % 60_000) / 1000;

  return `${minutes}:${seconds.toFixed(3).padStart(6, "0")}`;
}
