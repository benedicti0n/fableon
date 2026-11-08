import type { AnimationTrack } from "@fableon/scene-schema";

import { InvalidFrameError } from "./timeline";

/**
 * Standard cubic ease-in-out. Values outside 0..1 are clamped for safety; the
 * evaluator only calls this with an in-range segment progress.
 */
export function easeInOutCubic(progress: number): number {
  if (progress <= 0) {
    return 0;
  }
  if (progress >= 1) {
    return 1;
  }

  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

/**
 * Evaluates a validated, strictly ordered keyframe track at a scene-local
 * frame. The interpolation mode on the left keyframe governs the segment to
 * the right keyframe. Before the first keyframe the first value holds; after
 * the last keyframe the last value holds. Exact keyframe frames return the
 * keyframe value directly.
 */
export function evaluateKeyframeTrack(track: AnimationTrack, localFrame: number): number {
  if (!Number.isInteger(localFrame) || localFrame < 0) {
    throw new InvalidFrameError(localFrame);
  }

  const keyframes = track.keyframes;
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  if (!first || !last) {
    throw new Error("Animation track must contain at least one keyframe.");
  }

  if (localFrame <= first.frame) {
    return first.value;
  }
  if (localFrame >= last.frame) {
    return last.value;
  }

  let low = 0;
  let high = keyframes.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const keyframe = keyframes[middle];

    if (!keyframe) {
      break;
    }
    if (keyframe.frame === localFrame) {
      return keyframe.value;
    }
    if (keyframe.frame < localFrame) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const left = keyframes[low - 1];
  const right = keyframes[low];

  if (!left || !right || right.frame <= left.frame) {
    throw new Error("Animation track keyframes must be strictly increasing.");
  }

  if (left.interpolation === "hold") {
    return left.value;
  }

  const progress = (localFrame - left.frame) / (right.frame - left.frame);
  const eased = left.interpolation === "easeInOutCubic" ? easeInOutCubic(progress) : progress;

  return left.value + (right.value - left.value) * eased;
}
