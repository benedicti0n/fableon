import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { isStudioError } from "./errors";
import { importMediaFile } from "./media";
import { getProjectDir, getRepoRoot, nowIso, readProject, writeProject } from "./repository";
import type {
  ReviewHistoryEntry,
  ReviewIssue,
  StudioProject,
  StudioShot,
  StudioTake,
} from "./types";

export const DEMO_PROJECT_ID = "demo-where-the-light-lands";
export const DEMO_PROJECT_TITLE = "Where the Light Lands";

const AI_SHOT_ID = "demo-shot-ai";
const RIG_SHOT_ID = "demo-shot-rig";
const AI_TAKE_ID = "demo-take-ai-1";
const RIG_TAKE_ID = "demo-take-rig-1";

const AI_WING_ISSUE_ID = "demo-issue-ai-wing";
const AI_IDENTITY_ISSUE_ID = "demo-issue-ai-identity";
const AI_POP_ISSUE_ID = "demo-issue-ai-pop";
const RIG_ART_ISSUE_ID = "demo-issue-rig-art";
const REGENERATION_ID = "demo-regeneration-1";

function requiredDuration(value: number | null): number {
  if (value === null || value <= 0) {
    throw new Error("Demo media is missing a positive duration.");
  }
  return value;
}

function optionalRate(value: number | null): number {
  if (value === null || value <= 0) {
    throw new Error("Demo media is missing a positive frame rate.");
  }
  return value;
}

function historyEntry(
  id: string,
  status: ReviewHistoryEntry["status"],
  note: string,
  createdAt: string,
): ReviewHistoryEntry {
  return { id, status, note, createdAt };
}

function issue(
  id: string,
  category: ReviewIssue["category"],
  severity: ReviewIssue["severity"],
  description: string,
  timestampSeconds: number | null,
  createdAt: string,
): ReviewIssue {
  return {
    id,
    category,
    severity,
    description,
    timestampSeconds,
    frameImageMediaId: null,
    status: "open",
    createdAt,
    resolvedAt: null,
  };
}

async function readExperimentPrompt(): Promise<string> {
  try {
    const raw = await readFile(
      path.join(getRepoRoot(), "docs/benchmarks/phase-02-8/generated/metadata.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { prompt?: unknown };
    if (typeof parsed.prompt === "string" && parsed.prompt.trim().length > 0) {
      return parsed.prompt;
    }
  } catch {
    // The demo remains importable without the historical metadata file.
  }
  return "Animate the supplied painterly bird illustration into a graceful landing on a moss-covered branch with a static camera and consistent character identity.";
}

export async function importDemoProject(): Promise<{
  readonly project: StudioProject;
  readonly created: boolean;
}> {
  try {
    const existing = await readProject(DEMO_PROJECT_ID);
    return { project: existing, created: false };
  } catch (error) {
    if (!isStudioError(error) || error.code !== "not_found") {
      throw error;
    }
  }

  const now = nowIso();
  const base: StudioProject = {
    schemaVersion: 1,
    id: DEMO_PROJECT_ID,
    title: DEMO_PROJECT_TITLE,
    description:
      "Hybrid demonstration project: one real Phase 2.8 AI-generated take and one Phase 2.7 deterministic Gate 2 take.",
    createdAt: now,
    updatedAt: now,
    targetFrameRate: 24,
    targetWidth: 1920,
    targetHeight: 1080,
    shotOrder: [],
    shots: [],
    media: [],
    regenerationRequests: [],
    demoKey: "where-the-light-lands",
  };

  try {
    await writeProject(base);

    const startImage = await importMediaFile(
      DEMO_PROJECT_ID,
      path.join(getRepoRoot(), "assets/premium-video-v1/start-frame.png"),
      "start-frame.png",
      "image",
    );
    const aiVideo = await importMediaFile(
      DEMO_PROJECT_ID,
      path.join(getRepoRoot(), "docs/benchmarks/phase-02-8/generated/original-video.mp4"),
      "original-video.mp4",
      "video",
    );
    const rigVideo = await importMediaFile(
      DEMO_PROJECT_ID,
      path.join(getRepoRoot(), "docs/benchmarks/phase-02-7-gate2/landing-preview.mp4"),
      "landing-preview.mp4",
      "video",
    );
    const rigFrame = await importMediaFile(
      DEMO_PROJECT_ID,
      path.join(getRepoRoot(), "docs/benchmarks/phase-02-7-gate2/selected-frames/frame-000.png"),
      "frame-000.png",
      "image",
    );

    const prompt = await readExperimentPrompt();
    const aiDuration = requiredDuration(aiVideo.media.durationSeconds);
    const rigDuration = requiredDuration(rigVideo.media.durationSeconds);

    const aiIssues = [
      issue(
        AI_WING_ISSUE_ID,
        "anatomy_defect",
        "critical",
        "Far wing temporarily reads as detached near the bird's head around 1.1 s. Source: Phase 2.8 Experiment 1 evaluation; not independently re-verified by Studio.",
        1.1,
        now,
      ),
      issue(
        AI_IDENTITY_ISSUE_ID,
        "character_inconsistency",
        "major",
        "The final perched bird is rounder with a larger eye, shorter beak, and shorter tail than the starting frame. Source: Phase 2.8 Experiment 1 evaluation.",
        2.9,
        now,
      ),
      issue(
        AI_POP_ISSUE_ID,
        "motion_problem",
        "major",
        "A small pose and scale pop occurs near the landing transition at approximately 1.17 s. Source: Phase 2.8 Experiment 1 evaluation.",
        1.17,
        now,
      ),
    ];

    const aiTake: StudioTake = {
      id: AI_TAKE_ID,
      shotId: AI_SHOT_ID,
      takeNumber: 1,
      sourceType: "ai-video",
      mediaId: aiVideo.media.id,
      provider: "Google",
      model: "gemini-omni-1.2-flash",
      generationPrompt: prompt,
      durationSeconds: aiDuration,
      width: aiVideo.media.width,
      height: aiVideo.media.height,
      frameRate: optionalRate(aiVideo.media.frameRate),
      codec: aiVideo.media.codec ?? "h264",
      hasAudio: aiVideo.media.hasAudio,
      fileSizeBytes: aiVideo.media.sizeBytes,
      sha256: aiVideo.media.sha256,
      reviewStatus: "needs_changes",
      reviewHistory: [
        historyEntry(
          "demo-history-ai-import",
          "not_reviewed",
          "Imported from the Phase 2.8 Experiment 1 benchmark.",
          now,
        ),
        historyEntry(
          "demo-history-ai-review",
          "needs_changes",
          "Known defects are seeded from the Phase 2.8 evaluation for demonstration only.",
          now,
        ),
      ],
      issues: aiIssues,
      createdAt: now,
      updatedAt: now,
    };

    const rigTake: StudioTake = {
      id: RIG_TAKE_ID,
      shotId: RIG_SHOT_ID,
      takeNumber: 1,
      sourceType: "deterministic-export",
      mediaId: rigVideo.media.id,
      provider: "Fableon",
      model: "Canvas 2D / Phase 2.7 Gate 2",
      generationPrompt: "",
      durationSeconds: rigDuration,
      width: rigVideo.media.width,
      height: rigVideo.media.height,
      frameRate: optionalRate(rigVideo.media.frameRate),
      codec: rigVideo.media.codec ?? "h264",
      hasAudio: rigVideo.media.hasAudio,
      fileSizeBytes: rigVideo.media.sizeBytes,
      sha256: rigVideo.media.sha256,
      reviewStatus: "needs_changes",
      reviewHistory: [
        historyEntry(
          "demo-history-rig-import",
          "not_reviewed",
          "Imported from the Phase 2.7 Gate 2 deterministic benchmark.",
          now,
        ),
        historyEntry(
          "demo-history-rig-review",
          "needs_changes",
          "Gate 2 candidate artwork and diagnostic background are not approved production art.",
          now,
        ),
      ],
      issues: [
        issue(
          RIG_ART_ISSUE_ID,
          "other",
          "major",
          "Gate 2 artwork has visible seams, low-resolution character detail, and a diagnostic procedural background. Source: Phase 2.7 Gate 2 quality assessment.",
          null,
          now,
        ),
      ],
      createdAt: now,
      updatedAt: now,
    };

    const aiShot: StudioShot = {
      id: AI_SHOT_ID,
      projectId: DEMO_PROJECT_ID,
      title: "Shot 001 — Bird Landing (AI)",
      description:
        "Real Gemini Omni 1.2 Flash take from Phase 2.8 Experiment 1, including known review defects.",
      targetDurationSeconds: 3,
      referenceImageMediaId: startImage.media.id,
      generationPrompt: prompt,
      renderingMethod: "ai-video",
      currentTakeId: AI_TAKE_ID,
      takes: [aiTake],
      createdAt: now,
      updatedAt: now,
    };

    const rigShot: StudioShot = {
      id: RIG_SHOT_ID,
      projectId: DEMO_PROJECT_ID,
      title: "Shot 002 — Bird Landing (Rig)",
      description:
        "Phase 2.7 Gate 2 deterministic export. Candidate artwork, not approved production art.",
      targetDurationSeconds: 2,
      referenceImageMediaId: rigFrame.media.id,
      generationPrompt: "",
      renderingMethod: "deterministic",
      currentTakeId: RIG_TAKE_ID,
      takes: [rigTake],
      createdAt: now,
      updatedAt: now,
    };

    const final: StudioProject = {
      ...base,
      shotOrder: [AI_SHOT_ID, RIG_SHOT_ID],
      media: [startImage.media, aiVideo.media, rigVideo.media, rigFrame.media],
      shots: [aiShot, rigShot],
      regenerationRequests: [
        {
          id: REGENERATION_ID,
          projectId: DEMO_PROJECT_ID,
          shotId: AI_SHOT_ID,
          sourceTakeId: AI_TAKE_ID,
          providerLabel: "Google",
          modelLabel: "gemini-omni-1.2-flash",
          prompt:
            "Regenerate the bird landing with a clean far-wing attachment and stable character identity.",
          startReferenceMediaId: startImage.media.id,
          endReferenceMediaId: null,
          desiredDurationSeconds: 3,
          desiredResolution: "720p",
          preserveInstructions:
            "Preserve the painterly forest, branch, lighting direction, palette, and static camera.",
          changeInstructions:
            "Correct the far-wing attachment and preserve the original character proportions, eye size, and beak shape.",
          defectIssueIds: [AI_WING_ISSUE_ID, AI_IDENTITY_ISSUE_ID, AI_POP_ISSUE_ID],
          budgetCeilingUsd: 0.25,
          status: "ready_for_authorization",
          createdAt: now,
          updatedAt: now,
        },
      ],
      updatedAt: now,
    };

    await writeProject(final);
    return { project: final, created: true };
  } catch (error) {
    await rm(getProjectDir(DEMO_PROJECT_ID), { recursive: true, force: true }).catch(
      () => undefined,
    );
    throw error;
  }
}
