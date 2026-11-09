import type { Vec2 } from "@fableon/sprite-motion";

export interface TwoBoneSolution {
  /** World rotation of the first bone, degrees clockwise from straight down. */
  readonly upper: number;
  /** Rotation of the second bone relative to the first, degrees. */
  readonly lower: number;
}

/**
 * Solves a two-bone chain whose rest pose points straight down. Angles are
 * measured clockwise from +Y. `bend` is +1 or -1 and selects the joint side.
 */
export function solveTwoBone(
  origin: Vec2,
  target: Vec2,
  upperLength: number,
  lowerLength: number,
  bend: 1 | -1,
): TwoBoneSolution {
  if (upperLength <= 0 || lowerLength <= 0) {
    throw new Error("Two-bone lengths must be positive.");
  }
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.max(
    Math.abs(upperLength - lowerLength) + 0.001,
    Math.min(upperLength + lowerLength - 0.001, Math.hypot(dx, dy)),
  );
  const direction = (Math.atan2(dx, dy) * 180) / Math.PI;
  const cosineUpper =
    (upperLength * upperLength + distance * distance - lowerLength * lowerLength) /
    (2 * upperLength * distance);
  const cosineLower =
    (lowerLength * lowerLength + distance * distance - upperLength * upperLength) /
    (2 * lowerLength * distance);
  const alpha = (Math.acos(Math.min(Math.max(cosineUpper, -1), 1)) * 180) / Math.PI;
  const beta = (Math.acos(Math.min(Math.max(cosineLower, -1), 1)) * 180) / Math.PI;
  const upper = direction + bend * alpha;
  const lowerWorld = direction - bend * beta;
  return { upper, lower: lowerWorld - upper };
}

export function distance(left: Vec2, right: Vec2): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}
