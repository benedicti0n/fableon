import {
  TRANSFORM_PROPERTIES,
  type Layer,
  type Project,
  type Scene,
  type Transform,
} from "@fableon/scene-schema";

import { evaluateKeyframeTrack } from "./interpolate";
import {
  buildTimeline,
  FrameOutOfRangeError,
  InvalidFrameError,
  resolveGlobalFrame,
  TimelineError,
} from "./timeline";

export type EvaluatedLayerContent =
  | { readonly type: "asset"; readonly assetId: string }
  | {
      readonly type: "text";
      readonly text: string;
      readonly fontFamily: string;
      readonly fontSize: number;
      readonly color: string;
    }
  | { readonly type: "solid"; readonly color: string };

export interface EvaluatedLayer {
  readonly id: string;
  readonly name: string;
  readonly type: Layer["type"];
  readonly order: number;
  readonly visible: boolean;
  readonly transform: Transform;
  readonly content: EvaluatedLayerContent;
}

export interface FramePlan {
  readonly globalFrame: number;
  readonly sceneId: string;
  readonly sceneName: string;
  readonly sceneIndex: number;
  readonly localFrame: number;
  readonly frameRate: number;
  readonly layers: readonly EvaluatedLayer[];
}

/** Resolves animated transform properties from the base transform. */
export function evaluateLayerTransform(layer: Layer, localFrame: number): Transform {
  const transform: Transform = { ...layer.transform };

  for (const property of TRANSFORM_PROPERTIES) {
    const track = layer.animation?.[property];
    if (track) {
      transform[property] = evaluateKeyframeTrack(track, localFrame);
    }
  }

  return transform;
}

function evaluateLayerContent(layer: Layer): EvaluatedLayerContent {
  switch (layer.type) {
    case "asset":
      return { type: "asset", assetId: layer.assetId };
    case "text":
      return {
        type: "text",
        text: layer.text,
        fontFamily: layer.fontFamily,
        fontSize: layer.fontSize,
        color: layer.color,
      };
    case "solid":
      return { type: "solid", color: layer.color };
  }
}

/** Evaluates one layer into pure, renderer-independent state. */
export function evaluateLayer(layer: Layer, localFrame: number): EvaluatedLayer {
  return {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    order: layer.order,
    visible: layer.visible,
    transform: evaluateLayerTransform(layer, localFrame),
    content: evaluateLayerContent(layer),
  };
}

/**
 * Evaluates all layers of a scene in ascending explicit stacking order. Layers
 * with equal order are impossible in a validated scene; the sort is stable for
 * defensive callers.
 */
export function evaluateSceneFrame(scene: Scene, localFrame: number): readonly EvaluatedLayer[] {
  if (!Number.isInteger(localFrame) || localFrame < 0) {
    throw new InvalidFrameError(localFrame);
  }
  if (localFrame >= scene.durationFrames) {
    throw new FrameOutOfRangeError(localFrame, scene.durationFrames, "scene");
  }

  return [...scene.layers]
    .sort((left, right) => left.order - right.order)
    .map((layer) => evaluateLayer(layer, localFrame));
}

/**
 * The central deterministic contract: project plus global frame in, pure
 * evaluated frame plan out. It never mutates the project, consults the wall
 * clock, or uses unseeded randomness.
 */
export function evaluateProjectFrame(project: Project, globalFrame: number): FramePlan {
  const timeline = buildTimeline(project);
  const resolution = resolveGlobalFrame(timeline, globalFrame);
  const scene = project.scenes[resolution.sceneIndex];

  if (!scene) {
    throw new TimelineError(`Scene index ${resolution.sceneIndex} is missing from the project.`);
  }

  return {
    globalFrame: resolution.globalFrame,
    sceneId: resolution.sceneId,
    sceneName: resolution.sceneName,
    sceneIndex: resolution.sceneIndex,
    localFrame: resolution.localFrame,
    frameRate: project.frameRate,
    layers: evaluateSceneFrame(scene, resolution.localFrame),
  };
}
