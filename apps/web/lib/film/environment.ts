import {
  applyCameraMatrix,
  layerCameraMatrix,
  type CameraMatrix,
  type CameraState,
  type CameraViewport,
  type CameraWorld,
  type ScreenPoint,
} from "@fableon/camera-engine";

export type EnvironmentAssetId = "plate-distant" | "plate";

export interface EnvironmentLayer {
  readonly id: string;
  readonly assetId: EnvironmentAssetId | null;
  /** 0 = pinned to world center; 1 = full foreground camera movement. */
  readonly depth: number;
  readonly opacity: number;
  readonly note: string;
}

/**
 * The repository has one painted forest plate derived from the Phase 2.8 start
 * frame, plus a softened copy for the distant plane. This is intentionally a
 * conservative two-plane parallax demonstration, not a falsely claimed full
 * multilayer painting.
 */
export const ENVIRONMENT_LAYERS: readonly EnvironmentLayer[] = Object.freeze([
  {
    id: "distant-forest",
    assetId: "plate-distant",
    depth: 0.18,
    opacity: 0.78,
    note: "Softened distant plane derived from the same painted plate.",
  },
  {
    id: "midground-forest",
    assetId: "plate",
    depth: 0.55,
    opacity: 1,
    note: "Primary painted forest, branch, and right trunk plate.",
  },
  {
    id: "atmospheric-overlay",
    assetId: null,
    depth: 0.95,
    opacity: 1,
    note: "Procedural light, mist, pollen, and foreground leaf sway.",
  },
]);

export function assertEnvironmentLayerOrder(
  layers: readonly EnvironmentLayer[] = ENVIRONMENT_LAYERS,
): void {
  let previousDepth = -1;
  const ids = new Set<string>();
  for (const layer of layers) {
    if (ids.has(layer.id)) {
      throw new Error(`Duplicate environment layer "${layer.id}".`);
    }
    ids.add(layer.id);
    if (layer.depth < previousDepth) {
      throw new Error("Environment layers must be ordered from distant to near.");
    }
    if (layer.depth < 0) {
      throw new Error("Environment layer depth cannot be negative.");
    }
    previousDepth = layer.depth;
  }
}

export function environmentLayerMatrix(
  camera: CameraState,
  viewport: CameraViewport,
  world: CameraWorld,
  layer: EnvironmentLayer,
): CameraMatrix {
  return layerCameraMatrix(camera, viewport, world, layer.depth);
}

export function environmentLayerPoint(
  camera: CameraState,
  viewport: CameraViewport,
  world: CameraWorld,
  layer: EnvironmentLayer,
  point: { readonly x: number; readonly y: number },
): ScreenPoint {
  return applyCameraMatrix(environmentLayerMatrix(camera, viewport, world, layer), point);
}
