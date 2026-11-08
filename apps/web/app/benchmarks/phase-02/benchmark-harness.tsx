"use client";

/* eslint-disable @next/next/no-img-element -- benchmark artifacts are runtime canvas data URLs, which Next Image cannot optimize. */

import { useEffect, useState } from "react";

import { evaluateProjectFrame, formatTimestamp } from "@fableon/animation-core";
import { createWhereTheLightLandsAssets } from "@fableon/paint-engine";
import { renderFrame, type ImageAssetResolver, type RasterImage } from "@fableon/render-engine";
import { SAMPLE_PROJECT } from "@fableon/scene-schema/fixtures";

const BENCHMARK_FRAMES = [
  { frame: 0, label: "Dawn" },
  { frame: 216, label: "Glide" },
  { frame: 528, label: "Descent" },
  { frame: 840, label: "Landing" },
  { frame: 1151, label: "Final" },
] as const;

export interface BenchmarkAssetArtifact {
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
}

export interface BenchmarkFrameArtifact {
  readonly frame: number;
  readonly label: string;
  readonly sceneId: string;
  readonly sceneName: string;
  readonly localFrame: number;
  readonly dataUrl: string;
  readonly renderMs: number;
}

export interface BenchmarkArtifacts {
  readonly seed: number;
  readonly assets: Readonly<Record<string, BenchmarkAssetArtifact>>;
  readonly frames: readonly BenchmarkFrameArtifact[];
  readonly contactSheet: string;
  readonly metrics: {
    readonly assetGenerationMs: number;
    readonly frameRenderMs: Readonly<Record<string, number>>;
    readonly totalGenerationMs: number;
  };
}

type BenchmarkWindow = Window & {
  __FABLEON_BENCHMARK__?: BenchmarkArtifacts;
};

let cachedArtifacts: Promise<BenchmarkArtifacts> | undefined;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2D canvas context unavailable for benchmark generation.");
  }
  return context;
}

function createContactSheet(
  frames: readonly {
    canvas: HTMLCanvasElement;
    artifact: Omit<BenchmarkFrameArtifact, "dataUrl">;
  }[],
): string {
  const columns = 3;
  const tileWidth = 620;
  const tileHeight = 349;
  const gap = 18;
  const margin = 24;
  const header = 88;
  const labelHeight = 34;
  const rows = Math.ceil(frames.length / columns);
  const width = margin * 2 + columns * tileWidth + (columns - 1) * gap;
  const height = margin * 2 + header + rows * (tileHeight + labelHeight) + (rows - 1) * gap;
  const canvas = createCanvas(width, height);
  const context = contextFor(canvas);

  context.fillStyle = "#0b0d10";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#efe9db";
  context.font = "600 30px Georgia, serif";
  context.fillText("Where the Light Lands — Phase 2 render benchmark", margin, 52);
  context.fillStyle = "#9a978f";
  context.font = "14px Menlo, monospace";
  context.fillText(
    "Actual Canvas 2D output · 1920×1080 · 24 FPS · procedural Fableon Paint assets",
    margin,
    76,
  );

  frames.forEach(({ canvas: frameCanvas, artifact }, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * (tileWidth + gap);
    const y = margin + header + row * (tileHeight + labelHeight + gap);

    context.drawImage(frameCanvas, x, y, tileWidth, tileHeight);
    context.strokeStyle = "#2a2f38";
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, tileWidth - 1, tileHeight - 1);

    context.fillStyle = "#e7e3d7";
    context.font = "600 16px Georgia, serif";
    context.fillText(`${artifact.label} · frame ${artifact.frame}`, x, y + tileHeight + 22);
    context.fillStyle = "#7f858d";
    context.font = "12px Menlo, monospace";
    context.fillText(
      `${artifact.sceneName} · local ${artifact.localFrame} · ${formatTimestamp(artifact.frame, 24)}`,
      x,
      y + tileHeight + 38,
    );
  });

  return canvas.toDataURL("image/png");
}

async function generateArtifacts(): Promise<BenchmarkArtifacts> {
  const started = performance.now();
  const assetStart = performance.now();
  const painted = createWhereTheLightLandsAssets(SAMPLE_PROJECT.seed);
  const assetGenerationMs = performance.now() - assetStart;

  const canvases = new Map<string, HTMLCanvasElement>([
    ["forest-dawn", painted.forestDawn],
    ["forest-deep", painted.forestDeep],
    ["branch", painted.branch],
    ["bird", painted.bird],
  ]);

  const assets: Record<string, BenchmarkAssetArtifact> = {};
  for (const [assetId, canvas] of canvases) {
    assets[assetId] = {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  }

  const resolver: ImageAssetResolver = {
    async resolve(assetId: string): Promise<RasterImage> {
      const canvas = canvases.get(assetId);
      if (!canvas) {
        throw new Error(`Benchmark asset "${assetId}" has no painted source.`);
      }
      return { source: canvas, width: canvas.width, height: canvas.height };
    },
  };

  const frameArtifacts: {
    canvas: HTMLCanvasElement;
    artifact: Omit<BenchmarkFrameArtifact, "dataUrl">;
  }[] = [];

  for (const point of BENCHMARK_FRAMES) {
    const frameStart = performance.now();
    const plan = evaluateProjectFrame(SAMPLE_PROJECT, point.frame);
    const canvas = createCanvas(SAMPLE_PROJECT.canvas.width, SAMPLE_PROJECT.canvas.height);
    const context = contextFor(canvas);

    await renderFrame(
      plan,
      { context, width: canvas.width, height: canvas.height },
      { assets: resolver },
    );

    frameArtifacts.push({
      canvas,
      artifact: {
        frame: point.frame,
        label: point.label,
        sceneId: plan.sceneId,
        sceneName: plan.sceneName,
        localFrame: plan.localFrame,
        renderMs: performance.now() - frameStart,
      },
    });
  }

  const frames: BenchmarkFrameArtifact[] = frameArtifacts.map(({ canvas, artifact }) => ({
    ...artifact,
    dataUrl: canvas.toDataURL("image/png"),
  }));

  const frameRenderMs = Object.fromEntries(
    frames.map((frame) => [String(frame.frame), frame.renderMs]),
  ) as Record<string, number>;

  return {
    seed: SAMPLE_PROJECT.seed,
    assets,
    frames,
    contactSheet: createContactSheet(frameArtifacts),
    metrics: {
      assetGenerationMs,
      frameRenderMs,
      totalGenerationMs: performance.now() - started,
    },
  };
}

function getArtifacts(): Promise<BenchmarkArtifacts> {
  cachedArtifacts ??= generateArtifacts();
  return cachedArtifacts;
}

export function BenchmarkHarness() {
  const [artifacts, setArtifacts] = useState<BenchmarkArtifacts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getArtifacts()
      .then((result) => {
        if (!active) {
          return;
        }
        (window as BenchmarkWindow).__FABLEON_BENCHMARK__ = result;
        document.documentElement.dataset.benchmarkReady = "true";
        setArtifacts(result);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        setError(caught instanceof Error ? caught.message : String(caught));
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-3xl text-paper-50">Benchmark generation failed</h1>
        <p className="mt-4 text-sm text-clay-500">{error}</p>
      </main>
    );
  }

  if (!artifacts) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-serif text-3xl text-paper-50">Painting Phase 2 benchmark…</h1>
        <p className="mt-4 text-sm text-mist-400">
          Generating procedural assets and rendering five native-resolution frames.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="font-mono text-[10px] tracking-[0.18em] text-ochre-400 uppercase">
        Internal benchmark harness
      </p>
      <h1 className="mt-3 font-serif text-4xl text-paper-50">Where the Light Lands</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-mist-400">
        Five real renderer outputs generated from the validated Phase 1 fixture. All artwork is
        procedural Fableon Paint output. This page is a capture harness, not the Studio product.
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-ink-700 bg-ink-900 p-3">
          <dt className="font-mono text-[9px] text-mist-500 uppercase">Asset generation</dt>
          <dd className="mt-1 font-mono text-sm text-paper-100">
            {artifacts.metrics.assetGenerationMs.toFixed(0)} ms
          </dd>
        </div>
        <div className="rounded-md border border-ink-700 bg-ink-900 p-3">
          <dt className="font-mono text-[9px] text-mist-500 uppercase">Frames</dt>
          <dd className="mt-1 font-mono text-sm text-paper-100">
            {artifacts.frames.length} × 1920×1080
          </dd>
        </div>
        <div className="rounded-md border border-ink-700 bg-ink-900 p-3">
          <dt className="font-mono text-[9px] text-mist-500 uppercase">Total generation</dt>
          <dd className="mt-1 font-mono text-sm text-paper-100">
            {artifacts.metrics.totalGenerationMs.toFixed(0)} ms
          </dd>
        </div>
        <div className="rounded-md border border-ink-700 bg-ink-900 p-3">
          <dt className="font-mono text-[9px] text-mist-500 uppercase">Seed</dt>
          <dd className="mt-1 font-mono text-sm text-paper-100">{artifacts.seed}</dd>
        </div>
      </dl>

      <img
        src={artifacts.contactSheet}
        alt="Five rendered benchmark frames: dawn, glide, descent, landing, and final"
        className="mt-8 w-full rounded-lg border border-ink-700"
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {artifacts.frames.map((frame) => (
          <figure key={frame.frame} className="overflow-hidden rounded-lg border border-ink-700">
            <img
              src={frame.dataUrl}
              alt={`${frame.label} frame ${frame.frame}`}
              className="w-full"
            />
            <figcaption className="flex justify-between gap-3 border-t border-ink-700 bg-ink-900 px-3 py-2 font-mono text-[10px] text-mist-400">
              <span>
                {frame.label} · frame {frame.frame}
              </span>
              <span>{frame.renderMs.toFixed(0)} ms</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
