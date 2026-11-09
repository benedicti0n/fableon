export type TransitionType = "cut" | "crossfade" | "fadeFromBlack" | "fadeToBlack";

export interface ShotTransition {
  readonly type: TransitionType;
  /** Number of output frames used by the transition. Must be 0 for a cut. */
  readonly frames: number;
}

export interface FilmShot {
  readonly id: string;
  readonly title: string;
  readonly startFrame: number;
  readonly frameCount: number;
  readonly sceneId: string;
  readonly renderingMethod: "local-canvas" | "deterministic";
  readonly cameraTrackId: string;
  readonly characterMotionId: string | null;
  /** Transition into this shot. A crossfade holds the previous shot's last frame. */
  readonly transitionIn: ShotTransition;
  /** Optional fade to black at the end of this shot. */
  readonly transitionOut: ShotTransition | null;
  readonly notes: string;
}

export interface TitleOverlay {
  readonly id: string;
  readonly text: string;
  readonly startFrame: number;
  /** Inclusive final frame. */
  readonly endFrame: number;
  readonly fadeInFrames: number;
  readonly fadeOutFrames: number;
  readonly x: number;
  readonly y: number;
  readonly maxWidth: number;
  readonly fontSize: number;
  readonly color: string;
  readonly align: "left" | "center" | "right";
}

export interface FilmComposition {
  readonly id: string;
  readonly title: string;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly shots: readonly FilmShot[];
  readonly titles: readonly TitleOverlay[];
}

export interface EvaluatedTitle extends TitleOverlay {
  readonly opacity: number;
}

export interface CompositionFrame {
  readonly globalFrame: number;
  readonly shot: FilmShot;
  readonly shotIndex: number;
  readonly localFrame: number;
  readonly previousShot: FilmShot | null;
  readonly previousLocalFrame: number | null;
  readonly incomingOpacity: number;
  readonly previousOpacity: number;
  readonly blackOpacity: number;
  readonly titles: readonly EvaluatedTitle[];
}

export class CompositionError extends Error {
  override readonly name = "CompositionError";
}

export function totalFrames(composition: FilmComposition): number {
  const last = composition.shots.at(-1);
  return last ? last.startFrame + last.frameCount : 0;
}

export function frameToSeconds(frame: number, fps: number): number {
  return frame / fps;
}

export function validateComposition(composition: FilmComposition): void {
  if (!Number.isInteger(composition.fps) || composition.fps <= 0) {
    throw new CompositionError("Composition fps must be a positive integer.");
  }
  if (
    !Number.isInteger(composition.width) ||
    !Number.isInteger(composition.height) ||
    composition.width <= 0 ||
    composition.height <= 0
  ) {
    throw new CompositionError("Composition dimensions must be positive integers.");
  }
  if (composition.shots.length === 0) {
    throw new CompositionError("A composition must contain at least one shot.");
  }

  let expectedStart = 0;
  const ids = new Set<string>();
  const cameraIds = new Set<string>();
  for (const shot of composition.shots) {
    if (ids.has(shot.id)) {
      throw new CompositionError(`Duplicate shot ID "${shot.id}".`);
    }
    ids.add(shot.id);
    if (shot.startFrame !== expectedStart) {
      throw new CompositionError(
        `Shot "${shot.id}" starts at ${shot.startFrame}; expected ${expectedStart}. Shots must be contiguous.`,
      );
    }
    if (!Number.isInteger(shot.frameCount) || shot.frameCount <= 0) {
      throw new CompositionError(`Shot "${shot.id}" must have a positive integer frame count.`);
    }
    if (shot.cameraTrackId.trim().length === 0) {
      throw new CompositionError(`Shot "${shot.id}" must reference a camera track.`);
    }
    cameraIds.add(shot.cameraTrackId);
    if (shot.transitionIn.type === "fadeToBlack") {
      throw new CompositionError(
        `Shot "${shot.id}" transitionIn must be cut, crossfade, or fadeFromBlack.`,
      );
    }
    validateTransition(shot.transitionIn, `shot ${shot.id} transitionIn`, shot.frameCount);
    if (shot.transitionOut) {
      if (shot.transitionOut.type !== "fadeToBlack") {
        throw new CompositionError(
          `Shot "${shot.id}" transitionOut must be fadeToBlack when provided.`,
        );
      }
      validateTransition(shot.transitionOut, `shot ${shot.id} transitionOut`, shot.frameCount);
    }
    expectedStart += shot.frameCount;
  }

  const endFrame = totalFrames(composition);
  for (const title of composition.titles) {
    if (title.startFrame < 0 || title.endFrame >= endFrame || title.endFrame < title.startFrame) {
      throw new CompositionError(`Title "${title.id}" is outside the composition timeline.`);
    }
    if (title.fadeInFrames < 0 || title.fadeOutFrames < 0) {
      throw new CompositionError(`Title "${title.id}" has invalid fade frames.`);
    }
  }
}

function validateTransition(
  transition: ShotTransition,
  path: string,
  shotFrameCount: number,
): void {
  if (!Number.isInteger(transition.frames) || transition.frames < 0) {
    throw new CompositionError(`${path} must have a non-negative integer frame count.`);
  }
  if (transition.frames > shotFrameCount) {
    throw new CompositionError(`${path} cannot exceed the shot duration.`);
  }
  if (transition.type === "cut" && transition.frames !== 0) {
    throw new CompositionError(`${path} must use 0 frames for a cut.`);
  }
  if (
    (transition.type === "crossfade" || transition.type === "fadeFromBlack") &&
    transition.frames === 0
  ) {
    throw new CompositionError(`${path} requires at least one frame.`);
  }
}

export function shotAtFrame(
  composition: FilmComposition,
  globalFrame: number,
): { readonly shot: FilmShot; readonly index: number; readonly localFrame: number } {
  const shotIndex = composition.shots.findIndex(
    (shot) => globalFrame >= shot.startFrame && globalFrame < shot.startFrame + shot.frameCount,
  );
  const shot = composition.shots[shotIndex];
  if (!shot) {
    throw new CompositionError(
      `Frame ${globalFrame} is outside the composition range 0..${totalFrames(composition) - 1}.`,
    );
  }
  return { shot, index: shotIndex, localFrame: globalFrame - shot.startFrame };
}

function transitionProgress(localFrame: number, frames: number): number {
  if (frames <= 1) return 1;
  return Math.min(Math.max(localFrame / (frames - 1), 0), 1);
}

function evaluateTitles(
  composition: FilmComposition,
  globalFrame: number,
): readonly EvaluatedTitle[] {
  const active: EvaluatedTitle[] = [];
  for (const title of composition.titles) {
    if (globalFrame < title.startFrame || globalFrame > title.endFrame) continue;
    const fadeIn =
      title.fadeInFrames <= 0
        ? 1
        : Math.min((globalFrame - title.startFrame + 1) / title.fadeInFrames, 1);
    const fadeOut =
      title.fadeOutFrames <= 0
        ? 1
        : Math.min((title.endFrame - globalFrame + 1) / title.fadeOutFrames, 1);
    active.push({ ...title, opacity: Math.min(fadeIn, fadeOut, 1) });
  }
  return active;
}

export function evaluateCompositionFrame(
  composition: FilmComposition,
  globalFrame: number,
): CompositionFrame {
  validateComposition(composition);
  if (!Number.isInteger(globalFrame) || globalFrame < 0) {
    throw new CompositionError("Global frame must be a non-negative integer.");
  }
  const endFrame = totalFrames(composition);
  if (globalFrame >= endFrame) {
    throw new CompositionError(
      `Global frame ${globalFrame} exceeds the composition range 0..${endFrame - 1}.`,
    );
  }

  const { shot, index, localFrame } = shotAtFrame(composition, globalFrame);
  const previousShot = index > 0 ? (composition.shots[index - 1] ?? null) : null;

  let incomingOpacity = 1;
  let previousOpacity = 0;
  let blackOpacity = 0;

  if (shot.transitionIn.type !== "cut" && localFrame < shot.transitionIn.frames) {
    const progress = transitionProgress(localFrame, shot.transitionIn.frames);
    if (shot.transitionIn.type === "crossfade") {
      incomingOpacity = progress;
      previousOpacity = 1 - progress;
    } else {
      incomingOpacity = progress;
      blackOpacity = 1 - progress;
    }
  }

  if (shot.transitionOut?.type === "fadeToBlack" && shot.transitionOut.frames > 0) {
    const fadeStart = shot.frameCount - shot.transitionOut.frames;
    if (localFrame >= fadeStart) {
      const fadeFrame = localFrame - fadeStart;
      const progress =
        shot.transitionOut.frames <= 1 ? 1 : fadeFrame / (shot.transitionOut.frames - 1);
      blackOpacity = Math.max(blackOpacity, Math.min(Math.max(progress, 0), 1));
    }
  }

  return {
    globalFrame,
    shot,
    shotIndex: index,
    localFrame,
    previousShot,
    previousLocalFrame: previousShot === null ? null : previousShot.frameCount - 1,
    incomingOpacity,
    previousOpacity,
    blackOpacity,
    titles: evaluateTitles(composition, globalFrame),
  };
}
