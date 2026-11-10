import {
  ARTISAN_V2_RIG,
  artisanPose,
  resolveFolkPose,
  type ArtisanMotionConfig,
  type FolkPose,
  type FolkRig,
  type ResolvedFolkNode,
} from "@fableon/folk-motion";
import { transformPoint, type Vec2 } from "@fableon/sprite-motion";

export const STAGE2B_FPS = 24;
export const STAGE2B_FRAMES = 192;
export const STAGE2B_WIDTH = 1280;
export const STAGE2B_HEIGHT = 720;

export interface Stage2BConfig {
  readonly id: string;
  readonly actorScale: number;
  readonly groundY: number;
  readonly walk: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly fromX: number;
    readonly toX: number;
    readonly cycleSeconds: number;
    readonly bob: number;
    readonly armSwingDeg: number;
    readonly stepLift: number;
  };
  readonly reach: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly gripFrame: number;
    readonly releaseFrame: number;
    readonly returnFrame: number;
    readonly returnEndFrame: number;
    readonly target: Vec2;
  };
  readonly bell: {
    readonly pedestal: Vec2;
    readonly scale: number;
    readonly handOffset: Vec2;
  };
  readonly headTurnDeg: number;
  readonly blinkIntervalFrames: number;
  readonly blinkDurationFrames: number;
}

export const STAGE2B_BASE_CONFIG: Stage2BConfig = {
  id: "stage2b-walk-reach-grip",
  actorScale: 0.62,
  groundY: 620,
  walk: {
    startFrame: 0,
    endFrame: 59,
    fromX: 100,
    toX: 420,
    cycleSeconds: 1.1,
    bob: 5,
    armSwingDeg: 26,
    stepLift: 26,
  },
  reach: {
    startFrame: 60,
    endFrame: 108,
    gripFrame: 108,
    releaseFrame: 144,
    returnFrame: 144,
    returnEndFrame: 168,
    target: { x: 850, y: 540 },
  },
  bell: {
    pedestal: { x: 850, y: 560 },
    scale: 0.16,
    handOffset: { x: 0, y: 22 },
  },
  headTurnDeg: 8,
  blinkIntervalFrames: 72,
  blinkDurationFrames: 3,
};

export const STAGE2B_VARIATION_CONFIG: Stage2BConfig = {
  ...STAGE2B_BASE_CONFIG,
  id: "stage2b-variation-fast-low-reach",
  walk: {
    ...STAGE2B_BASE_CONFIG.walk,
    fromX: 180,
    toX: 470,
    cycleSeconds: 0.86,
    bob: 3,
    armSwingDeg: 34,
    stepLift: 20,
  },
  reach: {
    ...STAGE2B_BASE_CONFIG.reach,
    startFrame: 52,
    endFrame: 96,
    gripFrame: 96,
    releaseFrame: 132,
    returnFrame: 132,
    returnEndFrame: 160,
    target: { x: 820, y: 500 },
  },
  headTurnDeg: -10,
  blinkIntervalFrames: 54,
  blinkDurationFrames: 2,
};

export interface Stage2BFrameState {
  readonly frame: number;
  readonly phase: "walk" | "reach" | "grip" | "release" | "idle";
  readonly placement: { readonly x: number; readonly y: number; readonly scale: number };
  readonly pose: FolkPose;
  readonly nodes: readonly ResolvedFolkNode[];
  readonly handWorld: Vec2;
  readonly bellWorld: Vec2;
  readonly bellAttached: boolean;
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function easeInOut(progress: number): number {
  const t = clamp01(progress);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function phaseFor(config: Stage2BConfig, frame: number): Stage2BFrameState["phase"] {
  if (frame <= config.walk.endFrame) return "walk";
  if (frame < config.reach.gripFrame) return "reach";
  if (frame < config.reach.releaseFrame) return "grip";
  if (frame < config.reach.returnEndFrame) return "release";
  return "idle";
}

function placementFor(config: Stage2BConfig, frame: number) {
  const walkProgress = clamp01(
    (frame - config.walk.startFrame) / Math.max(1, config.walk.endFrame - config.walk.startFrame),
  );
  const x =
    frame <= config.walk.endFrame
      ? lerp(config.walk.fromX, config.walk.toX, walkProgress)
      : config.walk.toX;
  return {
    x,
    y: config.groundY - 1020 * config.actorScale,
    scale: config.actorScale,
  };
}

export function stage2bFrameState(
  config: Stage2BConfig,
  frame: number,
  rig: FolkRig = ARTISAN_V2_RIG,
): Stage2BFrameState {
  if (!Number.isInteger(frame) || frame < 0 || frame >= STAGE2B_FRAMES) {
    throw new Error(`Stage 2B frame must be an integer in 0..${STAGE2B_FRAMES - 1}.`);
  }
  const phase = phaseFor(config, frame);
  const placement = placementFor(config, frame);
  const walkSpeed =
    (config.walk.toX - config.walk.fromX) /
    Math.max(1, (config.walk.endFrame - config.walk.startFrame + 1) / STAGE2B_FPS);
  const motion: ArtisanMotionConfig = {
    walkSpeed,
    cycleSeconds: config.walk.cycleSeconds,
    bob: config.walk.bob,
    armSwingDeg: config.walk.armSwingDeg,
    stepLift: config.walk.stepLift,
    idleSwayDeg: 3,
    blinkIntervalFrames: config.blinkIntervalFrames,
    blinkDurationFrames: config.blinkDurationFrames,
    headTurnDeg: config.headTurnDeg,
  };
  const reaching = phase === "reach" || phase === "grip" || phase === "release";
  const target = {
    x: (config.reach.target.x - placement.x) / placement.scale,
    y: (config.reach.target.y - placement.y) / placement.scale,
  };
  const pose = artisanPose({
    action: phase === "walk" ? "walk" : reaching ? "reach" : "idle",
    frame,
    globalFrame: frame,
    scale: placement.scale,
    config: motion,
    ...(reaching
      ? {
          reach: {
            target,
            startFrame: config.reach.startFrame,
            endFrame: config.reach.endFrame,
            gripFrame: config.reach.gripFrame,
            releaseFrame: config.reach.releaseFrame,
            returnFrame: config.reach.returnFrame,
            returnEndFrame: config.reach.returnEndFrame,
          },
        }
      : {}),
  });
  const tracking =
    phase === "walk"
      ? 0
      : config.headTurnDeg *
        (phase === "release" || phase === "idle"
          ? 1 -
            easeInOut(
              (frame - config.reach.returnFrame) /
                Math.max(1, config.reach.returnEndFrame - config.reach.returnFrame),
            )
          : 1);
  const adjusted: FolkPose = {
    nodes: {
      ...pose.nodes,
      neck: {
        ...pose.nodes.neck,
        rotation: (pose.nodes.neck?.rotation ?? 0) + tracking * 0.35,
      },
      head: {
        ...pose.nodes.head,
        rotation: (pose.nodes.head?.rotation ?? 0) + tracking * 0.65,
      },
    },
  };
  const nodes = resolveFolkPose(rig, adjusted);
  const gripHand = nodes.find((node) => node.id === "handGrip");
  const openHand = nodes.find((node) => node.id === "handOpen");
  const hand = phase === "grip" ? (gripHand ?? openHand) : (openHand ?? gripHand);
  const handWorld = hand
    ? transformPoint(hand.world, {
        x: hand.pivot.x + config.bell.handOffset.x,
        y: hand.pivot.y + config.bell.handOffset.y,
      })
    : { x: placement.x, y: placement.y };
  const attached = phase === "grip";
  return {
    frame,
    phase,
    placement,
    pose: adjusted,
    nodes,
    handWorld,
    bellWorld: attached ? handWorld : config.bell.pedestal,
    bellAttached: attached,
  };
}

export function stage2bFrameStates(
  config: Stage2BConfig,
  rig: FolkRig = ARTISAN_V2_RIG,
): readonly Stage2BFrameState[] {
  return Array.from({ length: STAGE2B_FRAMES }, (_, frame) =>
    stage2bFrameState(config, frame, rig),
  );
}
