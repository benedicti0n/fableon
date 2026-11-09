export type CameraEasing = "linear" | "easeInOutCubic" | "smooth";

export interface CameraKeyframe {
  readonly frame: number;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly rotation?: number;
  readonly easing?: CameraEasing;
}

export interface CameraWorld {
  readonly width: number;
  readonly height: number;
}

export interface CameraTrack {
  readonly id: string;
  readonly world: CameraWorld;
  readonly keyframes: readonly CameraKeyframe[];
}

export interface CameraViewport {
  readonly width: number;
  readonly height: number;
}

export interface CameraState {
  readonly centerX: number;
  readonly centerY: number;
  readonly zoom: number;
  readonly rotation: number;
}

/** Canvas 2D affine matrix: [a c e; b d f; 0 0 1]. */
export interface CameraMatrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export const CANONICAL_VIEWPORT: CameraViewport = Object.freeze({
  width: 1920,
  height: 1080,
});

export class CameraError extends Error {
  override readonly name = "CameraError";
}

function ease(progress: number, easing: CameraEasing): number {
  const t = Math.min(Math.max(progress, 0), 1);
  if (easing === "linear") return t;
  if (easing === "smooth") return t * t * (3 - 2 * t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function validateTrack(track: CameraTrack): void {
  if (track.keyframes.length === 0) {
    throw new CameraError("A camera track must contain at least one keyframe.");
  }
  if (track.world.width <= 0 || track.world.height <= 0) {
    throw new CameraError("Camera world dimensions must be positive.");
  }
  let previousFrame = -1;
  for (const keyframe of track.keyframes) {
    if (!Number.isInteger(keyframe.frame) || keyframe.frame < 0) {
      throw new CameraError("Camera keyframe indices must be non-negative integers.");
    }
    if (keyframe.frame <= previousFrame) {
      throw new CameraError("Camera keyframes must be strictly ordered by frame.");
    }
    if (keyframe.zoom <= 0 || !Number.isFinite(keyframe.zoom)) {
      throw new CameraError("Camera zoom must be a positive finite number.");
    }
    previousFrame = keyframe.frame;
  }
}

function clampCenter(value: number, worldSize: number, viewportSize: number, zoom: number): number {
  const half = viewportSize / (2 * zoom);
  if (worldSize <= half * 2) {
    return worldSize / 2;
  }
  return Math.min(Math.max(value, half), worldSize - half);
}

export function evaluateCamera(
  track: CameraTrack,
  frame: number,
  viewport: CameraViewport = CANONICAL_VIEWPORT,
): CameraState {
  validateTrack(track);
  if (!Number.isInteger(frame) || frame < 0) {
    throw new CameraError("Camera frame must be a non-negative integer.");
  }
  const keyframes = track.keyframes;
  const first = keyframes[0];
  const last = keyframes.at(-1);
  if (!first || !last) {
    throw new CameraError("A camera track must contain at least one keyframe.");
  }
  if (frame <= first.frame) {
    return clampCameraState(track, viewport, {
      centerX: first.x,
      centerY: first.y,
      zoom: first.zoom,
      rotation: first.rotation ?? 0,
    });
  }
  if (frame >= last.frame) {
    return clampCameraState(track, viewport, {
      centerX: last.x,
      centerY: last.y,
      zoom: last.zoom,
      rotation: last.rotation ?? 0,
    });
  }

  let left = first;
  let right = last;
  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const candidate = keyframes[index];
    const next = keyframes[index + 1];
    if (candidate && next && frame >= candidate.frame && frame <= next.frame) {
      left = candidate;
      right = next;
      break;
    }
  }
  const span = right.frame - left.frame;
  const progress = span <= 0 ? 0 : (frame - left.frame) / span;
  const t = ease(progress, left.easing ?? "easeInOutCubic");
  const interpolate = (from: number, to: number) => from + (to - from) * t;
  return clampCameraState(track, viewport, {
    centerX: interpolate(left.x, right.x),
    centerY: interpolate(left.y, right.y),
    zoom: interpolate(left.zoom, right.zoom),
    rotation: interpolate(left.rotation ?? 0, right.rotation ?? 0),
  });
}

function clampCameraState(
  track: CameraTrack,
  viewport: CameraViewport,
  state: CameraState,
): CameraState {
  return {
    ...state,
    centerX: clampCenter(state.centerX, track.world.width, viewport.width, state.zoom),
    centerY: clampCenter(state.centerY, track.world.height, viewport.height, state.zoom),
  };
}

/**
 * Camera-space matrix for a parallax layer.
 *
 * depth = 1: world camera movement is applied normally.
 * depth = 0: the layer is pinned to the world center.
 * Values between 0 and 1 move less than the foreground.
 */
export function layerCameraMatrix(
  camera: CameraState,
  viewport: CameraViewport,
  world: CameraWorld,
  depth: number,
): CameraMatrix {
  if (!Number.isFinite(depth) || depth < 0) {
    throw new CameraError("Parallax depth must be a non-negative finite number.");
  }
  const anchorX = world.width / 2;
  const anchorY = world.height / 2;
  const zoom = camera.zoom;
  const offsetX = (camera.centerX - anchorX) * zoom * depth;
  const offsetY = (camera.centerY - anchorY) * zoom * depth;
  return {
    a: zoom,
    b: 0,
    c: 0,
    d: zoom,
    e: viewport.width / 2 - anchorX * zoom - offsetX,
    f: viewport.height / 2 - anchorY * zoom - offsetY,
  };
}

export function worldToScreen(
  camera: CameraState,
  viewport: CameraViewport,
  point: { readonly x: number; readonly y: number },
): ScreenPoint {
  return {
    x: viewport.width / 2 + (point.x - camera.centerX) * camera.zoom,
    y: viewport.height / 2 + (point.y - camera.centerY) * camera.zoom,
  };
}

export function screenToWorld(
  camera: CameraState,
  viewport: CameraViewport,
  point: ScreenPoint,
): ScreenPoint {
  return {
    x: camera.centerX + (point.x - viewport.width / 2) / camera.zoom,
    y: camera.centerY + (point.y - viewport.height / 2) / camera.zoom,
  };
}

export function applyCameraMatrix(
  matrix: CameraMatrix,
  point: { readonly x: number; readonly y: number },
): ScreenPoint {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}
