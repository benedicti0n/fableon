import type { EvaluatedLayer, FramePlan } from "@fableon/animation-core";

import {
  RenderError,
  type Canvas2DContextLike,
  type CanvasFrameRenderOptions,
  type FrameRenderOptions,
  type ImageAssetResolver,
  type RasterImage,
  type RenderFrameResult,
  type RenderSurface,
} from "./types";

const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * Version-1 transform convention, shared by all layer content:
 *
 * 1. The canvas origin is the top-left, with X right and Y down.
 * 2. A layer's `x`/`y` places the top-left of its local content box.
 * 3. The transform origin and rotation pivot are that same top-left point.
 *    Version 1 has no anchor field; this is the documented limitation.
 * 4. Operations apply in order: translate, rotate, scale, then draw content at
 *    local (0, 0). Rotation is in degrees.
 * 5. Solid layers fill the full surface at local size. Image layers draw at
 *    their intrinsic pixel dimensions. Text is laid out top-left with the
 *    declared font size and a fixed 1.2 line height for newline-separated lines.
 * 6. Layer opacity multiplies the normal source-over alpha; invisible layers
 *    are skipped.
 */
function assertSurface(surface: RenderSurface): void {
  if (
    !Number.isInteger(surface.width) ||
    !Number.isInteger(surface.height) ||
    surface.width <= 0 ||
    surface.height <= 0
  ) {
    throw new RenderError(
      `Render surface dimensions must be positive integers; received ${surface.width}×${surface.height}.`,
      { code: "invalid_surface" },
    );
  }
}

function clampOpacity(opacity: number): number {
  return Math.min(Math.max(opacity, 0), 1);
}

function isVisibleAssetLayer(
  layer: EvaluatedLayer,
): layer is EvaluatedLayer & { content: { type: "asset"; assetId: string } } {
  return layer.visible && layer.content.type === "asset";
}

async function resolveVisibleAssets(
  layers: readonly EvaluatedLayer[],
  assets: ImageAssetResolver,
): Promise<Map<string, RasterImage>> {
  const layersByAsset = new Map<string, EvaluatedLayer>();

  for (const layer of layers) {
    if (isVisibleAssetLayer(layer) && !layersByAsset.has(layer.content.assetId)) {
      layersByAsset.set(layer.content.assetId, layer);
    }
  }

  const resolved = new Map<string, RasterImage>();

  await Promise.all(
    [...layersByAsset].map(async ([assetId, layer]) => {
      try {
        resolved.set(assetId, await assets.resolve(assetId));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new RenderError(
          `Could not resolve asset "${assetId}" for layer "${layer.id}": ${detail}`,
          {
            code: "asset_resolution_failed",
            layerId: layer.id,
            assetId,
            cause: error,
          },
        );
      }
    }),
  );

  return resolved;
}

function drawTextLayer(
  context: Canvas2DContextLike,
  layer: EvaluatedLayer & { content: { type: "text" } },
): void {
  context.fillStyle = layer.content.color;
  context.font = `${layer.content.fontSize}px ${layer.content.fontFamily}`;
  context.textBaseline = "top";

  const lines = layer.content.text.split(/\r?\n/);
  const lineHeight = layer.content.fontSize * 1.2;
  lines.forEach((line, index) => {
    context.fillText(line, 0, index * lineHeight);
  });
}

function drawLayer(
  context: Canvas2DContextLike,
  layer: EvaluatedLayer,
  surface: RenderSurface,
  resolvedAssets: ReadonlyMap<string, RasterImage>,
): void {
  context.save();

  try {
    context.globalAlpha = clampOpacity(layer.transform.opacity);
    context.translate(layer.transform.x, layer.transform.y);
    context.rotate(layer.transform.rotation * DEGREES_TO_RADIANS);
    context.scale(layer.transform.scaleX, layer.transform.scaleY);

    switch (layer.content.type) {
      case "solid":
        context.fillStyle = layer.content.color;
        context.fillRect(0, 0, surface.width, surface.height);
        break;
      case "text":
        drawTextLayer(context, layer as EvaluatedLayer & { content: { type: "text" } });
        break;
      case "asset": {
        const image = resolvedAssets.get(layer.content.assetId);
        if (!image) {
          throw new RenderError(
            `Asset "${layer.content.assetId}" was not resolved before drawing layer "${layer.id}".`,
            {
              code: "asset_resolution_failed",
              layerId: layer.id,
              assetId: layer.content.assetId,
            },
          );
        }
        context.drawImage(image.source, 0, 0, image.width, image.height);
        break;
      }
    }
  } finally {
    context.restore();
  }
}

/**
 * Renders a deterministic FramePlan into a Canvas 2D-like surface. The plan is
 * treated as immutable. The surface is cleared before drawing by default, and
 * every layer is wrapped in save/restore so state cannot leak.
 */
export async function renderFrame(
  framePlan: FramePlan,
  surface: RenderSurface,
  options: FrameRenderOptions,
): Promise<RenderFrameResult> {
  assertSurface(surface);
  const { context } = surface;

  if (options.clear !== false) {
    context.save();
    try {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, surface.width, surface.height);
    } finally {
      context.restore();
    }
  }

  const resolvedAssets = await resolveVisibleAssets(framePlan.layers, options.assets);
  const renderedLayerIds: string[] = [];
  const skippedLayerIds: string[] = [];

  context.save();
  try {
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    for (const layer of framePlan.layers) {
      if (!layer.visible) {
        skippedLayerIds.push(layer.id);
        continue;
      }

      drawLayer(context, layer, surface, resolvedAssets);
      renderedLayerIds.push(layer.id);
    }
  } finally {
    context.restore();
  }

  return Object.freeze({
    renderedLayerIds: Object.freeze(renderedLayerIds),
    skippedLayerIds: Object.freeze(skippedLayerIds),
  });
}

/** Creates a render surface around an existing browser canvas context. */
export function createCanvasSurface(canvas: HTMLCanvasElement): RenderSurface {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new RenderError("A 2D canvas context is required.", { code: "invalid_surface" });
  }

  return {
    context,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Browser-facing wrapper. It owns logical canvas sizing and delegates all draw
 * behavior to the domain renderer.
 */
export async function renderFrameToCanvas(
  canvas: HTMLCanvasElement,
  framePlan: FramePlan,
  options: CanvasFrameRenderOptions,
): Promise<RenderFrameResult> {
  const width = options.width ?? canvas.width;
  const height = options.height ?? canvas.height;

  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }

  return renderFrame(framePlan, createCanvasSurface(canvas), options);
}
