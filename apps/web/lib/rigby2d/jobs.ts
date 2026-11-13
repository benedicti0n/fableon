import { randomUUID } from "node:crypto";
import { readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

import {
  RIGBY2D_MAX_FPS,
  RIGBY2D_MAX_SCALE,
  RIGBY2D_MIN_FPS,
  RIGBY2D_MIN_SCALE,
} from "./constants";
import { Rigby2DError } from "./errors";
import {
  exportAnimationFrames,
  makeFrameCacheKey,
  readCachedFrameRender,
  type FrameRenderMetadata,
} from "./frames";
import { getRigby2DDataRoot } from "./constants";
import { readVersion, getVersionProjectPath, recordFrameExport } from "./assets";
import { atomicWriteJson } from "./storage";

export const RIGBY2D_RENDER_STATUSES = [
  "queued",
  "rendering",
  "completed",
  "failed",
  "cancelled",
] as const;

export type Rigby2DRenderStatus = (typeof RIGBY2D_RENDER_STATUSES)[number];
export type Rigby2DRenderPhase =
  "queued" | "starting" | "exporting" | "caching" | "completed" | "failed" | "cancelled";

export interface Rigby2DRenderJob {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly status: Rigby2DRenderStatus;
  readonly phase: Rigby2DRenderPhase;
  readonly progress: number;
  readonly characterId: string;
  readonly versionId: string;
  readonly animation: string;
  readonly fps: number;
  readonly scale: number;
  readonly cacheKey: string;
  readonly frameCount: number;
  readonly durationSeconds: number;
  readonly cached: boolean;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly durationMs: number | null;
  readonly cancelRequested: boolean;
  readonly errorCode: string | null;
  readonly error: string | null;
  readonly frameRender: FrameRenderMetadata | null;
}

const REGISTRY_KEY = Symbol.for("fableon.rigby2d.renderRegistry");
const JOB_ID = /^[a-f0-9-]{36}$/;

interface Registry {
  readonly controllers: Map<string, AbortController>;
}

type GlobalWithRegistry = typeof globalThis & { [REGISTRY_KEY]?: Registry };

function registry(): Registry {
  const globalStore = globalThis as GlobalWithRegistry;
  globalStore[REGISTRY_KEY] ??= { controllers: new Map() };
  return globalStore[REGISTRY_KEY];
}

export function getRendersDir(dataRoot?: string): string {
  return path.join(getRigby2DDataRoot(dataRoot), "renders");
}

export function getRenderJobFile(renderId: string, dataRoot?: string): string {
  if (!JOB_ID.test(renderId)) {
    throw new Rigby2DError("INVALID_INPUT", "Invalid render ID.");
  }
  return path.join(getRendersDir(dataRoot), `${renderId}.json`);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseJob(value: unknown, id: string): Rigby2DRenderJob {
  if (!isObject(value) || value["schemaVersion"] !== 1 || value["id"] !== id) {
    throw new Rigby2DError("STORAGE_CORRUPT", `Render job ${id} metadata is invalid.`);
  }
  const status = value["status"];
  if (
    typeof status !== "string" ||
    !RIGBY2D_RENDER_STATUSES.includes(status as Rigby2DRenderStatus)
  ) {
    throw new Rigby2DError("STORAGE_CORRUPT", `Render job ${id} status is invalid.`);
  }
  const phase = value["phase"];
  const phaseValue: Rigby2DRenderPhase =
    phase === "starting" ||
    phase === "exporting" ||
    phase === "caching" ||
    phase === "completed" ||
    phase === "failed" ||
    phase === "cancelled"
      ? phase
      : "queued";
  const frameRender = isObject(value["frameRender"])
    ? (value["frameRender"] as unknown as FrameRenderMetadata)
    : null;
  return {
    schemaVersion: 1,
    id,
    status: status as Rigby2DRenderStatus,
    phase: phaseValue,
    progress: numberField(value["progress"]),
    characterId: stringField(value["characterId"]),
    versionId: stringField(value["versionId"]),
    animation: stringField(value["animation"]),
    fps: numberField(value["fps"]),
    scale: numberField(value["scale"]),
    cacheKey: stringField(value["cacheKey"]),
    frameCount: numberField(value["frameCount"]),
    durationSeconds: numberField(value["durationSeconds"]),
    cached: value["cached"] === true,
    createdAt: stringField(value["createdAt"]),
    startedAt: typeof value["startedAt"] === "string" ? value["startedAt"] : null,
    finishedAt: typeof value["finishedAt"] === "string" ? value["finishedAt"] : null,
    durationMs: typeof value["durationMs"] === "number" ? value["durationMs"] : null,
    cancelRequested: value["cancelRequested"] === true,
    errorCode: typeof value["errorCode"] === "string" ? value["errorCode"] : null,
    error: typeof value["error"] === "string" ? value["error"] : null,
    frameRender,
  };
}

export async function writeRenderJob(job: Rigby2DRenderJob, dataRoot?: string): Promise<void> {
  await atomicWriteJson(getRenderJobFile(job.id, dataRoot), job);
}

export async function readRenderJob(
  renderId: string,
  dataRoot?: string,
): Promise<Rigby2DRenderJob> {
  const file = getRenderJobFile(renderId, dataRoot);
  try {
    return parseJob(JSON.parse(await readFile(file, "utf8")) as unknown, renderId);
  } catch (error) {
    if (error instanceof Rigby2DError) throw error;
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Rigby2DError("RENDER_NOT_FOUND", `Render ${renderId} does not exist.`);
    }
    throw new Rigby2DError("STORAGE_CORRUPT", `Render ${renderId} metadata could not be read.`);
  }
}

export function isActiveRender(job: Rigby2DRenderJob): boolean {
  return job.status === "queued" || job.status === "rendering";
}

export async function reconcileRenderJob(
  job: Rigby2DRenderJob,
  dataRoot?: string,
): Promise<Rigby2DRenderJob> {
  if (!isActiveRender(job)) return job;
  if (registry().controllers.has(job.id)) return job;
  const repaired: Rigby2DRenderJob = {
    ...job,
    status: job.cancelRequested ? "cancelled" : "failed",
    phase: job.cancelRequested ? "cancelled" : "failed",
    finishedAt: new Date().toISOString(),
    errorCode: job.cancelRequested ? "MCP_CANCELLED" : "MCP_PROCESS_EXITED",
    error: job.cancelRequested
      ? "Render cancelled."
      : "The Fableon runtime process ended before the render completed.",
  };
  await writeRenderJob(repaired, dataRoot);
  return repaired;
}

export async function listRenderJobs(dataRoot?: string): Promise<Rigby2DRenderJob[]> {
  const dir = getRendersDir(dataRoot);
  let entries;
  try {
    entries = await readdir(dir);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const jobs: Rigby2DRenderJob[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    jobs.push(await readRenderJob(entry.slice(0, -5), dataRoot));
  }
  return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface StartRenderInput {
  readonly characterId: string;
  readonly versionId: string;
  readonly animation: string;
  readonly fps: number;
  readonly scale: number;
  readonly dataRoot?: string;
}

export async function startRender(input: StartRenderInput): Promise<Rigby2DRenderJob> {
  if (!Number.isInteger(input.fps) || input.fps < RIGBY2D_MIN_FPS || input.fps > RIGBY2D_MAX_FPS) {
    throw new Rigby2DError(
      "INVALID_INPUT",
      `FPS must be an integer in ${RIGBY2D_MIN_FPS}..${RIGBY2D_MAX_FPS}.`,
    );
  }
  if (
    !Number.isFinite(input.scale) ||
    input.scale < RIGBY2D_MIN_SCALE ||
    input.scale > RIGBY2D_MAX_SCALE
  ) {
    throw new Rigby2DError(
      "INVALID_INPUT",
      `Scale must be between ${RIGBY2D_MIN_SCALE} and ${RIGBY2D_MAX_SCALE}.`,
    );
  }
  const version = await readVersion(input.characterId, input.versionId, input.dataRoot);
  if (!version.animations.some((animation) => animation.name === input.animation)) {
    throw new Rigby2DError(
      "ANIMATION_NOT_FOUND",
      `Animation ${input.animation} is not present in version ${input.versionId}.`,
    );
  }
  const projectPath = await getVersionProjectPath(
    input.characterId,
    input.versionId,
    input.dataRoot,
  );
  const cacheKey = makeFrameCacheKey({
    sourceSha256: version.sha256,
    runtimeCommit: version.runtimeCommit,
    animation: input.animation,
    fps: input.fps,
    scale: input.scale,
  });
  const cached = await readCachedFrameRender(cacheKey, input.dataRoot);
  if (cached) {
    const now = new Date().toISOString();
    const job: Rigby2DRenderJob = {
      schemaVersion: 1,
      id: randomUUID(),
      status: "completed",
      phase: "completed",
      progress: 1,
      characterId: input.characterId,
      versionId: input.versionId,
      animation: input.animation,
      fps: input.fps,
      scale: input.scale,
      cacheKey,
      frameCount: cached.frameCount,
      durationSeconds: cached.durationSeconds,
      cached: true,
      createdAt: now,
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      cancelRequested: false,
      errorCode: null,
      error: null,
      frameRender: cached,
    };
    await writeRenderJob(job, input.dataRoot);
    await recordFrameExport({
      characterId: input.characterId,
      versionId: input.versionId,
      metadata: cached,
      ...(input.dataRoot ? { dataRoot: input.dataRoot } : {}),
    }).catch(() => undefined);
    return job;
  }
  const activeJobs = (await listRenderJobs(input.dataRoot)).filter(isActiveRender);
  if (activeJobs.length >= 2) {
    throw new Rigby2DError(
      "RENDER_BUSY",
      "Two Rigby2D renders are already active. Wait for one to finish or cancel it.",
    );
  }
  const active = activeJobs.find(
    (job) =>
      job.characterId === input.characterId &&
      job.versionId === input.versionId &&
      job.animation === input.animation &&
      job.fps === input.fps &&
      job.scale === input.scale,
  );
  if (active) return reconcileRenderJob(active, input.dataRoot);
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const job: Rigby2DRenderJob = {
    schemaVersion: 1,
    id,
    status: "queued",
    phase: "queued",
    progress: 0,
    characterId: input.characterId,
    versionId: input.versionId,
    animation: input.animation,
    fps: input.fps,
    scale: input.scale,
    cacheKey,
    frameCount: 0,
    durationSeconds: 0,
    cached: false,
    createdAt,
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    cancelRequested: false,
    errorCode: null,
    error: null,
    frameRender: null,
  };
  await writeRenderJob(job, input.dataRoot);
  const controller = new AbortController();
  registry().controllers.set(id, controller);
  void runRenderJob(job, projectPath, version.sha256, input.dataRoot, controller.signal);
  return job;
}

async function runRenderJob(
  job: Rigby2DRenderJob,
  projectPath: string,
  sourceSha256: string,
  dataRoot: string | undefined,
  signal: AbortSignal,
): Promise<void> {
  const startedAt = new Date().toISOString();
  let current: Rigby2DRenderJob = {
    ...job,
    status: "rendering",
    phase: "starting",
    progress: 0.05,
    startedAt,
  };
  await writeRenderJob(current, dataRoot);
  try {
    current = { ...current, phase: "exporting", progress: 0.2 };
    await writeRenderJob(current, dataRoot);
    const result = await exportAnimationFrames({
      characterId: job.characterId,
      versionId: job.versionId,
      sourceSha256,
      sourcePath: projectPath,
      animation: job.animation,
      fps: job.fps,
      scale: job.scale,
      ...(dataRoot ? { dataRoot } : {}),
      signal,
    });
    const finishedAt = new Date().toISOString();
    current = {
      ...current,
      status: "completed",
      phase: "completed",
      progress: 1,
      finishedAt,
      durationMs: Date.now() - Date.parse(startedAt),
      frameCount: result.metadata.frameCount,
      durationSeconds: result.metadata.durationSeconds,
      cached: result.cached,
      frameRender: result.metadata,
      errorCode: null,
      error: null,
    };
    await writeRenderJob(current, dataRoot);
    await recordFrameExport({
      characterId: job.characterId,
      versionId: job.versionId,
      metadata: result.metadata,
      ...(dataRoot ? { dataRoot } : {}),
    }).catch(() => undefined);
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const cancelled =
      signal.aborted || (error instanceof Rigby2DError && error.code === "MCP_CANCELLED");
    const code = error instanceof Rigby2DError ? error.code : "MCP_TOOL_FAILED";
    current = {
      ...current,
      status: cancelled ? "cancelled" : "failed",
      phase: cancelled ? "cancelled" : "failed",
      progress: 1,
      finishedAt,
      durationMs: Date.now() - Date.parse(startedAt),
      cancelRequested: cancelled,
      errorCode: cancelled ? "MCP_CANCELLED" : code,
      error: cancelled
        ? "Render cancelled."
        : error instanceof Error
          ? error.message
          : String(error),
    };
    await writeRenderJob(current, dataRoot).catch(() => undefined);
  } finally {
    registry().controllers.delete(job.id);
  }
}

export async function cancelRenderJob(
  renderId: string,
  dataRoot?: string,
): Promise<Rigby2DRenderJob> {
  const job = await readRenderJob(renderId, dataRoot);
  if (!isActiveRender(job)) return job;
  await writeRenderJob({ ...job, cancelRequested: true }, dataRoot);
  const controller = registry().controllers.get(renderId);
  if (controller) {
    controller.abort();
    return await readRenderJob(renderId, dataRoot).catch(() => job);
  }
  const cancelled: Rigby2DRenderJob = {
    ...job,
    status: "cancelled",
    phase: "cancelled",
    progress: 1,
    cancelRequested: true,
    finishedAt: new Date().toISOString(),
    errorCode: "MCP_CANCELLED",
    error: "Render cancelled.",
  };
  await writeRenderJob(cancelled, dataRoot);
  return cancelled;
}

export async function releaseRenderJob(
  renderId: string,
  dataRoot?: string,
): Promise<{ released: boolean }> {
  let job: Rigby2DRenderJob;
  try {
    job = await readRenderJob(renderId, dataRoot);
  } catch (error) {
    if (error instanceof Rigby2DError && error.code === "RENDER_NOT_FOUND") {
      return { released: false };
    }
    throw error;
  }
  if (isActiveRender(job)) await cancelRenderJob(renderId, dataRoot);
  const jobDir = path.join(getRigby2DDataRoot(dataRoot), "jobs", renderId);
  await rm(jobDir, { recursive: true, force: true });
  return { released: true };
}

export async function renderJobCacheBytes(renderId: string, dataRoot?: string): Promise<number> {
  const job = await readRenderJob(renderId, dataRoot);
  if (!job.frameRender) return 0;
  try {
    const info = await stat(
      path.join(getRigby2DDataRoot(dataRoot), "cache", "frames", job.cacheKey),
    );
    return info.isDirectory() ? job.frameRender.cacheBytes : 0;
  } catch {
    return 0;
  }
}
