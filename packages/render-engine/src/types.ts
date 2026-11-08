import type { FramePlan } from "@fableon/animation-core";

/**
 * The small Canvas 2D surface required by the renderer. A real
 * CanvasRenderingContext2D satisfies this interface; tests can provide a
 * command-recording mock without a browser canvas implementation.
 */
export interface Canvas2DContextLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textBaseline: CanvasTextBaseline;
  globalAlpha: number;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: ImageSmoothingQuality;

  save(): void;
  restore(): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  drawImage(
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
  ): void;
}

export interface RenderSurface {
  readonly context: Canvas2DContextLike;
  readonly width: number;
  readonly height: number;
}

/** A decoded image plus its intrinsic pixel dimensions. */
export interface RasterImage {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
}

export interface ImageAssetResolver {
  resolve(assetId: string): Promise<RasterImage>;
}

export interface FrameRenderOptions {
  readonly assets: ImageAssetResolver;
  /** Clear the target before drawing. Defaults to true. */
  readonly clear?: boolean;
}

export interface RenderFrameResult {
  readonly renderedLayerIds: readonly string[];
  readonly skippedLayerIds: readonly string[];
}

export type RenderErrorCode =
  "invalid_surface" | "asset_resolution_failed" | "unsupported_layer_content";

export interface RenderErrorContext {
  readonly code: RenderErrorCode;
  readonly layerId?: string;
  readonly assetId?: string;
  readonly cause?: unknown;
}

export class RenderError extends Error {
  override readonly name = "RenderError";
  readonly code: RenderErrorCode;
  readonly layerId: string | undefined;
  readonly assetId: string | undefined;
  override readonly cause: unknown;

  constructor(message: string, context: RenderErrorContext) {
    super(message);
    this.code = context.code;
    this.layerId = context.layerId;
    this.assetId = context.assetId;
    this.cause = context.cause;
  }
}

export interface CanvasFrameRenderOptions extends FrameRenderOptions {
  readonly width?: number;
  readonly height?: number;
}

export interface RenderedFrameDescriptor {
  readonly plan: FramePlan;
  readonly result: RenderFrameResult;
}
