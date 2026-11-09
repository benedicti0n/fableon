"use client";

import { useEffect, useRef, useState } from "react";

import { Panel } from "@/components/ui/panel";
import { studioFetch, studioPostJson, StudioApiError } from "@/lib/studio/client";
import { loadFilmAssets } from "@/lib/film/assets";
import { FilmRenderer } from "@/lib/film/renderer";
import {
  evaluateFilmFrame,
  FILM_TOTAL_FRAMES,
  WHERE_THE_LIGHT_LANDS,
} from "@/lib/film/where-the-light-lands";

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

export function CompositionStudio() {
  const [renderer, setRenderer] = useState<FilmRenderer | null>(null);
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

  const state = evaluateFilmFrame(frame);
  const activeJob = job !== null && ACTIVE_STATUSES.has(job.status);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const assets = await loadFilmAssets();
        if (!cancelled) setRenderer(new FilmRenderer(assets));
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      if (next >= FILM_TOTAL_FRAMES) {
        setFrame(FILM_TOTAL_FRAMES - 1);
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
    const startFrame = frame >= FILM_TOTAL_FRAMES - 1 ? 0 : frame;
    if (startFrame !== frame) setFrame(startFrame);
    playbackRef.current = { frame: startFrame, time: performance.now() };
    setIsPlaying(true);
  }

  function seek(nextFrame: number): void {
    setIsPlaying(false);
    playbackRef.current = null;
    setFrame(Math.min(Math.max(Math.round(nextFrame), 0), FILM_TOTAL_FRAMES - 1));
  }

  async function startExport(): Promise<void> {
    setIsStartingExport(true);
    setExportError(null);
    try {
      const [width, height] = exportResolution.split("x").map(Number);
      const response = await studioPostJson<{ job: RenderJobView }>(
        "/api/studio/composition/export",
        {
          startFrame: Number(exportStart),
          endFrame: Number(exportEnd),
          width: width ?? 1920,
          height: height ?? 1080,
        },
      );
      setJob(response.job);
    } catch (caught) {
      setExportError(
        caught instanceof StudioApiError ? caught.message : "The export could not be started.",
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
        caught instanceof StudioApiError ? caught.message : "The export could not be cancelled.",
      );
    }
  }

  const timeLabel = `${(frame / 24).toFixed(2)} s / 30.00 s`;
  const exportProgress = job ? Math.round(job.progress * 100) : 0;

  return (
    <div data-testid="composition-page" className="space-y-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
            Phase 4 · local composition
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
            {WHERE_THE_LIGHT_LANDS.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-mist-400">
            30.000-second film · 720 frames · 24 fps · four deterministic shots · local Canvas 2D
            and FFmpeg. No paid provider is contacted.
          </p>
        </div>
        <div className="rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 font-mono text-[10px] text-mist-400">
          <span className="block text-paper-100">30.000 s</span>
          <span className="block">720 frames · 24 fps</span>
          <span className="block">1920×1080 target</span>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}

      <div
        data-testid="composition-frame-state"
        data-frame={frame}
        data-shot={state.composition.shot.id}
        data-local-frame={state.composition.localFrame}
        data-shot-title={state.composition.shot.title}
        data-character-visible={state.character ? "true" : "false"}
        data-wing-near={state.character ? state.character.wingNear.toFixed(3) : ""}
        data-foot-contact={state.character?.contact ? "true" : "false"}
        data-title={state.composition.titles[0]?.text ?? ""}
        data-title-opacity={state.composition.titles[0]?.opacity.toFixed(4) ?? ""}
        data-black-opacity={state.composition.blackOpacity.toFixed(4)}
        data-incoming-opacity={state.composition.incomingOpacity.toFixed(4)}
        data-previous-opacity={state.composition.previousOpacity.toFixed(4)}
        data-camera-zoom={state.camera.zoom.toFixed(3)}
        data-camera-x={state.camera.centerX.toFixed(3)}
        className="sr-only"
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Panel
            title="Composition preview"
            status={`Frame ${frame} / 719`}
            bodyClassName="space-y-3"
          >
            <div className="overflow-hidden rounded-md border border-ink-700 bg-black">
              <canvas
                ref={canvasRef}
                data-testid="composition-canvas"
                aria-label="Where the Light Lands composition frame"
                className="aspect-video h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? "Pause film" : "Play film"}
                className={studioPrimaryButtonClassName}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min={0}
                max={FILM_TOTAL_FRAMES - 1}
                step={1}
                value={frame}
                onChange={(event) => seek(Number(event.currentTarget.value))}
                aria-label="Film frame"
                className="min-w-32 flex-1 accent-ochre-400"
              />
              <span className="font-mono text-[10px] text-mist-300" aria-label="Film time">
                {timeLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-mist-400">
              <span className="font-mono text-mist-200">{state.composition.shot.title}</span>
              <span className="font-mono">
                local {state.composition.localFrame} · camera x {state.camera.centerX.toFixed(0)} ·
                zoom {state.camera.zoom.toFixed(2)}
              </span>
              <label className="ml-auto flex items-center gap-2">
                <span className={studioLabelClassName}>Preview</span>
                <select
                  value={previewResolution}
                  onChange={(event) => setPreviewResolution(event.currentTarget.value)}
                  className={studioSelectClassName}
                  aria-label="Preview resolution"
                >
                  <option value="1280x720">1280×720</option>
                  <option value="1920x1080">1920×1080</option>
                </select>
              </label>
            </div>
          </Panel>

          <Panel
            title="Shot sequence"
            status="4 shots"
            bodyClassName="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
          >
            {WHERE_THE_LIGHT_LANDS.shots.map((shot, index) => {
              const active = shot.id === state.composition.shot.id;
              return (
                <button
                  key={shot.id}
                  type="button"
                  onClick={() => seek(shot.startFrame)}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    active
                      ? "border-ochre-500/60 bg-ochre-500/10"
                      : "border-ink-700 bg-ink-950/40 hover:border-mist-400"
                  }`}
                >
                  <span className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                    Shot {String(index + 1).padStart(3, "0")}
                  </span>
                  <span className="mt-1 block font-serif text-base text-paper-100">
                    {shot.title}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-mist-400">
                    {shot.frameCount} frames · {(shot.frameCount / 24).toFixed(2)} s
                  </span>
                  <span className="mt-1 block font-mono text-[9px] text-mist-500">
                    {shot.startFrame}–{shot.startFrame + shot.frameCount - 1}
                  </span>
                </button>
              );
            })}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Local export" status="No paid API" bodyClassName="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={studioLabelClassName} htmlFor="export-start">
                  Start frame
                </label>
                <input
                  id="export-start"
                  type="number"
                  min={0}
                  max={719}
                  value={exportStart}
                  onChange={(event) => setExportStart(Number(event.currentTarget.value))}
                  className={studioInputClassName}
                />
              </div>
              <div>
                <label className={studioLabelClassName} htmlFor="export-end">
                  End frame
                </label>
                <input
                  id="export-end"
                  type="number"
                  min={0}
                  max={719}
                  value={exportEnd}
                  onChange={(event) => setExportEnd(Number(event.currentTarget.value))}
                  className={studioInputClassName}
                />
              </div>
            </div>
            <div>
              <label className={studioLabelClassName} htmlFor="export-resolution">
                Export resolution
              </label>
              <select
                id="export-resolution"
                value={exportResolution}
                onChange={(event) => setExportResolution(event.currentTarget.value)}
                className={studioSelectClassName}
              >
                <option value="1280x720">1280×720</option>
                <option value="1920x1080">1920×1080</option>
              </select>
            </div>
            <button
              type="button"
              data-testid="start-export"
              onClick={() => void startExport()}
              disabled={isStartingExport || activeJob}
              className={studioPrimaryButtonClassName}
            >
              {isStartingExport
                ? "Starting…"
                : activeJob
                  ? "Export in progress"
                  : "Start local export"}
            </button>
            {activeJob ? (
              <button
                type="button"
                onClick={() => void cancelExport()}
                className={studioSecondaryButtonClassName}
              >
                Request cancel
              </button>
            ) : null}
            <p className="text-[11px] leading-5 text-mist-500">
              The server starts a separate local render process. The browser polls genuine progress
              from a persisted job record. Jobs are not guaranteed to survive a server restart.
            </p>
            {exportError ? (
              <p
                role="alert"
                className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
              >
                {exportError}
              </p>
            ) : null}
          </Panel>

          {job ? (
            <div data-testid="export-panel">
              <Panel title="Render job" status={job.status} bodyClassName="space-y-3">
                <div
                  role="progressbar"
                  aria-label="Render progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={exportProgress}
                  data-testid="export-progress"
                  className="h-2 overflow-hidden rounded-full bg-ink-800"
                >
                  <div
                    className="h-full rounded-full bg-ochre-400 transition-[width]"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <p className="font-mono text-[10px] text-mist-400">
                  {exportProgress}% · {job.renderedFrames}/{job.totalFrames} frames · {job.width}×
                  {job.height}
                </p>
                {job.error ? (
                  <p role="alert" className="text-xs text-clay-500">
                    {job.error}
                  </p>
                ) : null}
                {job.status === "completed" ? (
                  <div className="space-y-2">
                    <video
                      data-testid="export-video"
                      src={`/api/studio/composition/export/${job.id}/video`}
                      controls
                      className="aspect-video w-full rounded-md border border-ink-700 bg-black"
                    />
                    <p className="font-mono text-[9px] break-all text-mist-500">{job.outputPath}</p>
                  </div>
                ) : null}
              </Panel>
            </div>
          ) : null}

          <Panel
            title="Engineering status"
            status="Local only"
            bodyClassName="space-y-2 text-xs leading-5 text-mist-400"
          >
            <p>
              Preview and export use the same <code>FilmRenderer</code> and frame evaluator.
            </p>
            <p>No AI provider, cloud renderer, or external service is contacted.</p>
            <p>Export writes a new file; it refuses to overwrite existing output.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
