import { Rigby2DError } from "./errors";

export interface JointPoint {
  readonly x: number;
  readonly y: number;
}

export interface FlexionMeasurement {
  readonly flexion: number;
  readonly bendSide: -1 | 0 | 1;
  readonly upperLength: number;
  readonly lowerLength: number;
}

export interface FlexionCheckInput {
  readonly jointA: JointPoint;
  readonly jointB: JointPoint;
  readonly jointC: JointPoint;
  readonly requestedFlexion: number;
  readonly tolerance: number;
  readonly animation: string;
  readonly timeSeconds: number;
  readonly chain: { readonly a: string; readonly b: string; readonly c: string };
  readonly ikTarget: { readonly name: string; readonly x: number; readonly y: number } | null;
}

export interface FlexionCheck extends FlexionMeasurement {
  readonly requestedFlexion: number;
  readonly delta: number;
  readonly tolerance: number;
  readonly passed: boolean;
  readonly animation: string;
  readonly timeSeconds: number;
  readonly chain: { readonly a: string; readonly b: string; readonly c: string };
  readonly ikTarget: { readonly name: string; readonly x: number; readonly y: number } | null;
}

function distance(from: JointPoint, to: JointPoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/**
 * Measures elbow/knee flexion from three world joints.
 *
 * Convention: 0 degrees = straight (A-B-C collinear, B between A and C), 90 = right angle,
 * 180 = fully folded. The vectors used are A->B and B->C, so the angle between them is exactly
 * the flexion, not its supplement.
 */
export function measureFlexion(
  jointA: JointPoint,
  jointB: JointPoint,
  jointC: JointPoint,
): FlexionMeasurement {
  const upperLength = distance(jointA, jointB);
  const lowerLength = distance(jointB, jointC);
  if (upperLength <= 1e-9 || lowerLength <= 1e-9) {
    throw new Rigby2DError("POSE_CHAIN_INVALID", "Joint chain contains a zero-length bone.");
  }
  const abx = jointB.x - jointA.x;
  const aby = jointB.y - jointA.y;
  const bcx = jointC.x - jointB.x;
  const bcy = jointC.y - jointB.y;
  const cosine = Math.max(-1, Math.min(1, (abx * bcx + aby * bcy) / (upperLength * lowerLength)));
  const flexion = (Math.acos(cosine) * 180) / Math.PI;
  const cross = abx * bcy - aby * bcx;
  const bendSide: -1 | 0 | 1 = cross > 1e-6 ? 1 : cross < -1e-6 ? -1 : 0;
  return { flexion, bendSide, upperLength, lowerLength };
}

export function evaluateFlexionCheck(input: FlexionCheckInput): FlexionCheck {
  if (
    !Number.isFinite(input.requestedFlexion) ||
    input.requestedFlexion < 0 ||
    input.requestedFlexion > 180
  ) {
    throw new Rigby2DError("INVALID_INPUT", "Requested flexion must be between 0 and 180 degrees.");
  }
  if (!Number.isFinite(input.tolerance) || input.tolerance <= 0) {
    throw new Rigby2DError("INVALID_INPUT", "Flexion tolerance must be a positive number.");
  }
  const measurement = measureFlexion(input.jointA, input.jointB, input.jointC);
  const delta = measurement.flexion - input.requestedFlexion;
  return {
    ...measurement,
    requestedFlexion: input.requestedFlexion,
    delta,
    tolerance: input.tolerance,
    passed: Math.abs(delta) <= input.tolerance,
    animation: input.animation,
    timeSeconds: input.timeSeconds,
    chain: input.chain,
    ikTarget: input.ikTarget,
  };
}

export const R2_1_FLEXION_FIXTURES = [
  { requested: 30, measured: 149.25, timeSeconds: 0.25 },
  { requested: 60, measured: 119.19, timeSeconds: 0.5 },
  { requested: 90, measured: 90.67, timeSeconds: 0.75 },
] as const;

export const R2_2_FLEXION_FIXTURES = [
  { requested: 30, measured: 32.03, timeSeconds: 0.25 },
  { requested: 60, measured: 61.24, timeSeconds: 0.5 },
  { requested: 90, measured: 90.73, timeSeconds: 0.75 },
] as const;
