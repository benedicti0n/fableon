import type { AnimationTrack } from "@fableon/scene-schema";
import {
  evaluateSpriteRig,
  transformPoint,
  type SpriteNodeDefinition,
  type SpriteRigDefinition,
  type SpriteTransformTracks,
  type Vec2,
} from "@fableon/sprite-motion";

export const PREMIUM_PACK_ID = "premium-bird-v1";
export const PREMIUM_FRAME_COUNT = 48;
export const PREMIUM_FPS = 24;
export const PREMIUM_CONTACT_FRAME = 30;
export const PREMIUM_SETTLE_FRAME = 38;
export const PREMIUM_DISPLAY_SCALE = 2;
export const PREMIUM_SCENE_OFFSET = Object.freeze({ x: 0, y: 44 });
export const PREMIUM_BODY_TOP_LEFT = Object.freeze({ x: 600, y: 494 });
export const PREMIUM_BODY_PIVOT = Object.freeze({ x: 133, y: 80 });
export const PREMIUM_HEAD_PIVOT = Object.freeze({ x: 30, y: 150 });
export const PREMIUM_LEFT_FOOT = Object.freeze({ x: 53, y: 133 });
export const PREMIUM_RIGHT_FOOT = Object.freeze({ x: 53, y: 116 });

type Interpolation = "hold" | "linear" | "easeInOutCubic";

function track(
  entries: readonly (readonly [frame: number, value: number, interpolation?: Interpolation])[],
): AnimationTrack {
  return {
    keyframes: entries.map(([frame, value, interpolation = "easeInOutCubic"]) => ({
      frame,
      value,
      interpolation,
    })),
  };
}

function tracks(
  values: Partial<Record<keyof SpriteTransformTracks, AnimationTrack>>,
): SpriteTransformTracks {
  return values as SpriteTransformTracks;
}

function node(
  id: string,
  parentId: string | null,
  drawOrder: number,
  pivot: Vec2,
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  },
  animationTracks?: SpriteTransformTracks,
): SpriteNodeDefinition {
  return {
    id,
    parentId,
    drawOrder,
    pivot,
    transform,
    ...(animationTracks ? { tracks: animationTracks } : {}),
  };
}

/**
 * Gate 2 conversion of the candidate's 960x540 provisional rig. The body-local
 * joints and part scales come from rig-candidate-v2.json. The body/head pivots
 * are moved to sensible rotation centers while preserving the same visible
 * registration, and the whole character is displayed at 2x in the 1920x1080
 * scene. Motion timing follows the Phase 2.5 landing phases.
 */
export function createPremiumBaseRig(): SpriteRigDefinition {
  return Object.freeze({
    nodes: Object.freeze([
      node(
        "body",
        null,
        50,
        PREMIUM_BODY_PIVOT,
        {
          x: 866,
          y: 642,
          rotation: 0,
          scaleX: PREMIUM_DISPLAY_SCALE,
          scaleY: PREMIUM_DISPLAY_SCALE,
        },
        tracks({
          x: track([
            [0, 466],
            [8, 536],
            [16, 686],
            [24, 824],
            [30, 866],
            [47, 866, "hold"],
          ]),
          y: track([
            [0, 344],
            [8, 398],
            [16, 514],
            [24, 622],
            [30, 654],
            [33, 659.5],
            [36, 661],
            [40, 659],
            [44, 656],
            [47, 654],
          ]),
          rotation: track([
            [0, -8],
            [8, -4],
            [16, 0],
            [22, 2],
            [26, -1],
            [30, 0],
            [33, 0],
            [36, 0],
            [47, 0, "hold"],
          ]),
        }),
      ),
      node(
        "tail",
        "body",
        10,
        { x: 118, y: 18 },
        { x: 77, y: 114, rotation: 0, scaleX: 0.9, scaleY: 0.9 },
        tracks({
          rotation: track([
            [0, 10],
            [8, 5],
            [16, 10],
            [24, 12],
            [30, 12],
            [34, 16],
            [38, 8],
            [47, 6, "hold"],
          ]),
        }),
      ),
      node(
        "wingFar",
        "body",
        20,
        { x: 147, y: 25 },
        { x: 163, y: 51, rotation: 0, scaleX: 0.94, scaleY: 0.94 },
        tracks({
          rotation: track([
            [0, 20],
            [2, -12],
            [4, 20],
            [6, 52],
            [8, 20],
            [10, -12],
            [12, 20],
            [14, 52],
            [15, 43],
            [20, 45],
            [24, 52],
            [28, 57],
            [30, 58],
            [33, 40],
            [36, 20],
            [38, 12],
            [47, 12, "hold"],
          ]),
        }),
      ),
      node(
        "legLeft",
        "body",
        30,
        { x: 53, y: 13 },
        { x: 142, y: 145, rotation: 0, scaleX: 0.63, scaleY: 0.63 },
        tracks({
          y: track([
            [0, 145],
            [16, 145],
            [30, 145],
            [33, 142.25],
            [36, 141.5],
            [40, 142.5],
            [44, 144],
            [47, 145, "hold"],
          ]),
        }),
      ),
      node(
        "legRight",
        "body",
        31,
        { x: 53, y: 12 },
        { x: 193, y: 154, rotation: 0, scaleX: 0.64, scaleY: 0.64 },
        tracks({
          y: track([
            [0, 154],
            [16, 154],
            [30, 154],
            [33, 151.25],
            [36, 150.5],
            [40, 151.5],
            [44, 153],
            [47, 154, "hold"],
          ]),
        }),
      ),
      node(
        "wingNear",
        "body",
        60,
        { x: 148, y: 23 },
        { x: 145, y: 65, rotation: 0, scaleX: 1, scaleY: 1 },
        tracks({
          rotation: track([
            [0, 35],
            [2, 92],
            [4, 35],
            [6, -22],
            [8, 35],
            [10, 92],
            [12, 35],
            [14, -22],
            [15, -5],
            [20, 35],
            [24, 65],
            [28, 88],
            [30, 96],
            [33, 60],
            [36, 25],
            [38, 8],
            [47, 8, "hold"],
          ]),
        }),
      ),
      node(
        "head",
        "body",
        70,
        PREMIUM_HEAD_PIVOT,
        { x: 181, y: 116, rotation: 0, scaleX: 1, scaleY: 1 },
        tracks({
          rotation: track([
            [0, 6],
            [8, 2],
            [16, -2],
            [24, 4],
            [30, 3],
            [34, -1],
            [38, 2],
            [42, 0],
            [47, 0, "hold"],
          ]),
        }),
      ),
      node(
        "beak",
        "head",
        80,
        { x: 8, y: 22 },
        { x: 175, y: 65, rotation: 0, scaleX: 0.72, scaleY: 0.72 },
      ),
      node(
        "eye",
        "head",
        85,
        { x: 22, y: 22 },
        { x: 140, y: 56, rotation: 0, scaleX: 0.62, scaleY: 0.62 },
        tracks({
          scaleY: track([
            [0, 0.62, "hold"],
            [40, 0.62, "hold"],
            [42, 0.08],
            [44, 0.62],
            [47, 0.62, "hold"],
          ]),
        }),
      ),
    ]),
  });
}

export function evaluatePremiumRig(frame: number): ReturnType<typeof evaluateSpriteRig> {
  if (!Number.isInteger(frame) || frame < 0 || frame >= PREMIUM_FRAME_COUNT) {
    throw new Error(`Premium frame must be an integer from 0 to ${PREMIUM_FRAME_COUNT - 1}.`);
  }
  return evaluateSpriteRig(createPremiumBaseRig(), frame);
}

export function premiumFootPoints(frame: number): {
  readonly left: Vec2;
  readonly right: Vec2;
} {
  const evaluated = evaluatePremiumRig(frame);
  const leftNode = evaluated.find((node) => node.id === "legLeft");
  const rightNode = evaluated.find((node) => node.id === "legRight");
  if (!leftNode || !rightNode) {
    throw new Error("Premium rig is missing a leg node.");
  }
  return {
    left: transformPoint(leftNode.world, PREMIUM_LEFT_FOOT),
    right: transformPoint(rightNode.world, PREMIUM_RIGHT_FOOT),
  };
}
