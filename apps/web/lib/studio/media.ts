import { createHash, randomUUID } from "node:crypto";
import { constants, createReadStream } from "node:fs";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, open, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { StudioError } from "./errors";
import {
  getDataRoot,
  getProjectMediaDir,
  nowIso,
  readProject,
  withProjectLock,
  writeProject,
} from "./repository";
import { assertSafeMediaFileName, assertStudioId } from "./validation";
import type { MediaKind, StudioMediaAsset, StudioProject } from "./types";

const execFileAsync = promisify(execFile);
const DEFAULT_MAX_VIDEO_MB = 100;
const DEFAULT_MAX_IMAGE_MB = 20;

interface DetectedMedia {
  readonly mimeType: string;
  readonly extension: string;
}

interface ProbeJson {
  readonly format?: {
    readonly duration?: string;
  };
  readonly streams?: readonly {
    readonly codec_type?: string;
    readonly codec_name?: string;
    readonly width?: number;
    readonly height?: number;
    readonly avg_frame_rate?: string;
    readonly r_frame_rate?: string;
    readonly duration?: string;
  }[];
}

export interface MediaProbeResult {
  readonly width: number;
  readonly height: number;
  readonly durationSeconds: number | null;
  readonly frameRate: number | null;
  readonly codec: string | null;
  readonly hasAudio: boolean;
}

export interface MediaImportResult {
  readonly project: StudioProject;
  readonly media: StudioMediaAsset;
  readonly duplicate: boolean;
}

export interface MediaRange {
  readonly start: number;
  readonly end: number;
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getUploadLimitBytes(kind: MediaKind): number {
  const megabytes =
    kind === "video"
      ? numberFromEnv("FABLEON_MAX_VIDEO_MB", DEFAULT_MAX_VIDEO_MB)
      : numberFromEnv("FABLEON_MAX_IMAGE_MB", DEFAULT_MAX_IMAGE_MB);
  return Math.floor(megabytes * 1024 * 1024);
}

async function detectMedia(filePath: string, expectedKind: MediaKind): Promise<DetectedMedia> {
  const handle = await open(filePath, "r");
  let header: Buffer;
  try {
    header = Buffer.alloc(16);
    await handle.read(header, 0, header.length, 0);
  } finally {
    await handle.close();
  }

  const isMp4 = header.subarray(4, 8).toString("ascii") === "ftyp";
  const isPng =
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a;
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isWebp =
    header.subarray(0, 4).toString("ascii") === "RIFF" &&
    header.subarray(8, 12).toString("ascii") === "WEBP";

  if (expectedKind === "video") {
    if (!isMp4) {
      throw new StudioError(
        "unsupported_media",
        "The uploaded video is not a valid MP4 file. Only MP4 video is supported.",
      );
    }
    return { mimeType: "video/mp4", extension: "mp4" };
  }

  if (isPng) return { mimeType: "image/png", extension: "png" };
  if (isJpeg) return { mimeType: "image/jpeg", extension: "jpg" };
  if (isWebp) return { mimeType: "image/webp", extension: "webp" };
  throw new StudioError("unsupported_media", "The uploaded image must be PNG, JPEG, or WebP.");
}

function parseRate(value: string | undefined): number | null {
  if (!value) return null;
  const [numerator, denominator] = value.split("/");
  const n = Number(numerator);
  const d = denominator === undefined ? 1 : Number(denominator);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0 || n <= 0) return null;
  const rate = n / d;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function parseDuration(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 1000) / 1000 : null;
}

export async function probeMedia(filePath: string, kind: MediaKind): Promise<MediaProbeResult> {
  let stdout: string;
  try {
    const result = await execFileAsync(
      "ffprobe",
      ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { maxBuffer: 4 * 1024 * 1024 },
    );
    stdout = result.stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) {
      throw new StudioError(
        "media_tool_missing",
        "FFprobe is not installed. Install FFmpeg/FFprobe and retry the import.",
      );
    }
    throw new StudioError(
      "unsupported_media",
      "FFprobe could not inspect this media file. It may be malformed or unsupported.",
    );
  }

  let parsed: ProbeJson;
  try {
    parsed = JSON.parse(stdout) as ProbeJson;
  } catch {
    throw new StudioError("unsupported_media", "FFprobe returned unreadable metadata.");
  }

  const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");
  if (!videoStream) {
    throw new StudioError("unsupported_media", "No video stream was found in the file.");
  }
  const width = Number(videoStream.width);
  const height = Number(videoStream.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new StudioError("unsupported_media", "The media dimensions could not be determined.");
  }

  if (kind === "image") {
    return {
      width,
      height,
      durationSeconds: null,
      frameRate: null,
      codec: videoStream.codec_name ?? null,
      hasAudio: false,
    };
  }

  const duration = parseDuration(parsed.format?.duration) ?? parseDuration(videoStream.duration);
  if (duration === null) {
    throw new StudioError("unsupported_media", "The video duration could not be determined.");
  }
  const frameRate = parseRate(videoStream.avg_frame_rate) ?? parseRate(videoStream.r_frame_rate);
  if (frameRate === null) {
    throw new StudioError("unsupported_media", "The video frame rate could not be determined.");
  }

  return {
    width,
    height,
    durationSeconds: duration,
    frameRate,
    codec: videoStream.codec_name ?? null,
    hasAudio: parsed.streams?.some((stream) => stream.codec_type === "audio") ?? false,
  };
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
}

function sanitizeOriginalName(value: string): string {
  const base = path
    .basename(value)
    .replace(/[\u0000-\u001f]/g, "")
    .trim();
  return (base.length > 0 ? base : "uploaded-media").slice(0, 255);
}

export async function importMediaFile(
  projectId: string,
  sourcePath: string,
  originalName: string,
  kind: MediaKind,
): Promise<MediaImportResult> {
  assertStudioId(projectId, "projectId");
  const sourceStat = await stat(sourcePath);
  if (!sourceStat.isFile() || sourceStat.size <= 0) {
    throw new StudioError("unsupported_media", "The uploaded file is empty or unreadable.");
  }
  const limit = getUploadLimitBytes(kind);
  if (sourceStat.size > limit) {
    throw new StudioError(
      "payload_too_large",
      `The file exceeds the configured ${kind} upload limit of ${Math.round(limit / (1024 * 1024))} MB.`,
    );
  }

  const detected = await detectMedia(sourcePath, kind);
  const probe = await probeMedia(sourcePath, kind);
  const sha256 = await sha256File(sourcePath);

  return withProjectLock(projectId, async () => {
    const project = await readProject(projectId);
    const existing = project.media.find((item) => item.sha256 === sha256 && item.kind === kind);
    if (existing) {
      return { project, media: existing, duplicate: true };
    }

    const mediaId = randomUUID();
    const fileName = `${mediaId}.${detected.extension}`;
    const mediaDir = getProjectMediaDir(projectId);
    const destination = path.join(/* turbopackIgnore: true */ mediaDir, fileName);
    await mkdir(mediaDir, { recursive: true });
    await copyFile(sourcePath, destination, constants.COPYFILE_EXCL);

    const media: StudioMediaAsset = {
      id: mediaId,
      kind,
      fileName,
      originalName: sanitizeOriginalName(originalName),
      mimeType: detected.mimeType,
      sizeBytes: sourceStat.size,
      sha256,
      width: probe.width,
      height: probe.height,
      durationSeconds: probe.durationSeconds,
      frameRate: probe.frameRate,
      codec: probe.codec,
      hasAudio: probe.hasAudio,
      createdAt: nowIso(),
    };

    try {
      const updated: StudioProject = {
        ...project,
        media: [...project.media, media],
        updatedAt: nowIso(),
      };
      await writeProject(updated);
      return { project: updated, media, duplicate: false };
    } catch (error) {
      await rm(destination, { force: true }).catch(() => undefined);
      throw error;
    }
  });
}

export async function importMediaBuffer(
  projectId: string,
  buffer: Buffer,
  originalName: string,
  kind: MediaKind,
): Promise<MediaImportResult> {
  if (buffer.length === 0) {
    throw new StudioError("unsupported_media", "The uploaded file is empty.");
  }
  const limit = getUploadLimitBytes(kind);
  if (buffer.length > limit) {
    throw new StudioError(
      "payload_too_large",
      `The file exceeds the configured ${kind} upload limit of ${Math.round(limit / (1024 * 1024))} MB.`,
    );
  }
  const tempDir = await mkdtemp(path.join(getDataRoot(), "upload-"));
  const tempPath = path.join(tempDir, "upload.bin");
  try {
    await writeFile(tempPath, buffer, { flag: "wx" });
    return await importMediaFile(projectId, tempPath, originalName, kind);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function getMediaFilePath(
  projectId: string,
  mediaId: string,
): Promise<{ asset: StudioMediaAsset; filePath: string }> {
  assertStudioId(projectId, "projectId");
  assertStudioId(mediaId, "mediaId");
  const project = await readProject(projectId);
  const asset = project.media.find((item) => item.id === mediaId);
  if (!asset) {
    throw new StudioError("not_found", `Media ${mediaId} does not exist in this project.`);
  }
  assertSafeMediaFileName(asset.fileName);
  const mediaDir = path.resolve(getProjectMediaDir(projectId));
  const filePath = path.resolve(mediaDir, asset.fileName);
  if (!filePath.startsWith(`${mediaDir}${path.sep}`)) {
    throw new StudioError(
      "storage_corrupt",
      "Media reference escapes the project media directory.",
    );
  }
  return { asset, filePath };
}

export function parseRangeHeader(size: number, header: string | null): MediaRange | null {
  if (header === null || header.trim() === "") return null;
  if (size <= 0) {
    throw new StudioError("range_not_satisfiable", "The media file is empty.");
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) {
    throw new StudioError("range_not_satisfiable", "Only a single byte range is supported.");
  }
  const startRaw = match[1] ?? "";
  const endRaw = match[2] ?? "";
  if (startRaw === "" && endRaw === "") {
    throw new StudioError("range_not_satisfiable", "The byte range is empty.");
  }

  let start: number;
  let end: number;
  if (startRaw === "") {
    const suffix = Number(endRaw);
    if (!Number.isInteger(suffix) || suffix <= 0) {
      throw new StudioError("range_not_satisfiable", "The suffix byte range is invalid.");
    }
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === "" ? size - 1 : Number(endRaw);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
      throw new StudioError("range_not_satisfiable", "The byte range is invalid.");
    }
    if (start >= size) {
      throw new StudioError("range_not_satisfiable", "The byte range starts beyond the file.");
    }
    end = Math.min(end, size - 1);
  }
  return { start, end };
}
