import { worldToScreen } from "@fableon/camera-engine";

import type { FramePivot } from "./frames";

export interface FableonCamera {
  readonly centerX: number;
  readonly centerY: number;
  readonly zoom: number;
}

export interface FableonViewport {
  readonly width: number;
  readonly height: number;
}

export interface FableonActorPlacement {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface FramePlacementInput {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly pivot: FramePivot;
  readonly actor: FableonActorPlacement;
  readonly camera: FableonCamera;
  readonly viewport: FableonViewport;
}

export interface FramePlacement {
  readonly anchorX: number;
  readonly anchorY: number;
  readonly drawX: number;
  readonly drawY: number;
  readonly drawWidth: number;
  readonly drawHeight: number;
  readonly originX: number;
  readonly originY: number;
  readonly scale: number;
}

/**
 * Places a Rigby2D frame by its skeleton-origin pivot, not by centering the cropped PNG.
 *
 * The actor anchor is a Fableon world point. The Rigby2D pivot is the skeleton origin in the
 * exported PNG, so the same pivot is used for every frame. This keeps the character stationary
 * when the animation only moves a limb.
 */
export function placeFrame(input: FramePlacementInput): FramePlacement {
  const scale = input.actor.scale * input.camera.zoom;
  const anchor = worldToScreen({ ...input.camera, rotation: 0 }, input.viewport, {
    x: input.actor.x,
    y: input.actor.y,
  });
  const originX = input.pivot.x * input.frameWidth;
  const originY = input.pivot.y * input.frameHeight;
  return {
    anchorX: anchor.x,
    anchorY: anchor.y,
    drawX: anchor.x - originX * scale,
    drawY: anchor.y - originY * scale,
    drawWidth: input.frameWidth * scale,
    drawHeight: input.frameHeight * scale,
    originX,
    originY,
    scale,
  };
}
