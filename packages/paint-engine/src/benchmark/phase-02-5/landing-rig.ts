import {
  evaluateSpriteRig,
  type ResolvedSpriteNode,
  type SpriteNodeDefinition,
  type SpriteRigDefinition,
  type SpriteTransformTracks,
} from "@fableon/sprite-motion";

export const LANDING_FRAME_COUNT = 48;
export const LANDING_FPS = 24;
export const LANDING_CONTACT_FRAME = 30;
export const LANDING_SETTLE_FRAME = 38;
export const BIRD_FOOT_LOCAL = Object.freeze({ x: 60, y: 228 });

type Interpolation = "hold" | "linear" | "easeInOutCubic";
type Track = { keyframes: Array<{ frame: number; value: number; interpolation: Interpolation }> };

function track(
  entries: readonly (readonly [frame: number, value: number, interpolation?: Interpolation])[],
): Track {
  return {
    keyframes: entries.map(([frame, value, interpolation = "easeInOutCubic"]) => ({
      frame,
      value,
      interpolation,
    })),
  };
}

function tracks(
  values: Partial<Record<keyof SpriteTransformTracks, Track>>,
): SpriteTransformTracks {
  return values as SpriteTransformTracks;
}

function node(
  id: string,
  parentId: string | null,
  drawOrder: number,
  pivot: { x: number; y: number },
  transform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number },
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

export type LandingPhase = "flight" | "approach" | "contact" | "settle";

export function landingPhaseForFrame(frame: number): LandingPhase {
  if (!Number.isInteger(frame) || frame < 0 || frame >= LANDING_FRAME_COUNT) {
    throw new Error(`Frame must be an integer from 0 to ${LANDING_FRAME_COUNT - 1}.`);
  }
  if (frame < 16) return "flight";
  if (frame < LANDING_CONTACT_FRAME) return "approach";
  if (frame < LANDING_SETTLE_FRAME) return "contact";
  return "settle";
}

/**
 * A benchmark-local rig. Attachment coordinates are in the parent's image
 * space; pivots come from the layered artwork. This does not change the
 * persisted scene schema.
 */
export function createLandingRig(): SpriteRigDefinition {
  const identity = { rotation: 0, scaleX: 1, scaleY: 1 };

  return Object.freeze({
    nodes: Object.freeze([
      node(
        "body",
        null,
        50,
        { x: 380, y: 300 },
        { x: 960, y: 647, ...identity },
        tracks({
          x: track([
            [0, 470, "easeInOutCubic"],
            [8, 600, "easeInOutCubic"],
            [16, 730, "easeInOutCubic"],
            [22, 840, "easeInOutCubic"],
            [26, 910, "easeInOutCubic"],
            [30, 960, "easeInOutCubic"],
            [47, 960, "hold"],
          ]),
          y: track([
            [0, 300, "easeInOutCubic"],
            [8, 365, "easeInOutCubic"],
            [16, 450, "easeInOutCubic"],
            [22, 540, "easeInOutCubic"],
            [26, 610, "easeInOutCubic"],
            [30, 647, "easeInOutCubic"],
            [33, 655, "easeInOutCubic"],
            [36, 649, "easeInOutCubic"],
            [40, 647, "easeInOutCubic"],
            [47, 647, "hold"],
          ]),
          rotation: track([
            [0, -12, "easeInOutCubic"],
            [8, -6, "easeInOutCubic"],
            [16, 2, "easeInOutCubic"],
            [22, 6, "easeInOutCubic"],
            [26, -3, "easeInOutCubic"],
            [30, 0, "easeInOutCubic"],
            [33, 0, "easeInOutCubic"],
            [36, 0, "easeInOutCubic"],
            [47, 0, "hold"],
          ]),
        }),
      ),
      node(
        "tail",
        "body",
        10,
        { x: 440, y: 108 },
        { x: 235, y: 330, ...identity },
        tracks({
          rotation: track([
            [0, -6, "easeInOutCubic"],
            [8, 2, "easeInOutCubic"],
            [16, -4, "easeInOutCubic"],
            [24, 8, "easeInOutCubic"],
            [30, 12, "easeInOutCubic"],
            [34, 18, "easeInOutCubic"],
            [38, 6, "easeInOutCubic"],
            [47, 0, "hold"],
          ]),
        }),
      ),
      node(
        "wingFar",
        "body",
        20,
        { x: 418, y: 394 },
        { x: 345, y: 235, ...identity },
        tracks({
          rotation: track([
            [0, -10, "easeInOutCubic"],
            [4, -75, "easeInOutCubic"],
            [8, -25, "easeInOutCubic"],
            [12, -70, "easeInOutCubic"],
            [16, -20, "easeInOutCubic"],
            [20, -40, "easeInOutCubic"],
            [24, -15, "easeInOutCubic"],
            [28, -50, "easeInOutCubic"],
            [30, -70, "easeInOutCubic"],
            [34, -55, "easeInOutCubic"],
            [38, -50, "easeInOutCubic"],
            [47, -50, "hold"],
          ]),
        }),
      ),
      node(
        "legLeft",
        "body",
        30,
        { x: 60, y: 20 },
        { x: 330, y: 375, ...identity },
        tracks({
          y: track([
            [0, 375, "easeInOutCubic"],
            [16, 370, "easeInOutCubic"],
            [24, 375, "easeInOutCubic"],
            [30, 375, "easeInOutCubic"],
            [33, 367, "easeInOutCubic"],
            [36, 373, "easeInOutCubic"],
            [40, 375, "easeInOutCubic"],
            [47, 375, "hold"],
          ]),
          rotation: track([
            [0, 25, "easeInOutCubic"],
            [16, 22, "easeInOutCubic"],
            [24, 12, "easeInOutCubic"],
            [30, 0, "easeInOutCubic"],
            [47, 0, "hold"],
          ]),
        }),
      ),
      node(
        "legRight",
        "body",
        31,
        { x: 60, y: 20 },
        { x: 440, y: 375, ...identity },
        tracks({
          y: track([
            [0, 375, "easeInOutCubic"],
            [16, 370, "easeInOutCubic"],
            [24, 375, "easeInOutCubic"],
            [30, 375, "easeInOutCubic"],
            [33, 367, "easeInOutCubic"],
            [36, 373, "easeInOutCubic"],
            [40, 375, "easeInOutCubic"],
            [47, 375, "hold"],
          ]),
          rotation: track([
            [0, 25, "easeInOutCubic"],
            [16, 22, "easeInOutCubic"],
            [24, 12, "easeInOutCubic"],
            [30, 0, "easeInOutCubic"],
            [47, 0, "hold"],
          ]),
        }),
      ),
      node(
        "wingNear",
        "body",
        60,
        { x: 418, y: 394 },
        { x: 445, y: 230, ...identity },
        tracks({
          rotation: track([
            [0, -20, "easeInOutCubic"],
            [4, -85, "easeInOutCubic"],
            [8, -15, "easeInOutCubic"],
            [12, -80, "easeInOutCubic"],
            [16, -30, "easeInOutCubic"],
            [20, -50, "easeInOutCubic"],
            [24, -25, "easeInOutCubic"],
            [28, -60, "easeInOutCubic"],
            [30, -80, "easeInOutCubic"],
            [34, -65, "easeInOutCubic"],
            [38, -55, "easeInOutCubic"],
            [47, -55, "hold"],
          ]),
        }),
      ),
      node(
        "head",
        "body",
        70,
        { x: 120, y: 245 },
        { x: 470, y: 185, rotation: 0, scaleX: 0.94, scaleY: 0.94 },
        tracks({
          rotation: track([
            [0, 8, "easeInOutCubic"],
            [8, 4, "easeInOutCubic"],
            [16, -2, "easeInOutCubic"],
            [24, 6, "easeInOutCubic"],
            [30, 4, "easeInOutCubic"],
            [34, -2, "easeInOutCubic"],
            [38, 3, "easeInOutCubic"],
            [42, 0, "easeInOutCubic"],
            [47, 0, "hold"],
          ]),
        }),
      ),
      node("beak", "head", 80, { x: 8, y: 38 }, { x: 300, y: 165, ...identity }),
      node(
        "eye",
        "head",
        85,
        { x: 24, y: 24 },
        { x: 233, y: 145, ...identity },
        tracks({
          scaleY: track([
            [0, 1, "hold"],
            [40, 1, "hold"],
            [42, 0.12, "easeInOutCubic"],
            [44, 1, "easeInOutCubic"],
            [47, 1, "hold"],
          ]),
        }),
      ),
    ]),
  });
}

export function evaluateLandingRig(frame: number): readonly ResolvedSpriteNode[] {
  if (!Number.isInteger(frame) || frame < 0 || frame >= LANDING_FRAME_COUNT) {
    throw new Error(`Landing frame must be an integer from 0 to ${LANDING_FRAME_COUNT - 1}.`);
  }
  return evaluateSpriteRig(createLandingRig(), frame);
}
