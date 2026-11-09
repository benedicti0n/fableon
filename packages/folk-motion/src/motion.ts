import type { Vec2 } from "@fableon/sprite-motion";

import { distance, solveTwoBone } from "./ik";
import { ARTISAN_FOOT_LOCAL, ARTISAN_SHOULDER_LOCAL, HORSE_LEG_LOCAL } from "./rigs";
import type { FolkPose } from "./rig";

export interface ArtisanMotionConfig {
  readonly walkSpeed: number;
  readonly cycleSeconds: number;
  readonly bob: number;
  readonly armSwingDeg: number;
  readonly stepLift: number;
  readonly idleSwayDeg: number;
  readonly blinkIntervalFrames: number;
  readonly blinkDurationFrames: number;
  readonly headTurnDeg: number;
}

export interface HorseMotionConfig {
  readonly walkSpeed: number;
  readonly cycleSeconds: number;
  readonly bob: number;
  readonly stepLift: number;
  readonly headNodDeg: number;
  readonly tailSwayDeg: number;
  readonly legOffsets: {
    readonly nearFront: number;
    readonly farFront: number;
    readonly nearHind: number;
    readonly farHind: number;
  };
}

export interface ReachOptions {
  readonly target: Vec2;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly gripFrame: number;
  readonly releaseFrame?: number;
}

export type ArtisanAction = "idle" | "walk" | "reach" | "watch";
export type HorseAction = "idle" | "walk" | "nod";

export interface ArtisanPoseOptions {
  readonly action: ArtisanAction;
  readonly frame: number;
  readonly globalFrame: number;
  readonly scale: number;
  readonly config: ArtisanMotionConfig;
  readonly reach?: ReachOptions;
}

export interface HorsePoseOptions {
  readonly action: HorseAction;
  readonly frame: number;
  readonly globalFrame: number;
  readonly scale: number;
  readonly config: HorseMotionConfig;
  readonly nodStartFrame?: number;
}

export interface CartPoseOptions {
  readonly frame: number;
  readonly wheelDegrees: number;
  readonly bounce: number;
}

function easeInOut(progress: number): number {
  const t = Math.min(Math.max(progress, 0), 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function phaseAt(frame: number, cycleSeconds: number, fps = 24): number {
  const cycleFrames = Math.max(1, cycleSeconds * fps);
  return (((frame / cycleFrames) % 1) + 1) % 1;
}

function gaitTarget(
  base: Vec2,
  phase: number,
  strideMaster: number,
  lift: number,
  duty = 0.6,
): { readonly target: Vec2; readonly swing: number } {
  const p = ((phase % 1) + 1) % 1;
  if (p < duty) {
    return {
      target: { x: base.x + strideMaster * (duty / 2 - p), y: base.y },
      swing: 0,
    };
  }
  const swingProgress = (p - duty) / (1 - duty);
  return {
    target: {
      x: base.x + strideMaster * (-duty / 2 + swingProgress * duty),
      y: base.y - lift * Math.sin(Math.PI * swingProgress),
    },
    swing: Math.sin(Math.PI * swingProgress),
  };
}

function isBlinking(globalFrame: number, config: ArtisanMotionConfig): boolean {
  const interval = Math.max(2, Math.round(config.blinkIntervalFrames));
  const phase = globalFrame % interval;
  return phase < Math.max(1, Math.round(config.blinkDurationFrames));
}

function armWalk(swingDeg: number, phase: number): { upper: number; lower: number } {
  const upper = swingDeg * Math.sin(phase * Math.PI * 2);
  return { upper, lower: -12 - Math.abs(upper) * 0.2 };
}

function reachArm(
  shoulder: Vec2,
  target: Vec2,
  progress: number,
): { upper: number; lower: number; handRotation: number } {
  const eased = easeInOut(progress);
  const relaxed = { x: shoulder.x + 40, y: shoulder.y + 272 };
  const aimed = {
    x: shoulder.x + (target.x - shoulder.x) * eased,
    y: shoulder.y + (target.y - shoulder.y) * eased,
  };
  const wristTarget = {
    x: relaxed.x + (aimed.x - relaxed.x),
    y: relaxed.y + (aimed.y - relaxed.y),
  };
  const upperLength = distance({ x: 508, y: 470 }, { x: 532, y: 610 });
  const lowerLength = distance({ x: 532, y: 610 }, { x: 548, y: 742 });
  const solution = solveTwoBone(shoulder, wristTarget, upperLength, lowerLength, -1);
  return {
    upper: solution.upper,
    lower: solution.lower,
    handRotation: solution.upper + solution.lower,
  };
}

export function artisanPose(options: ArtisanPoseOptions): FolkPose {
  const { config, frame, globalFrame, action } = options;
  const cycle = phaseAt(frame, config.cycleSeconds);
  const walking = action === "walk";
  const reachProgress =
    action === "reach" && options.reach
      ? (frame - options.reach.startFrame) /
        Math.max(1, options.reach.endFrame - options.reach.startFrame)
      : 0;
  const grip =
    action === "reach" && options.reach
      ? frame >= options.reach.gripFrame &&
        (options.reach.releaseFrame === undefined || frame < options.reach.releaseFrame)
      : false;
  const bob = walking ? -config.bob * Math.abs(Math.sin(cycle * Math.PI * 2)) : 0;
  const breathe =
    action === "idle" || action === "watch" || action === "reach"
      ? Math.sin((frame / 24) * Math.PI * 2 * 0.28) * 1.2
      : 0;
  const torsoRotation =
    (walking
      ? Math.sin(cycle * Math.PI * 2) * 1.4
      : Math.sin((frame / 24) * Math.PI * 2 * 0.28) * 1.1) +
    (action === "reach" ? -2.5 * easeInOut(reachProgress) : 0);
  const headBob = walking
    ? Math.sin(cycle * Math.PI * 4) * 1.2
    : Math.sin((frame / 24) * Math.PI * 2 * 0.28) * 0.6;
  const blink = isBlinking(globalFrame, config);
  const look = action === "watch" ? config.headTurnDeg : 0;

  const strideWorld = config.walkSpeed * config.cycleSeconds;
  const strideMaster = walking ? strideWorld / options.scale : 0;
  const nearPhase = cycle;
  const farPhase = cycle + 0.5;
  const nearFoot = gaitTarget(ARTISAN_FOOT_LOCAL.near, nearPhase, strideMaster, config.stepLift);
  const farFoot = gaitTarget(ARTISAN_FOOT_LOCAL.far, farPhase, strideMaster, config.stepLift);

  const nearThigh = solveTwoBone(
    { x: 470, y: 670 + bob },
    nearFoot.target,
    distance({ x: 470, y: 670 }, { x: 476, y: 824 }),
    distance({ x: 476, y: 824 }, { x: 480, y: 978 }),
    1,
  );
  const farThigh = solveTwoBone(
    { x: 405, y: 670 + bob },
    farFoot.target,
    distance({ x: 405, y: 670 }, { x: 402, y: 824 }),
    distance({ x: 402, y: 824 }, { x: 398, y: 978 }),
    -1,
  );

  const shoulder = { x: ARTISAN_SHOULDER_LOCAL.x, y: ARTISAN_SHOULDER_LOCAL.y + bob };
  const nearWalkArm = armWalk(config.armSwingDeg, cycle + 0.5);
  const farWalkArm = armWalk(config.armSwingDeg, cycle);
  const reach = options.reach ? reachArm(shoulder, options.reach.target, reachProgress) : null;
  const nearUpper = walking ? nearWalkArm.upper : reach ? reach.upper : -2;
  const nearLower = walking ? nearWalkArm.lower : reach ? reach.lower : -6;
  const farUpper = walking ? farWalkArm.upper : -3;
  const farLower = walking ? farWalkArm.lower : -7;
  const handRotation = reach ? reach.handRotation : nearUpper + nearLower;

  return {
    nodes: {
      pelvis: { y: bob },
      torso: { y: breathe, rotation: torsoRotation },
      sash: { rotation: torsoRotation * 0.35 },
      necklace: { rotation: -torsoRotation * 0.4 },
      neck: { rotation: -torsoRotation * 0.6 + look * 0.35, y: headBob * 0.4 },
      head: { rotation: -torsoRotation * 0.7 + look * 0.65 + headBob * 0.2 },
      eye: {},
      eyelid: { visible: blink },
      brow: { rotation: blink ? -4 : 0 },
      mustache: {},
      earring: { rotation: Math.sin(cycle * Math.PI * 2) * (walking ? 5 : 1.5) },
      turban: { rotation: headBob * 0.2 },
      turbanTail: { rotation: Math.sin(cycle * Math.PI * 2 + 0.8) * (walking ? 6 : 2) },
      shoulderSash: { rotation: Math.sin(cycle * Math.PI * 2) * (walking ? 3 : 1) },
      nearThigh: { rotation: -nearThigh.upper },
      nearShin: { rotation: -nearThigh.lower },
      nearFoot: {
        rotation: nearThigh.upper + nearThigh.lower + nearFoot.swing * 12,
      },
      nearDhoti: { rotation: -nearThigh.upper * 0.2 },
      farThigh: { rotation: -farThigh.upper },
      farShin: { rotation: -farThigh.lower },
      farFoot: { rotation: farThigh.upper + farThigh.lower + farFoot.swing * 12 },
      farDhoti: { rotation: -farThigh.upper * 0.2 },
      nearUpperArm: { rotation: -nearUpper },
      nearForearm: { rotation: -nearLower },
      handOpen: { rotation: -handRotation, visible: !grip },
      handGrip: { rotation: -handRotation, visible: grip },
      farUpperArm: { rotation: -farUpper },
      farForearm: { rotation: -farLower },
      farHand: { rotation: -(farUpper + farLower) },
    },
  };
}

function horseLegPose(
  name: keyof typeof HORSE_LEG_LOCAL,
  phase: number,
  strideMaster: number,
  lift: number,
  bend: 1 | -1,
  rootBob: number,
): {
  upper: number;
  lower: number;
  hoof: number;
} {
  const leg = HORSE_LEG_LOCAL[name];
  const foot = gaitTarget(leg.ankle, phase, strideMaster, lift);
  const hip = { x: leg.hip.x, y: leg.hip.y + rootBob };
  const upperLength = distance(leg.hip, leg.knee);
  const lowerLength = distance(leg.knee, leg.ankle);
  const solution = solveTwoBone(hip, foot.target, upperLength, lowerLength, bend);
  return {
    upper: solution.upper,
    lower: solution.lower,
    hoof: -(solution.upper + solution.lower) - foot.swing * 16,
  };
}

export function horsePose(options: HorsePoseOptions): FolkPose {
  const { config, frame, action } = options;
  const cycle = phaseAt(frame, config.cycleSeconds);
  const walking = action === "walk";
  const rootBob = walking ? -config.bob * Math.abs(Math.sin(cycle * Math.PI * 2)) : 0;
  const strideMaster = walking ? (config.walkSpeed * config.cycleSeconds) / options.scale : 0;
  const nodProgress =
    action === "nod" && options.nodStartFrame !== undefined
      ? Math.min(Math.max((frame - options.nodStartFrame) / 34, 0), 1)
      : 0;
  const nod = walking
    ? Math.sin(cycle * Math.PI * 4) * config.headNodDeg * 0.35
    : action === "nod"
      ? Math.sin(nodProgress * Math.PI * 2) * config.headNodDeg * 1.8
      : Math.sin((frame / 24) * Math.PI * 2 * 0.3) * 1.2;
  const tail = Math.sin(cycle * Math.PI * 2 + 0.5) * config.tailSwayDeg;

  const nearFront = horseLegPose(
    "nearFront",
    cycle + config.legOffsets.nearFront,
    strideMaster,
    config.stepLift,
    -1,
    rootBob,
  );
  const farFront = horseLegPose(
    "farFront",
    cycle + config.legOffsets.farFront,
    strideMaster,
    config.stepLift,
    -1,
    rootBob,
  );
  const nearHind = horseLegPose(
    "nearHind",
    cycle + config.legOffsets.nearHind,
    strideMaster,
    config.stepLift,
    1,
    rootBob,
  );
  const farHind = horseLegPose(
    "farHind",
    cycle + config.legOffsets.farHind,
    strideMaster,
    config.stepLift,
    1,
    rootBob,
  );

  return {
    nodes: {
      torso: { y: rootBob },
      neck: { rotation: nod * 0.55 },
      head: { rotation: nod * 0.45 },
      farEar: { rotation: -nod * 0.3 },
      nearEar: { rotation: -nod * 0.35 },
      forelock: { rotation: nod * 0.2 },
      eye: {},
      bridle: {},
      mane: { rotation: Math.sin(cycle * Math.PI * 2) * 2 },
      tailBase: { rotation: tail },
      tailTuft: { rotation: tail * 1.4 + Math.sin(cycle * Math.PI * 2 + 1.2) * 4 },
      saddleBlanket: { rotation: Math.sin(cycle * Math.PI * 2) * 0.6 },
      harnessCollar: {},
      harnessStrap: {},
      harnessAnchor: {},
      nearFrontUpper: { rotation: -nearFront.upper },
      nearFrontLower: { rotation: -nearFront.lower },
      nearFrontHoof: { rotation: -nearFront.hoof },
      farFrontUpper: { rotation: -farFront.upper },
      farFrontLower: { rotation: -farFront.lower },
      farFrontHoof: { rotation: -farFront.hoof },
      nearHindUpper: { rotation: -nearHind.upper },
      nearHindLower: { rotation: -nearHind.lower },
      nearHindHoof: { rotation: -nearHind.hoof },
      farHindUpper: { rotation: -farHind.upper },
      farHindLower: { rotation: -farHind.lower },
      farHindHoof: { rotation: -farHind.hoof },
    },
  };
}

export function cartPose(options: CartPoseOptions): FolkPose {
  return {
    nodes: {
      cartBody: {
        y: Math.sin((options.frame / 24) * Math.PI * 2 * 1.4) * options.bounce,
        rotation: Math.sin((options.frame / 24) * Math.PI * 2 * 0.7) * 0.5,
      },
      farWheel: { rotation: options.wheelDegrees },
      nearWheel: { rotation: options.wheelDegrees },
      shafts: {},
    },
  };
}

export function bellPose(rotation: number): FolkPose {
  return { nodes: { bell: { rotation } } };
}
