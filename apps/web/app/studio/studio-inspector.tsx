"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildTimeline,
  evaluateProjectFrame,
  formatTimestamp,
  type EvaluatedLayer,
  type EvaluatedLayerContent,
} from "@fableon/animation-core";
import { createBrowserImageAssetResolver, renderFrameToCanvas } from "@fableon/render-engine";
import type { Project } from "@fableon/scene-schema";

import { BrandMark } from "@/components/brand-mark";
import { FrameIcon, LayersIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

interface StudioInspectorProps {
  project: Project;
}

const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-ink-600 px-3 py-1.5 text-xs text-mist-200 transition-colors hover:border-mist-400 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-40";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-ochre-400 bg-ochre-400 px-3 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:border-ochre-300 hover:bg-ochre-300 disabled:cursor-not-allowed disabled:opacity-40";

function formatNumber(value: number): string {
  return (Object.is(value, -0) ? 0 : value).toFixed(2);
}

function describeLayerContent(content: EvaluatedLayerContent): string {
  switch (content.type) {
    case "asset":
      return `Asset reference · ${content.assetId}`;
    case "text":
      return `Text · “${content.text}”`;
    case "solid":
      return `Solid color · ${content.color}`;
  }
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">{label}</dt>
      <dd aria-label={label} className="mt-1 truncate font-mono text-xs text-paper-100">
        {value}
      </dd>
    </div>
  );
}

function LayerDetails({ layer }: { layer: EvaluatedLayer }) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-950/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-paper-100">{layer.name}</h3>
          <p className="mt-1 text-[11px] leading-5 text-mist-400">
            {describeLayerContent(layer.content)}
          </p>
        </div>
        <Badge variant="outline">{layer.type}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric label="Resolved x" value={`${formatNumber(layer.transform.x)} px`} />
        <Metric label="Resolved y" value={`${formatNumber(layer.transform.y)} px`} />
        <Metric label="Resolved scale x" value={formatNumber(layer.transform.scaleX)} />
        <Metric label="Resolved scale y" value={formatNumber(layer.transform.scaleY)} />
        <Metric label="Resolved rotation" value={`${formatNumber(layer.transform.rotation)}°`} />
        <Metric label="Resolved opacity" value={formatNumber(layer.transform.opacity)} />
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-700 pt-3">
        <span className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
          Visibility
        </span>
        <span className="font-mono text-[10px] text-mist-200">
          {layer.visible ? "visible" : "hidden"}
        </span>
      </div>
    </div>
  );
}

export function StudioInspector({ project }: StudioInspectorProps) {
  const timeline = useMemo(() => buildTimeline(project), [project]);
  const [frame, setFrame] = useState(0);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRenderedFrame, setHasRenderedFrame] = useState(false);
  const [isRendering, setIsRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [lastRenderMs, setLastRenderMs] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderRequestRef = useRef(0);
  const renderQueueRef = useRef<Promise<void>>(Promise.resolve());
  const playbackStartRef = useRef<{ frame: number; time: number } | null>(null);
  const assetResolver = useMemo(
    () => createBrowserImageAssetResolver(project.assets, { basePath: "/" }),
    [project.assets],
  );
  const plan = useMemo(() => evaluateProjectFrame(project, frame), [project, frame]);

  const activeTiming = timeline.scenes[plan.sceneIndex];
  if (!activeTiming) {
    throw new Error("Timeline invariant failed: active scene timing is missing.");
  }

  const selectedLayer = plan.layers.find((layer) => layer.id === selectedLayerId) ?? plan.layers[0];
  const previousScene = plan.sceneIndex > 0 ? timeline.scenes[plan.sceneIndex - 1] : undefined;
  const nextScene = timeline.scenes[plan.sceneIndex + 1];
  const timestamp = formatTimestamp(plan.globalFrame, project.frameRate);
  const previewState = renderError ? "error" : hasRenderedFrame ? "ready" : "loading";
  const frameBudgetMs = 1000 / project.frameRate;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const requestId = ++renderRequestRef.current;
    setIsRendering(true);

    renderQueueRef.current = renderQueueRef.current.then(async () => {
      if (requestId !== renderRequestRef.current) {
        return;
      }

      const started = performance.now();
      try {
        await renderFrameToCanvas(canvas, plan, {
          assets: assetResolver,
          width: project.canvas.width,
          height: project.canvas.height,
        });

        if (requestId !== renderRequestRef.current) {
          return;
        }

        setLastRenderMs(performance.now() - started);
        setHasRenderedFrame(true);
        setRenderError(null);
        setIsRendering(false);
      } catch (error) {
        if (requestId !== renderRequestRef.current) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setRenderError(message);
        setHasRenderedFrame(false);
        setIsRendering(false);
      }
    });

    return () => {
      renderRequestRef.current += 1;
    };
  }, [assetResolver, plan, project.canvas.height, project.canvas.width]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const start = playbackStartRef.current;
    if (!start) {
      setIsPlaying(false);
      return;
    }

    const lastFrame = timeline.totalFrames - 1;
    let animationFrame = 0;

    const tick = (now: number) => {
      const elapsedSeconds = (now - start.time) / 1000;
      const nextFrame = start.frame + Math.floor(elapsedSeconds * project.frameRate);

      if (nextFrame >= lastFrame) {
        setFrame(lastFrame);
        setIsPlaying(false);
        playbackStartRef.current = null;
        return;
      }

      setFrame((current) => (current === nextFrame ? current : nextFrame));
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, project.frameRate, timeline.totalFrames]);

  useEffect(() => {
    return () => {
      assetResolver.clear();
    };
  }, [assetResolver]);

  function seek(nextFrame: number): void {
    setIsPlaying(false);
    playbackStartRef.current = null;
    setExportMessage(null);
    setFrame(Math.min(Math.max(Math.round(nextFrame), 0), timeline.totalFrames - 1));
  }

  function togglePlayback(): void {
    if (isPlaying) {
      setIsPlaying(false);
      playbackStartRef.current = null;
      return;
    }

    const lastFrame = timeline.totalFrames - 1;
    const startFrame = plan.globalFrame >= lastFrame ? 0 : plan.globalFrame;
    if (startFrame !== plan.globalFrame) {
      setFrame(startFrame);
    }
    playbackStartRef.current = { frame: startFrame, time: performance.now() };
    setIsPlaying(true);
  }

  async function exportFrame(): Promise<void> {
    const canvas = canvasRef.current;
    if (!canvas || !hasRenderedFrame || renderError) {
      return;
    }

    setIsExporting(true);
    setExportMessage(null);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!blob) {
        setExportMessage("Could not encode the current canvas as PNG.");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `fableon-frame-${String(plan.globalFrame).padStart(4, "0")}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setExportMessage(`Exported frame ${plan.globalFrame} as PNG.`);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <h1 className="sr-only">Fableon Studio</h1>

      <header className="flex min-h-14 flex-wrap items-center gap-3 border-b border-ink-700 bg-ink-900/90 px-4 py-2">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Fableon home">
          <BrandMark className="size-8" />
          <span className="hidden font-serif text-lg tracking-tight text-paper-50 sm:inline">
            Fableon
          </span>
        </Link>
        <span aria-hidden="true" className="hidden h-5 w-px bg-ink-600 sm:block" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-paper-100">{project.title}</p>
          <p className="truncate font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
            Sample project · {project.id}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge variant="accent" className="hidden md:inline-flex">
            Phase 2 · Paint preview
          </Badge>
          <Link
            href="/"
            className="rounded-md border border-ink-700 px-2.5 py-1.5 text-[11px] text-mist-300 transition-colors hover:border-ink-500 hover:text-paper-50"
          >
            Exit studio
          </Link>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-[16rem_minmax(0,1fr)_19rem]">
        <aside
          aria-label="Project and scenes"
          className="flex flex-col gap-3 border-b border-ink-700 bg-ink-900/40 p-3 lg:border-r lg:border-b-0"
        >
          <Panel title="Project" status="Read only" bodyClassName="space-y-3">
            <dl className="space-y-2.5">
              <Metric label="Project title" value={project.title} />
              <Metric label="Project ID" value={project.id} />
              <Metric label="Frame rate" value={`${project.frameRate} fps`} />
              <Metric label="Canvas" value={`${project.canvas.width} × ${project.canvas.height}`} />
              <Metric label="Seed" value={String(project.seed)} />
              <Metric
                label="Duration"
                value={`${timeline.totalFrames} frames · ${formatTimestamp(timeline.totalFrames, project.frameRate)}`}
              />
            </dl>
            <p className="border-t border-ink-700 pt-3 text-[11px] leading-5 text-mist-500">
              Read-only fixture data. Project editing and persistence arrive in Phase 5.
            </p>
          </Panel>

          <Panel title="Scenes" status={`${timeline.scenes.length} scenes`} bodyClassName="p-2">
            <ol className="space-y-1.5">
              {timeline.scenes.map((scene) => {
                const active = scene.sceneId === plan.sceneId;

                return (
                  <li key={scene.sceneId}>
                    <button
                      type="button"
                      onClick={() => seek(scene.startFrame)}
                      aria-current={active ? "true" : undefined}
                      aria-label={`Select scene ${scene.sceneIndex + 1}: ${scene.sceneName}`}
                      className={cn(
                        "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                        active
                          ? "border-ochre-500/60 bg-ochre-500/10"
                          : "border-transparent hover:bg-ink-800",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[9px] tracking-[0.12em] text-mist-500">
                          {String(scene.sceneIndex + 1).padStart(2, "0")}
                        </span>
                        <Badge variant={active ? "accent" : "outline"}>
                          {scene.durationFrames} f
                        </Badge>
                      </span>
                      <span className="mt-1.5 block truncate text-xs text-paper-100">
                        {scene.sceneName}
                      </span>
                      <span className="mt-1 block font-mono text-[9px] text-mist-500">
                        Global {scene.startFrame}–{scene.endFrame - 1}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </aside>

        <main
          aria-label="Canvas and timeline"
          className="flex min-w-0 flex-col gap-3 border-b border-ink-700 p-3 lg:border-b-0"
        >
          <Panel title="Canvas / Preview" status="Canvas 2D" bodyClassName="flex flex-col gap-2.5">
            <div
              data-testid="preview-surface"
              data-preview-state={previewState}
              data-rendering={isRendering ? "true" : "false"}
              data-frame={plan.globalFrame}
              data-scene={plan.sceneId}
              className="relative aspect-video w-full overflow-hidden rounded-md border border-ink-700 bg-[#080a0b]"
            >
              <canvas
                ref={canvasRef}
                width={project.canvas.width}
                height={project.canvas.height}
                role="img"
                aria-label={`Rendered frame preview at frame ${plan.globalFrame}`}
                className="block h-full w-full"
              />

              {previewState === "loading" ? (
                <div
                  role="status"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/80 px-6 text-center"
                >
                  <span className="flex size-10 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-mist-400">
                    <FrameIcon className="size-5" />
                  </span>
                  <p className="font-serif text-xl text-paper-100">Loading painted frame…</p>
                  <p className="max-w-sm text-xs leading-5 text-mist-400">
                    Decoding local image assets and compositing the current FramePlan on Canvas 2D.
                  </p>
                  <Badge variant="muted">Loading assets</Badge>
                </div>
              ) : null}

              {previewState === "error" ? (
                <div
                  role="alert"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/90 px-6 text-center"
                >
                  <p className="font-serif text-xl text-paper-100">Frame could not be rendered</p>
                  <p className="max-w-md text-xs leading-5 text-clay-500">{renderError}</p>
                  <p className="max-w-md text-[10px] leading-4 text-mist-500">
                    Missing or unsupported assets are reported explicitly; they are never replaced
                    silently.
                  </p>
                </div>
              ) : null}

              <span className="pointer-events-none absolute top-3 right-6 font-mono text-[9px] tracking-[0.12em] text-mist-400 uppercase drop-shadow">
                {project.canvas.width} × {project.canvas.height} · {project.frameRate} fps
              </span>
              <span className="pointer-events-none absolute bottom-3 left-6 font-mono text-[9px] tracking-[0.12em] text-paper-100 uppercase drop-shadow">
                {plan.sceneName} · local frame {plan.localFrame}
              </span>
              {previewState === "ready" ? (
                <span className="pointer-events-none absolute top-3 left-3 flex items-center gap-2">
                  <Badge variant="accent">Canvas 2D</Badge>
                  {lastRenderMs !== null ? (
                    <span
                      aria-label="Last render time"
                      className="rounded-full border border-ink-700 bg-ink-950/70 px-2 py-0.5 font-mono text-[9px] text-mist-300"
                    >
                      {lastRenderMs.toFixed(1)} ms
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-start justify-between gap-2 px-0.5">
              <p className="max-w-xl text-[11px] leading-5 text-mist-500">
                Real Canvas 2D output composited from the active FramePlan. Artwork is procedural
                Phase 2 benchmark painting, not AI imagery.
              </p>
              <p
                aria-label="Render performance"
                className="font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase"
              >
                {lastRenderMs === null
                  ? "Waiting for first frame"
                  : lastRenderMs > frameBudgetMs
                    ? `Last render ${lastRenderMs.toFixed(1)} ms · slower than 24 FPS budget`
                    : `Last render ${lastRenderMs.toFixed(1)} ms · within 24 FPS budget`}
              </p>
            </div>
            {exportMessage ? (
              <p aria-live="polite" className="px-0.5 text-[11px] text-mist-300">
                {exportMessage}
              </p>
            ) : null}
          </Panel>

          <Panel title="Timeline" status="Phase 1" bodyClassName="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[9px] tracking-[0.14em] text-ochre-400 uppercase">
                  Active scene
                </p>
                <p aria-label="Active scene" className="mt-1 font-serif text-xl text-paper-50">
                  {plan.sceneName}
                </p>
                <p className="mt-1 font-mono text-[10px] text-mist-500">
                  Global {plan.globalFrame} · local {plan.localFrame} · {timestamp}
                </p>
              </div>
              <div className="flex gap-2">
                <output
                  aria-label="Current frame"
                  className="rounded-md border border-ink-700 bg-ink-850 px-3 py-2 font-mono text-xs text-paper-100"
                >
                  Frame {plan.globalFrame}
                </output>
                <output
                  aria-label="Current timestamp"
                  className="rounded-md border border-ink-700 bg-ink-850 px-3 py-2 font-mono text-xs text-paper-100"
                >
                  {timestamp}
                </output>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                <label htmlFor="global-frame-scrubber">Global frame</label>
                <span>
                  {plan.globalFrame} / {timeline.totalFrames - 1}
                </span>
              </div>
              <input
                id="global-frame-scrubber"
                type="range"
                min={0}
                max={timeline.totalFrames - 1}
                step={1}
                value={plan.globalFrame}
                onChange={(event) => seek(Number(event.currentTarget.value))}
                aria-label="Global frame"
                aria-valuetext={`Frame ${plan.globalFrame}, ${timestamp}`}
                className="h-2 w-full cursor-pointer accent-ochre-400"
              />
              <div
                aria-hidden="true"
                className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-ink-800"
              >
                {timeline.scenes.map((scene) => (
                  <span
                    key={scene.sceneId}
                    style={{ width: `${(scene.durationFrames / timeline.totalFrames) * 100}%` }}
                    className={cn(
                      "h-full",
                      scene.sceneId === plan.sceneId ? "bg-ochre-400" : "bg-ink-600",
                    )}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[9px] text-mist-500">
                <span>0</span>
                <span>{timeline.totalFrames - 1}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-ink-700 pt-4">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!hasRenderedFrame || Boolean(renderError)}
                aria-label={isPlaying ? "Pause playback" : "Play animation"}
                aria-pressed={isPlaying}
                className={primaryButtonClassName}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => void exportFrame()}
                disabled={!hasRenderedFrame || Boolean(renderError) || isRendering || isExporting}
                aria-label="Export frame PNG"
                className={secondaryButtonClassName}
              >
                {isExporting ? "Exporting…" : "Export PNG"}
              </button>
              <span className="ml-auto font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase">
                24 FPS target · elapsed-time playback
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => previousScene && seek(previousScene.startFrame)}
                disabled={!previousScene}
                className={secondaryButtonClassName}
              >
                ← Previous scene
              </button>
              <button
                type="button"
                onClick={() => nextScene && seek(nextScene.startFrame)}
                disabled={!nextScene}
                className={secondaryButtonClassName}
              >
                Next scene →
              </button>
              <span className="ml-auto font-mono text-[9px] tracking-[0.1em] text-mist-500 uppercase">
                Scene {plan.sceneIndex + 1} of {timeline.scenes.length} · global{" "}
                {activeTiming.startFrame}–{activeTiming.endFrame - 1}
              </span>
            </div>
          </Panel>
        </main>

        <aside
          aria-label="Evaluated layers and assets"
          className="flex flex-col gap-3 border-ink-700 bg-ink-900/40 p-3 lg:border-l"
        >
          <Panel
            title="Evaluated layers"
            status={`${plan.layers.length} layers`}
            bodyClassName="space-y-3"
          >
            <p className="text-[11px] leading-5 text-mist-500">
              Resolved by animation-core for global frame {plan.globalFrame}. Select a layer to
              inspect its transform.
            </p>

            <ol className="space-y-1.5">
              {plan.layers.map((layer) => {
                const selected = selectedLayer?.id === layer.id;

                return (
                  <li key={layer.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLayerId(layer.id)}
                      aria-label={`Select layer ${layer.name}`}
                      aria-pressed={selected}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                        selected
                          ? "border-ochre-500/60 bg-ochre-500/10"
                          : "border-transparent hover:bg-ink-800",
                      )}
                    >
                      <span className="font-mono text-[9px] text-mist-500">
                        {String(layer.order).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-paper-100">
                        {layer.name}
                      </span>
                      <span className="font-mono text-[9px] text-mist-500 uppercase">
                        {layer.type}
                      </span>
                      <span className="font-mono text-[9px] text-mist-400">
                        {formatNumber(layer.transform.opacity)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {selectedLayer ? (
              <LayerDetails layer={selectedLayer} />
            ) : (
              <EmptyState
                icon={<LayersIcon className="size-4" />}
                title="No layers in this scene"
                description="The evaluator returned an empty layer stack for this scene."
                className="min-h-28"
              />
            )}
          </Panel>

          <Panel title="Assets" status={`${project.assets.length} refs`} bodyClassName="space-y-2">
            <ul className="space-y-1.5">
              {project.assets.map((asset) => (
                <li key={asset.id} className="rounded-md border border-ink-700 bg-ink-950/30 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-paper-100">{asset.name}</span>
                    <Badge variant="muted">{asset.type}</Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-[9px] text-mist-500">{asset.path}</p>
                </li>
              ))}
            </ul>
            <p className="border-t border-ink-700 pt-2 text-[10px] leading-5 text-mist-500">
              Local image assets are loaded through the browser-safe resolver. Audio manifest
              entries remain non-rendered references.
            </p>
          </Panel>
        </aside>
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-700 bg-ink-900 px-4 py-2 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
        <span className="flex items-center gap-2 text-mist-300">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ochre-400" />
          Canvas 2D live preview
        </span>
        <span className="hidden sm:inline">Renderer — local Canvas 2D</span>
        <span className="hidden md:inline">Assets — local PNG</span>
        <span className="hidden md:inline">Procedural benchmark artwork</span>
        <span className="ml-auto">
          Frame {plan.globalFrame} · {timestamp}
        </span>
      </footer>
    </div>
  );
}
