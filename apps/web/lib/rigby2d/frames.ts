import { copyFile, mkdir, readFile, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { RIGBY2D_EXPORT_TIMEOUT_MS, RIGBY2D_PROJECT_FILE, getRigby2DDataRoot } from "./constants";
import { Rigby2DError } from "./errors";
import { Rigby2DMcpClient, type Rigby2DTraceEntry } from "./mcp-client";
import { atomicWriteJson, createJobWorkspace, removeJobWorkspace, sha256Bytes } from "./storage";

export interface FramePivot {
  readonly x: number;
  readonly y: number;
}

export interface FrameRenderMetadata {
  readonly schemaVersion: 1;
  readonly cacheKey: string;
  readonly characterId: string;
  readonly versionId: string;
  readonly sourceSha256: string;
  readonly runtimeVersion: string;
  readonly runtimeCommit: string;
  readonly animation: string;
  readonly fps: number;
  readonly scale: number;
  readonly loop: false;
  readonly frameCount: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly pivot: FramePivot;
  readonly origin: FramePivot;
  readonly durationSeconds: number;
  readonly frameFiles: readonly string[];
  readonly createdAt: string;
  readonly exportMs: number;
  readonly metadataMs: number;
  readonly cacheBytes: number;
  readonly mcp: {
    readonly protocolVersion: string;
    readonly toolCount: number;
    readonly elapsedMs: number;
    readonly peakRssKb: number;
    readonly requestCount: number;
    readonly trace: readonly Rigby2DTraceEntry[];
    readonly stderr: string;
  };
}

export interface FrameRenderResult {
  readonly metadata: FrameRenderMetadata;
  readonly cached: boolean;
}

export interface FrameFile {
  readonly path: string;
  readonly fileName: string;
  readonly index: number;
}

interface FrameSheetEntry {
  readonly sourceSize?: { readonly w?: number; readonly h?: number };
  readonly pivot?: { readonly x?: number; readonly y?: number };
}

interface FrameSheetJson {
  readonly frames?: Record<string, FrameSheetEntry>;
  readonly textures?: readonly { readonly frames?: readonly FrameSheetEntry[] }[];
}

interface ExportSummary {
  readonly frames?: number;
  readonly width?: number;
  readonly height?: number;
  readonly frameWidth?: number;
  readonly frameHeight?: number;
}

const inflight = new Map<string, Promise<FrameRenderResult>>();

export function getFrameCacheRoot(dataRoot?: string): string {
  return path.join(getRigby2DDataRoot(dataRoot), "cache", "frames");
}

export function getFrameCacheDir(cacheKey: string, dataRoot?: string): string {
  if (!/^[a-f0-9]{64}$/.test(cacheKey)) {
    throw new Rigby2DError("INVALID_INPUT", "Invalid frame cache key.");
  }
  return path.join(getFrameCacheRoot(dataRoot), cacheKey);
}

export function makeFrameCacheKey(input: {
  readonly sourceSha256: string;
  readonly runtimeCommit: string;
  readonly animation: string;
  readonly fps: number;
  readonly scale: number;
}): string {
  return sha256Bytes(
    Buffer.from(
      JSON.stringify({
        schema: 1,
        sourceSha256: input.sourceSha256,
        runtimeCommit: input.runtimeCommit,
        animation: input.animation,
        fps: input.fps,
        scale: input.scale,
        format: "frames",
        loop: false,
        trim: false,
        dedupe: false,
      }),
    ),
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseMeta(value: unknown): FrameRenderMetadata | null {
  if (!isObject(value) || value["schemaVersion"] !== 1) return null;
  const pivot = isObject(value["pivot"]) ? value["pivot"] : {};
  const origin = isObject(value["origin"]) ? value["origin"] : {};
  const mcp = isObject(value["mcp"]) ? value["mcp"] : {};
  const frameFiles = Array.isArray(value["frameFiles"])
    ? value["frameFiles"].filter((entry): entry is string => typeof entry === "string")
    : [];
  return {
    schemaVersion: 1,
    cacheKey: stringField(value["cacheKey"]),
    characterId: stringField(value["characterId"]),
    versionId: stringField(value["versionId"]),
    sourceSha256: stringField(value["sourceSha256"]),
    runtimeVersion: stringField(value["runtimeVersion"]),
    runtimeCommit: stringField(value["runtimeCommit"]),
    animation: stringField(value["animation"]),
    fps: numberField(value["fps"]),
    scale: numberField(value["scale"]),
    loop: false,
    frameCount: numberField(value["frameCount"]),
    frameWidth: numberField(value["frameWidth"]),
    frameHeight: numberField(value["frameHeight"]),
    pivot: { x: numberField(pivot["x"]), y: numberField(pivot["y"]) },
    origin: { x: numberField(origin["x"]), y: numberField(origin["y"]) },
    durationSeconds: numberField(value["durationSeconds"]),
    frameFiles,
    createdAt: stringField(value["createdAt"]),
    exportMs: numberField(value["exportMs"]),
    metadataMs: numberField(value["metadataMs"]),
    cacheBytes: numberField(value["cacheBytes"]),
    mcp: {
      protocolVersion: stringField(mcp["protocolVersion"]),
      toolCount: numberField(mcp["toolCount"]),
      elapsedMs: numberField(mcp["elapsedMs"]),
      peakRssKb: numberField(mcp["peakRssKb"]),
      requestCount: numberField(mcp["requestCount"]),
      trace: Array.isArray(mcp["trace"]) ? (mcp["trace"] as Rigby2DTraceEntry[]) : [],
      stderr: stringField(mcp["stderr"]),
    },
  };
}

export async function readCachedFrameRender(
  cacheKey: string,
  dataRoot?: string,
): Promise<FrameRenderMetadata | null> {
  const dir = getFrameCacheDir(cacheKey, dataRoot);
  try {
    const raw = await readFile(path.join(dir, "meta.json"), "utf8");
    const metadata = parseMeta(JSON.parse(raw) as unknown);
    if (!metadata || metadata.cacheKey !== cacheKey || metadata.frameCount <= 0) return null;
    if (metadata.frameFiles.length !== metadata.frameCount) return null;
    let total = 0;
    for (const file of metadata.frameFiles) {
      if (!/^[0-9]{4}\.png$/.test(file)) return null;
      const info = await stat(path.join(dir, "frames", file));
      if (!info.isFile() || info.size === 0) return null;
      total += info.size;
    }
    if (total !== metadata.cacheBytes && metadata.cacheBytes > 0) {
      // The cache is still usable; record the observed byte total in the returned copy.
      return { ...metadata, cacheBytes: total };
    }
    return metadata;
  } catch {
    return null;
  }
}

function entriesFromSheet(json: FrameSheetJson): FrameSheetEntry[] {
  if (json.frames) return Object.values(json.frames);
  if (Array.isArray(json.textures)) {
    return json.textures.flatMap((texture) =>
      Array.isArray(texture.frames) ? texture.frames : [],
    );
  }
  return [];
}

async function readSheetEntries(dir: string): Promise<FrameSheetEntry[]> {
  const files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort();
  for (const file of files) {
    try {
      const parsed = JSON.parse(await readFile(path.join(dir, file), "utf8")) as FrameSheetJson;
      const entries = entriesFromSheet(parsed);
      if (entries.length > 0) return entries;
    } catch {
      // Try the next JSON file.
    }
  }
  throw new Rigby2DError("MCP_TOOL_FAILED", "Rigby2D JSON export has no frame entries.");
}

function assertStableMetadata(entries: readonly FrameSheetEntry[], width: number, height: number) {
  if (entries.length === 0) {
    throw new Rigby2DError("MCP_TOOL_FAILED", "Rigby2D JSON export returned no frames.");
  }
  let pivotX = -1;
  let pivotY = -1;
  for (const entry of entries) {
    const source = entry.sourceSize;
    const pivot = entry.pivot;
    if (!source || !pivot) {
      throw new Rigby2DError("MCP_TOOL_FAILED", "Rigby2D JSON export lacks sourceSize/pivot.");
    }
    const sourceWidth = numberField(source.w);
    const sourceHeight = numberField(source.h);
    if (sourceWidth !== width || sourceHeight !== height) {
      throw new Rigby2DError(
        "FRAME_ORIGIN_UNSTABLE",
        `Rigby2D metadata frame ${sourceWidth}x${sourceHeight} does not match the exported PNGs ${width}x${height}.`,
      );
    }
    const px = numberField(pivot.x);
    const py = numberField(pivot.y);
    if (pivotX < 0) {
      pivotX = px;
      pivotY = py;
    } else if (Math.abs(px - pivotX) > 0.0001 || Math.abs(py - pivotY) > 0.0001) {
      throw new Rigby2DError(
        "FRAME_ORIGIN_UNSTABLE",
        "Rigby2D frame pivots change between frames; refusing to composite a jumping actor.",
      );
    }
  }
  return { pivotX, pivotY };
}

async function acquireCacheLock(
  lockDir: string,
  cacheKey: string,
  dataRoot?: string,
): Promise<boolean> {
  const started = Date.now();
  while (true) {
    try {
      await mkdir(lockDir);
      return true;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      const cached = await readCachedFrameRender(cacheKey, dataRoot);
      if (cached) return false;
      try {
        const info = await stat(lockDir);
        if (Date.now() - info.mtimeMs > 10 * 60 * 1000) {
          await rm(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - started > 120_000) {
        throw new Rigby2DError("CACHE_WRITE_FAILED", "Timed out waiting for the frame cache lock.");
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

async function copyFrames(sourceDir: string, targetDir: string): Promise<string[]> {
  const files = (await readdir(sourceDir)).filter((file) => file.endsWith(".png")).sort();
  if (files.length === 0) {
    throw new Rigby2DError("MCP_TOOL_FAILED", "Rigby2D frame export produced no PNG files.");
  }
  await mkdir(targetDir, { recursive: true });
  const names: string[] = [];
  for (const [index, file] of files.entries()) {
    const name = `${String(index).padStart(4, "0")}.png`;
    await copyFile(path.join(sourceDir, file), path.join(targetDir, name));
    names.push(name);
  }
  return names;
}

async function directoryBytes(dir: string): Promise<number> {
  let total = 0;
  for (const file of await readdir(dir)) {
    const info = await stat(path.join(dir, file));
    if (info.isFile()) total += info.size;
  }
  return total;
}

async function exportFrames(input: {
  readonly characterId: string;
  readonly versionId: string;
  readonly sourceSha256: string;
  readonly sourcePath: string;
  readonly animation: string;
  readonly fps: number;
  readonly scale: number;
  readonly cacheKey: string;
  readonly dataRoot?: string;
  readonly signal?: AbortSignal;
}): Promise<FrameRenderResult> {
  const job = await createJobWorkspace(input.dataRoot);
  let client: Rigby2DMcpClient | null = null;
  const tempCache = path.join(getFrameCacheRoot(input.dataRoot), `.tmp-${randomUUID()}`);
  const framesTarget = path.join(tempCache, "frames");
  try {
    await copyFile(input.sourcePath, path.join(job.workspaceDir, RIGBY2D_PROJECT_FILE));
    await mkdir(path.join(job.workspaceDir, "frames"), { recursive: true });
    await mkdir(path.join(job.workspaceDir, "meta"), { recursive: true });
    client = await Rigby2DMcpClient.open(job.workspaceDir);
    const exportStart = Date.now();
    const framesSummary = await client.call<ExportSummary>(
      "export_sprite_sheet",
      {
        input: RIGBY2D_PROJECT_FILE,
        output_folder: "frames",
        name: "export",
        format: "frames",
        animations: [input.animation],
        fps: input.fps,
        scale: input.scale,
        loop: false,
        overwrite: true,
      },
      {
        timeoutMs: RIGBY2D_EXPORT_TIMEOUT_MS,
        ...(input.signal ? { signal: input.signal } : {}),
      },
    );
    const exportMs = Date.now() - exportStart;
    const metadataStart = Date.now();
    await client.call<ExportSummary>(
      "export_sprite_sheet",
      {
        input: RIGBY2D_PROJECT_FILE,
        output_folder: "meta",
        name: "meta",
        format: "json",
        animations: [input.animation],
        fps: input.fps,
        scale: input.scale,
        layout: "grid",
        trim: false,
        dedupe: false,
        loop: false,
        max_width: 16384,
        overwrite: true,
      },
      {
        timeoutMs: RIGBY2D_EXPORT_TIMEOUT_MS,
        ...(input.signal ? { signal: input.signal } : {}),
      },
    );
    const metadataMs = Date.now() - metadataStart;
    const frameWidth = numberField(framesSummary.frameWidth);
    const frameHeight = numberField(framesSummary.frameHeight);
    const frameCount = numberField(framesSummary.frames);
    if (frameWidth <= 0 || frameHeight <= 0 || frameCount <= 0) {
      throw new Rigby2DError(
        "MCP_TOOL_FAILED",
        "Rigby2D frame export returned no frame dimensions.",
      );
    }
    const sheetEntries = await readSheetEntries(path.join(job.workspaceDir, "meta"));
    if (sheetEntries.length !== frameCount) {
      throw new Rigby2DError(
        "FRAME_ORIGIN_UNSTABLE",
        `Rigby2D metadata has ${sheetEntries.length} frames; the frame export has ${frameCount}.`,
      );
    }
    const { pivotX, pivotY } = assertStableMetadata(sheetEntries, frameWidth, frameHeight);
    const frameFiles = await copyFrames(
      path.join(job.workspaceDir, "frames", "export"),
      framesTarget,
    );
    if (frameFiles.length !== frameCount) {
      throw new Rigby2DError(
        "MCP_TOOL_FAILED",
        `Rigby2D frame export produced ${frameFiles.length} PNGs; expected ${frameCount}.`,
      );
    }
    const cacheBytes = await directoryBytes(framesTarget);
    const metadata: FrameRenderMetadata = {
      schemaVersion: 1,
      cacheKey: input.cacheKey,
      characterId: input.characterId,
      versionId: input.versionId,
      sourceSha256: input.sourceSha256,
      runtimeVersion: client.installationInfo.version,
      runtimeCommit: client.installationInfo.commit,
      animation: input.animation,
      fps: input.fps,
      scale: input.scale,
      loop: false,
      frameCount,
      frameWidth,
      frameHeight,
      pivot: { x: pivotX, y: pivotY },
      origin: { x: pivotX * frameWidth, y: pivotY * frameHeight },
      durationSeconds: frameCount / input.fps,
      frameFiles,
      createdAt: new Date().toISOString(),
      exportMs,
      metadataMs,
      cacheBytes,
      mcp: {
        protocolVersion: client.protocolVersion,
        toolCount: client.discovery.length,
        elapsedMs: client.resourceUsage.elapsedMs,
        peakRssKb: client.resourceUsage.peakRssKb,
        requestCount: client.resourceUsage.requestCount,
        trace: client.trace,
        stderr: client.stderrText(),
      },
    };
    await mkdir(tempCache, { recursive: true });
    await atomicWriteJson(path.join(tempCache, "meta.json"), metadata);
    const target = getFrameCacheDir(input.cacheKey, input.dataRoot);
    try {
      await rename(tempCache, target);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST") {
        await rm(tempCache, { recursive: true, force: true });
      } else {
        throw error;
      }
    }
    const cached = await readCachedFrameRender(input.cacheKey, input.dataRoot);
    if (!cached) {
      throw new Rigby2DError(
        "CACHE_WRITE_FAILED",
        "Frame cache was written but could not be read.",
      );
    }
    return { metadata: cached, cached: false };
  } finally {
    if (client) await client.close().catch(() => undefined);
    await rm(tempCache, { recursive: true, force: true }).catch(() => undefined);
    await removeJobWorkspace(job.jobDir);
  }
}

/**
 * Exports (or reuses) a content-addressed Rigby2D frame sequence. The returned metadata keeps the
 * exact frame canvas and skeleton-origin pivot used by every PNG.
 */
export async function exportAnimationFrames(input: {
  readonly characterId: string;
  readonly versionId: string;
  readonly sourceSha256: string;
  readonly sourcePath: string;
  readonly runtimeCommit: string;
  readonly animation: string;
  readonly fps: number;
  readonly scale: number;
  readonly dataRoot?: string;
  readonly signal?: AbortSignal;
}): Promise<FrameRenderResult> {
  const cacheKey = makeFrameCacheKey({
    sourceSha256: input.sourceSha256,
    runtimeCommit: input.runtimeCommit,
    animation: input.animation,
    fps: input.fps,
    scale: input.scale,
  });
  const cached = await readCachedFrameRender(cacheKey, input.dataRoot);
  if (cached) return { metadata: cached, cached: true };
  const existing = inflight.get(cacheKey);
  if (existing) return existing;
  await mkdir(getFrameCacheRoot(input.dataRoot), { recursive: true });
  const run = (async () => {
    const lockDir = `${getFrameCacheDir(cacheKey, input.dataRoot)}.lock`;
    const owned = await acquireCacheLock(lockDir, cacheKey, input.dataRoot);
    try {
      const afterLock = await readCachedFrameRender(cacheKey, input.dataRoot);
      if (afterLock) return { metadata: afterLock, cached: true };
      return await exportFrames({ ...input, cacheKey });
    } finally {
      if (owned) await rm(lockDir, { recursive: true, force: true }).catch(() => undefined);
    }
  })();
  inflight.set(cacheKey, run);
  try {
    return await run;
  } finally {
    inflight.delete(cacheKey);
  }
}

export async function getFrameFile(
  cacheKey: string,
  frameIndex: number,
  dataRoot?: string,
): Promise<FrameFile> {
  const metadata = await readCachedFrameRender(cacheKey, dataRoot);
  if (!metadata)
    throw new Rigby2DError("RENDER_NOT_FOUND", "Frame cache is missing or incomplete.");
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= metadata.frameCount) {
    throw new Rigby2DError(
      "FRAME_NOT_FOUND",
      `Frame ${frameIndex} is outside 0..${metadata.frameCount - 1}.`,
    );
  }
  const fileName = metadata.frameFiles[frameIndex];
  if (!fileName) throw new Rigby2DError("FRAME_NOT_FOUND", `Frame ${frameIndex} has no file.`);
  return {
    path: path.join(getFrameCacheDir(cacheKey, dataRoot), "frames", fileName),
    fileName,
    index: frameIndex,
  };
}
