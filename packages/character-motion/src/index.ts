import {
  evaluateSpriteRig,
  transformPoint,
  type ResolvedSpriteNode,
  type SpriteNodeDefinition,
  type SpriteRigDefinition,
  type Vec2,
} from "@fableon/sprite-motion";

export type { Vec2 };

export interface CharacterPose {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly bodyRotation: number;
  readonly wingNear: number;
  readonly wingFar: number;
  readonly tail: number;
  readonly head: number;
  readonly legLeftOffset: number;
  readonly legRightOffset: number;
  readonly eyeOpen: number;
  readonly contact: boolean;
}

export interface MotionPathOptions {
  readonly frame: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly start: Vec2;
  readonly end: Vec2;
  readonly scale: number;
  readonly seed?: number;
}

export interface LandingMotionOptions extends MotionPathOptions {
  readonly contactFrame: number;
  readonly settleFrame: number;
  readonly contactPoint: Vec2;
}

export interface IdleMotionOptions {
  readonly frame: number;
  readonly position: Vec2;
  readonly scale: number;
  readonly seed?: number;
}

export const BIRD_PART_IDS = [
  "body",
  "tail",
  "wingFar",
  "legLeft",
  "legRight",
  "wingNear",
  "head",
  "beak",
  "eye",
] as const;

export const BIRD_FOOT_LOCAL = Object.freeze({
  left: { x: 53, y: 133 },
  right: { x: 53, y: 116 },
});

const BASE_BODY_SCALE = 1;

/**
 * The reusable nine-part Little Bird rig. Pivots and local part transforms are
 * the same construction used by the Phase 2.7 Gate 2 candidate; this module
 * supplies new motion presets without changing that historical benchmark.
 */
export function createLittleBirdBaseRig(): SpriteRigDefinition {
  return {
    nodes: [
      baseNode(
        "body",
        null,
        50,
        { x: 133, y: 80 },
        {
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: BASE_BODY_SCALE,
          scaleY: BASE_BODY_SCALE,
        },
      ),
      baseNode(
        "tail",
        "body",
        10,
        { x: 118, y: 18 },
        {
          x: 77,
          y: 114,
          rotation: 0,
          scaleX: 0.9,
          scaleY: 0.9,
        },
      ),
      baseNode(
        "wingFar",
        "body",
        20,
        { x: 147, y: 25 },
        {
          x: 163,
          y: 51,
          rotation: 0,
          scaleX: 0.94,
          scaleY: 0.94,
        },
      ),
      baseNode(
        "legLeft",
        "body",
        30,
        { x: 53, y: 13 },
        {
          x: 142,
          y: 145,
          rotation: 0,
          scaleX: 0.63,
          scaleY: 0.63,
        },
      ),
      baseNode(
        "legRight",
        "body",
        31,
        { x: 53, y: 12 },
        {
          x: 193,
          y: 154,
          rotation: 0,
          scaleX: 0.64,
          scaleY: 0.64,
        },
      ),
      baseNode(
        "wingNear",
        "body",
        60,
        { x: 148, y: 23 },
        {
          x: 145,
          y: 65,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      ),
      baseNode(
        "head",
        "body",
        70,
        { x: 30, y: 150 },
        {
          x: 181,
          y: 116,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      ),
      baseNode(
        "beak",
        "head",
        80,
        { x: 8, y: 22 },
        {
          x: 175,
          y: 65,
          rotation: 0,
          scaleX: 0.72,
          scaleY: 0.72,
        },
      ),
      baseNode(
        "eye",
        "head",
        85,
        { x: 22, y: 22 },
        {
          x: 140,
          y: 56,
          rotation: 0,
          scaleX: 0.62,
          scaleY: 0.62,
        },
      ),
    ],
  };
}

function baseNode(
  id: string,
  parentId: string | null,
  drawOrder: number,
  pivot: Vec2,
  transform: SpriteNodeDefinition["transform"],
): SpriteNodeDefinition {
  return { id, parentId, drawOrder, pivot, transform, visible: true };
}

export function rigForPose(pose: CharacterPose): SpriteRigDefinition {
  const base = createLittleBirdBaseRig();
  return {
    nodes: base.nodes.map((node): SpriteNodeDefinition => {
      switch (node.id) {
        case "body":
          return {
            ...node,
            transform: {
              x: pose.x,
              y: pose.y,
              rotation: pose.bodyRotation,
              scaleX: pose.scale,
              scaleY: pose.scale,
            },
          };
        case "tail":
          return { ...node, transform: { ...node.transform, rotation: pose.tail } };
        case "wingFar":
          return { ...node, transform: { ...node.transform, rotation: pose.wingFar } };
        case "wingNear":
          return { ...node, transform: { ...node.transform, rotation: pose.wingNear } };
        case "legLeft":
          return {
            ...node,
            transform: { ...node.transform, y: node.transform.y + pose.legLeftOffset },
          };
        case "legRight":
          return {
            ...node,
            transform: { ...node.transform, y: node.transform.y + pose.legRightOffset },
          };
        case "head":
          return { ...node, transform: { ...node.transform, rotation: pose.head } };
        case "eye":
          return {
            ...node,
            transform: {
              ...node.transform,
              scaleY: node.transform.scaleY * clamp(pose.eyeOpen, 0.05, 1),
            },
          };
        default:
          return node;
      }
    }),
  };
}

export function evaluatePose(pose: CharacterPose): readonly ResolvedSpriteNode[] {
  return evaluateSpriteRig(rigForPose(pose), 0);
}

export function footPointsForPose(pose: CharacterPose): {
  readonly left: Vec2;
  readonly right: Vec2;
} {
  const evaluated = evaluatePose(pose);
  const leftNode = evaluated.find((node) => node.id === "legLeft");
  const rightNode = evaluated.find((node) => node.id === "legRight");
  if (!leftNode || !rightNode) {
    throw new Error("Little Bird rig is missing a leg node.");
  }
  return {
    left: transformPoint(leftNode.world, BIRD_FOOT_LOCAL.left),
    right: transformPoint(rightNode.world, BIRD_FOOT_LOCAL.right),
  };
}

/**
 * Shifts the whole character so the lower foot lands exactly on the branch.
 * Because the body translation is affine, this correction is exact.
 */
export function solveFootContact(
  pose: CharacterPose,
  branchY: number,
): { readonly pose: CharacterPose; readonly left: Vec2; readonly right: Vec2 } {
  const before = footPointsForPose(pose);
  const delta = branchY - Math.max(before.left.y, before.right.y);
  const shifted: CharacterPose = { ...pose, y: pose.y + delta };
  const after = footPointsForPose(shifted);
  return { pose: shifted, left: after.left, right: after.right };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function smooth(progress: number): number {
  const t = clamp(progress, 0, 1);
  return t * t * (3 - 2 * t);
}

function pathProgress(frame: number, startFrame: number, endFrame: number): number {
  return clamp((frame - startFrame) / Math.max(endFrame - startFrame, 1), 0, 1);
}

export function flightPose(options: MotionPathOptions): CharacterPose {
  const progress = pathProgress(options.frame, options.startFrame, options.endFrame);
  const eased = smooth(progress);
  const seed = options.seed ?? 0;
  const flap = options.frame * 0.62 + seed;
  const arc = Math.sin(progress * Math.PI) * 34;
  return {
    x: lerp(options.start.x, options.end.x, eased),
    y:
      lerp(options.start.y, options.end.y, eased) -
      arc +
      Math.sin(flap * 0.5) * 5 * Math.sin(progress * Math.PI),
    scale: options.scale,
    bodyRotation: Math.sin(progress * Math.PI * 2 + seed) * 3 + 1,
    wingNear: 35 + Math.sin(flap) * 55,
    wingFar: 22 + Math.sin(flap + 0.7) * 48,
    tail: 10 + Math.sin(flap - 0.6) * 10,
    head: 2 - Math.sin(flap) * 3,
    legLeftOffset: -6,
    legRightOffset: -5,
    eyeOpen: 1,
    contact: false,
  };
}

export function glidePose(options: MotionPathOptions): CharacterPose {
  const progress = pathProgress(options.frame, options.startFrame, options.endFrame);
  const eased = smooth(progress);
  const seed = options.seed ?? 0;
  return {
    x: lerp(options.start.x, options.end.x, eased),
    y: lerp(options.start.y, options.end.y, eased) - Math.sin(progress * Math.PI) * 18,
    scale: options.scale,
    bodyRotation: Math.sin(progress * Math.PI * 2 + seed) * 1.5,
    wingNear: 62 + Math.sin(options.frame * 0.12 + seed) * 5,
    wingFar: 48 + Math.sin(options.frame * 0.1 + seed + 0.5) * 4,
    tail: 9 + Math.sin(options.frame * 0.08 + seed) * 3,
    head: 1,
    legLeftOffset: -3,
    legRightOffset: -3,
    eyeOpen: 1,
    contact: false,
  };
}

export function landingPose(options: LandingMotionOptions): CharacterPose {
  const approach = pathProgress(options.frame, options.startFrame, options.contactFrame);
  const eased = 1 - Math.pow(1 - approach, 3);
  const seed = options.seed ?? 0;
  const contact = options.frame >= options.contactFrame;
  const settle = clamp(
    (options.frame - options.contactFrame) /
      Math.max(options.settleFrame - options.contactFrame, 1),
    0,
    1,
  );
  const brake = clamp((options.frame - (options.contactFrame - 24)) / 24, 0, 1);
  const flap = options.frame * 0.55 + seed;

  if (contact) {
    return {
      x: options.contactPoint.x,
      y: options.contactPoint.y,
      scale: options.scale * (1 - Math.sin(settle * Math.PI) * 0.018),
      bodyRotation: lerp(-3, 0, settle),
      wingNear: lerp(96, 8, smooth(settle)),
      wingFar: lerp(88, 12, smooth(settle)),
      tail: lerp(14, 6, smooth(settle)) + Math.sin(settle * Math.PI) * 3,
      head: lerp(4, 0, smooth(settle)),
      legLeftOffset: 0,
      legRightOffset: 0,
      eyeOpen: 1,
      contact: true,
    };
  }

  return {
    x: lerp(options.start.x, options.contactPoint.x, eased),
    y: lerp(options.start.y, options.contactPoint.y, eased) - Math.sin(approach * Math.PI) * 24,
    scale: options.scale,
    bodyRotation: lerp(-6, -3, eased),
    wingNear: lerp(35 + Math.sin(flap) * 40, 96, brake),
    wingFar: lerp(22 + Math.sin(flap + 0.5) * 35, 88, brake),
    tail: lerp(11 + Math.sin(flap - 0.4) * 7, 14, brake),
    head: lerp(2, 4, brake),
    legLeftOffset: lerp(-5, 8, brake),
    legRightOffset: lerp(-4, 8, brake),
    eyeOpen: 1,
    contact: false,
  };
}

export function idlePose(options: IdleMotionOptions): CharacterPose {
  const seed = options.seed ?? 0;
  const blinkPhase = (options.frame + Math.round(seed)) % 96;
  return {
    x: options.position.x + Math.sin(options.frame * 0.035 + seed) * 2,
    y: options.position.y + Math.sin(options.frame * 0.05 + seed) * 1.5,
    scale: options.scale,
    bodyRotation: Math.sin(options.frame * 0.04 + seed) * 1.2,
    wingNear: 8 + Math.sin(options.frame * 0.045 + seed) * 1.2,
    wingFar: 12 + Math.sin(options.frame * 0.04 + seed + 0.8) * 1,
    tail: 6 + Math.sin(options.frame * 0.08 + seed) * 3,
    head: Math.sin(options.frame * 0.06 + seed) * 2.5,
    legLeftOffset: 0,
    legRightOffset: 0,
    eyeOpen: blinkPhase < 3 ? 0.12 : 1,
    contact: true,
  };
}
