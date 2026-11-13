import { placeFrame, type FramePlacement } from "./placement";
import type { FrameRenderMetadata } from "./frames";

export interface Rigby2DShotConfig {
  readonly id: string;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly frameCount: number;
  readonly world: { readonly width: number; readonly height: number };
  readonly camera: { readonly centerX: number; readonly centerY: number; readonly zoom: number };
  readonly actor: {
    readonly characterId: string;
    readonly versionId: string;
    readonly animation: string;
    readonly x: number;
    readonly y: number;
    readonly scale: number;
  };
  readonly background: {
    readonly kind: "neutral-stage";
    readonly top: string;
    readonly bottom: string;
    readonly floor: string;
    readonly horizon: number;
  };
}

export const DEFAULT_R2_2_SHOT: Rigby2DShotConfig = {
  id: "r3-1-artisan-arm",
  title: "R3.1 · Rigby2D artisan arm · Fableon shot",
  width: 1920,
  height: 1080,
  fps: 24,
  frameCount: 73,
  world: { width: 1920, height: 1080 },
  camera: { centerX: 960, centerY: 540, zoom: 1 },
  actor: {
    characterId: "artisan-arm-r22",
    versionId: "v1",
    animation: "showcase_ikfix",
    x: 960,
    y: 1040,
    scale: 0.9,
  },
  background: {
    kind: "neutral-stage",
    top: "#f7f5f2",
    bottom: "#e4dfd8",
    floor: "#cfc7bc",
    horizon: 0.82,
  },
};

export function shotPlacement(
  config: Rigby2DShotConfig,
  metadata: FrameRenderMetadata,
): FramePlacement {
  return placeFrame({
    frameWidth: metadata.frameWidth,
    frameHeight: metadata.frameHeight,
    pivot: metadata.pivot,
    actor: {
      x: config.actor.x,
      y: config.actor.y,
      scale: config.actor.scale,
    },
    camera: config.camera,
    viewport: { width: config.width, height: config.height },
  });
}

export function frameToTime(frameIndex: number, fps: number): number {
  return frameIndex / fps;
}

export function frameCountForDuration(durationSeconds: number, fps: number): number {
  return Math.max(1, Math.round(durationSeconds * fps) + 1);
}
