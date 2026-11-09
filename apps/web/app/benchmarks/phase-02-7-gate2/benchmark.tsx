"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { landingPhaseForFrame } from "@fableon/paint-engine";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

import {
  captureEnvironmentPreview,
  capturePremiumContactSheet,
  capturePremiumFrame,
  capturePremiumPartsSheet,
  capturePremiumPivotSheet,
  capturePremiumValidation,
  createPremiumBenchmark,
  renderPremiumDebugOverlay,
  renderPremiumFrame,
  type PremiumBenchmark,
  type PremiumDebugValidation,
} from "./premium-benchmark";
import { PREMIUM_FPS, PREMIUM_FRAME_COUNT } from "./premium-rig";

const PART_TO_NODE: Record<string, string> = {
  body: "body",
  head: "head",
  eye: "eye",
  beak: "beak",
  "wing-far": "wingFar",
  "wing-near": "wingNear",
  tail: "tail",
  "leg-left": "legLeft",
  "leg-right": "legRight",
};

const PART_LABELS: Record<string, string> = {
  body: "Body",
  head: "Head",
  eye: "Eye",
  beak: "Beak",
  "wing-far": "Far wing",
  "wing-near": "Near wing",
  tail: "Tail",
  "leg-left": "Left leg",
  "leg-right": "Right leg",
};

interface Gate2CaptureApi {
  captureFrame(
    frame: number,
    hiddenPartIds?: readonly string[],
  ): ReturnType<typeof capturePremiumFrame>;
  captureContactSheet(): string;
  capturePivotSheet(): string;
  capturePartsSheet(): string;
  captureEnvironmentPreview(): string;
  captureValidation(): PremiumDebugValidation;
}

type Gate2Window = Window & {
  __FABLEON_GATE2__?: Gate2CaptureApi;
};

const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-ink-600 px-3 py-1.5 text-xs text-mist-200 transition-colors hover:border-mist-400 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-40";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-ochre-400 bg-ochre-400 px-3 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:border-ochre-300 hover:bg-ochre-300 disabled:cursor-not-allowed disabled:opacity-40";

function formatTimestamp(frame: number): string {
  const ms = Math.round((frame / PREMIUM_FPS) * 1000);
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.${String(
    ms % 1000,
  ).padStart(3, "0")}`;
}

function hiddenNodeIds(partIds: ReadonlySet<string>): readonly string[] {
  return [...partIds].map((partId) => PART_TO_NODE[partId] ?? partId);
}

export function Gate2Benchmark() {
  const [benchmark, setBenchmark] = useState<PremiumBenchmark | null>(null);
  const [validation, setValidation] = useState<PremiumDebugValidation | null>(null);
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [renderedFrame, setRenderedFrame] = useState<number | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [hiddenParts, setHiddenParts] = useState<ReadonlySet<string>>(new Set());
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const productionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackStartRef = useRef<{ frame: number; time: number } | null>(null);

  const phase = landingPhaseForFrame(frame);
  const timestamp = formatTimestamp(frame);
  const hiddenNodes = useMemo(() => hiddenNodeIds(hiddenParts), [hiddenParts]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const initialize = async () => {
      try {
        const created = await createPremiumBenchmark();
        if (cancelled) return;
        setBenchmark(created);
        setValidation(capturePremiumValidation(created));
        setIsReady(true);
        setError(null);

        const api: Gate2CaptureApi = {
          captureFrame: (targetFrame, hiddenPartIds = []) =>
            capturePremiumFrame(targetFrame, created, {
              hiddenNodeIds: hiddenNodeIds(new Set(hiddenPartIds)),
            }),
          captureContactSheet: () => capturePremiumContactSheet(created),
          capturePivotSheet: () => capturePremiumPivotSheet(created),
          capturePartsSheet: () => capturePremiumPartsSheet(created),
          captureEnvironmentPreview: () => captureEnvironmentPreview(created),
          captureValidation: () => capturePremiumValidation(created),
        };
        (window as Gate2Window).__FABLEON_GATE2__ = api;
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
          setIsReady(false);
        }
      }
    };

    timer = window.setTimeout(() => void initialize(), 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      delete (window as Gate2Window).__FABLEON_GATE2__;
    };
  }, []);

  useEffect(() => {
    if (!benchmark) return;
    const production = productionCanvasRef.current;
    const debug = debugCanvasRef.current;
    if (!production || !debug) return;

    const started = performance.now();
    renderPremiumFrame(production, frame, benchmark, { hiddenNodeIds: hiddenNodes });
    const elapsed = performance.now() - started;
    if (showDebug) {
      renderPremiumDebugOverlay(debug, frame, benchmark, { hiddenNodeIds: hiddenNodes });
    } else {
      const context = debug.getContext("2d");
      context?.clearRect(0, 0, debug.width, debug.height);
    }
    setRenderMs(elapsed);
    setRenderedFrame(frame);
    setError(null);
  }, [benchmark, frame, hiddenNodes, showDebug]);

  useEffect(() => {
    if (!isPlaying) return;
    const start = playbackStartRef.current;
    if (!start) {
      setIsPlaying(false);
      return;
    }
    let animationFrame = 0;
    const tick = (now: number) => {
      const elapsed = (now - start.time) / 1000;
      const next = start.frame + Math.floor(elapsed * PREMIUM_FPS);
      if (next >= PREMIUM_FRAME_COUNT - 1) {
        setFrame(PREMIUM_FRAME_COUNT - 1);
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

  function seek(next: number): void {
    setIsPlaying(false);
    playbackStartRef.current = null;
    setExportMessage(null);
    setFrame(Math.min(Math.max(Math.round(next), 0), PREMIUM_FRAME_COUNT - 1));
  }

  function togglePlayback(): void {
    if (isPlaying) {
      setIsPlaying(false);
      playbackStartRef.current = null;
      return;
    }
    const start = frame >= PREMIUM_FRAME_COUNT - 1 ? 0 : frame;
    if (start !== frame) setFrame(start);
    playbackStartRef.current = { frame: start, time: performance.now() };
    setIsPlaying(true);
  }

  function togglePart(partId: string): void {
    setHiddenParts((current) => {
      const next = new Set(current);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);
      return next;
    });
  }

  async function exportFrame(): Promise<void> {
    const canvas = productionCanvasRef.current;
    if (!canvas) return;
    setExportMessage(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });
      if (!blob) {
        setExportMessage("Could not encode the frame.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `premium-bird-frame-${String(frame).padStart(3, "0")}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportMessage(`Exported frame ${frame} as PNG.`);
    } catch (caught) {
      setExportMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <main className="mx-auto max-w-[1700px] px-5 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
            Phase 2.7 Gate 2 · candidate integration
          </p>
          <h1 className="mt-2 font-serif text-4xl text-paper-50">
            The Little Bird — Production Renderer Proof
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
            The repaired nine-part candidate is imported as a canonical Fableon illustration pack
            and animated through the existing Canvas renderer and hierarchical landing rig.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/studio/assets" className={secondaryButtonClassName}>
            Asset workspace
          </Link>
          <Link href="/benchmarks/phase-02-5" className={secondaryButtonClassName}>
            Phase 2.5 baseline
          </Link>
          <Link
            href="/"
            className="rounded-md border border-ink-700 px-3 py-2 text-xs text-mist-300 hover:border-ink-500 hover:text-paper-50"
          >
            Fableon home
          </Link>
        </div>
      </div>

      <section
        role="note"
        className="mt-6 rounded-xl border border-ochre-500/50 bg-ochre-500/5 px-4 py-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="accent">Gate 2 candidate</Badge>
          <p className="text-sm font-medium text-ochre-200">NOT APPROVED PRODUCTION ARTWORK</p>
        </div>
        <p className="mt-2 max-w-5xl text-xs leading-5 text-mist-300">
          The supplied candidate is integrated through the real Fableon pipeline. The background is
          the existing Phase 2.5 diagnostic forest, not premium art. Body and head were inferred
          reconstructions; wing, feather, and registration defects remain under review. Gate C
          artistic approval is pending.
        </p>
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-4">
          <section
            data-testid="gate2-benchmark"
            data-ready={isReady ? "true" : "false"}
            data-frame={frame}
            data-rendered-frame={renderedFrame ?? -1}
            data-source="premium-bird-v1"
            data-background="diagnostic-phase-2-5"
            data-parts={benchmark?.pack.parts.length ?? 0}
            data-debug={showDebug ? "on" : "off"}
            data-foot-locked={validation?.footLock.locked ? "true" : "false"}
            data-rig-ready={validation?.compatibilityReady ? "true" : "false"}
            className="rounded-xl border border-ink-700 bg-ink-900 p-3"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl text-paper-100">Production canvas</h2>
                <Badge variant="accent">Fableon Canvas</Badge>
                <Badge variant="outline">1920×1080</Badge>
              </div>
              <span className="font-mono text-[9px] text-mist-500">
                {renderMs === null ? "—" : `${renderMs.toFixed(2)} ms`}
              </span>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-md border border-ink-700 bg-[#080a0b]">
              <canvas
                ref={productionCanvasRef}
                width={1920}
                height={1080}
                role="img"
                aria-label={`Premium bird landing frame ${frame}`}
                className="block h-full w-full"
              />
              <canvas
                ref={debugCanvasRef}
                width={1920}
                height={1080}
                aria-hidden={!showDebug}
                data-testid="gate2-debug-overlay"
                className={cn(
                  "pointer-events-none absolute inset-0 h-full w-full",
                  showDebug ? "block" : "hidden",
                )}
              />
              {!isReady ? (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-950/85 px-6 text-center">
                  <p role="status" className="font-serif text-xl text-paper-100">
                    {error ? "Candidate could not be loaded" : "Importing candidate pack…"}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!isReady}
                aria-label={isPlaying ? "Pause premium benchmark" : "Play premium benchmark"}
                className={primaryButtonClassName}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => seek(0)}
                disabled={!isReady || frame === 0}
                aria-label="Replay premium benchmark"
                className={secondaryButtonClassName}
              >
                Replay
              </button>
              <button
                type="button"
                onClick={() => seek(frame - 1)}
                disabled={!isReady || frame <= 0}
                aria-label="Previous premium frame"
                className={secondaryButtonClassName}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => seek(frame + 1)}
                disabled={!isReady || frame >= PREMIUM_FRAME_COUNT - 1}
                aria-label="Next premium frame"
                className={secondaryButtonClassName}
              >
                →
              </button>
              <label className="flex items-center gap-2 text-[11px] text-mist-300">
                <input
                  type="checkbox"
                  checked={showDebug}
                  onChange={(event) => setShowDebug(event.currentTarget.checked)}
                  className="accent-ochre-400"
                />
                Pivot debug
              </label>
              <button
                type="button"
                onClick={() => void exportFrame()}
                disabled={!isReady}
                className={secondaryButtonClassName}
              >
                Export PNG
              </button>
              <span className="ml-auto rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 font-mono text-[10px] text-mist-200">
                Frame {frame} / 47 · {timestamp} · {phase}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={PREMIUM_FRAME_COUNT - 1}
              step={1}
              value={frame}
              aria-label="Premium benchmark frame"
              disabled={!isReady}
              onChange={(event) => seek(Number(event.currentTarget.value))}
              className="mt-3 w-full cursor-pointer accent-ochre-400"
            />
            {exportMessage ? (
              <p role="status" className="mt-2 text-[10px] text-mist-400">
                {exportMessage}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="mt-2 text-xs text-clay-500">
                {error}
              </p>
            ) : null}
          </section>

          <Panel title="Part visibility" status={`${9 - hiddenParts.size}/9 visible`}>
            <div className="flex flex-wrap gap-2">
              {benchmark?.pack.parts.map((part) => {
                const visible = !hiddenParts.has(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => togglePart(part.id)}
                    aria-pressed={visible}
                    aria-label={`Toggle ${PART_LABELS[part.id] ?? part.id} visibility`}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs",
                      visible
                        ? "border-ochre-500/50 bg-ochre-500/10 text-ochre-200"
                        : "border-ink-600 bg-ink-850 text-mist-500",
                    )}
                  >
                    {PART_LABELS[part.id] ?? part.id}
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Rig status" status={validation?.compatibilityReady ? "Ready" : "Pending"}>
            <dl className="space-y-2.5">
              <StatusRow
                label="Pack"
                value={`${benchmark?.pack.parts.length ?? 0} parts`}
                ok={benchmark?.pack.parts.length === 9}
              />
              <StatusRow
                label="Preparation"
                value={validation?.preparationReady ? "ready" : "blocked"}
                ok={validation?.preparationReady ?? false}
              />
              <StatusRow
                label="Rig mapping"
                value={validation?.compatibilityReady ? "ready" : "blocked"}
                ok={validation?.compatibilityReady ?? false}
              />
              <StatusRow
                label="Foot lock"
                value={
                  validation?.footLock.locked
                    ? `locked · drift ${validation.footLock.maxDrift.toExponential(1)}`
                    : "drift"
                }
                ok={validation?.footLock.locked ?? false}
              />
              <StatusRow
                label="Determinism"
                value={validation?.deterministic ? "repeated equal" : "drift"}
                ok={validation?.deterministic ?? false}
              />
            </dl>
            {validation?.compatibilityIssues.length ? (
              <ul className="mt-3 space-y-1.5 border-t border-ink-700 pt-3">
                {validation.compatibilityIssues.map((issue) => (
                  <li
                    key={`${issue.code}-${issue.message}`}
                    className="text-[10px] leading-4 text-mist-400"
                  >
                    <span className="font-mono uppercase">{issue.severity}</span> · {issue.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-ink-700 pt-3 text-[10px] leading-4 text-mist-500">
                No structural rig mapping errors. This does not approve anatomy or artistic quality.
              </p>
            )}
          </Panel>

          <Panel title="Candidate limitations" status="Under review">
            <ul className="space-y-2 text-[10px] leading-4 text-mist-400">
              <li>Body and head are inferred reconstructions, not hidden-pixel recovery.</li>
              <li>Source parts are only 45–266 px wide; the 2× display will soften detail.</li>
              <li>Near/far shoulder coverage and feather seams require visual review.</li>
              <li>Right leg was vertically adjusted to match the branch contact.</li>
              <li>The background is the diagnostic Phase 2.5 forest.</li>
            </ul>
          </Panel>

          <Panel title="Gate 2 decisions" status="Not certified">
            <ul className="space-y-2 text-[10px] leading-4">
              <li className="flex justify-between gap-3">
                <span className="text-mist-400">Import integrity</span>
                <Badge variant="accent">pass</Badge>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-mist-400">Rig compatibility</span>
                <Badge variant="accent">pass</Badge>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-mist-400">Animation rendering</span>
                <Badge variant="accent">pass</Badge>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-mist-400">Artwork quality</span>
                <Badge variant="outline">pending</Badge>
              </li>
            </ul>
            <p className="mt-3 border-t border-ink-700 pt-3 text-[10px] leading-4 text-mist-500">
              These badges describe technical checks only. Gate C remains for user and ChatGPT
              review.
            </p>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[11px] text-mist-400">{label}</dt>
      <dd
        className={cn("text-right font-mono text-[10px]", ok ? "text-sage-400" : "text-clay-500")}
      >
        {value}
      </dd>
    </div>
  );
}
