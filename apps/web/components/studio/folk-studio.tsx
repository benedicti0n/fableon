"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Panel } from "@/components/ui/panel";
import { studioFetch, studioPostJson, StudioApiError } from "@/lib/studio/client";
import { loadFolkAssets } from "@/lib/folk/assets";
import { loadFolkConfig, type FolkFilmConfig } from "@/lib/folk/config";
import { evaluateFolkFrame } from "@/lib/folk/evaluate";
import { FolkRenderer } from "@/lib/folk/renderer";

import {
  studioInputClassName,
  studioLabelClassName,
  studioPrimaryButtonClassName,
  studioSecondaryButtonClassName,
  studioSelectClassName,
} from "./ui";

interface RenderJobView {
  readonly id: string;
  readonly status: "queued" | "rendering" | "encoding" | "completed" | "failed" | "cancelled";
  readonly progress: number;
  readonly renderedFrames: number;
  readonly totalFrames: number;
  readonly currentFrame: number;
  readonly width: number;
  readonly height: number;
  readonly outputPath: string | null;
  readonly error: string | null;
}

const ACTIVE_STATUSES = new Set(["queued", "rendering", "encoding"]);
const TOTAL_FRAMES = 720;

export interface FolkStudioProps {
  readonly packUrl?: string;
  readonly exportEnabled?: boolean;
  readonly heading?: string;
  readonly subtitle?: string;
}

export function FolkStudio({
  packUrl,
  exportEnabled = true,
  heading,
  subtitle,
}: FolkStudioProps = {}) {
  const [config, setConfig] = useState<FolkFilmConfig | null>(null);
  const [renderer, setRenderer] = useState<FolkRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewResolution, setPreviewResolution] = useState("1280x720");
  const [exportResolution, setExportResolution] = useState("1920x1080");
  const [exportStart, setExportStart] = useState(0);
  const [exportEnd, setExportEnd] = useState(719);
  const [job, setJob] = useState<RenderJobView | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isStartingExport, setIsStartingExport] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackRef = useRef<{ frame: number; time: number } | null>(null);

  const state = config ? evaluateFolkFrame(config, frame) : null;
  const activeJob = job !== null && ACTIVE_STATUSES.has(job.status);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nextConfig, assets] = await Promise.all([
          loadFolkConfig(),
          packUrl
            ? loadFolkAssets({
                manifestUrl: `${packUrl.replace(/\/+$/, "")}/manifest.json`,
                baseUrl: packUrl,
              })
            : loadFolkAssets(),
        ]);
        if (!cancelled) {
          setConfig(nextConfig);
          setRenderer(new FolkRenderer(assets, nextConfig));
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packUrl]);

  useEffect(() => {
    if (!renderer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const [width, height] = previewResolution.split("x").map(Number);
    try {
      renderer.renderToCanvas(canvas, frame, width ?? 1280, height ?? 720);
    } catch (caught) {
      queueMicrotask(() => setError(caught instanceof Error ? caught.message : String(caught)));
    }
  }, [renderer, frame, previewResolution]);

  useEffect(() => {
    if (!isPlaying) return;
    let animationFrame = 0;
    const tick = (now: number) => {
      const start = playbackRef.current;
      if (!start) return;
      const next = start.frame + Math.floor(((now - start.time) / 1000) * 24);
      if (next >= TOTAL_FRAMES) {
        setFrame(TOTAL_FRAMES - 1);
        setIsPlaying(false);
        playbackRef.current = null;
        return;
      }
      setFrame(next);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  useEffect(() => {
    if (!job || !ACTIVE_STATUSES.has(job.status)) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const response = await studioFetch<{ job: RenderJobView }>(
            `/api/studio/composition/export/${job.id}`,
          );
          if (response.job) setJob(response.job);
        } catch {
          // Keep the last known progress; the next poll may recover.
        }
      })();
    }, 1000);
    return () => window.clearInterval(id);
  }, [job]);

  function togglePlayback(): void {
    if (isPlaying) {
      setIsPlaying(false);
      playbackRef.current = null;
      return;
    }
    const startFrame = frame >= TOTAL_FRAMES - 1 ? 0 : frame;
    if (startFrame !== frame) setFrame(startFrame);
    playbackRef.current = { frame: startFrame, time: performance.now() };
    setIsPlaying(true);
  }

  function seek(nextFrame: number): void {
    setIsPlaying(false);
    playbackRef.current = null;
    setFrame(Math.min(Math.max(Math.round(nextFrame), 0), TOTAL_FRAMES - 1));
  }

  async function startExport(): Promise<void> {
    setIsStartingExport(true);
    setExportError(null);
    try {
      const [width, height] = exportResolution.split("x").map(Number);
      const response = await studioPostJson<{ job: RenderJobView }>(
        "/api/studio/composition/export",
        {
          production: "folk-pilot",
          startFrame: Number(exportStart),
          endFrame: Number(exportEnd),
          width: width ?? 1920,
          height: height ?? 1080,
        },
      );
      setJob(response.job);
    } catch (caught) {
      setExportError(
        caught instanceof StudioApiError ? caught.message : "The folk export could not be started.",
      );
    } finally {
      setIsStartingExport(false);
    }
  }

  async function cancelExport(): Promise<void> {
    if (!job) return;
    try {
      const response = await studioPostJson<{ job: RenderJobView }>(
        `/api/studio/composition/export/${job.id}/cancel`,
        {},
      );
      setJob(response.job);
    } catch (caught) {
      setExportError(
        caught instanceof StudioApiError
          ? caught.message
          : "The folk export could not be cancelled.",
      );
    }
  }

  const exportProgress = job ? Math.round(job.progress * 100) : 0;

  return (
    <div data-testid="folk-studio-page" className="space-y-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
            Phase 5 · folk-art production
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
            {heading ?? config?.title ?? "The Little Brass Bell"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
            {subtitle ??
              "30-second, five-shot cutout film · original local vector masters · 61 reusable body parts · no image or video generation API contacted. AI generation is blocked on this host and the pilot uses original vector artwork."}
          </p>
        </div>
        <div className="rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 font-mono text-[10px] text-mist-400">
          <span className="block text-paper-100">30.000 s</span>
          <span className="block">720 frames · 24 fps</span>
          <span className="block">1920×1080 target</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Link className={studioSecondaryButtonClassName} href="/studio/folk/assets">
          Asset workshop
        </Link>
        <Link className={studioSecondaryButtonClassName} href="/studio/folk/rigs">
          Rig editor
        </Link>
        <Link className={studioSecondaryButtonClassName} href="/studio/folk/production">
          Shot board
        </Link>
        <Link className={studioSecondaryButtonClassName} href="/studio/folk/costs">
          Cost dashboard
        </Link>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}

      {state ? (
        <div
          data-testid="folk-frame-state"
          data-frame={frame}
          data-shot={state.shot.id}
          data-local-frame={state.localFrame}
          data-shot-title={state.shot.title}
          data-background={state.background}
          data-artisan={state.artisan ? (state.shot.artisan?.action ?? "visible") : "none"}
          data-horse={state.horse ? (state.shot.horse?.action ?? "visible") : "none"}
          data-bell={state.bell?.placement ?? "none"}
          data-transition={state.shot.transitionIn.type}
          data-incoming-opacity={state.incomingOpacity.toFixed(4)}
          data-previous-opacity={state.previousOpacity.toFixed(4)}
          data-black-opacity={state.blackOpacity.toFixed(4)}
          data-camera-x={state.camera.centerX.toFixed(2)}
          data-camera-zoom={state.camera.zoom.toFixed(3)}
          data-title={state.titles[0]?.text ?? ""}
          className="sr-only"
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel
            title="Folk composition preview"
            status={`Frame ${frame} / 719`}
            bodyClassName="space-y-3"
          >
            <div className="overflow-hidden rounded-md border border-ink-700 bg-black">
              <canvas
                ref={canvasRef}
                data-testid="folk-canvas"
                aria-label="The Little Brass Bell composition frame"
                className="aspect-video h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? "Pause folk film" : "Play folk film"}
                className={studioPrimaryButtonClassName}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min={0}
                max={TOTAL_FRAMES - 1}
                step={1}
                value={frame}
                aria-label="Folk film frame"
                onChange={(event) => seek(Number(event.target.value))}
                className="min-w-0 flex-1 accent-ochre-500"
              />
              <span className="font-mono text-[11px] text-mist-400">
                {(frame / 24).toFixed(2)} s / 30.00 s
              </span>
              <select
                aria-label="Folk preview resolution"
                value={previewResolution}
                onChange={(event) => setPreviewResolution(event.target.value)}
                className={studioSelectClassName}
              >
                <option value="1280x720">Preview 1280×720</option>
                <option value="1920x1080">Preview 1920×1080</option>
              </select>
            </div>
            {state ? (
              <div className="grid grid-cols-2 gap-3 text-[11px] text-mist-400 sm:grid-cols-4">
                <div>
                  <span className="block font-mono text-[9px] tracking-wide text-mist-500 uppercase">
                    Shot
                  </span>
                  {state.shot.title}
                </div>
                <div>
                  <span className="block font-mono text-[9px] tracking-wide text-mist-500 uppercase">
                    Artisan
                  </span>
                  {state.shot.artisan?.action ?? "—"}
                </div>
                <div>
                  <span className="block font-mono text-[9px] tracking-wide text-mist-500 uppercase">
                    Horse
                  </span>
                  {state.shot.horse?.action ?? "—"}
                </div>
                <div>
                  <span className="block font-mono text-[9px] tracking-wide text-mist-500 uppercase">
                    Bell
                  </span>
                  {state.bell?.placement ?? "hidden"}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel title="Shot sequence" status="5 shots" bodyClassName="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {config?.shots.map((shot, index) => (
                <button
                  key={shot.id}
                  type="button"
                  onClick={() => seek(shot.startFrame)}
                  className={`rounded-md border px-3 py-2 text-left transition-colors ${
                    state?.shot.id === shot.id
                      ? "border-ochre-500/70 bg-ochre-500/10 text-paper-50"
                      : "border-ink-700 bg-ink-900 text-mist-300 hover:border-ink-600"
                  }`}
                >
                  <span className="block font-mono text-[9px] tracking-wide text-mist-500 uppercase">
                    Shot {String(index + 1).padStart(3, "0")}
                  </span>
                  <span className="mt-1 block font-serif text-sm">{shot.title}</span>
                  <span className="mt-1 block font-mono text-[10px] text-mist-500">
                    {shot.frameCount} frames · {(shot.frameCount / 24).toFixed(0)} s
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          {exportEnabled ? (
            <Panel title="Local export" status="No paid API" bodyClassName="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className={studioLabelClassName}>Start frame</span>
                  <input
                    id="folk-export-start"
                    type="number"
                    min={0}
                    max={719}
                    value={exportStart}
                    onChange={(event) => setExportStart(Number(event.target.value))}
                    className={studioInputClassName}
                  />
                </label>
                <label className="space-y-1">
                  <span className={studioLabelClassName}>End frame</span>
                  <input
                    id="folk-export-end"
                    type="number"
                    min={0}
                    max={719}
                    value={exportEnd}
                    onChange={(event) => setExportEnd(Number(event.target.value))}
                    className={studioInputClassName}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className={studioLabelClassName}>Export resolution</span>
                <select
                  id="folk-export-resolution"
                  value={exportResolution}
                  onChange={(event) => setExportResolution(event.target.value)}
                  className={studioSelectClassName}
                >
                  <option value="1280x720">1280×720</option>
                  <option value="1920x1080">1920×1080</option>
                </select>
              </label>
              <button
                type="button"
                data-testid="folk-start-export"
                disabled={isStartingExport || activeJob}
                onClick={() => void startExport()}
                className={studioPrimaryButtonClassName}
              >
                {isStartingExport ? "Starting…" : "Start local export"}
              </button>
              <p className="text-[11px] leading-5 text-mist-500">
                A separate local render process rasterizes the same Canvas renderer used above and
                encodes with FFmpeg. No provider is contacted.
              </p>
              {exportError ? (
                <p
                  role="alert"
                  className="rounded border border-clay-500/40 bg-clay-500/10 px-2 py-1 text-xs text-clay-500"
                >
                  {exportError}
                </p>
              ) : null}
              {job ? (
                <div
                  data-testid="folk-export-panel"
                  className="space-y-2 rounded-md border border-ink-700 bg-ink-950 p-3"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-mist-400">{job.status}</span>
                    <span className="font-mono text-mist-500">
                      {job.renderedFrames}/{job.totalFrames}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    data-testid="folk-export-progress"
                    aria-valuenow={exportProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 overflow-hidden rounded bg-ink-800"
                  >
                    <div
                      className="h-full bg-ochre-500 transition-[width]"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  {activeJob ? (
                    <button
                      type="button"
                      onClick={() => void cancelExport()}
                      className={studioSecondaryButtonClassName}
                    >
                      Cancel export
                    </button>
                  ) : null}
                  {job.error ? <p className="text-[11px] text-clay-500">{job.error}</p> : null}
                  {job.status === "completed" ? (
                    <video
                      data-testid="folk-export-video"
                      controls
                      className="w-full rounded border border-ink-700"
                      src={`/api/studio/composition/export/${job.id}/video`}
                    />
                  ) : null}
                </div>
              ) : null}
            </Panel>
          ) : (
            <Panel
              title="Local export"
              status="Gated"
              bodyClassName="space-y-2 text-[11px] leading-5 text-mist-400"
            >
              <p>
                Provider-pack export is disabled in this preview. Stage 2 requires an approved
                provider pack and a separate production authorization.
              </p>
            </Panel>
          )}

          <Panel
            title="Production gates"
            status="Phase 5"
            bodyClassName="space-y-2 text-[11px] leading-5 text-mist-400"
          >
            <p>
              <span className="text-paper-100">Gate A · assets</span> 61 parts with hashes and
              pending artistic approval.
            </p>
            <p>
              <span className="text-paper-100">Gate B · rigging</span> hierarchical artisan, horse,
              cart, and bell rigs.
            </p>
            <p>
              <span className="text-paper-100">Gate C · animation</span> data-driven walk, reach,
              nod, wheel and camera config.
            </p>
            <p>
              <span className="text-paper-100">Gate D · film</span> 720 frames / five shots / local
              MP4.
            </p>
            <p>
              <span className="text-paper-100">Gate E · cost</span> append-only local ledger; API
              spend $0.
            </p>
            <p>
              <span className="text-paper-100">Gate F · spending</span> remote providers disabled;
              no paid call.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
