import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { StudioError } from "@/lib/studio/errors";
import { getDataRoot, getRepoRoot, nowIso } from "@/lib/studio/repository";
import { assertStudioId } from "@/lib/studio/validation";

export const RENDER_JOB_STATUSES = [
  "queued",
  "rendering",
  "encoding",
  "completed",
  "failed",
  "cancelled",
] as const;
export type RenderJobStatus = (typeof RENDER_JOB_STATUSES)[number];
export type RenderProduction = "where-the-light-lands" | "folk-pilot";

export interface RenderJob {
  readonly id: string;
  readonly status: RenderJobStatus;
  readonly progress: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly totalFrames: number;
  readonly renderedFrames: number;
  readonly currentFrame: number;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly outputPath: string | null;
  readonly startedAt: string | null;
  readonly updatedAt: string;
  readonly finishedAt: string | null;
  readonly pid: number | null;
  readonly renderDurationMs: number | null;
  readonly encodingDurationMs: number | null;
  readonly error: string | null;
  readonly cancelRequested: boolean;
  readonly production: RenderProduction;
}

export interface CreateRenderJobInput {
  readonly startFrame: number;
  readonly endFrame: number;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly production?: RenderProduction;
}

const JOB_ID_PATTERN = /^[a-z0-9-]{2,64}$/;

export function getRenderJobsDir(): string {
  return path.join(getDataRoot(), "render-jobs");
}

export function getRenderJobFile(jobId: string): string {
  if (!JOB_ID_PATTERN.test(jobId)) {
    throw new StudioError("invalid_input", "Invalid render job ID.");
  }
  return path.join(getRenderJobsDir(), `${jobId}.json`);
}

export function getFilmOutputsDir(production: RenderProduction = "where-the-light-lands"): string {
  return path.join(getRepoRoot(), "outputs", production);
}

function assertJob(value: unknown): RenderJob {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new StudioError("storage_corrupt", "Render job metadata is not an object.");
  }
  const job = value as Record<string, unknown>;
  const status = job["status"];
  if (typeof status !== "string" || !RENDER_JOB_STATUSES.includes(status as RenderJobStatus)) {
    throw new StudioError("storage_corrupt", "Render job status is invalid.");
  }
  const id = job["id"];
  if (typeof id !== "string" || !JOB_ID_PATTERN.test(id)) {
    throw new StudioError("storage_corrupt", "Render job ID is invalid.");
  }
  const numberField = (key: string): number => {
    const field = job[key];
    if (typeof field !== "number" || !Number.isFinite(field)) {
      throw new StudioError("storage_corrupt", `Render job ${key} is invalid.`);
    }
    return field;
  };
  const stringOrNull = (key: string): string | null => {
    const field = job[key];
    if (field === null) return null;
    if (typeof field !== "string") {
      throw new StudioError("storage_corrupt", `Render job ${key} is invalid.`);
    }
    return field;
  };
  return {
    id,
    status: status as RenderJobStatus,
    progress: numberField("progress"),
    startFrame: numberField("startFrame"),
    endFrame: numberField("endFrame"),
    totalFrames: numberField("totalFrames"),
    renderedFrames: numberField("renderedFrames"),
    currentFrame: numberField("currentFrame"),
    width: numberField("width"),
    height: numberField("height"),
    fps: numberField("fps"),
    outputPath: stringOrNull("outputPath"),
    startedAt: stringOrNull("startedAt"),
    updatedAt: typeof job["updatedAt"] === "string" ? (job["updatedAt"] as string) : nowIso(),
    finishedAt: stringOrNull("finishedAt"),
    pid: job["pid"] === null ? null : numberField("pid"),
    renderDurationMs: job["renderDurationMs"] === null ? null : numberField("renderDurationMs"),
    encodingDurationMs:
      job["encodingDurationMs"] === null ? null : numberField("encodingDurationMs"),
    error: stringOrNull("error"),
    cancelRequested: job["cancelRequested"] === true,
    production:
      job["production"] === "folk-pilot" ||
      (typeof job["outputPath"] === "string" && job["outputPath"].includes("outputs/folk-pilot"))
        ? "folk-pilot"
        : "where-the-light-lands",
  };
}

export async function writeRenderJob(job: RenderJob): Promise<void> {
  const dir = getRenderJobsDir();
  await mkdir(dir, { recursive: true });
  const file = getRenderJobFile(job.id);
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(job, null, 2)}\n`, "utf8");
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function readRenderJob(jobId: string): Promise<RenderJob> {
  let raw: string;
  try {
    raw = await readFile(getRenderJobFile(jobId), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new StudioError("not_found", `Render job ${jobId} does not exist.`);
    }
    throw new StudioError("storage_corrupt", `Render job ${jobId} could not be read.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new StudioError("storage_corrupt", `Render job ${jobId} contains invalid JSON.`);
  }
  return assertJob(parsed);
}

export async function listRenderJobs(): Promise<RenderJob[]> {
  const dir = getRenderJobsDir();
  let entries;
  try {
    entries = await readdir(dir);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const jobs: RenderJob[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    jobs.push(await readRenderJob(entry.slice(0, -5)));
  }
  return jobs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createRenderJob(input: CreateRenderJobInput): Promise<RenderJob> {
  const now = nowIso();
  const job: RenderJob = {
    id: randomUUID(),
    status: "queued",
    progress: 0,
    startFrame: input.startFrame,
    endFrame: input.endFrame,
    totalFrames: input.endFrame - input.startFrame + 1,
    renderedFrames: 0,
    currentFrame: input.startFrame - 1,
    width: input.width,
    height: input.height,
    fps: input.fps,
    outputPath: null,
    startedAt: null,
    updatedAt: now,
    finishedAt: null,
    pid: null,
    renderDurationMs: null,
    encodingDurationMs: null,
    error: null,
    cancelRequested: false,
    production: input.production ?? "where-the-light-lands",
  };
  await writeRenderJob(job);
  return job;
}

export async function requestRenderJobCancel(jobId: string): Promise<RenderJob> {
  let job = await readRenderJob(jobId);
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
    return job;
  }

  await writeRenderJob({
    ...job,
    cancelRequested: true,
    updatedAt: nowIso(),
  });

  // The child may not have recorded its PID yet. Give it a short window so a
  // cancel issued immediately after POST can still terminate the process.
  if (job.pid === null) {
    for (let attempt = 0; attempt < 12 && job.pid === null; attempt += 1) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 125));
      job = await readRenderJob(jobId);
      if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
        return job;
      }
    }
  }

  if (job.pid !== null) {
    await terminateProcess(job.pid);
  }

  const latest = await readRenderJob(jobId);
  if (latest.status === "completed") {
    return latest;
  }
  const cancelled: RenderJob = {
    ...latest,
    status: "cancelled",
    cancelRequested: true,
    finishedAt: nowIso(),
    updatedAt: nowIso(),
    error: latest.error ?? "Cancelled by user.",
  };
  await writeRenderJob(cancelled);
  await removePartialOutput(cancelled);
  return cancelled;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
}

async function terminateProcess(pid: number): Promise<void> {
  const signalGroup = (signal: NodeJS.Signals) => {
    try {
      process.kill(-pid, signal);
      return true;
    } catch {
      try {
        process.kill(pid, signal);
        return true;
      } catch {
        return false;
      }
    }
  };
  if (!processIsAlive(pid)) return;
  signalGroup("SIGTERM");
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    if (!processIsAlive(pid)) return;
  }
  signalGroup("SIGKILL");
}

async function removePartialOutput(job: RenderJob): Promise<void> {
  if (!job.outputPath) return;
  let output = job.outputPath;
  if (!path.isAbsolute(output)) output = path.join(getRepoRoot(), output);
  try {
    const safe = safeFilmOutputPath(output, job.production);
    await rm(safe, { force: true });
  } catch {
    // A partial file outside the known film output directory is left untouched.
  }
}

/**
 * Repairs a stale active job whose child process exited without writing a
 * terminal status. Called when reading or listing jobs so the UI cannot poll a
 * ghost "rendering" job forever.
 */
export async function reconcileRenderJob(job: RenderJob): Promise<RenderJob> {
  if (!isActiveRenderJob(job) || job.pid === null || processIsAlive(job.pid)) {
    return job;
  }
  const cancelled = job.cancelRequested;
  const repaired: RenderJob = {
    ...job,
    status: cancelled ? "cancelled" : "failed",
    finishedAt: nowIso(),
    updatedAt: nowIso(),
    error: cancelled
      ? (job.error ?? "Cancelled by user.")
      : "Render process exited without writing a terminal status.",
  };
  await writeRenderJob(repaired);
  await removePartialOutput(repaired);
  return repaired;
}

export function isActiveRenderJob(job: RenderJob): boolean {
  return job.status === "queued" || job.status === "rendering" || job.status === "encoding";
}

export function renderJobOutputPath(
  jobId: string,
  production: RenderProduction = "where-the-light-lands",
): string {
  assertStudioId(jobId, "jobId");
  return path.join(getFilmOutputsDir(production), `studio-export-${jobId}.mp4`);
}

export function safeFilmOutputPath(
  outputPath: string,
  production: RenderProduction = "where-the-light-lands",
): string {
  const root = path.resolve(getFilmOutputsDir(production));
  const resolved = path.resolve(outputPath);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new StudioError(
      "invalid_input",
      "Render output must stay inside the film output directory.",
    );
  }
  return resolved;
}
