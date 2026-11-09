import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { StudioError } from "./errors";
import {
  getMediaFilePath,
  getUploadLimitBytes,
  importMediaFile,
  parseRangeHeader,
  sha256File,
} from "./media";
import { createProject, getProjectMediaDir, getRepoRoot, readProject } from "./repository";

let tempRoot: string;
let previousDataRoot: string | undefined;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "fableon-studio-media-"));
  previousDataRoot = process.env["FABLEON_DATA_DIR"];
  process.env["FABLEON_DATA_DIR"] = tempRoot;
});

afterEach(async () => {
  if (previousDataRoot === undefined) {
    delete process.env["FABLEON_DATA_DIR"];
  } else {
    process.env["FABLEON_DATA_DIR"] = previousDataRoot;
  }
  delete process.env["FABLEON_MAX_VIDEO_MB"];
  delete process.env["FABLEON_MAX_IMAGE_MB"];
  await rm(tempRoot, { recursive: true, force: true });
});

async function newProject() {
  return createProject({
    title: "Media test",
    description: "",
    targetFrameRate: 24,
    targetWidth: 1920,
    targetHeight: 1080,
  });
}

describe("studio media intake", () => {
  it("imports the real Phase 2.8 MP4, extracts metadata, and preserves the source", async () => {
    const project = await newProject();
    const source = path.join(
      getRepoRoot(),
      "docs/benchmarks/phase-02-8/generated/original-video.mp4",
    );
    const sourceHashBefore = await sha256File(source);

    const result = await importMediaFile(project.id, source, "original-video.mp4", "video");

    expect(result.duplicate).toBe(false);
    expect(result.media.kind).toBe("video");
    expect(result.media.width).toBe(1280);
    expect(result.media.height).toBe(720);
    expect(result.media.durationSeconds).toBeCloseTo(3.029, 2);
    expect(result.media.frameRate).toBe(24);
    expect(result.media.codec).toBe("h264");
    expect(result.media.hasAudio).toBe(true);
    expect(result.media.originalName).toBe("original-video.mp4");
    expect(result.media.fileName).toMatch(/^[a-z0-9-]+\.mp4$/);

    expect(await sha256File(source)).toBe(sourceHashBefore);
    const storedPath = path.join(getProjectMediaDir(project.id), result.media.fileName);
    expect((await stat(storedPath)).isFile()).toBe(true);
    expect(await sha256File(storedPath)).toBe(result.media.sha256);

    const reloaded = await readProject(project.id);
    expect(reloaded.media).toHaveLength(1);
    expect(reloaded.media[0]?.id).toBe(result.media.id);
  });

  it("reuses an identical media asset instead of copying it twice", async () => {
    const project = await newProject();
    const source = path.join(
      getRepoRoot(),
      "docs/benchmarks/phase-02-8/generated/original-video.mp4",
    );
    const first = await importMediaFile(project.id, source, "original-video.mp4", "video");
    const second = await importMediaFile(project.id, source, "same-video.mp4", "video");

    expect(second.duplicate).toBe(true);
    expect(second.media.id).toBe(first.media.id);
    expect((await readProject(project.id)).media).toHaveLength(1);
  });

  it("imports a real PNG starting frame and records image dimensions", async () => {
    const project = await newProject();
    const source = path.join(getRepoRoot(), "assets/premium-video-v1/start-frame.png");
    const result = await importMediaFile(project.id, source, "start-frame.png", "image");

    expect(result.media.kind).toBe("image");
    expect(result.media.width).toBe(1672);
    expect(result.media.height).toBe(941);
    expect(result.media.durationSeconds).toBeNull();
    expect(result.media.frameRate).toBeNull();
    expect(result.media.hasAudio).toBe(false);
  });

  it("rejects a non-video file even when it has an MP4 extension", async () => {
    const project = await newProject();
    const source = path.join(tempRoot, "fake.mp4");
    await writeFile(source, "this is not an mp4", "utf8");

    await expect(importMediaFile(project.id, source, "fake.mp4", "video")).rejects.toMatchObject({
      code: "unsupported_media",
    } satisfies Partial<StudioError>);
  });

  it("enforces the configured upload-size limit", async () => {
    process.env["FABLEON_MAX_VIDEO_MB"] = "0.001";
    const project = await newProject();
    const source = path.join(
      getRepoRoot(),
      "docs/benchmarks/phase-02-8/generated/original-video.mp4",
    );
    await expect(
      importMediaFile(project.id, source, "too-large.mp4", "video"),
    ).rejects.toMatchObject({
      code: "payload_too_large",
    } satisfies Partial<StudioError>);
    expect(getUploadLimitBytes("video")).toBeLessThan(200_000);
  });

  it("returns actionable not-found errors for unknown media and rejects invalid IDs", async () => {
    const project = await newProject();
    await expect(getMediaFilePath(project.id, "missing-media")).rejects.toMatchObject({
      code: "not_found",
    } satisfies Partial<StudioError>);
    await expect(getMediaFilePath(project.id, "../escape")).rejects.toMatchObject({
      code: "invalid_input",
    } satisfies Partial<StudioError>);
  });

  it("parses supported HTTP byte ranges and rejects invalid ones", () => {
    expect(parseRangeHeader(100, "bytes=0-9")).toEqual({ start: 0, end: 9 });
    expect(parseRangeHeader(100, "bytes=90-")).toEqual({ start: 90, end: 99 });
    expect(parseRangeHeader(100, "bytes=-10")).toEqual({ start: 90, end: 99 });
    expect(parseRangeHeader(100, null)).toBeNull();
    expect(() => parseRangeHeader(100, "bytes=200-300")).toThrow(StudioError);
    expect(() => parseRangeHeader(100, "bytes=0-1,2-3")).toThrow(StudioError);
    expect(() => parseRangeHeader(100, "items=0-1")).toThrow(StudioError);
  });

  it("does not store a copy when validation fails", async () => {
    const project = await newProject();
    const source = path.join(tempRoot, "fake.png");
    await writeFile(source, "not an image", "utf8");
    await expect(importMediaFile(project.id, source, "fake.png", "image")).rejects.toThrow(
      StudioError,
    );
    const mediaDir = getProjectMediaDir(project.id);
    const contents = await readdir(mediaDir).catch(() => []);
    expect(contents).toEqual([]);
  });
});
