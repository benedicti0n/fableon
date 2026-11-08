"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { LANDING_FPS, LANDING_FRAME_COUNT, landingPhaseForFrame } from "@fableon/paint-engine";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { createDiagnosticBenchmark, type DiagnosticBenchmark } from "./diagnostic-pack";
import {
  baselineFrameDataUrl,
  captureFrame as captureFrameOutput,
  createContactSheet,
  createFidelityComparison,
  createRigValidation,
  createValidationReport,
  importedFrameDataUrl,
  measureRenderBreakdown,
  preparedCharacterDataUrl,
  renderBaselineFrame,
  renderImportedFrame,
  sourceArtworkDataUrl,
  type FidelityComparison,
} from "./render";

interface Phase26CaptureApi {
  captureFrame(frame: number): ReturnType<typeof captureFrameOutput>;
  captureContactSheet(): string;
  captureFidelityComparison(): ReturnType<typeof createFidelityComparison>;
  captureValidation(): ReturnType<typeof createValidationReport>;
  captureRigValidation(): ReturnType<typeof createRigValidation>;
  captureRenderBreakdown(): ReturnType<typeof measureRenderBreakdown>;
  sourceArtwork(): string;
  preparedCharacter(): string;
  importedFrame(frame: number): string;
  baselineFrame(frame: number): string;
}

type Phase26Window = Window & {
  __FABLEON_PHASE_02_6__?: Phase26CaptureApi;
};

const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-ink-600 px-3 py-1.5 text-xs text-mist-200 transition-colors hover:border-mist-400 hover:text-paper-50 disabled:cursor-not-allowed disabled:opacity-40";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-md border border-ochre-400 bg-ochre-400 px-3 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:border-ochre-300 hover:bg-ochre-300 disabled:cursor-not-allowed disabled:opacity-40";

function formatMs(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)} ms`;
}

function formatFrameTimestamp(frame: number): string {
  const totalMilliseconds = Math.round((frame / LANDING_FPS) * 1000);
  const seconds = Math.floor(totalMilliseconds / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}.${String(
    milliseconds,
  ).padStart(3, "0")}`;
}

export function Phase26Benchmark() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticBenchmark | null>(null);
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderTimes, setRenderTimes] = useState<{
    baseline: number;
    imported: number;
  } | null>(null);
  const [fidelity, setFidelity] = useState<FidelityComparison | null>(null);
  const baselineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const importedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackStartRef = useRef<{ frame: number; time: number } | null>(null);

  const phase = landingPhaseForFrame(frame);
  const timestamp = formatFrameTimestamp(frame);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const initialize = async () => {
      try {
        const created = await createDiagnosticBenchmark();
        if (cancelled) {
          for (const url of created.objectUrls) URL.revokeObjectURL(url);
          return;
        }
        setDiagnostic(created);
        setIsReady(true);
        setError(null);

        const captureApi: Phase26CaptureApi = {
          captureFrame: (targetFrame) => captureFrameOutput(targetFrame, created),
          captureContactSheet: () => createContactSheet(created),
          captureFidelityComparison: () => createFidelityComparison(created),
          captureValidation: () => createValidationReport(created),
          captureRigValidation: () => createRigValidation(created),
          captureRenderBreakdown: () => measureRenderBreakdown(created),
          sourceArtwork: () => sourceArtworkDataUrl(created),
          preparedCharacter: () => preparedCharacterDataUrl(created),
          importedFrame: (targetFrame) => importedFrameDataUrl(targetFrame, created),
          baselineFrame: (targetFrame) => baselineFrameDataUrl(targetFrame, created),
        };
        (window as Phase26Window).__FABLEON_PHASE_02_6__ = captureApi;
        setFidelity(createFidelityComparison(created));
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
      delete (window as Phase26Window).__FABLEON_PHASE_02_6__;
    };
  }, []);

  useEffect(() => {
    if (!diagnostic) return;
    const baselineCanvas = baselineCanvasRef.current;
    const importedCanvas = importedCanvasRef.current;
    if (!baselineCanvas || !importedCanvas) return;

    const baselineStarted = performance.now();
    renderBaselineFrame(baselineCanvas, frame, diagnostic);
    const baselineMs = performance.now() - baselineStarted;

    const importedStarted = performance.now();
    renderImportedFrame(importedCanvas, frame, diagnostic);
    const importedMs = performance.now() - importedStarted;

    setRenderTimes({ baseline: baselineMs, imported: importedMs });
    setError(null);
  }, [diagnostic, frame]);

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
      const next = start.frame + Math.floor(elapsed * LANDING_FPS);
      if (next >= LANDING_FRAME_COUNT - 1) {
        setFrame(LANDING_FRAME_COUNT - 1);
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

  useEffect(() => {
    return () => {
      if (diagnostic) {
        for (const url of diagnostic.objectUrls) URL.revokeObjectURL(url);
      }
    };
  }, [diagnostic]);

  function seek(nextFrame: number): void {
    setIsPlaying(false);
    playbackStartRef.current = null;
    setFrame(Math.min(Math.max(Math.round(nextFrame), 0), LANDING_FRAME_COUNT - 1));
  }

  function togglePlayback(): void {
    if (isPlaying) {
      setIsPlaying(false);
      playbackStartRef.current = null;
      return;
    }
    const startFrame = frame >= LANDING_FRAME_COUNT - 1 ? 0 : frame;
    if (startFrame !== frame) setFrame(startFrame);
    playbackStartRef.current = { frame: startFrame, time: performance.now() };
    setIsPlaying(true);
  }

  const metrics = useMemo(() => {
    if (!diagnostic) return null;
    const maxPartError = Math.max(
      ...diagnostic.parts.map((part) => part.pixelDifference.meanAbsoluteError),
    );
    return {
      importedParts: diagnostic.characterPack.parts.length,
      environmentLayers: diagnostic.environmentPack.parts.length,
      maxPartError,
      characterReady: diagnostic.characterPreparation.ready,
      environmentReady: diagnostic.environmentPreparation.ready,
      rigReady: diagnostic.rigCompatibility.ready,
      footLocked: createRigValidation(diagnostic).footContact.locked,
      deterministic: createRigValidation(diagnostic).determinism.allRepeatedEvaluationsEqual,
    };
  }, [diagnostic]);

  return (
    <main className="mx-auto max-w-[1700px] px-5 py-8">
      <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
        Phase 2.6 · Hybrid illustration validation
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-paper-50">Imported Artwork, Same Motion</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
            This benchmark re-imports the Phase 2.5 layered bird and forest through the Phase 2.6
            asset pipeline, then runs the same 48-frame landing motion. It tests pipeline fidelity,
            not premium illustration quality.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/studio/assets" className={secondaryButtonClassName}>
            Prepare assets
          </Link>
          <Link href="/benchmarks/phase-02-5" className={secondaryButtonClassName}>
            Phase 2.5 baseline
          </Link>
          <Link
            href="/"
            className="rounded-md border border-ink-700 px-3 py-2 text-xs text-mist-300 transition-colors hover:border-ink-500 hover:text-paper-50"
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
          <Badge variant="accent">Diagnostic artwork</Badge>
          <p className="text-sm font-medium text-ochre-200">
            DIAGNOSTIC ARTWORK — NOT ARTISTIC VALIDATION
          </p>
        </div>
        <p className="mt-2 max-w-5xl text-xs leading-5 text-mist-300">
          No premium source artwork was present in the repository. The benchmark uses the Phase 2.5
          procedural layered bird and forest as a diagnostic fixture, imported through the real PNG
          inspection, trim, registration, hash, pack, and rig-adapter path. A premium-art comparison
          is <strong>BLOCKED</strong>, not passed. The required source deliverables are listed below
          and in
          <code className="mx-1 text-mist-200">SOURCE_ASSET_REQUIREMENTS.md</code>.
        </p>
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <section
            data-testid="phase26-benchmark"
            data-ready={isReady ? "true" : "false"}
            data-frame={frame}
            data-source="diagnostic"
            data-character-parts={metrics?.importedParts ?? 0}
            data-fidelity-mae={fidelity?.frame47MeanAbsoluteError ?? ""}
            className="rounded-xl border border-ink-700 bg-ink-900 p-3"
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="font-serif text-lg text-paper-100">
                    Phase 2.5 procedural baseline
                  </h2>
                  <Badge variant="muted">original</Badge>
                </div>
                <div className="relative aspect-video overflow-hidden rounded-md border border-ink-700 bg-[#080a0b]">
                  <canvas
                    ref={baselineCanvasRef}
                    width={1920}
                    height={1080}
                    role="img"
                    aria-label={`Phase 2.5 procedural baseline frame ${frame}`}
                    className="block h-full w-full"
                  />
                </div>
                <p className="mt-2 font-mono text-[9px] text-mist-500">
                  render {formatMs(renderTimes?.baseline ?? null)}
                </p>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="font-serif text-lg text-paper-100">Phase 2.6 imported pack</h2>
                  <Badge variant="accent">diagnostic</Badge>
                </div>
                <div className="relative aspect-video overflow-hidden rounded-md border border-ink-700 bg-[#080a0b]">
                  <canvas
                    ref={importedCanvasRef}
                    width={1920}
                    height={1080}
                    role="img"
                    aria-label={`Phase 2.6 imported diagnostic frame ${frame}`}
                    className="block h-full w-full"
                  />
                  {!isReady ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink-950/85 px-6 text-center">
                      <p role="status" className="font-serif text-xl text-paper-100">
                        {error ? "Benchmark generation failed" : "Importing diagnostic pack…"}
                      </p>
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 font-mono text-[9px] text-mist-500">
                  render {formatMs(renderTimes?.imported ?? null)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!isReady}
                aria-label={isPlaying ? "Pause benchmark" : "Play benchmark"}
                className={primaryButtonClassName}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => seek(frame - 1)}
                disabled={!isReady || frame <= 0}
                aria-label="Previous benchmark frame"
                className={secondaryButtonClassName}
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => seek(frame + 1)}
                disabled={!isReady || frame >= LANDING_FRAME_COUNT - 1}
                aria-label="Next benchmark frame"
                className={secondaryButtonClassName}
              >
                →
              </button>
              <span className="rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 font-mono text-[10px] text-mist-200">
                Frame {frame} / {LANDING_FRAME_COUNT - 1}
              </span>
              <span className="rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 font-mono text-[10px] text-mist-200">
                {timestamp}
              </span>
              <Badge variant="outline">{phase}</Badge>
              <span className="ml-auto font-mono text-[9px] text-mist-500">
                1920×1080 · {LANDING_FPS} fps target
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={LANDING_FRAME_COUNT - 1}
              step={1}
              value={frame}
              disabled={!isReady}
              aria-label="Benchmark frame"
              onChange={(event) => seek(Number(event.currentTarget.value))}
              className="mt-3 w-full cursor-pointer accent-ochre-400"
            />
            {error ? (
              <p role="alert" className="mt-3 text-xs leading-5 text-clay-500">
                {error}
              </p>
            ) : null}
          </section>

          <Panel title="Fidelity comparison" status={fidelity ? "Captured" : "Pending"}>
            {fidelity ? (
              <div className="space-y-3">
                <Checkerboard>
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated runtime comparison sheet */}
                  <img
                    src={fidelity.dataUrl}
                    alt="Artwork fidelity comparison: source, prepared pack, neutral pose, animated pose"
                    className="w-full"
                  />
                </Checkerboard>
                <dl className="grid gap-2 sm:grid-cols-3">
                  <Metric
                    label="Frame 47 mean abs error"
                    value={fidelity.frame47MeanAbsoluteError.toFixed(4)}
                  />
                  <Metric
                    label="Environment mean abs error"
                    value={diagnostic?.environmentDifference.meanAbsoluteError.toFixed(4) ?? "—"}
                  />
                  <Metric
                    label="Max part pixel error"
                    value={metrics?.maxPartError.toFixed(4) ?? "—"}
                  />
                </dl>
                <p className="text-[10px] leading-4 text-mist-500">
                  Values compare the actual baseline render against the imported-pack render in this
                  environment. Low values indicate that import, trimming, registration, and rig
                  mapping preserved the source pixels; they do not measure artistic quality.
                </p>
              </div>
            ) : (
              <p className="text-xs text-mist-500">The comparison sheet is being generated.</p>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Pipeline metrics" status={isReady ? "Ready" : "Loading"}>
            {diagnostic && metrics ? (
              <dl className="space-y-2.5">
                <Metric label="Import time" value={`${diagnostic.timing.importMs.toFixed(1)} ms`} />
                <Metric label="Decode time" value={`${diagnostic.timing.decodeMs.toFixed(1)} ms`} />
                <Metric
                  label="Pack build time"
                  value={`${diagnostic.timing.packBuildMs.toFixed(1)} ms`}
                />
                <Metric label="Imported parts" value={String(metrics.importedParts)} />
                <Metric label="Environment layers" value={String(metrics.environmentLayers)} />
                <Metric
                  label="Frame 47 fidelity MAE"
                  value={fidelity?.frame47MeanAbsoluteError.toFixed(4) ?? "—"}
                />
                <Metric
                  label="Environment fidelity MAE"
                  value={diagnostic.environmentDifference.meanAbsoluteError.toFixed(4)}
                />
              </dl>
            ) : (
              <p className="text-xs text-mist-500">Inspecting and importing diagnostic assets.</p>
            )}
          </Panel>

          <Panel title="Validation status" status={isReady ? "Checked" : "Pending"}>
            {metrics ? (
              <ul className="space-y-2 text-[11px]">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-mist-400">Character pack</span>
                  <Badge variant={metrics.characterReady ? "accent" : "outline"}>
                    {metrics.characterReady ? "ready" : "incomplete"}
                  </Badge>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-mist-400">Environment pack</span>
                  <Badge variant={metrics.environmentReady ? "accent" : "outline"}>
                    {metrics.environmentReady ? "ready" : "incomplete"}
                  </Badge>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-mist-400">Rig compatibility</span>
                  <Badge variant={metrics.rigReady ? "accent" : "outline"}>
                    {metrics.rigReady ? "ready" : "blocked"}
                  </Badge>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-mist-400">Foot lock (30–47)</span>
                  <Badge variant={metrics.footLocked ? "accent" : "outline"}>
                    {metrics.footLocked ? "locked" : "drift"}
                  </Badge>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-mist-400">Repeat evaluation</span>
                  <Badge variant={metrics.deterministic ? "accent" : "outline"}>
                    {metrics.deterministic ? "equal" : "drift"}
                  </Badge>
                </li>
              </ul>
            ) : (
              <p className="text-xs text-mist-500">Waiting for the import and rig checks.</p>
            )}
          </Panel>

          <Panel title="Premium artwork gate" status="Blocked">
            <ul className="space-y-2 text-[10px] leading-4 text-mist-400">
              <li>Master character sheet with consistent anatomy and palette.</li>
              <li>Neutral, wings-raised, wings-lowered, landing, and perched poses.</li>
              <li>Separated transparent parts or authored hidden-side reconstruction.</li>
              <li>1920×1080+ painted forest background and independent branch.</li>
              <li>Documented provenance and usage rights for every source.</li>
            </ul>
            <p className="mt-3 border-t border-ink-700 pt-3 text-[10px] leading-4 text-ochre-200">
              The pipeline is ready to ingest these assets. The comparison remains blocked until
              they exist and are reviewed through `/studio/assets`.
            </p>
          </Panel>

          <Panel title="Diagnostic pack" status={`${diagnostic?.parts.length ?? 0} parts`}>
            {diagnostic ? (
              <div className="space-y-2">
                {diagnostic.parts.map((part) => (
                  <div
                    key={part.id}
                    className="rounded-md border border-ink-700 bg-ink-950/30 px-2.5 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-paper-100">{part.id}</span>
                      <span className="font-mono text-[9px] text-mist-500">
                        z
                        {diagnostic.characterPack.parts.find((item) => item.id === part.id)?.zIndex}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-mist-500">
                      {part.originalSize.width}×{part.originalSize.height} →{" "}
                      {part.preparedSize.width}×{part.preparedSize.height} · trim{" "}
                      {part.trim.applied ? "yes" : "no"} · pixel Δ{" "}
                      {part.pixelDifference.meanAbsoluteError.toFixed(4)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mist-500">Diagnostic parts are being prepared.</p>
            )}
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-xs text-paper-100">{value}</dd>
    </div>
  );
}

function Checkerboard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-md border border-ink-700"
      style={{
        backgroundColor: "#12151a",
        backgroundImage:
          "linear-gradient(45deg, #1b1f26 25%, transparent 25%), linear-gradient(-45deg, #1b1f26 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1b1f26 75%), linear-gradient(-45deg, transparent 75%, #1b1f26 75%)",
        backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
        backgroundSize: "24px 24px",
      }}
    >
      {children}
    </div>
  );
}
