import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { StudioError } from "./errors";
import {
  addIssue,
  addShot,
  addTake,
  createProject,
  getProjectDir,
  getProjectFile,
  getProjectMediaDir,
  listProjects,
  readProject,
  reorderShots,
  setTakeReview,
  updateIssue,
  updateProjectMetadata,
  writeProject,
} from "./repository";
import type { StudioMediaAsset, StudioProject } from "./types";

let tempRoot: string;
let previousDataRoot: string | undefined;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "fableon-studio-storage-"));
  previousDataRoot = process.env["FABLEON_DATA_DIR"];
  process.env["FABLEON_DATA_DIR"] = tempRoot;
});

afterEach(async () => {
  if (previousDataRoot === undefined) {
    delete process.env["FABLEON_DATA_DIR"];
  } else {
    process.env["FABLEON_DATA_DIR"] = previousDataRoot;
  }
  await rm(tempRoot, { recursive: true, force: true });
});

function mediaAsset(id = "media-1", hash = "a"): StudioMediaAsset {
  return {
    id,
    kind: "video",
    fileName: `${id}.mp4`,
    originalName: "original-video.mp4",
    mimeType: "video/mp4",
    sizeBytes: 1024,
    sha256: hash.repeat(64),
    width: 1280,
    height: 720,
    durationSeconds: 3.029,
    frameRate: 24,
    codec: "h264",
    hasAudio: true,
    createdAt: new Date().toISOString(),
  };
}

async function projectWithMedia(): Promise<StudioProject> {
  const project = await createProject({
    title: "Storage test",
    description: "A temporary project.",
    targetFrameRate: 24,
    targetWidth: 1920,
    targetHeight: 1080,
  });
  await mkdir(getProjectMediaDir(project.id), { recursive: true });
  await writeFile(path.join(getProjectMediaDir(project.id), "media-1.mp4"), "fake-video");
  const withMedia: StudioProject = { ...project, media: [mediaAsset()] };
  await writeProject(withMedia);
  return withMedia;
}

describe("studio project storage", () => {
  it("creates projects and shots, persists them, and reloads from disk", async () => {
    const project = await createProject({
      title: "Where the Light Lands",
      description: "A bird returns home.",
      targetFrameRate: 24,
      targetWidth: 1920,
      targetHeight: 1080,
    });

    const withShot = await addShot(project.id, {
      title: "Bird landing",
      description: "The bird lands on the branch.",
      targetDurationSeconds: 3,
      generationPrompt: "A painterly bird landing.",
      renderingMethod: "ai-video",
      referenceImageMediaId: null,
    });

    expect(withShot.shots).toHaveLength(1);
    expect(withShot.shotOrder).toEqual([withShot.shots[0]?.id]);

    const reloaded = await readProject(project.id);
    expect(reloaded.title).toBe("Where the Light Lands");
    expect(reloaded.shots[0]?.title).toBe("Bird landing");
    expect(reloaded.schemaVersion).toBe(1);
  });

  it("reorders shots without losing identity relationships", async () => {
    const project = await createProject({
      title: "Ordering",
      description: "",
      targetFrameRate: 24,
      targetWidth: 1920,
      targetHeight: 1080,
    });
    const first = await addShot(project.id, {
      title: "First",
      description: "",
      targetDurationSeconds: 2,
      generationPrompt: "",
      renderingMethod: "ai-video",
      referenceImageMediaId: null,
    });
    const second = await addShot(project.id, {
      title: "Second",
      description: "",
      targetDurationSeconds: 4,
      generationPrompt: "",
      renderingMethod: "deterministic",
      referenceImageMediaId: null,
    });
    const firstId = first.shots[0]?.id;
    const secondId = second.shots[1]?.id;
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();

    const reordered = await reorderShots(project.id, [secondId!, firstId!]);
    expect(reordered.shotOrder).toEqual([secondId, firstId]);
    expect((await readProject(project.id)).shotOrder).toEqual([secondId, firstId]);
  });

  it("persists takes, issues, and take-specific review state", async () => {
    const project = await projectWithMedia();
    const withShot = await addShot(project.id, {
      title: "Landing take",
      description: "",
      targetDurationSeconds: 3,
      generationPrompt: "Bird landing.",
      renderingMethod: "ai-video",
      referenceImageMediaId: null,
    });
    const shotId = withShot.shots[0]?.id;
    expect(shotId).toBeTruthy();

    const withTake = await addTake(project.id, shotId!, {
      sourceType: "ai-video",
      mediaId: "media-1",
      provider: "Google",
      model: "gemini-omni-1.2-flash",
      generationPrompt: "Bird landing.",
      durationSeconds: 3.029,
      width: 1280,
      height: 720,
      frameRate: 24,
      codec: "h264",
      hasAudio: true,
      fileSizeBytes: 1024,
      sha256: "a".repeat(64),
    });
    const takeId = withTake.shots[0]?.takes[0]?.id;
    expect(takeId).toBeTruthy();
    expect(withTake.shots[0]?.currentTakeId).toBe(takeId);

    const withIssue = await addIssue(project.id, shotId!, takeId!, {
      category: "anatomy_defect",
      severity: "critical",
      description: "Far wing detaches.",
      timestampSeconds: 1.1,
      frameImageMediaId: null,
    });
    expect(withIssue.shots[0]?.takes[0]?.issues[0]?.status).toBe("open");

    await expect(
      setTakeReview(project.id, shotId!, takeId!, "approved", "", false),
    ).rejects.toMatchObject({
      code: "approval_requires_confirmation",
    });

    const approved = await setTakeReview(project.id, shotId!, takeId!, "approved", "", true);
    expect(approved.shots[0]?.takes[0]?.reviewStatus).toBe("approved");
    expect(approved.shots[0]?.takes[0]?.reviewHistory).toHaveLength(1);

    const reloaded = await readProject(project.id);
    expect(reloaded.shots[0]?.takes[0]?.issues[0]?.description).toBe("Far wing detaches.");
    expect(reloaded.shots[0]?.takes[0]?.reviewStatus).toBe("approved");
  });

  it("rejects a duplicate take of the same media", async () => {
    const project = await projectWithMedia();
    const withShot = await addShot(project.id, {
      title: "Duplicate",
      description: "",
      targetDurationSeconds: 3,
      generationPrompt: "",
      renderingMethod: "ai-video",
      referenceImageMediaId: null,
    });
    const shotId = withShot.shots[0]?.id;
    expect(shotId).toBeTruthy();
    const take = {
      sourceType: "ai-video" as const,
      mediaId: "media-1",
      provider: null,
      model: null,
      generationPrompt: "",
      durationSeconds: 3,
      width: 1280,
      height: 720,
      frameRate: 24,
      codec: "h264",
      hasAudio: true,
      fileSizeBytes: 1024,
      sha256: "a".repeat(64),
    };
    await addTake(project.id, shotId!, take);
    await expect(addTake(project.id, shotId!, take)).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("rejects path traversal and invalid entity IDs", async () => {
    await expect(readProject("../../etc")).rejects.toMatchObject({
      code: "invalid_input",
    });
    expect(() => getProjectDir("../outside")).toThrow(StudioError);
  });

  it("fails loudly on a corrupted manifest without repairing it", async () => {
    const project = await createProject({
      title: "Corrupt",
      description: "",
      targetFrameRate: 24,
      targetWidth: 1920,
      targetHeight: 1080,
    });
    const file = getProjectFile(project.id);
    const original = '{"broken": true';
    await writeFile(file, original, "utf8");

    await expect(readProject(project.id)).rejects.toMatchObject({
      code: "storage_corrupt",
    });
    expect(await readFile(file, "utf8")).toBe(original);
  });

  it("updates metadata and lists a project summary", async () => {
    const project = await createProject({
      title: "Old title",
      description: "Before",
      targetFrameRate: 24,
      targetWidth: 1920,
      targetHeight: 1080,
    });
    await updateProjectMetadata(project.id, { title: "New title", description: "After" });
    const summaries = await listProjects();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.title).toBe("New title");
    expect(summaries[0]?.shotCount).toBe(0);
    expect(summaries[0]?.needsReviewShotCount).toBe(0);
  });

  it("keeps review state and issues independent across takes", async () => {
    const project = await createProject({
      title: "Take independence",
      description: "",
      targetFrameRate: 24,
      targetWidth: 1920,
      targetHeight: 1080,
    });
    await mkdir(getProjectMediaDir(project.id), { recursive: true });
    await writeFile(path.join(getProjectMediaDir(project.id), "media-1.mp4"), "fake-video-1");
    await writeFile(path.join(getProjectMediaDir(project.id), "media-2.mp4"), "fake-video-2");
    await writeProject({
      ...project,
      media: [mediaAsset("media-1", "a"), mediaAsset("media-2", "b")],
    });
    const withShot = await addShot(project.id, {
      title: "Two takes",
      description: "",
      targetDurationSeconds: 3,
      generationPrompt: "",
      renderingMethod: "ai-video",
      referenceImageMediaId: null,
    });
    const shotId = withShot.shots[0]?.id;
    expect(shotId).toBeTruthy();
    const baseTake = {
      sourceType: "ai-video" as const,
      provider: null,
      model: null,
      generationPrompt: "",
      durationSeconds: 3,
      width: 1280,
      height: 720,
      frameRate: 24,
      codec: "h264",
      hasAudio: true,
    };
    const first = await addTake(project.id, shotId!, {
      ...baseTake,
      mediaId: "media-1",
      fileSizeBytes: 1024,
      sha256: "a".repeat(64),
    });
    const takeOneId = first.shots[0]?.takes[0]?.id;
    const second = await addTake(project.id, shotId!, {
      ...baseTake,
      mediaId: "media-2",
      fileSizeBytes: 2048,
      sha256: "b".repeat(64),
    });
    const takeTwoId = second.shots[0]?.takes[1]?.id;
    expect(takeOneId).toBeTruthy();
    expect(takeTwoId).toBeTruthy();

    const withIssue = await addIssue(project.id, shotId!, takeOneId!, {
      category: "anatomy_defect",
      severity: "critical",
      description: "Detached wing",
      timestampSeconds: 1.1,
      frameImageMediaId: null,
    });
    const issueId = withIssue.shots[0]?.takes[0]?.issues[0]?.id;
    expect(issueId).toBeTruthy();

    const takeTwoApproved = await setTakeReview(
      project.id,
      shotId!,
      takeTwoId!,
      "approved",
      "Second take is clean.",
      false,
    );
    const takeOne = takeTwoApproved.shots[0]?.takes.find((take) => take.id === takeOneId);
    const takeTwo = takeTwoApproved.shots[0]?.takes.find((take) => take.id === takeTwoId);
    expect(takeOne?.reviewStatus).toBe("not_reviewed");
    expect(takeOne?.issues[0]?.status).toBe("open");
    expect(takeTwo?.reviewStatus).toBe("approved");

    const resolved = await updateIssue(project.id, shotId!, takeOneId!, issueId!, {
      status: "resolved",
    });
    const resolvedIssue = resolved.shots[0]?.takes[0]?.issues[0];
    expect(resolvedIssue?.status).toBe("resolved");
    expect(resolvedIssue?.resolvedAt).not.toBeNull();
  });

  it("generates collision-resistant project and shot IDs", async () => {
    const project = await createProject({
      title: "IDs",
      description: "",
      targetFrameRate: 24,
      targetWidth: 1920,
      targetHeight: 1080,
    });
    expect(project.id).toMatch(/^[a-z0-9-]{2,64}$/);
    expect(project.id).not.toBe(
      (
        await createProject({
          title: "Second",
          description: "",
          targetFrameRate: 24,
          targetWidth: 1920,
          targetHeight: 1080,
        })
      ).id,
    );
  });
});
