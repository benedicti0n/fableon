import { describe, expect, it, vi } from "vitest";

import type { EvaluatedLayer, EvaluatedLayerContent, FramePlan } from "@fableon/animation-core";

import { renderFrame, RenderError } from "./index";
import type {
  Canvas2DContextLike,
  FrameRenderOptions,
  ImageAssetResolver,
  RasterImage,
  RenderSurface,
} from "./index";

interface RecordedCall {
  readonly method: string;
  readonly args: readonly unknown[];
  readonly fillStyle: string;
  readonly globalAlpha: number;
}

class RecordingContext implements Canvas2DContextLike {
  fillStyle: string | CanvasGradient | CanvasPattern = "#000000";
  font = "10px sans-serif";
  textBaseline: CanvasTextBaseline = "alphabetic";
  globalAlpha = 1;
  imageSmoothingEnabled = false;
  imageSmoothingQuality: ImageSmoothingQuality = "low";
  readonly calls: RecordedCall[] = [];

  private record(method: string, ...args: unknown[]): void {
    this.calls.push({
      method,
      args,
      fillStyle: String(this.fillStyle),
      globalAlpha: this.globalAlpha,
    });
  }

  save(): void {
    this.record("save");
  }
  restore(): void {
    this.record("restore");
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.record("setTransform", a, b, c, d, e, f);
  }
  clearRect(x: number, y: number, width: number, height: number): void {
    this.record("clearRect", x, y, width, height);
  }
  fillRect(x: number, y: number, width: number, height: number): void {
    this.record("fillRect", x, y, width, height);
  }
  fillText(text: string, x: number, y: number): void {
    this.record("fillText", text, x, y);
  }
  translate(x: number, y: number): void {
    this.record("translate", x, y);
  }
  rotate(angle: number): void {
    this.record("rotate", angle);
  }
  scale(x: number, y: number): void {
    this.record("scale", x, y);
  }
  drawImage(
    image: CanvasImageSource,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
  ): void {
    this.record("drawImage", image, dx, dy, dWidth, dHeight);
  }

  methods(): string[] {
    return this.calls.map((call) => call.method);
  }
}

function transform(
  overrides: Partial<EvaluatedLayer["transform"]> = {},
): EvaluatedLayer["transform"] {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    ...overrides,
  };
}

function layer(
  content: EvaluatedLayerContent,
  overrides: Partial<Omit<EvaluatedLayer, "content">> = {},
): EvaluatedLayer {
  return {
    id: "layer-1",
    name: "Layer",
    type: content.type,
    order: 0,
    visible: true,
    transform: transform(),
    content,
    ...overrides,
  };
}

function plan(layers: readonly EvaluatedLayer[]): FramePlan {
  return {
    globalFrame: 0,
    sceneId: "scene-1",
    sceneName: "Scene",
    sceneIndex: 0,
    localFrame: 0,
    frameRate: 24,
    layers,
  };
}

function surface(context: Canvas2DContextLike): RenderSurface {
  return { context, width: 1920, height: 1080 };
}

function fakeImage(width = 200, height = 100): RasterImage {
  return {
    source: {} as unknown as CanvasImageSource,
    width,
    height,
  };
}

function resolverFor(image: RasterImage): ImageAssetResolver & {
  resolve: ReturnType<typeof vi.fn>;
} {
  return {
    resolve: vi.fn(async () => image),
  };
}

function options(assets: ImageAssetResolver): FrameRenderOptions {
  return { assets };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

describe("Canvas 2D frame renderer", () => {
  it("clears the surface and fills a solid layer with transforms and opacity", async () => {
    const context = new RecordingContext();
    const frame = plan([
      layer(
        { type: "solid", color: "#112233" },
        {
          transform: transform({
            x: 10,
            y: 20,
            scaleX: 2,
            scaleY: 0.5,
            rotation: 45,
            opacity: 0.4,
          }),
        },
      ),
    ]);

    const result = await renderFrame(frame, surface(context), options(resolverFor(fakeImage())));

    expect(result).toEqual({ renderedLayerIds: ["layer-1"], skippedLayerIds: [] });
    expect(context.methods()).toContain("clearRect");
    expect(context.calls.find((call) => call.method === "clearRect")?.args).toEqual([
      0, 0, 1920, 1080,
    ]);
    expect(context.calls.find((call) => call.method === "translate")?.args).toEqual([10, 20]);
    expect(context.calls.find((call) => call.method === "rotate")?.args[0]).toBeCloseTo(
      Math.PI / 4,
      10,
    );
    expect(context.calls.find((call) => call.method === "scale")?.args).toEqual([2, 0.5]);
    expect(context.calls.find((call) => call.method === "fillRect")?.args).toEqual([
      0, 0, 1920, 1080,
    ]);
    expect(context.calls.find((call) => call.method === "fillRect")?.fillStyle).toBe("#112233");
    expect(context.calls.find((call) => call.method === "fillRect")?.globalAlpha).toBe(0.4);
  });

  it("draws visible layers in FramePlan order", async () => {
    const context = new RecordingContext();
    const frame = plan([
      layer({ type: "solid", color: "#111111" }, { id: "bottom", order: 0 }),
      layer({ type: "solid", color: "#222222" }, { id: "middle", order: 10 }),
      layer({ type: "solid", color: "#333333" }, { id: "top", order: 20 }),
    ]);

    const result = await renderFrame(frame, surface(context), options(resolverFor(fakeImage())));
    const fills = context.calls.filter((call) => call.method === "fillRect");

    expect(fills.map((call) => call.fillStyle)).toEqual(["#111111", "#222222", "#333333"]);
    expect(result.renderedLayerIds).toEqual(["bottom", "middle", "top"]);
  });

  it("skips invisible layers and does not resolve their assets", async () => {
    const context = new RecordingContext();
    const resolver = resolverFor(fakeImage());
    const frame = plan([
      layer({ type: "solid", color: "#111111" }, { id: "visible" }),
      layer(
        { type: "asset", assetId: "hidden-image" },
        { id: "hidden", visible: false, transform: transform({ x: 30 }) },
      ),
    ]);

    const result = await renderFrame(frame, surface(context), options(resolver));

    expect(resolver.resolve).not.toHaveBeenCalled();
    expect(result.renderedLayerIds).toEqual(["visible"]);
    expect(result.skippedLayerIds).toEqual(["hidden"]);
    expect(context.calls.some((call) => call.method === "translate" && call.args[0] === 30)).toBe(
      false,
    );
  });

  it("wraps each layer in save/restore so canvas state cannot leak", async () => {
    const context = new RecordingContext();
    const frame = plan([
      layer({ type: "solid", color: "#111111" }, { id: "one", transform: transform({ x: 1 }) }),
      layer({ type: "solid", color: "#222222" }, { id: "two", transform: transform({ x: 2 }) }),
    ]);

    await renderFrame(frame, surface(context), options(resolverFor(fakeImage())));

    const saves = context.calls.filter((call) => call.method === "save").length;
    const restores = context.calls.filter((call) => call.method === "restore").length;
    expect(saves).toBe(restores);
    expect(saves).toBeGreaterThanOrEqual(3);
  });

  it("draws image assets at their intrinsic size and deduplicates resolution", async () => {
    const context = new RecordingContext();
    const image = fakeImage(640, 360);
    const resolver = resolverFor(image);
    const frame = plan([
      layer({ type: "asset", assetId: "bird" }, { id: "bird-1" }),
      layer({ type: "asset", assetId: "bird" }, { id: "bird-2", transform: transform({ x: 40 }) }),
    ]);

    const result = await renderFrame(frame, surface(context), options(resolver));

    expect(resolver.resolve).toHaveBeenCalledTimes(1);
    expect(context.calls.filter((call) => call.method === "drawImage")).toHaveLength(2);
    expect(context.calls.find((call) => call.method === "drawImage")?.args).toEqual([
      image.source,
      0,
      0,
      640,
      360,
    ]);
    expect(result.renderedLayerIds).toEqual(["bird-1", "bird-2"]);
  });

  it("renders textual content with top-left positioning", async () => {
    const context = new RecordingContext();
    const frame = plan([
      layer(
        {
          type: "text",
          text: "First line\nSecond line",
          fontFamily: "Georgia, serif",
          fontSize: 72,
          color: "#f5e6c6",
        },
        { transform: transform({ x: 100, y: 50, opacity: 0.8 }) },
      ),
    ]);

    await renderFrame(frame, surface(context), options(resolverFor(fakeImage())));

    expect(context.font).toBe("72px Georgia, serif");
    expect(context.textBaseline).toBe("top");
    const texts = context.calls.filter((call) => call.method === "fillText");
    expect(texts[0]?.args).toEqual(["First line", 0, 0]);
    expect(texts[1]?.args[0]).toBe("Second line");
    expect(texts[1]?.args[1]).toBe(0);
    expect(texts[1]?.args[2]).toBeCloseTo(86.4, 10);
    expect(texts[0]?.fillStyle).toBe("#f5e6c6");
    expect(texts[0]?.globalAlpha).toBe(0.8);
  });

  it("reports missing assets with explicit layer and asset context", async () => {
    const context = new RecordingContext();
    const resolver: ImageAssetResolver = {
      resolve: vi.fn(async () => {
        throw new Error("404 Not Found");
      }),
    };
    const frame = plan([layer({ type: "asset", assetId: "missing-bird" }, { id: "bird-layer" })]);

    await expect(renderFrame(frame, surface(context), options(resolver))).rejects.toMatchObject({
      name: "RenderError",
      code: "asset_resolution_failed",
      layerId: "bird-layer",
      assetId: "missing-bird",
    });

    expect(context.calls.some((call) => call.method === "clearRect")).toBe(true);
    expect(context.calls.some((call) => call.method === "drawImage")).toBe(false);
  });

  it("does not mutate the FramePlan", async () => {
    const frame = deepFreeze(
      plan([
        layer(
          { type: "solid", color: "#111111" },
          { transform: transform({ x: 12, opacity: 0.5 }) },
        ),
      ]),
    );
    const snapshot = JSON.stringify(frame);

    await renderFrame(frame, surface(new RecordingContext()), options(resolverFor(fakeImage())));

    expect(JSON.stringify(frame)).toBe(snapshot);
  });

  it("handles empty plans without crashing", async () => {
    const context = new RecordingContext();
    const result = await renderFrame(plan([]), surface(context), options(resolverFor(fakeImage())));

    expect(result).toEqual({ renderedLayerIds: [], skippedLayerIds: [] });
    expect(context.calls.some((call) => call.method === "clearRect")).toBe(true);
  });

  it("can skip clearing when explicitly requested", async () => {
    const context = new RecordingContext();
    const frame = plan([layer({ type: "solid", color: "#111111" })]);

    await renderFrame(frame, surface(context), {
      assets: resolverFor(fakeImage()),
      clear: false,
    });

    expect(context.calls.some((call) => call.method === "clearRect")).toBe(false);
  });

  it("rejects invalid surface dimensions", async () => {
    const context = new RecordingContext();

    await expect(
      renderFrame(plan([]), { context, width: 0, height: 1080 }, options(resolverFor(fakeImage()))),
    ).rejects.toBeInstanceOf(RenderError);
  });
});
