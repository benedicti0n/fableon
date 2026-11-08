"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formatTimestamp } from "@fableon/animation-core";
import {
  BIRD_PART_IDS,
  createLandingBenchmark,
  LANDING_FPS,
  LANDING_FRAME_COUNT,
  landingPhaseForFrame,
  renderLandingFrame,
  type BirdPartId,
  type LandingBenchmark,
} from "@fableon/paint-engine";

const PART_LABELS: Record<BirdPartId, string> = {
  tail: "Tail",
  wingFar: "Far wing",
  legLeft: "Left leg",
  legRight: "Right leg",
  body: "Body",
  head: "Head",
  beak: "Beak",
  eye: "Eye",
  wingNear: "Near wing",
};

const SELECTED_FRAMES = [0, 8, 16, 24, 30, 38, 47] as const;
const POSE_FRAMES = [
  { frame: 0, label: "Wings raised" },
  { frame: 4, label: "Wings lowered" },
  { frame: 24, label: "Braking / approach" },
  { frame: 38, label: "Settling" },
  { frame: 47, label: "Perched" },
] as const;

interface Phase25CaptureApi {
  captureFrame(frame: number): { dataUrl: string; renderMs: number };
  captureContactSheet(): string;
  capturePosePreviews(): {
    poses: Array<{ frame: number; label: string; dataUrl: string }>;
    sheet: string;
  };
}

type Phase25Window = Window & {
  __FABLEON_PHASE_02_5__?: Phase25CaptureApi;
};

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is required for the landing preview.");
  }
  return context;
}

function renderFrameCanvas(
  benchmark: LandingBenchmark,
  frame: number,
): { canvas: HTMLCanvasElement; renderMs: number } {
  const canvas = createCanvas(benchmark.scene.width, benchmark.scene.height);
  const context = contextFor(canvas);
  const start = performance.now();
  renderLandingFrame(context, frame, benchmark);
  return { canvas, renderMs: performance.now() - start };
}

function createSheet(
  entries: ReadonlyArray<{
    canvas: HTMLCanvasElement;
    label: string;
    subtitle: string;
  }>,
  title: string,
  subtitle: string,
): string {
  const columns = 3;
  const tileWidth = 620;
  const tileHeight = 349;
  const gap = 18;
  const margin = 24;
  const header = 86;
  const labelHeight = 40;
  const rows = Math.ceil(entries.length / columns);
  const width = margin * 2 + columns * tileWidth + (columns - 1) * gap;
  const height = margin * 2 + header + rows * (tileHeight + labelHeight) + (rows - 1) * gap;
  const canvas = createCanvas(width, height);
  const context = contextFor(canvas);

  context.fillStyle = "#0b0d10";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#efe9db";
  context.font = "600 30px Georgia, serif";
  context.fillText(title, margin, 48);
  context.fillStyle = "#9a978f";
  context.font = "13px Menlo, monospace";
  context.fillText(subtitle, margin, 72);

  entries.forEach((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * (tileWidth + gap);
    const y = margin + header + row * (tileHeight + labelHeight + gap);

    context.drawImage(entry.canvas, x, y, tileWidth, tileHeight);
    context.strokeStyle = "#2a2f38";
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, tileWidth - 1, tileHeight - 1);
    context.fillStyle = "#e7e3d7";
    context.font = "600 16px Georgia, serif";
    context.fillText(entry.label, x, y + tileHeight + 22);
    context.fillStyle = "#7f858d";
    context.font = "12px Menlo, monospace";
    context.fillText(entry.subtitle, x, y + tileHeight + 38);
  });

  return canvas.toDataURL("image/png");
}

export function LandingPreview() {
  const [benchmark, setBenchmark] = useState<LandingBenchmark | null>(null);
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hiddenParts, setHiddenParts] = useState<ReadonlySet<BirdPartId>>(new Set());
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackStartRef = useRef<{ frame: number; time: number } | null>(null);

  const phase = landingPhaseForFrame(frame);
  const timestamp = formatTimestamp(frame, LANDING_FPS);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const initialize = () => {
      try {
        const created = createLandingBenchmark();
        if (cancelled) {
          return;
        }
        setBenchmark(created);

        const capture: Phase25CaptureApi = {
          captureFrame: (targetFrame) => {
            const rendered = renderFrameCanvas(created, targetFrame);
            return {
              dataUrl: rendered.canvas.toDataURL("image/png"),
              renderMs: rendered.renderMs,
            };
          },
          captureContactSheet: () => {
            const entries = SELECTED_FRAMES.map((targetFrame) => {
              const rendered = renderFrameCanvas(created, targetFrame);
              return {
                canvas: rendered.canvas,
                label: `${phaseLabelForFrame(targetFrame)} · frame ${targetFrame}`,
                subtitle: `${formatTimestamp(targetFrame, LANDING_FPS)} · ${landingPhaseForFrame(
                  targetFrame,
                )}`,
              };
            });
            return createSheet(
              entries,
              "The Little Bird Comes Home — selected frames",
              "Actual Fableon Canvas 2D output · 48 frames · 24 FPS · 1920×1080",
            );
          },
          capturePosePreviews: () => {
            const poses = POSE_FRAMES.map((pose) => {
              const rendered = renderFrameCanvas(created, pose.frame);
              return {
                frame: pose.frame,
                label: pose.label,
                dataUrl: rendered.canvas.toDataURL("image/png"),
                canvas: rendered.canvas,
              };
            });
            return {
              poses: poses.map(({ frame: poseFrame, label, dataUrl }) => ({
                frame: poseFrame,
                label,
                dataUrl,
              })),
              sheet: createSheet(
                poses.map((pose) => ({
                  canvas: pose.canvas,
                  label: `${pose.label} · frame ${pose.frame}`,
                  subtitle: "Layered storybook bird · same master parts",
                })),
                "The Little Bird Comes Home — character poses",
                "Five poses reconstructed from the same layered bird rig",
              ),
            };
          },
        };
        (window as Phase25Window).__FABLEON_PHASE_02_5__ = capture;
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      }
    };

    timer = window.setTimeout(initialize, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      delete (window as Phase25Window).__FABLEON_PHASE_02_5__;
    };
  }, []);

  useEffect(() => {
    if (!benchmark) {
      return;
    }
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      setError("Canvas 2D is unavailable in this browser.");
      return;
    }

    let cancelled = false;
    const start = performance.now();
    try {
      renderLandingFrame(context, frame, benchmark, {
        hiddenPartIds: [...hiddenParts],
      });
      const elapsed = performance.now() - start;
      queueMicrotask(() => {
        if (!cancelled) {
          setRenderMs(elapsed);
          setError(null);
        }
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      queueMicrotask(() => {
        if (!cancelled) {
          setError(message);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [benchmark, frame, hiddenParts]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }
    const start = playbackStartRef.current;
    if (!start) {
      setIsPlaying(false);
      return;
    }

    let animationFrame = 0;
    const tick = (now: number) => {
      const elapsed = (now - start.time) / 1000;
      const next = start.frame + Math.floor(elapsed * LANDING_FPS);
      const lastFrame = LANDING_FRAME_COUNT - 1;

      if (next >= lastFrame) {
        setFrame(lastFrame);
        setIsPlaying(false);
        playbackStartRef.current = null;
        return;
      }

      setFrame((current) => (current === next ? current : next));
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  function seek(nextFrame: number): void {
    setIsPlaying(false);
    playbackStartRef.current = null;
    setExportMessage(null);
    setFrame(Math.min(Math.max(Math.round(nextFrame), 0), LANDING_FRAME_COUNT - 1));
  }

  function togglePlayback(): void {
    if (isPlaying) {
      setIsPlaying(false);
      playbackStartRef.current = null;
      return;
    }

    const startFrame = frame >= LANDING_FRAME_COUNT - 1 ? 0 : frame;
    if (startFrame !== frame) {
      setFrame(startFrame);
    }
    playbackStartRef.current = { frame: startFrame, time: performance.now() };
    setIsPlaying(true);
  }

  function togglePart(partId: BirdPartId): void {
    setHiddenParts((current) => {
      const next = new Set(current);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
  }

  async function exportFrame(): Promise<void> {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    setIsExporting(true);
    setExportMessage(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });
      if (!blob) {
        setExportMessage("Could not encode frame as PNG.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `little-bird-frame-${String(frame).padStart(3, "0")}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportMessage(`Exported frame ${frame} as PNG.`);
    } catch (caught) {
      setExportMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
        Phase 2.5 · Hybrid animation benchmark
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-paper-50">The Little Bird Comes Home</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist-400">
            A two-second layered-bird landing study. Every frame is generated from the same master
            parts, hierarchical rig, and deterministic motion definition.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-ink-700 px-3 py-2 text-xs text-mist-300 transition-colors hover:border-ink-500 hover:text-paper-50"
        >
          Back to Fableon
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-ink-700 bg-ink-900 p-3">
        <div
          data-testid="landing-preview-surface"
          data-frame={frame}
          data-phase={phase}
          data-ready={benchmark ? "true" : "false"}
          className="relative aspect-video w-full overflow-hidden rounded-md border border-ink-700 bg-[#080a0b]"
        >
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            role="img"
            aria-label={`Little Bird landing frame ${frame}`}
            className="block h-full w-full"
          />
          {!benchmark && !error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-950/80">
              <p role="status" className="font-serif text-xl text-paper-100">
                Painting layered character…
              </p>
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="absolute inset-0 flex items-center justify-center bg-ink-950/90 px-6 text-center"
            >
              <p className="text-sm text-clay-500">{error}</p>
            </div>
          ) : null}
          <span className="pointer-events-none absolute top-3 left-3 rounded-full border border-ink-700 bg-ink-950/65 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-mist-200 uppercase">
            {phase}
          </span>
          <span className="pointer-events-none absolute top-3 right-3 rounded-full border border-ink-700 bg-ink-950/65 px-2.5 py-0.5 font-mono text-[9px] text-mist-300">
            1920×1080 · 24 fps
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={isPlaying ? "Pause animation" : "Play animation"}
              aria-pressed={isPlaying}
              className="rounded-md border border-ochre-400 bg-ochre-400 px-3 py-1.5 text-xs font-medium text-ink-950"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => seek(frame - 1)}
              disabled={frame <= 0}
              aria-label="Previous frame"
              className="rounded-md border border-ink-600 px-3 py-1.5 text-xs text-mist-200 disabled:opacity-40"
            >
              ← Frame
            </button>
            <button
              type="button"
              onClick={() => seek(frame + 1)}
              disabled={frame >= LANDING_FRAME_COUNT - 1}
              aria-label="Next frame"
              className="rounded-md border border-ink-600 px-3 py-1.5 text-xs text-mist-200 disabled:opacity-40"
            >
              Frame →
            </button>
            <button
              type="button"
              onClick={() => void exportFrame()}
              disabled={isExporting}
              aria-label="Export current frame PNG"
              className="rounded-md border border-ink-600 px-3 py-1.5 text-xs text-mist-200 disabled:opacity-40"
            >
              {isExporting ? "Exporting…" : "Export PNG"}
            </button>
          </div>
          <div className="flex items-end gap-3 font-mono text-[10px] text-mist-400">
            <output aria-label="Current frame">Frame {frame}</output>
            <output aria-label="Current timestamp">{timestamp}</output>
            <output aria-label="Current phase" className="text-ochre-300 uppercase">
              {phase}
            </output>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase">
            <span>Frame</span>
            <span>
              {frame} / {LANDING_FRAME_COUNT - 1}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={LANDING_FRAME_COUNT - 1}
            step={1}
            value={frame}
            aria-label="Animation frame"
            onChange={(event) => seek(Number(event.currentTarget.value))}
            className="w-full cursor-pointer accent-ochre-400"
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] text-mist-500">
            <span>0 · flight</span>
            <span>16 · approach</span>
            <span>30 · contact</span>
            <span>38 · settle</span>
            <span>47</span>
          </div>
        </div>
        {exportMessage ? (
          <p aria-live="polite" className="mt-3 text-[11px] text-mist-300">
            {exportMessage}
          </p>
        ) : null}
        {renderMs !== null ? (
          <p aria-label="Render time" className="mt-2 font-mono text-[9px] text-mist-500 uppercase">
            Last render {renderMs.toFixed(2)} ms
          </p>
        ) : null}
      </section>

      <section className="mt-5 rounded-xl border border-ink-700 bg-ink-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-paper-50">Character parts</h2>
            <p className="mt-1 text-xs text-mist-500">
              Toggle visibility to inspect layered artwork. All parts share one master palette and
              drawing pass.
            </p>
          </div>
          <span className="font-mono text-[10px] text-mist-500 uppercase">
            {BIRD_PART_IDS.length - hiddenParts.size}/{BIRD_PART_IDS.length} visible
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {BIRD_PART_IDS.map((partId) => {
            const visible = !hiddenParts.has(partId);
            return (
              <button
                key={partId}
                type="button"
                onClick={() => togglePart(partId)}
                aria-pressed={visible}
                aria-label={`Toggle ${PART_LABELS[partId]} visibility`}
                className={
                  visible
                    ? "rounded-full border border-ochre-500/50 bg-ochre-500/10 px-3 py-1.5 text-xs text-ochre-200"
                    : "rounded-full border border-ink-600 bg-ink-850 px-3 py-1.5 text-xs text-mist-500"
                }
              >
                {PART_LABELS[partId]}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function phaseLabelForFrame(frame: number): string {
  return landingPhaseForFrame(frame)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
