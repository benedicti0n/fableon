import {
  ARTISAN_V2_RIG,
  artisanPose,
  distance,
  resolveFolkPose,
  solveTwoBone,
  type ArtisanMotionConfig,
  type FolkPose,
  type FolkRig,
  type ResolvedFolkNode,
} from "@fableon/folk-motion";
import { transformPoint, type Vec2 } from "@fableon/sprite-motion";

export const STAGE2B1_FPS = 24;
export const STAGE2B1_FRAMES = 192;
export const STAGE2B1_WIDTH = 1280;
export const STAGE2B1_HEIGHT = 720;

export type Stage2B1Phase = "walk" | "reach" | "contact" | "grip" | "carry" | "release" | "settled";

export type InteractionState =
  "approaching" | "contact" | "gripping" | "carrying" | "releasing" | "settled" | "blocked";

export interface Stage2B1Config {
  readonly id: string;
  readonly actorScale: number;
  readonly groundY: number;
  readonly walk: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly fromX: number;
    readonly toX: number;
    readonly cycleSeconds: number;
    readonly duty: number;
    readonly bob: number;
    readonly pelvisSway: number;
    readonly stepLift: number;
    readonly armSwingDeg: number;
    readonly leanDeg: number;
  };
  readonly reach: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly contactFrame: number;
    readonly gripFrame: number;
    readonly releaseFrame: number;
    readonly returnEndFrame: number;
    readonly target: Vec2;
    readonly contactTolerance: number;
  };
  readonly bell: {
    readonly pedestal: Vec2;
    readonly scale: number;
  };
  readonly character: {
    readonly handGripOffset: Vec2;
    readonly footContact: {
      readonly near: Vec2;
      readonly far: Vec2;
    };
  };
  readonly headTurnDeg: number;
  readonly blinkIntervalFrames: number;
  readonly blinkDurationFrames: number;
}

export const STAGE2B1_BASE_CONFIG: Stage2B1Config = {
  id: "stage2b1-polished",
  actorScale: 0.62,
  groundY: 620,
  walk: {
    startFrame: 0,
    endFrame: 59,
    fromX: 100,
    toX: 420,
    cycleSeconds: 1.1,
    duty: 0.62,
    bob: 5,
    pelvisSway: 3,
    stepLift: 28,
    armSwingDeg: 26,
    leanDeg: 1.4,
  },
  reach: {
    startFrame: 60,
    endFrame: 108,
    contactFrame: 100,
    gripFrame: 108,
    releaseFrame: 144,
    returnEndFrame: 168,
    target: { x: 800, y: 420 },
    contactTolerance: 14,
  },
  bell: {
    pedestal: { x: 800, y: 460 },
    scale: 0.3,
  },
  character: {
    handGripOffset: { x: 0, y: 30 },
    footContact: {
      near: { x: 0, y: 28 },
      far: { x: 0, y: 28 },
    },
  },
  headTurnDeg: 8,
  blinkIntervalFrames: 72,
  blinkDurationFrames: 3,
};

export const STAGE2B1_VARIATION_CONFIG: Stage2B1Config = {
  ...STAGE2B1_BASE_CONFIG,
  id: "stage2b1-variation",
  walk: {
    ...STAGE2B1_BASE_CONFIG.walk,
    fromX: 170,
    toX: 470,
    cycleSeconds: 0.9,
    duty: 0.6,
    bob: 3.5,
    pelvisSway: 2,
    stepLift: 22,
    armSwingDeg: 34,
    leanDeg: 2.2,
  },
  reach: {
    ...STAGE2B1_BASE_CONFIG.reach,
    startFrame: 52,
    endFrame: 96,
    contactFrame: 90,
    gripFrame: 96,
    releaseFrame: 132,
    returnEndFrame: 160,
    target: { x: 780, y: 400 },
  },
  headTurnDeg: -10,
  blinkIntervalFrames: 54,
  blinkDurationFrames: 2,
};

export interface Stage2B1FrameState {
  readonly frame: number;
  readonly phase: Stage2B1Phase;
  readonly interaction: InteractionState;
  readonly placement: { readonly x: number; readonly y: number; readonly scale: number };
  readonly pose: FolkPose;
  readonly nodes: readonly ResolvedFolkNode[];
  readonly handGripWorld: Vec2;
  readonly bellWorld: Vec2;
  readonly bellAttached: boolean;
  readonly contactError: number;
  readonly rootX: number;
  readonly feet: {
    readonly near: {
      readonly stance: boolean;
      readonly swing: number;
      readonly contactWorld: Vec2;
    };
    readonly far: { readonly stance: boolean; readonly swing: number; readonly contactWorld: Vec2 };
  };
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function smoothstep(progress: number): number {
  const t = clamp01(progress);
  return t * t * (3 - 2 * t);
}

function easeInOut(progress: number): number {
  const t = clamp01(progress);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function cyclePhase(frame: number, cycleSeconds: number, offset = 0): number {
  const cycleFrames = Math.max(1, cycleSeconds * STAGE2B1_FPS);
  return ((((frame + offset * cycleFrames) / cycleFrames) % 1) + 1) % 1;
}

function rootXFor(config: Stage2B1Config, frame: number): number {
  if (frame <= config.walk.endFrame) {
    const progress = clamp01(
      (frame - config.walk.startFrame) / Math.max(1, config.walk.endFrame - config.walk.startFrame),
    );
    return lerp(config.walk.fromX, config.walk.toX, progress);
  }
  return config.walk.toX;
}

function placementFor(config: Stage2B1Config, frame: number) {
  return {
    x: rootXFor(config, frame),
    y: config.groundY - 1020 * config.actorScale,
    scale: config.actorScale,
  };
}

function phaseFor(config: Stage2B1Config, frame: number): Stage2B1Phase {
  if (frame <= config.walk.endFrame) return "walk";
  if (frame < config.reach.contactFrame) return "reach";
  if (frame < config.reach.gripFrame) return "contact";
  if (frame < config.reach.gripFrame + 18) return "grip";
  if (frame < config.reach.releaseFrame) return "carry";
  if (frame < config.reach.returnEndFrame) return "release";
  return "settled";
}

interface FootSolution {
  readonly ankle: Vec2;
  readonly thighRotation: number;
  readonly shinRotation: number;
  readonly footRotation: number;
  readonly swing: number;
  readonly stance: boolean;
}

function footSolution(input: {
  readonly config: Stage2B1Config;
  readonly frame: number;
  readonly phase: number;
  readonly baseAnkle: Vec2;
  readonly hip: Vec2;
  readonly upperLength: number;
  readonly lowerLength: number;
  readonly contact: Vec2;
  readonly bend: 1 | -1;
  readonly placementY: number;
}): FootSolution {
  const {
    config,
    frame,
    phase,
    baseAnkle,
    hip,
    upperLength,
    lowerLength,
    contact,
    bend,
    placementY,
  } = input;
  const duty = Math.min(Math.max(config.walk.duty, 0.3), 0.85);
  const cycleFrames = Math.max(1, config.walk.cycleSeconds * STAGE2B1_FPS);
  const rootSpeed =
    (config.walk.toX - config.walk.fromX) /
    Math.max(1, (config.walk.endFrame - config.walk.startFrame + 1) / STAGE2B1_FPS);
  const strideWorld = rootSpeed * config.walk.cycleSeconds;
  const strideMaster = strideWorld / config.actorScale;
  const swingStart = baseAnkle.x - strideMaster * (duty / 2);
  const swingEnd = baseAnkle.x + strideMaster * (duty / 2);
  let ankleX: number;
  let ankleY: number;
  let footRotation: number;
  let swing = 0;
  let stance = false;

  if (phase < duty) {
    stance = true;
    const elapsedFrames = phase * cycleFrames;
    const contactFrame = Math.max(config.walk.startFrame, frame - elapsedFrames);
    const anchorWorld =
      rootXFor(config, contactFrame) + (baseAnkle.x + contact.x) * config.actorScale;
    ankleX = (anchorWorld - rootXFor(config, frame)) / config.actorScale - contact.x;
    ankleY = (config.groundY - placementY) / config.actorScale - contact.y;
    footRotation = 0;
  } else {
    const swingProgress = (phase - duty) / (1 - duty);
    swing = Math.sin(Math.PI * swingProgress);
    ankleX = lerp(swingStart, swingEnd, smoothstep(swingProgress));
    ankleY =
      (config.groundY - placementY) / config.actorScale -
      contact.y -
      (config.walk.stepLift * swing) / config.actorScale;
    footRotation = -12 * Math.sin(Math.PI * swingProgress);
  }

  const solution = solveTwoBone(hip, { x: ankleX, y: ankleY }, upperLength, lowerLength, bend);
  return {
    ankle: { x: ankleX, y: ankleY },
    thighRotation: -solution.upper,
    shinRotation: -solution.lower,
    footRotation,
    swing,
    stance,
  };
}

function handWorldFor(
  nodes: readonly ResolvedFolkNode[],
  handId: "handOpen" | "handGrip",
  offset: Vec2,
): Vec2 {
  const hand = nodes.find((node) => node.id === handId);
  if (!hand) return { x: 0, y: 0 };
  return transformPoint(hand.world, {
    x: hand.pivot.x + offset.x,
    y: hand.pivot.y + offset.y,
  });
}

export function stage2b1FrameState(
  config: Stage2B1Config,
  frame: number,
  rig: FolkRig = ARTISAN_V2_RIG,
): Stage2B1FrameState {
  if (!Number.isInteger(frame) || frame < 0 || frame >= STAGE2B1_FRAMES) {
    throw new Error(`Stage 2B.1 frame must be an integer in 0..${STAGE2B1_FRAMES - 1}.`);
  }
  const phase = phaseFor(config, frame);
  const placement = placementFor(config, frame);
  const walking = phase === "walk";
  const cycle = cyclePhase(frame, config.walk.cycleSeconds);
  const nearPhase = cycle;
  const farPhase = cyclePhase(frame, config.walk.cycleSeconds, 0.5);
  const motion: ArtisanMotionConfig = {
    walkSpeed:
      (config.walk.toX - config.walk.fromX) /
      Math.max(1, (config.walk.endFrame - config.walk.startFrame + 1) / STAGE2B1_FPS),
    cycleSeconds: config.walk.cycleSeconds,
    bob: config.walk.bob,
    armSwingDeg: config.walk.armSwingDeg,
    stepLift: config.walk.stepLift,
    idleSwayDeg: 3,
    blinkIntervalFrames: config.blinkIntervalFrames,
    blinkDurationFrames: config.blinkDurationFrames,
    headTurnDeg: config.headTurnDeg,
  };
  const reaching = phase !== "walk" && phase !== "settled";
  const reachWeight =
    phase === "walk" || phase === "settled"
      ? 0
      : phase === "reach"
        ? easeInOut(
            (frame - config.reach.startFrame) /
              Math.max(1, config.reach.endFrame - config.reach.startFrame),
          )
        : phase === "release"
          ? 1 -
            smoothstep(
              (frame - config.reach.releaseFrame) /
                Math.max(1, config.reach.returnEndFrame - config.reach.releaseFrame),
            )
          : 1;
  const targetMaster = {
    x: (config.reach.target.x - placement.x) / placement.scale,
    y: (config.reach.target.y - placement.y) / placement.scale,
  };
  const pedestalMaster = {
    x: (config.bell.pedestal.x - placement.x) / placement.scale,
    y: (config.bell.pedestal.y - placement.y) / placement.scale,
  };
  const basePose = artisanPose({
    action: walking ? "walk" : reaching ? "reach" : "idle",
    frame,
    globalFrame: frame,
    scale: placement.scale,
    config: motion,
    ...(reaching
      ? {
          reach: {
            target: targetMaster,
            startFrame: config.reach.startFrame,
            endFrame: config.reach.endFrame,
            gripFrame: config.reach.gripFrame,
            releaseFrame: config.reach.releaseFrame,
            returnFrame: config.reach.releaseFrame,
            returnEndFrame: config.reach.returnEndFrame,
          },
        }
      : {}),
  });
  const bob = walking ? -config.walk.bob * (0.5 - 0.5 * Math.cos(cycle * Math.PI * 4)) : 0;
  const sway = walking ? config.walk.pelvisSway * Math.sin(cycle * Math.PI * 2) : 0;
  const baseNodes = resolveFolkPose(rig, {
    ...basePose,
    nodes: {
      ...basePose.nodes,
      pelvis: { ...basePose.nodes.pelvis, x: sway, y: bob },
    },
  });
  const byId = new Map(baseNodes.map((node) => [node.id, node]));
  const nearThighNode = byId.get("nearThigh")!;
  const farThighNode = byId.get("farThigh")!;
  const nearHip = transformPoint(nearThighNode.world, nearThighNode.pivot);
  const farHip = transformPoint(farThighNode.world, farThighNode.pivot);
  const nearFoot = footSolution({
    config,
    frame,
    phase: nearPhase,
    baseAnkle: nearThighNode.parentId === "pelvis" ? { x: 480, y: 978 } : { x: 480, y: 978 },
    hip: nearHip,
    upperLength: distance({ x: 470, y: 670 }, { x: 476, y: 824 }),
    lowerLength: distance({ x: 476, y: 824 }, { x: 480, y: 978 }),
    contact: config.character.footContact.near,
    bend: 1,
    placementY: placement.y,
  });
  const farFoot = footSolution({
    config,
    frame,
    phase: farPhase,
    baseAnkle: { x: 398, y: 978 },
    hip: farHip,
    upperLength: distance({ x: 405, y: 670 }, { x: 402, y: 824 }),
    lowerLength: distance({ x: 402, y: 824 }, { x: 398, y: 978 }),
    contact: config.character.footContact.far,
    bend: -1,
    placementY: placement.y,
  });
  const nearUpper = byId.get("nearUpperArm")!;
  const shoulder = transformPoint(nearUpper.world, nearUpper.pivot);
  const upperLength = distance({ x: 508, y: 470 }, { x: 532, y: 610 });
  const lowerLength = distance({ x: 532, y: 610 }, { x: 548, y: 742 });
  const handOffset = config.character.handGripOffset;
  let wristTarget = {
    x: targetMaster.x - handOffset.x,
    y: targetMaster.y - handOffset.y,
  };
  let solution = solveTwoBone(shoulder, wristTarget, upperLength, lowerLength, -1);
  let handRotation = -(solution.upper + solution.lower);
  let solvedNodes = baseNodes;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const candidatePose: FolkPose = {
      nodes: {
        ...basePose.nodes,
        pelvis: { ...basePose.nodes.pelvis, x: sway, y: bob },
        nearUpperArm: { rotation: -solution.upper },
        nearForearm: { rotation: -solution.lower },
        handOpen: { rotation: handRotation, visible: phase !== "grip" && phase !== "carry" },
        handGrip: { rotation: handRotation, visible: phase === "grip" || phase === "carry" },
      },
    };
    solvedNodes = resolveFolkPose(rig, candidatePose);
    const handId = phase === "grip" || phase === "carry" ? "handGrip" : "handOpen";
    const gripWorld = handWorldFor(solvedNodes, handId, handOffset);
    const error = {
      x: targetMaster.x - gripWorld.x,
      y: targetMaster.y - gripWorld.y,
    };
    if (Math.hypot(error.x, error.y) < 0.6) break;
    wristTarget = {
      x: wristTarget.x + error.x,
      y: wristTarget.y + error.y,
    };
    solution = solveTwoBone(shoulder, wristTarget, upperLength, lowerLength, -1);
    handRotation = -(solution.upper + solution.lower);
  }
  const interaction = (() => {
    if (phase === "walk") return "approaching" as const;
    if (phase === "reach") return "approaching" as const;
    if (phase === "contact") return "contact" as const;
    if (phase === "grip") return "gripping" as const;
    if (phase === "carry") return "carrying" as const;
    if (phase === "release") return "releasing" as const;
    return "settled" as const;
  })();
  const gripHandId = phase === "grip" || phase === "carry" ? "handGrip" : "handOpen";
  const gripWorld = handWorldFor(solvedNodes, gripHandId, handOffset);
  const contactError =
    Math.hypot(gripWorld.x - targetMaster.x, gripWorld.y - targetMaster.y) * placement.scale;
  const attached =
    (phase === "grip" || phase === "carry") && contactError <= config.reach.contactTolerance;
  const baseUpper = basePose.nodes.nearUpperArm?.rotation ?? 0;
  const baseFore = basePose.nodes.nearForearm?.rotation ?? 0;
  const baseHand = basePose.nodes.handOpen?.rotation ?? 0;
  const armUpper = lerp(baseUpper, -solution.upper, reachWeight);
  const armFore = lerp(baseFore, -solution.lower, reachWeight);
  const armHand = lerp(baseHand, handRotation, reachWeight);
  const finalPose: FolkPose = {
    nodes: {
      ...basePose.nodes,
      pelvis: { ...basePose.nodes.pelvis, x: sway, y: bob },
      nearThigh: { rotation: nearFoot.thighRotation },
      nearShin: { rotation: nearFoot.shinRotation },
      nearFoot: { rotation: nearFoot.footRotation },
      farThigh: { rotation: farFoot.thighRotation },
      farShin: { rotation: farFoot.shinRotation },
      farFoot: { rotation: farFoot.footRotation },
      torso: {
        ...basePose.nodes.torso,
        rotation: (basePose.nodes.torso?.rotation ?? 0) + (walking ? config.walk.leanDeg : 0),
      },
      nearUpperArm: { rotation: armUpper },
      nearForearm: { rotation: armFore },
      handOpen: {
        rotation: armHand,
        visible: phase !== "grip" && phase !== "carry",
      },
      handGrip: {
        rotation: armHand,
        visible: phase === "grip" || phase === "carry",
      },
      turbanTail: {
        rotation:
          (basePose.nodes.turbanTail?.rotation ?? 0) +
          Math.sin(cycle * Math.PI * 2 + 0.8) * (walking ? 6 : 2),
      },
      sash: {
        rotation:
          (basePose.nodes.sash?.rotation ?? 0) +
          Math.sin(cycle * Math.PI * 2 + 0.4) * (walking ? 2 : 0.8),
      },
      shoulderSash: {
        rotation:
          (basePose.nodes.shoulderSash?.rotation ?? 0) +
          Math.sin(cycle * Math.PI * 2 + 1.2) * (walking ? 3 : 1),
      },
    },
  };
  const finalNodes = resolveFolkPose(rig, finalPose);
  const finalGrip = handWorldFor(finalNodes, gripHandId, handOffset);
  const releaseBellProgress = clamp01((frame - config.reach.releaseFrame) / 8);
  const finalBell =
    phase === "grip" || phase === "carry"
      ? attached
        ? finalGrip
        : pedestalMaster
      : phase === "release"
        ? {
            x: lerp(targetMaster.x, pedestalMaster.x, smoothstep(releaseBellProgress)),
            y: lerp(targetMaster.y, pedestalMaster.y, smoothstep(releaseBellProgress)),
          }
        : pedestalMaster;
  return {
    frame,
    phase,
    interaction:
      contactError > config.reach.contactTolerance && (phase === "grip" || phase === "carry")
        ? "blocked"
        : interaction,
    placement,
    pose: finalPose,
    nodes: finalNodes,
    handGripWorld: finalGrip,
    bellWorld: finalBell,
    bellAttached: attached,
    contactError,
    rootX: placement.x,
    feet: {
      near: {
        stance: nearFoot.stance,
        swing: nearFoot.swing,
        contactWorld: {
          x:
            placement.x +
            (nearFoot.ankle.x + config.character.footContact.near.x) * placement.scale,
          y:
            placement.y +
            (nearFoot.ankle.y + config.character.footContact.near.y) * placement.scale,
        },
      },
      far: {
        stance: farFoot.stance,
        swing: farFoot.swing,
        contactWorld: {
          x: placement.x + (farFoot.ankle.x + config.character.footContact.far.x) * placement.scale,
          y: placement.y + (farFoot.ankle.y + config.character.footContact.far.y) * placement.scale,
        },
      },
    },
  };
}

export function stage2b1FrameStates(
  config: Stage2B1Config,
  rig: FolkRig = ARTISAN_V2_RIG,
): readonly Stage2B1FrameState[] {
  return Array.from({ length: STAGE2B1_FRAMES }, (_, frame) =>
    stage2b1FrameState(config, frame, rig),
  );
}

export interface Stage2B1Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export function stage2b1CameraBounds(
  states: readonly Stage2B1FrameState[],
  partBounds: Readonly<
    Record<
      string,
      {
        readonly offsetX: number;
        readonly offsetY: number;
        readonly width: number;
        readonly height: number;
      }
    >
  >,
): Stage2B1Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const state of states) {
    for (const node of state.nodes) {
      if (!node.visible) continue;
      const part = partBounds[node.partId];
      if (!part) continue;
      for (const [x, y] of [
        [part.offsetX, part.offsetY],
        [part.offsetX + part.width, part.offsetY],
        [part.offsetX + part.width, part.offsetY + part.height],
        [part.offsetX, part.offsetY + part.height],
      ] as const) {
        const point = transformPoint(node.world, { x, y });
        const screenX = state.placement.x + point.x * state.placement.scale;
        const screenY = state.placement.y + point.y * state.placement.scale;
        minX = Math.min(minX, screenX);
        minY = Math.min(minY, screenY);
        maxX = Math.max(maxX, screenX);
        maxY = Math.max(maxY, screenY);
      }
    }
    const bellRadius = 20;
    const bellX = state.placement.x + state.bellWorld.x * state.placement.scale;
    const bellY = state.placement.y + state.bellWorld.y * state.placement.scale;
    minX = Math.min(minX, bellX - bellRadius);
    minY = Math.min(minY, bellY - bellRadius);
    maxX = Math.max(maxX, bellX + bellRadius);
    maxY = Math.max(maxY, bellY + bellRadius);
  }
  return { minX, minY, maxX, maxY };
}

export function fitCamera(
  bounds: Stage2B1Bounds,
  width = STAGE2B1_WIDTH,
  height = STAGE2B1_HEIGHT,
  margin = 36,
): { readonly scale: number; readonly x: number; readonly y: number } {
  const boundsWidth = Math.max(1, bounds.maxX - bounds.minX);
  const boundsHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(
    (width - margin * 2) / boundsWidth,
    (height - margin * 2) / boundsHeight,
    1,
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    scale,
    x: width / 2 - centerX * scale,
    y: height / 2 - centerY * scale,
  };
}
