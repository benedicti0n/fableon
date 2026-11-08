import { DEFAULT_TRANSFORM } from "./constants";
import {
  animationTrackSchema,
  keyframeSchema,
  transformSchema,
  type AnimationTrack,
  type Interpolation,
  type Keyframe,
  type Transform,
} from "./schema";

/**
 * Builds a complete transform from the documented defaults. Invalid overrides
 * throw rather than being clamped or repaired.
 */
export function createTransform(overrides: Partial<Transform> = {}): Transform {
  return transformSchema.parse({ ...DEFAULT_TRANSFORM, ...overrides });
}

/** Builds and validates a single keyframe. */
export function createKeyframe(
  frame: number,
  value: number,
  interpolation: Interpolation = "linear",
): Keyframe {
  return keyframeSchema.parse({ frame, value, interpolation });
}

/** Builds and validates a non-empty, strictly ordered keyframe track. */
export function createAnimationTrack(keyframes: readonly Keyframe[]): AnimationTrack {
  return animationTrackSchema.parse({ keyframes });
}
