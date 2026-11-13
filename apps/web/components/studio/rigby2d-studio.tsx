"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Panel } from "@/components/ui/panel";
import { studioFetch, studioPostJson, studioUpload, StudioApiError } from "@/lib/studio/client";
import { placeFrame } from "@/lib/rigby2d/placement";
import { DEFAULT_R2_2_SHOT } from "@/lib/rigby2d/shot";
import type {
  CharacterManifestView,
  CharacterVersionView,
  FrameRenderView,
  PoseCheckView,
  RenderJobView,
  RuntimeHealthView,
  ValidationView,
} from "@/lib/rigby2d/view-types";

import {
  studioInputClassName,
  studioLabelClassName,
  studioPrimaryButtonClassName,
  studioSecondaryButtonClassName,
  studioSelectClassName,
} from "./ui";

interface CharacterDetailResponse {
  readonly character: CharacterManifestView;
  readonly version: CharacterVersionView;
}

interface ImportResponse {
  readonly character: CharacterManifestView;
  readonly version: CharacterVersionView;
  readonly created: boolean;
}

const ACTIVE = new Set(["queued", "rendering"]);
const PREVIEW_WIDTH = 960;
const PREVIEW_HEIGHT = 540;
const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080;
const PREVIEW_SCALE = PREVIEW_WIDTH / OUTPUT_WIDTH;

function errorMessage(error: unknown): string {
  return error instanceof StudioApiError
    ? `${error.code}: ${error.message}`
    : error instanceof Error
      ? error.message
      : String(error);
}

function statusLabel(job: RenderJobView): string {
  if (job.status === "completed") return job.cached ? "completed · cached" : "completed";
  if (job.status === "rendering") return `rendering · ${job.phase}`;
  return job.status;
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  anchorX: number,
  anchorY: number,
  scale: number,
): void {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#f7f5f2");
  gradient.addColorStop(1, "#e4dfd8");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const horizon = height * DEFAULT_R2_2_SHOT.background.horizon;
  context.fillStyle = "#d8d0c5";
  context.fillRect(0, horizon, width, height - horizon);
  context.strokeStyle = "rgba(73, 58, 44, 0.22)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, horizon + 0.5);
  context.lineTo(width, horizon + 0.5);
  context.stroke();

  const shadow = context.createRadialGradient(anchorX, anchorY, 2, anchorX, anchorY, 95 * scale);
  shadow.addColorStop(0, "rgba(54, 42, 31, 0.28)");
  shadow.addColorStop(1, "rgba(54, 42, 31, 0)");
  context.save();
  context.translate(anchorX, anchorY);
  context.scale(1, 0.22);
  context.fillStyle = shadow;
  context.beginPath();
  context.arc(0, 0, 95 * scale, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawFrame(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  render: FrameRenderView | null,
  anchorX: number,
  anchorY: number,
  actorScale: number,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const previewAnchorX = anchorX * PREVIEW_SCALE;
  const previewAnchorY = anchorY * PREVIEW_SCALE;
  drawBackground(
    context,
    PREVIEW_WIDTH,
    PREVIEW_HEIGHT,
    previewAnchorX,
    previewAnchorY,
    actorScale,
  );
  if (!image || !render) return;
  const placement = placeFrame({
    frameWidth: render.frameWidth,
    frameHeight: render.frameHeight,
    pivot: render.pivot,
    actor: { x: anchorX, y: anchorY, scale: actorScale },
    camera: { centerX: 960, centerY: 540, zoom: 1 },
    viewport: { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT },
  });
  context.drawImage(
    image,
    placement.drawX * PREVIEW_SCALE,
    placement.drawY * PREVIEW_SCALE,
    placement.drawWidth * PREVIEW_SCALE,
    placement.drawHeight * PREVIEW_SCALE,
  );
}

export function Rigby2DStudio(): React.JSX.Element {
  const [health, setHealth] = useState<RuntimeHealthView | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<readonly CharacterManifestView[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<CharacterDetailResponse | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<readonly RenderJobView[]>([]);
  const [selectedRenderId, setSelectedRenderId] = useState<string>("");
  const [jobError, setJobError] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importName, setImportName] = useState("Artisan arm R2.2");
  const [importAttribution, setImportAttribution] = useState(
    "R2.2 corrected continuous-arm pilot (OpenAI artwork, Rigby2D AutoRig)",
  );
  const [importStatus, setImportStatus] = useState("approved_arm_motion_only");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [animation, setAnimation] = useState("showcase_ikfix");
  const [fps, setFps] = useState(24);
  const [scale, setScale] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationView | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [anchorX, setAnchorX] = useState(DEFAULT_R2_2_SHOT.actor.x);
  const [anchorY, setAnchorY] = useState(DEFAULT_R2_2_SHOT.actor.y);
  const [actorScale, setActorScale] = useState(DEFAULT_R2_2_SHOT.actor.scale);
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [preview, setPreview] = useState<{
    readonly jobId: string;
    readonly images: readonly HTMLImageElement[];
    readonly error: string | null;
  } | null>(null);

  const [poseAnimation, setPoseAnimation] = useState("arm_angles_ikfix");
  const [poseTime, setPoseTime] = useState(0.75);
  const [poseA, setPoseA] = useState("upperarm_r");
  const [poseB, setPoseB] = useState("forearm_r");
  const [poseC, setPoseC] = useState("hand_r");
  const [requestedFlexion, setRequestedFlexion] = useState(90);
  const [tolerance, setTolerance] = useState(3);
  const [poseCheck, setPoseCheck] = useState<PoseCheckView | null>(null);
  const [poseError, setPoseError] = useState<string | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackRef = useRef<{ frame: number; time: number } | null>(null);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.characterId === selectedId) ?? null,
    [characters, selectedId],
  );
  const selectedRender = useMemo(
    () => jobs.find((job) => job.id === selectedRenderId) ?? null,
    [jobs, selectedRenderId],
  );
  const completedRender = selectedRender?.status === "completed" ? selectedRender : null;
  const completedRenderId = completedRender?.id ?? "";
  const completedFrameRender = completedRender?.frameRender ?? null;
  const activeJob = jobs.find((job) => ACTIVE.has(job.status)) ?? null;
  const hasActive = activeJob !== null;
  const frameCount = completedFrameRender?.frameCount ?? 0;
  const previewFrame = frameCount > 0 ? Math.min(frame, frameCount - 1) : 0;
  const previewImages = useMemo(
    () => (preview?.jobId === completedRenderId ? preview.images : []),
    [preview, completedRenderId],
  );
  const previewError = preview?.jobId === completedRenderId ? preview.error : null;
  const previewLoading = Boolean(completedFrameRender) && preview?.jobId !== completedRenderId;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [healthResponse, characterResponse, jobResponse] = await Promise.all([
          studioFetch<RuntimeHealthView>("/api/studio/folk/rigby2d/health"),
          studioFetch<{ characters: CharacterManifestView[] }>(
            "/api/studio/folk/rigby2d/characters",
          ),
          studioFetch<{ jobs: RenderJobView[] }>("/api/studio/folk/rigby2d/renders"),
        ]);
        if (cancelled) return;
        setHealth(healthResponse);
        setCharacters(characterResponse.characters);
        setJobs(jobResponse.jobs);
        if (!selectedId && characterResponse.characters[0]) {
          const latestCompleted = jobResponse.jobs.find(
            (job) => job.status === "completed" && job.frameRender !== null,
          );
          const initialCharacter =
            characterResponse.characters.find(
              (character) => character.characterId === latestCompleted?.characterId,
            ) ?? characterResponse.characters[0];
          setSelectedId(initialCharacter.characterId);
          const latest = jobResponse.jobs.find(
            (job) =>
              job.characterId === initialCharacter.characterId &&
              job.status === "completed" &&
              job.frameRender !== null,
          );
          if (latest) {
            setSelectedRenderId(latest.id);
            setAnimation(latest.animation);
            setFps(latest.fps);
            setScale(latest.scale);
          }
        }
      } catch (error) {
        if (!cancelled) setHealthError(errorMessage(error));
      }
    })();
    return () => {
      cancelled = true;
    };
    // Initial load only; later refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void (async () => {
      setDetail(null);
      setDetailError(null);
      try {
        const response = await studioFetch<CharacterDetailResponse>(
          `/api/studio/folk/rigby2d/characters/${selectedId}`,
        );
        if (cancelled) return;
        setDetail(response);
        setValidation(response.version.validation);
        setAnimation((current) =>
          response.version.animations.some((entry) => entry.name === current)
            ? current
            : (response.version.animations[0]?.name ?? ""),
        );
        setPoseAnimation((current) =>
          response.version.animations.some((entry) => entry.name === current)
            ? current
            : (response.version.animations[0]?.name ?? ""),
        );
      } catch (error) {
        if (!cancelled) setDetailError(errorMessage(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!hasActive) return;
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const response = await studioFetch<{ jobs: RenderJobView[] }>(
            "/api/studio/folk/rigby2d/renders",
          );
          setJobs(response.jobs);
        } catch (error) {
          setJobError(errorMessage(error));
        }
      })();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasActive]);

  useEffect(() => {
    if (!completedRenderId || !completedFrameRender) return;
    let cancelled = false;
    const frameTotal = completedFrameRender.frameCount;
    void (async () => {
      try {
        const loaded = await Promise.all(
          Array.from({ length: frameTotal }, (_, index) => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = () => reject(new Error(`Frame ${index} could not be loaded.`));
              image.src = `/api/studio/folk/rigby2d/renders/${completedRenderId}/frames/${index}`;
            });
          }),
        );
        if (!cancelled) {
          setPreview({ jobId: completedRenderId, images: loaded, error: null });
          setFrame(0);
          setIsPlaying(false);
          playbackRef.current = null;
        }
      } catch (error) {
        if (!cancelled) {
          setPreview({ jobId: completedRenderId, images: [], error: errorMessage(error) });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [completedRenderId, completedFrameRender]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawFrame(
      canvas,
      previewImages[previewFrame] ?? null,
      completedFrameRender,
      anchorX,
      anchorY,
      actorScale,
    );
  }, [previewImages, previewFrame, completedFrameRender, anchorX, anchorY, actorScale]);

  useEffect(() => {
    if (!isPlaying || previewImages.length === 0 || frameCount === 0) return;
    const start = playbackRef.current;
    if (!start) return;
    let raf = 0;
    const tick = (now: number) => {
      const next =
        start.frame + Math.floor(((now - start.time) / 1000) * (completedRender?.fps ?? 24));
      if (next >= frameCount) {
        setFrame(frameCount - 1);
        setIsPlaying(false);
        playbackRef.current = null;
        return;
      }
      setFrame(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, previewImages.length, frameCount, completedRender?.fps]);

  function togglePlayback(): void {
    if (isPlaying) {
      setIsPlaying(false);
      playbackRef.current = null;
      return;
    }
    if (previewImages.length === 0) return;
    const startFrame = previewFrame >= frameCount - 1 ? 0 : previewFrame;
    setFrame(startFrame);
    playbackRef.current = { frame: startFrame, time: performance.now() };
    setIsPlaying(true);
  }

  function seek(next: number): void {
    setIsPlaying(false);
    playbackRef.current = null;
    setFrame(Math.min(Math.max(Math.round(next), 0), Math.max(0, frameCount - 1)));
  }

  async function importCharacter(): Promise<void> {
    if (!importFile) {
      setImportError("Choose a .rigby file first.");
      return;
    }
    setIsImporting(true);
    setImportError(null);
    try {
      const form = new FormData();
      form.append("file", importFile);
      form.append("name", importName);
      form.append("sourceAttribution", importAttribution);
      form.append("artisticReviewStatus", importStatus);
      const response = await studioUpload<ImportResponse>(
        "/api/studio/folk/rigby2d/characters",
        form,
      );
      const refreshed = await studioFetch<{ characters: CharacterManifestView[] }>(
        "/api/studio/folk/rigby2d/characters",
      );
      setCharacters(refreshed.characters);
      setSelectedId(response.character.characterId);
      setDetail({ character: response.character, version: response.version });
      setValidation(response.version.validation);
      setImportFile(null);
      setImportError(null);
    } catch (error) {
      setImportError(errorMessage(error));
    } finally {
      setIsImporting(false);
    }
  }

  async function validateCharacter(): Promise<void> {
    if (!selectedCharacter) return;
    setIsValidating(true);
    setValidationError(null);
    try {
      const response = await studioPostJson<{ validation: ValidationView }>(
        `/api/studio/folk/rigby2d/characters/${selectedCharacter.characterId}/validate`,
        { versionId: selectedCharacter.currentVersionId },
      );
      setValidation(response.validation);
    } catch (error) {
      setValidationError(errorMessage(error));
    } finally {
      setIsValidating(false);
    }
  }

  async function startRender(): Promise<void> {
    if (!selectedCharacter) return;
    setIsStarting(true);
    setRenderError(null);
    try {
      const response = await studioPostJson<{ job: RenderJobView }>(
        "/api/studio/folk/rigby2d/renders",
        {
          characterId: selectedCharacter.characterId,
          versionId: selectedCharacter.currentVersionId,
          animation,
          fps,
          scale,
        },
      );
      setJobs((current) => [response.job, ...current.filter((job) => job.id !== response.job.id)]);
      setSelectedRenderId(response.job.id);
    } catch (error) {
      setRenderError(errorMessage(error));
    } finally {
      setIsStarting(false);
    }
  }

  async function cancelRender(): Promise<void> {
    if (!activeJob) return;
    try {
      const response = await studioPostJson<{ job: RenderJobView }>(
        `/api/studio/folk/rigby2d/renders/${activeJob.id}/cancel`,
        {},
      );
      setJobs((current) => current.map((job) => (job.id === response.job.id ? response.job : job)));
    } catch (error) {
      setJobError(errorMessage(error));
    }
  }

  async function measurePose(): Promise<void> {
    if (!selectedCharacter) return;
    setIsMeasuring(true);
    setPoseError(null);
    setPoseCheck(null);
    try {
      const response = await studioPostJson<{ check: PoseCheckView }>(
        "/api/studio/folk/rigby2d/pose",
        {
          characterId: selectedCharacter.characterId,
          versionId: selectedCharacter.currentVersionId,
          animation: poseAnimation,
          timeSeconds: poseTime,
          requestedFlexion,
          tolerance,
          chain: { a: poseA, b: poseB, c: poseC },
        },
      );
      setPoseCheck(response.check);
    } catch (error) {
      setPoseError(errorMessage(error));
    } finally {
      setIsMeasuring(false);
    }
  }

  function selectRender(job: RenderJobView): void {
    setSelectedRenderId(job.id);
    setSelectedId(job.characterId);
    setAnimation(job.animation);
    setFps(job.fps);
    setScale(job.scale);
    setJobError(null);
  }

  const animationOptions = detail?.version.animations ?? [];
  const hasPreview = previewImages.length > 0;
  const previewStatus = completedRender
    ? `${previewFrame} / ${Math.max(0, frameCount - 1)} · ${(previewFrame / (completedRender.fps || 24)).toFixed(2)} s`
    : "No render";

  return (
    <div data-testid="rigby2d-studio" className="space-y-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
            R3.1 · Rigby2D runtime
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
            Rigby2D Character Runtime
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-mist-400">
            Import an existing <span className="font-mono text-[12px]">.rigby</span> character,
            inspect the pinned Rigby2D project, validate it, measure joint flexion, render real
            Rigby2D frames, and preview them at a Fableon-controlled actor position.
          </p>
        </div>
        <div className="rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 font-mono text-[10px] text-mist-400">
          <span className="block text-paper-100">
            {health
              ? `Rigby2D ${health.version}`
              : healthError
                ? "runtime unavailable"
                : "checking runtime…"}
          </span>
          <span className="block">{health ? health.commit.slice(0, 12) : "pinned commit"}</span>
          <span className="block">No paid API</span>
        </div>
      </div>

      {healthError ? (
        <p
          role="alert"
          className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {healthError}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          <Panel title="Rigby2D frame preview" status={previewStatus} bodyClassName="space-y-3">
            <div className="relative overflow-hidden rounded-md border border-ink-700 bg-ink-950">
              <canvas
                ref={canvasRef}
                data-testid="rigby2d-preview"
                aria-label="Fableon-composited Rigby2D character preview"
                className="aspect-video h-full w-full"
              />
              {!hasPreview ? (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-950/70 px-6 text-center text-[12px] leading-5 text-mist-400">
                  {previewLoading
                    ? "Loading the real Rigby2D frames…"
                    : selectedRender?.status === "failed"
                      ? (selectedRender.error ?? "The render failed.")
                      : "Import a character and render an animation to see frames here."}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!hasPreview}
                className={studioPrimaryButtonClassName}
                aria-label={isPlaying ? "Pause preview" : "Play preview"}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(0, frameCount - 1)}
                step={1}
                value={previewFrame}
                disabled={!hasPreview}
                aria-label="Rigby2D preview frame"
                onChange={(event) => seek(Number(event.target.value))}
                className="min-w-0 flex-1 accent-ochre-500"
              />
              <span className="font-mono text-[11px] text-mist-400">
                {completedRender
                  ? `${previewFrame} / ${Math.max(0, frameCount - 1)} · ${completedRender.fps} fps`
                  : "—"}
              </span>
            </div>
            {previewError ? (
              <p role="alert" className="text-[11px] text-clay-500">
                {previewError}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 text-[11px] text-mist-400 sm:grid-cols-4">
              <label className="space-y-1">
                <span className={studioLabelClassName}>Actor X</span>
                <input
                  type="number"
                  value={anchorX}
                  onChange={(event) => setAnchorX(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Actor Y</span>
                <input
                  type="number"
                  value={anchorY}
                  onChange={(event) => setAnchorY(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Actor scale</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="2"
                  value={actorScale}
                  onChange={(event) => setActorScale(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <div>
                <span className={studioLabelClassName}>Placement</span>
                <span className="mt-2 block font-mono text-[10px] text-mist-500">
                  pivot {completedRender?.frameRender?.pivot.x.toFixed(4) ?? "—"},{" "}
                  {completedRender?.frameRender?.pivot.y.toFixed(4) ?? "—"}
                </span>
              </div>
            </div>
          </Panel>

          <Panel
            title="Saved render jobs"
            status={`${jobs.length} job${jobs.length === 1 ? "" : "s"}`}
            bodyClassName="space-y-2"
          >
            {jobs.length === 0 ? (
              <p className="text-[11px] leading-5 text-mist-400">
                No Rigby2D frame renders yet. Import the R2.2 arm and render an animation.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-auto">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    data-testid="rigby2d-render-job"
                    onClick={() => selectRender(job)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      job.id === selectedRenderId
                        ? "border-ochre-500/70 bg-ochre-500/10"
                        : "border-ink-700 bg-ink-900 hover:border-ink-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="font-mono text-paper-100">{job.animation}</span>
                      <span className="font-mono text-mist-400">
                        {statusLabel(job)} · {job.fps} fps
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 font-mono text-[10px] text-mist-500">
                      <span>{job.characterId}</span>
                      <span>
                        {job.frameCount} frames · {job.durationSeconds.toFixed(3)} s
                      </span>
                    </div>
                    {job.error ? (
                      <p className="mt-1 text-[10px] text-clay-500">{job.error}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
            {jobError ? (
              <p role="alert" className="text-[11px] text-clay-500">
                {jobError}
              </p>
            ) : null}
          </Panel>

          <Panel
            title="Render detail"
            status={selectedRender?.status ?? "none"}
            bodyClassName="space-y-2 text-[11px] leading-5 text-mist-400"
          >
            {selectedRender?.frameRender ? (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <span>
                    frames <strong className="text-paper-100">{selectedRender.frameCount}</strong>
                  </span>
                  <span>
                    duration{" "}
                    <strong className="text-paper-100">
                      {selectedRender.durationSeconds.toFixed(3)} s
                    </strong>
                  </span>
                  <span>
                    canvas{" "}
                    <strong className="text-paper-100">
                      {selectedRender.frameRender.frameWidth}×
                      {selectedRender.frameRender.frameHeight}
                    </strong>
                  </span>
                  <span>
                    cached{" "}
                    <strong className="text-paper-100">
                      {selectedRender.cached ? "yes" : "no"}
                    </strong>
                  </span>
                </div>
                <p className="font-mono text-[10px] break-all text-mist-500">
                  cache key: {selectedRender.cacheKey}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    className={studioSecondaryButtonClassName}
                    href={`/api/studio/folk/rigby2d/renders/${selectedRender.id}/metadata`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open frame metadata
                  </a>
                  {selectedCharacter ? (
                    <a
                      className={studioSecondaryButtonClassName}
                      href={`/api/studio/folk/rigby2d/characters/${selectedCharacter.characterId}/source?versionId=${selectedCharacter.currentVersionId}`}
                    >
                      Download source .rigby
                    </a>
                  ) : null}
                </div>
                <details className="rounded-md border border-ink-700 bg-ink-950 p-2">
                  <summary className="cursor-pointer font-mono text-[10px] text-mist-300">
                    Export / validation details
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto text-[10px] leading-4 text-mist-400">
                    {JSON.stringify(
                      {
                        render: selectedRender.frameRender,
                        validation: validation ?? detail?.version.validation,
                        mcpTrace: selectedRender.frameRender.mcp.trace,
                        mcpStderr: selectedRender.frameRender.mcp.stderr,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </>
            ) : (
              <p>Select a completed render to inspect its frame metadata.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Import character" status=".rigby" bodyClassName="space-y-2">
            <label className="block space-y-1">
              <span className={studioLabelClassName}>Rigby2D project</span>
              <input
                data-testid="rigby2d-import-file"
                type="file"
                accept=".rigby,application/zip"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                className={studioInputClassName}
              />
            </label>
            <label className="block space-y-1">
              <span className={studioLabelClassName}>Character name</span>
              <input
                data-testid="rigby2d-import-name"
                value={importName}
                onChange={(event) => setImportName(event.target.value)}
                className={studioInputClassName}
              />
            </label>
            <label className="block space-y-1">
              <span className={studioLabelClassName}>Source attribution</span>
              <input
                value={importAttribution}
                onChange={(event) => setImportAttribution(event.target.value)}
                className={studioInputClassName}
              />
            </label>
            <label className="block space-y-1">
              <span className={studioLabelClassName}>Artistic review</span>
              <select
                value={importStatus}
                onChange={(event) => setImportStatus(event.target.value)}
                className={studioSelectClassName}
              >
                <option value="approved_arm_motion_only">approved · arm motion only</option>
                <option value="experimental_unreviewed">experimental · unreviewed</option>
                <option value="pending_review">pending review</option>
              </select>
            </label>
            <button
              type="button"
              data-testid="rigby2d-import-submit"
              onClick={() => void importCharacter()}
              disabled={isImporting || !importFile}
              className={studioPrimaryButtonClassName}
            >
              {isImporting ? "Importing…" : "Import immutable asset"}
            </button>
            {importError ? (
              <p role="alert" className="text-[11px] text-clay-500">
                {importError}
              </p>
            ) : null}
          </Panel>

          <Panel
            title="Character"
            status={selectedCharacter?.currentVersionId ?? "none"}
            bodyClassName="space-y-2"
          >
            {characters.length === 0 ? (
              <p className="text-[11px] leading-5 text-mist-400">
                No imported Rigby2D characters. The R2.2 arm can be imported above.
              </p>
            ) : (
              <select
                aria-label="Rigby2D character"
                value={selectedId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedId(nextId);
                  setDetail(null);
                  const latest = jobs.find(
                    (job) =>
                      job.characterId === nextId &&
                      job.status === "completed" &&
                      job.frameRender !== null,
                  );
                  setSelectedRenderId(latest?.id ?? "");
                  if (latest) {
                    setAnimation(latest.animation);
                    setFps(latest.fps);
                    setScale(latest.scale);
                  }
                }}
                className={studioSelectClassName}
              >
                {characters.map((character) => (
                  <option key={character.characterId} value={character.characterId}>
                    {character.name} · {character.characterId}
                  </option>
                ))}
              </select>
            )}
            {detail ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-mist-400">
                  <span>
                    bones <strong className="text-paper-100">{detail.version.counts.bones}</strong>
                  </span>
                  <span>
                    slots <strong className="text-paper-100">{detail.version.counts.slots}</strong>
                  </span>
                  <span>
                    IK{" "}
                    <strong className="text-paper-100">{detail.version.counts.constraints}</strong>
                  </span>
                  <span>
                    animations{" "}
                    <strong className="text-paper-100">{detail.version.counts.animations}</strong>
                  </span>
                </div>
                <p className="text-[11px] leading-5 text-mist-400">
                  {detail.version.sourceAttribution}
                </p>
                <p className="font-mono text-[10px] text-mist-500">
                  review: {detail.version.artisticReviewStatus} · sha256{" "}
                  {detail.version.sha256.slice(0, 12)}…
                </p>
                <button
                  type="button"
                  data-testid="rigby2d-validate"
                  onClick={() => void validateCharacter()}
                  disabled={isValidating}
                  className={studioSecondaryButtonClassName}
                >
                  {isValidating ? "Validating…" : "Run Rigby2D validation"}
                </button>
                {validation ? (
                  <div
                    data-testid="rigby2d-validation"
                    className={`rounded border px-2 py-1 text-[11px] ${
                      validation.valid
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-clay-500/40 bg-clay-500/10 text-clay-500"
                    }`}
                  >
                    {validation.valid ? "valid" : "invalid"} · {validation.errors.length} error(s)
                    {validation.warnings.length > 0
                      ? ` · ${validation.warnings.length} warning(s)`
                      : ""}
                  </div>
                ) : null}
                {validationError ? (
                  <p role="alert" className="text-[11px] text-clay-500">
                    {validationError}
                  </p>
                ) : null}
                <details className="rounded-md border border-ink-700 bg-ink-950 p-2">
                  <summary className="cursor-pointer font-mono text-[10px] text-mist-300">
                    Skeleton / animation details
                  </summary>
                  <pre className="mt-2 max-h-48 overflow-auto text-[10px] leading-4 text-mist-400">
                    {JSON.stringify(
                      {
                        bones: detail.version.bones,
                        slots: detail.version.slots,
                        animations: detail.version.animations,
                        validation: detail.version.validation,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </>
            ) : detailError ? (
              <p role="alert" className="text-[11px] text-clay-500">
                {detailError}
              </p>
            ) : (
              <p className="text-[11px] text-mist-400">Select a character.</p>
            )}
          </Panel>

          <Panel title="Render animation" status="Rigby2D frames" bodyClassName="space-y-2">
            <label className="block space-y-1">
              <span className={studioLabelClassName}>Animation</span>
              <select
                data-testid="rigby2d-animation"
                value={animation}
                onChange={(event) => setAnimation(event.target.value)}
                className={studioSelectClassName}
                disabled={animationOptions.length === 0}
              >
                {animationOptions.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.name} · {entry.duration.toFixed(2)} s
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className={studioLabelClassName}>FPS</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={fps}
                  onChange={(event) => setFps(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Export scale</span>
                <input
                  type="number"
                  min={0.25}
                  max={2}
                  step={0.25}
                  value={scale}
                  onChange={(event) => setScale(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="rigby2d-start-render"
                onClick={() => void startRender()}
                disabled={isStarting || hasActive || !selectedCharacter || !animation}
                className={studioPrimaryButtonClassName}
              >
                {isStarting ? "Starting…" : "Render real frames"}
              </button>
              {activeJob ? (
                <button
                  type="button"
                  data-testid="rigby2d-cancel-render"
                  onClick={() => void cancelRender()}
                  className={studioSecondaryButtonClassName}
                >
                  Cancel
                </button>
              ) : null}
            </div>
            {activeJob ? (
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px] text-mist-400">
                  <span>{activeJob.phase}</span>
                  <span>{Math.round(activeJob.progress * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-ink-800">
                  <div
                    className="h-full bg-ochre-500 transition-[width]"
                    style={{ width: `${Math.round(activeJob.progress * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
            {renderError ? (
              <p role="alert" className="text-[11px] text-clay-500">
                {renderError}
              </p>
            ) : null}
            {selectedRender?.status === "completed" ? (
              <p className="text-[10px] leading-4 text-mist-500">
                {selectedRender.frameCount} frames · {selectedRender.durationSeconds.toFixed(3)} s ·{" "}
                {selectedRender.cached
                  ? "reused cache"
                  : `rendered in ${selectedRender.durationMs ?? 0} ms`}
              </p>
            ) : null}
          </Panel>

          <Panel title="Joint flexion" status="Regression guard" bodyClassName="space-y-2">
            <p className="text-[10px] leading-4 text-mist-500">
              0° straight · 90° right angle · 180° folded. Measured from actual Rigby2D sample_pose
              world joints, not labels.
            </p>
            <div className="grid grid-cols-3 gap-1">
              <label className="space-y-1">
                <span className={studioLabelClassName}>A</span>
                <input
                  data-testid="rigby2d-pose-a"
                  value={poseA}
                  onChange={(event) => setPoseA(event.target.value)}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>B</span>
                <input
                  data-testid="rigby2d-pose-b"
                  value={poseB}
                  onChange={(event) => setPoseB(event.target.value)}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>C</span>
                <input
                  data-testid="rigby2d-pose-c"
                  value={poseC}
                  onChange={(event) => setPoseC(event.target.value)}
                  className={studioInputClassName}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className={studioLabelClassName}>Animation</span>
                <select
                  data-testid="rigby2d-pose-animation"
                  value={poseAnimation}
                  onChange={(event) => setPoseAnimation(event.target.value)}
                  className={studioSelectClassName}
                >
                  {animationOptions.map((entry) => (
                    <option key={entry.name} value={entry.name}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Time (s)</span>
                <input
                  data-testid="rigby2d-pose-time"
                  type="number"
                  step="0.05"
                  min={0}
                  value={poseTime}
                  onChange={(event) => setPoseTime(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Requested</span>
                <input
                  data-testid="rigby2d-pose-requested"
                  type="number"
                  min={0}
                  max={180}
                  value={requestedFlexion}
                  onChange={(event) => setRequestedFlexion(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Tolerance</span>
                <input
                  type="number"
                  step="0.5"
                  min={0.1}
                  value={tolerance}
                  onChange={(event) => setTolerance(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
            </div>
            <button
              type="button"
              data-testid="rigby2d-measure-pose"
              onClick={() => void measurePose()}
              disabled={isMeasuring || !selectedCharacter}
              className={studioSecondaryButtonClassName}
            >
              {isMeasuring ? "Measuring…" : "Measure actual flexion"}
            </button>
            {poseCheck ? (
              <div
                data-testid="rigby2d-pose-result"
                className={`space-y-1 rounded border px-2 py-1 text-[11px] ${
                  poseCheck.passed
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-clay-500/40 bg-clay-500/10 text-clay-500"
                }`}
              >
                <p className="font-mono">
                  measured {poseCheck.flexion.toFixed(2)}° · requested{" "}
                  {poseCheck.requestedFlexion.toFixed(0)}° · {poseCheck.passed ? "PASS" : "FAIL"}
                </p>
                <p className="text-[10px] opacity-80">
                  Δ {poseCheck.delta.toFixed(2)}° (tol {poseCheck.tolerance}°) · bend side{" "}
                  {poseCheck.bendSide} · upper {poseCheck.upperLength.toFixed(2)} px · lower{" "}
                  {poseCheck.lowerLength.toFixed(2)} px
                </p>
                <p className="text-[10px] opacity-80">
                  IK target{" "}
                  {poseCheck.ikTarget
                    ? `${poseCheck.ikTarget.name} (${poseCheck.ikTarget.x.toFixed(2)}, ${poseCheck.ikTarget.y.toFixed(2)})`
                    : "not recorded"}
                </p>
              </div>
            ) : null}
            {poseError ? (
              <p role="alert" className="text-[11px] text-clay-500">
                {poseError}
              </p>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
