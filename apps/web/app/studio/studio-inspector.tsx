"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  buildTimeline,
  evaluateProjectFrame,
  formatTimestamp,
  type EvaluatedLayer,
  type EvaluatedLayerContent,
} from "@fableon/animation-core";
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
  const plan = useMemo(() => evaluateProjectFrame(project, frame), [project, frame]);

  const activeTiming = timeline.scenes[plan.sceneIndex];
  if (!activeTiming) {
    throw new Error("Timeline invariant failed: active scene timing is missing.");
  }

  const selectedLayer = plan.layers.find((layer) => layer.id === selectedLayerId) ?? plan.layers[0];
  const previousScene = plan.sceneIndex > 0 ? timeline.scenes[plan.sceneIndex - 1] : undefined;
  const nextScene = timeline.scenes[plan.sceneIndex + 1];
  const timestamp = formatTimestamp(plan.globalFrame, project.frameRate);

  function seek(nextFrame: number): void {
    setFrame(Math.min(Math.max(Math.round(nextFrame), 0), timeline.totalFrames - 1));
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
            Phase 1 · Inspector
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
          <Panel title="Canvas / Preview" status="Phase 2" bodyClassName="flex flex-col gap-2.5">
            <div
              className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-ink-700 bg-[#080a0b]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgb(38 43 52 / 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgb(38 43 52 / 0.3) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            >
              <span
                aria-hidden="true"
                className="absolute top-3 left-3 size-3 border-t border-l border-ink-500"
              />
              <span
                aria-hidden="true"
                className="absolute top-3 right-3 size-3 border-t border-r border-ink-500"
              />
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-3 size-3 border-b border-l border-ink-500"
              />
              <span
                aria-hidden="true"
                className="absolute right-3 bottom-3 size-3 border-r border-b border-ink-500"
              />

              <span className="absolute top-3 right-6 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                {project.canvas.width} × {project.canvas.height} · {project.frameRate} fps
              </span>
              <span className="absolute bottom-3 left-6 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                {plan.sceneName} · local frame {plan.localFrame}
              </span>

              <div className="relative flex max-w-sm flex-col items-center gap-3 px-6 text-center">
                <span className="flex size-10 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-mist-400">
                  <FrameIcon className="size-5" />
                </span>
                <p className="font-serif text-xl text-paper-100">No painterly preview yet</p>
                <p className="text-xs leading-5 text-mist-400">
                  The visual renderer arrives in Phase 2. This panel shows real evaluator data, not
                  a rendered frame.
                </p>
                <Badge variant="outline">Renderer not connected</Badge>
              </div>
            </div>
            <p className="px-0.5 text-[11px] leading-5 text-mist-500">
              Scene data is driving this inspector. No artwork is loaded or animated here.
            </p>
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
              Reference metadata only. No media files are loaded or rendered in Phase 1.
            </p>
          </Panel>
        </aside>
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-700 bg-ink-900 px-4 py-2 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
        <span className="flex items-center gap-2 text-mist-300">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ochre-400" />
          Data-only inspector
        </span>
        <span className="hidden sm:inline">Renderer — not connected</span>
        <span className="hidden md:inline">Assets — references only</span>
        <span className="ml-auto">
          Frame {plan.globalFrame} · {timestamp}
        </span>
      </footer>
    </div>
  );
}
