import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { StudioError } from "./errors";
import { getShotReviewStatus } from "./model";
import { assertSafeMediaFileName, assertStudioId, parseProjectDocument } from "./validation";
import {
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  REGENERATION_STATUSES,
  REVIEW_STATUSES,
  RENDERING_METHODS,
  STUDIO_SCHEMA_VERSION,
  type CreateProjectInput,
  type CreateShotInput,
  type IssueCategory,
  type IssueSeverity,
  type IssueStatus,
  type NewIssueInput,
  type NewRegenerationRequestInput,
  type NewTakeRecord,
  type ProjectSummary,
  type RegenerationStatus,
  type RenderingMethod,
  type ReviewStatus,
  type StudioProject,
  type StudioShot,
  type StudioTake,
} from "./types";

const projectLocks = new Map<string, Promise<unknown>>();
let cachedRepoRoot: string | null = null;

export function nowIso(): string {
  return new Date().toISOString();
}

export function getRepoRoot(): string {
  if (cachedRepoRoot) return cachedRepoRoot;
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, "pnpm-workspace.yaml"))) {
      cachedRepoRoot = current;
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      cachedRepoRoot = process.cwd();
      return cachedRepoRoot;
    }
    current = parent;
  }
}

export function getDataRoot(): string {
  const override = process.env["FABLEON_DATA_DIR"];
  if (override && override.trim().length > 0) {
    return path.resolve(override);
  }
  return path.join(getRepoRoot(), ".fableon-data");
}

export function getProjectsRoot(): string {
  return path.join(getDataRoot(), "projects");
}

export function getProjectDir(projectId: string): string {
  assertStudioId(projectId, "projectId");
  return path.join(getProjectsRoot(), projectId);
}

export function getProjectFile(projectId: string): string {
  return path.join(getProjectDir(projectId), "project.json");
}

export function getProjectMediaDir(projectId: string): string {
  return path.join(getProjectDir(projectId), "media");
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export function withProjectLock<T>(projectId: string, task: () => Promise<T>): Promise<T> {
  const previous = projectLocks.get(projectId) ?? Promise.resolve();
  const run = previous.then(task, task);
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  projectLocks.set(projectId, settled);
  void settled.finally(() => {
    if (projectLocks.get(projectId) === settled) {
      projectLocks.delete(projectId);
    }
  });
  return run;
}

async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function writeProject(project: StudioProject): Promise<void> {
  const validated = parseProjectDocument(project);
  await atomicWriteJson(getProjectFile(validated.id), validated);
}

export async function readProject(projectId: string): Promise<StudioProject> {
  assertStudioId(projectId, "projectId");
  let raw: string;
  try {
    raw = await readFile(getProjectFile(projectId), "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new StudioError("not_found", `Project ${projectId} does not exist.`);
    }
    throw new StudioError("storage_corrupt", `Project ${projectId} could not be read.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new StudioError(
      "storage_corrupt",
      `Project ${projectId} contains invalid JSON. It was not repaired or overwritten.`,
    );
  }

  try {
    return parseProjectDocument(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new StudioError(
      "storage_corrupt",
      `Project ${projectId} metadata is invalid: ${message}. It was not repaired or overwritten.`,
    );
  }
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}

function summarizeProject(project: StudioProject): ProjectSummary {
  const approved = project.shots.filter((shot) => getShotReviewStatus(shot) === "approved").length;
  const needsReview = project.shots.filter((shot) => {
    const status = getShotReviewStatus(shot);
    return status !== "approved";
  }).length;
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    shotCount: project.shots.length,
    approvedShotCount: approved,
    needsReviewShotCount: needsReview,
  };
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const projectsRoot = getProjectsRoot();
  let entries;
  try {
    entries = await readdir(projectsRoot, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const summaries: ProjectSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const project = await readProject(entry.name);
    summaries.push(summarizeProject(project));
  }
  return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createProject(input: CreateProjectInput): Promise<StudioProject> {
  if (input.title.trim().length === 0) {
    throw new StudioError("invalid_input", "Project title is required.");
  }
  const now = nowIso();
  const project: StudioProject = {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    id: randomUUID(),
    title: input.title.trim(),
    description: input.description.trim(),
    createdAt: now,
    updatedAt: now,
    targetFrameRate: input.targetFrameRate,
    targetWidth: input.targetWidth,
    targetHeight: input.targetHeight,
    shotOrder: [],
    shots: [],
    media: [],
    regenerationRequests: [],
    demoKey: null,
  };
  await writeProject(project);
  return project;
}

async function mutateProject(
  projectId: string,
  mutate: (project: StudioProject, now: string) => StudioProject,
): Promise<StudioProject> {
  return withProjectLock(projectId, async () => {
    const project = await readProject(projectId);
    const updated = mutate(project, nowIso());
    const stamped: StudioProject = { ...updated, updatedAt: updated.updatedAt };
    await writeProject(stamped);
    return stamped;
  });
}

export interface ProjectMetadataPatch {
  readonly title?: string;
  readonly description?: string;
  readonly targetFrameRate?: number;
  readonly targetWidth?: number;
  readonly targetHeight?: number;
}

export async function updateProjectMetadata(
  projectId: string,
  patch: ProjectMetadataPatch,
): Promise<StudioProject> {
  return mutateProject(projectId, (project, now) => ({
    ...project,
    title: patch.title === undefined ? project.title : patch.title.trim(),
    description: patch.description === undefined ? project.description : patch.description.trim(),
    targetFrameRate: patch.targetFrameRate ?? project.targetFrameRate,
    targetWidth: patch.targetWidth ?? project.targetWidth,
    targetHeight: patch.targetHeight ?? project.targetHeight,
    updatedAt: now,
  }));
}

export async function reorderShots(
  projectId: string,
  shotOrder: readonly string[],
): Promise<StudioProject> {
  return mutateProject(projectId, (project, now) => {
    const currentIds = new Set(project.shots.map((shot) => shot.id));
    const nextIds = new Set(shotOrder);
    if (
      shotOrder.length !== project.shots.length ||
      nextIds.size !== shotOrder.length ||
      [...currentIds].some((id) => !nextIds.has(id))
    ) {
      throw new StudioError("invalid_input", "Shot order must contain every shot exactly once.");
    }
    return { ...project, shotOrder: [...shotOrder], updatedAt: now };
  });
}

function findShot(project: StudioProject, shotId: string): StudioShot {
  const shot = project.shots.find((item) => item.id === shotId);
  if (!shot) {
    throw new StudioError("not_found", `Shot ${shotId} does not exist in this project.`);
  }
  return shot;
}

function findTake(shot: StudioShot, takeId: string): StudioTake {
  const take = shot.takes.find((item) => item.id === takeId);
  if (!take) {
    throw new StudioError("not_found", `Take ${takeId} does not exist in this shot.`);
  }
  return take;
}

export async function addShot(projectId: string, input: CreateShotInput): Promise<StudioProject> {
  return mutateProject(projectId, (project, now) => {
    if (input.title.trim().length === 0) {
      throw new StudioError("invalid_input", "Shot title is required.");
    }
    if (input.renderingMethod !== undefined && !RENDERING_METHODS.includes(input.renderingMethod)) {
      throw new StudioError("invalid_input", "Invalid rendering method.");
    }
    if (input.referenceImageMediaId !== null) {
      const media = project.media.find((item) => item.id === input.referenceImageMediaId);
      if (!media || media.kind !== "image") {
        throw new StudioError("invalid_input", "Reference image must be an image asset.");
      }
    }
    const shot: StudioShot = {
      id: randomUUID(),
      projectId,
      title: input.title.trim(),
      description: input.description.trim(),
      targetDurationSeconds: input.targetDurationSeconds,
      referenceImageMediaId: input.referenceImageMediaId,
      generationPrompt: input.generationPrompt,
      renderingMethod: input.renderingMethod,
      currentTakeId: null,
      takes: [],
      createdAt: now,
      updatedAt: now,
    };
    return {
      ...project,
      shots: [...project.shots, shot],
      shotOrder: [...project.shotOrder, shot.id],
      updatedAt: now,
    };
  });
}

export interface ShotPatch {
  readonly title?: string;
  readonly description?: string;
  readonly targetDurationSeconds?: number;
  readonly generationPrompt?: string;
  readonly renderingMethod?: RenderingMethod;
  readonly referenceImageMediaId?: string | null;
  readonly currentTakeId?: string | null;
}

export async function updateShot(
  projectId: string,
  shotId: string,
  patch: ShotPatch,
): Promise<StudioProject> {
  return mutateProject(projectId, (project, now) => {
    const shot = findShot(project, shotId);
    if (patch.referenceImageMediaId !== undefined && patch.referenceImageMediaId !== null) {
      const media = project.media.find((item) => item.id === patch.referenceImageMediaId);
      if (!media || media.kind !== "image") {
        throw new StudioError("invalid_input", "Reference image must be an image asset.");
      }
    }
    if (patch.currentTakeId !== undefined && patch.currentTakeId !== null) {
      findTake(shot, patch.currentTakeId);
    }
    const updated: StudioShot = {
      ...shot,
      title: patch.title === undefined ? shot.title : patch.title.trim(),
      description: patch.description === undefined ? shot.description : patch.description.trim(),
      targetDurationSeconds: patch.targetDurationSeconds ?? shot.targetDurationSeconds,
      generationPrompt: patch.generationPrompt ?? shot.generationPrompt,
      renderingMethod: patch.renderingMethod ?? shot.renderingMethod,
      referenceImageMediaId:
        patch.referenceImageMediaId === undefined
          ? shot.referenceImageMediaId
          : patch.referenceImageMediaId,
      currentTakeId: patch.currentTakeId === undefined ? shot.currentTakeId : patch.currentTakeId,
      updatedAt: now,
    };
    return {
      ...project,
      shots: project.shots.map((item) => (item.id === shotId ? updated : item)),
      updatedAt: now,
    };
  });
}

export async function addTake(
  projectId: string,
  shotId: string,
  input: NewTakeRecord,
): Promise<StudioProject> {
  return mutateProject(projectId, (project, now) => {
    const shot = findShot(project, shotId);
    const media = project.media.find((item) => item.id === input.mediaId);
    if (!media || media.kind !== "video") {
      throw new StudioError("invalid_input", "Take media must be a video asset.");
    }
    if (shot.takes.some((take) => take.mediaId === input.mediaId)) {
      throw new StudioError("conflict", "That video is already a take for this shot.");
    }
    const takeNumber =
      shot.takes.reduce((highest, take) => Math.max(highest, take.takeNumber), 0) + 1;
    const take: StudioTake = {
      id: randomUUID(),
      shotId,
      takeNumber,
      sourceType: input.sourceType,
      mediaId: input.mediaId,
      provider: input.provider,
      model: input.model,
      generationPrompt: input.generationPrompt,
      durationSeconds: input.durationSeconds,
      width: input.width,
      height: input.height,
      frameRate: input.frameRate,
      codec: input.codec,
      hasAudio: input.hasAudio,
      fileSizeBytes: input.fileSizeBytes,
      sha256: input.sha256,
      reviewStatus: "not_reviewed",
      reviewHistory: [],
      issues: [],
      createdAt: now,
      updatedAt: now,
    };
    const updated: StudioShot = {
      ...shot,
      currentTakeId: take.id,
      takes: [...shot.takes, take],
      updatedAt: now,
    };
    return {
      ...project,
      shots: project.shots.map((item) => (item.id === shotId ? updated : item)),
      updatedAt: now,
    };
  });
}

export async function selectTake(
  projectId: string,
  shotId: string,
  takeId: string,
): Promise<StudioProject> {
  return updateShot(projectId, shotId, { currentTakeId: takeId });
}

export async function setTakeReview(
  projectId: string,
  shotId: string,
  takeId: string,
  status: ReviewStatus,
  note: string,
  confirmCriticalIssues: boolean,
): Promise<StudioProject> {
  if (!REVIEW_STATUSES.includes(status)) {
    throw new StudioError("invalid_input", "Invalid review status.");
  }
  return mutateProject(projectId, (project, now) => {
    const shot = findShot(project, shotId);
    const take = findTake(shot, takeId);
    const criticalIssues = take.issues.filter(
      (issue) => issue.status === "open" && issue.severity === "critical",
    );
    if (status === "approved" && criticalIssues.length > 0 && !confirmCriticalIssues) {
      throw new StudioError(
        "approval_requires_confirmation",
        "This take has unresolved critical issues. Confirm approval explicitly to continue.",
        {
          issues: criticalIssues.map((issue) => ({
            id: issue.id,
            description: issue.description,
          })),
        },
      );
    }
    const changed = take.reviewStatus !== status || note.trim().length > 0;
    const history = changed
      ? [
          ...take.reviewHistory,
          {
            id: randomUUID(),
            status,
            note: note.trim(),
            createdAt: now,
          },
        ]
      : take.reviewHistory;
    const updatedTake: StudioTake = {
      ...take,
      reviewStatus: status,
      reviewHistory: history,
      updatedAt: now,
    };
    const updatedShot: StudioShot = {
      ...shot,
      takes: shot.takes.map((item) => (item.id === takeId ? updatedTake : item)),
      updatedAt: now,
    };
    return {
      ...project,
      shots: project.shots.map((item) => (item.id === shotId ? updatedShot : item)),
      updatedAt: now,
    };
  });
}

export async function addIssue(
  projectId: string,
  shotId: string,
  takeId: string,
  input: NewIssueInput,
): Promise<StudioProject> {
  return mutateProject(projectId, (project, now) => {
    const shot = findShot(project, shotId);
    const take = findTake(shot, takeId);
    if (input.timestampSeconds !== null && input.timestampSeconds > take.durationSeconds + 0.05) {
      throw new StudioError("invalid_input", "Issue timestamp must fall within the take.");
    }
    if (input.frameImageMediaId !== null) {
      const media = project.media.find((item) => item.id === input.frameImageMediaId);
      if (!media || media.kind !== "image") {
        throw new StudioError("invalid_input", "Issue frame image must be an image asset.");
      }
    }
    const issue = {
      id: randomUUID(),
      category: input.category,
      severity: input.severity,
      description: input.description.trim(),
      timestampSeconds: input.timestampSeconds,
      frameImageMediaId: input.frameImageMediaId,
      status: "open" as const,
      createdAt: now,
      resolvedAt: null,
    };
    const updatedTake: StudioTake = {
      ...take,
      issues: [...take.issues, issue],
      updatedAt: now,
    };
    const updatedShot: StudioShot = {
      ...shot,
      takes: shot.takes.map((item) => (item.id === takeId ? updatedTake : item)),
      updatedAt: now,
    };
    return {
      ...project,
      shots: project.shots.map((item) => (item.id === shotId ? updatedShot : item)),
      updatedAt: now,
    };
  });
}

export interface IssuePatch {
  readonly category?: IssueCategory;
  readonly severity?: IssueSeverity;
  readonly description?: string;
  readonly timestampSeconds?: number | null;
  readonly status?: IssueStatus;
}

export async function updateIssue(
  projectId: string,
  shotId: string,
  takeId: string,
  issueId: string,
  patch: IssuePatch,
): Promise<StudioProject> {
  return mutateProject(projectId, (project, now) => {
    const shot = findShot(project, shotId);
    const take = findTake(shot, takeId);
    const issue = take.issues.find((item) => item.id === issueId);
    if (!issue) {
      throw new StudioError("not_found", `Issue ${issueId} does not exist in this take.`);
    }
    if (patch.status !== undefined && !ISSUE_STATUSES.includes(patch.status)) {
      throw new StudioError("invalid_input", "Invalid issue status.");
    }
    if (patch.severity !== undefined && !ISSUE_SEVERITIES.includes(patch.severity)) {
      throw new StudioError("invalid_input", "Invalid issue severity.");
    }
    const nextTimestamp =
      patch.timestampSeconds === undefined ? issue.timestampSeconds : patch.timestampSeconds;
    if (nextTimestamp !== null && nextTimestamp > take.durationSeconds + 0.05) {
      throw new StudioError("invalid_input", "Issue timestamp must fall within the take.");
    }
    const nextStatus = patch.status ?? issue.status;
    const updatedIssue = {
      ...issue,
      category: patch.category ?? issue.category,
      severity: patch.severity ?? issue.severity,
      description: patch.description === undefined ? issue.description : patch.description.trim(),
      timestampSeconds: nextTimestamp,
      status: nextStatus,
      resolvedAt:
        nextStatus === "open"
          ? null
          : nextStatus === "resolved"
            ? (issue.resolvedAt ?? now)
            : issue.resolvedAt,
    };
    const updatedTake: StudioTake = {
      ...take,
      issues: take.issues.map((item) => (item.id === issueId ? updatedIssue : item)),
      updatedAt: now,
    };
    const updatedShot: StudioShot = {
      ...shot,
      takes: shot.takes.map((item) => (item.id === takeId ? updatedTake : item)),
      updatedAt: now,
    };
    return {
      ...project,
      shots: project.shots.map((item) => (item.id === shotId ? updatedShot : item)),
      updatedAt: now,
    };
  });
}

export async function createRegenerationRequest(
  projectId: string,
  shotId: string,
  input: NewRegenerationRequestInput,
): Promise<StudioProject> {
  return mutateProject(projectId, (project, now) => {
    const shot = findShot(project, shotId);
    const sourceTake = findTake(shot, input.sourceTakeId);
    for (const issueId of input.defectIssueIds) {
      if (!sourceTake.issues.some((issue) => issue.id === issueId)) {
        throw new StudioError("invalid_input", "Defect references must belong to the source take.");
      }
    }
    for (const referenceId of [input.startReferenceMediaId, input.endReferenceMediaId]) {
      if (referenceId !== null) {
        const media = project.media.find((item) => item.id === referenceId);
        if (!media || media.kind !== "image") {
          throw new StudioError("invalid_input", "Reference media must be an image asset.");
        }
      }
    }
    const request = {
      id: randomUUID(),
      projectId,
      shotId,
      sourceTakeId: input.sourceTakeId,
      providerLabel: input.providerLabel.trim(),
      modelLabel: input.modelLabel.trim(),
      prompt: input.prompt,
      startReferenceMediaId: input.startReferenceMediaId,
      endReferenceMediaId: input.endReferenceMediaId,
      desiredDurationSeconds: input.desiredDurationSeconds,
      desiredResolution: input.desiredResolution.trim(),
      preserveInstructions: input.preserveInstructions,
      changeInstructions: input.changeInstructions,
      defectIssueIds: [...input.defectIssueIds],
      budgetCeilingUsd: input.budgetCeilingUsd,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    };
    return {
      ...project,
      regenerationRequests: [...project.regenerationRequests, request],
      updatedAt: now,
    };
  });
}

export async function updateRegenerationRequestStatus(
  projectId: string,
  requestId: string,
  status: RegenerationStatus,
): Promise<StudioProject> {
  if (!REGENERATION_STATUSES.includes(status)) {
    throw new StudioError("invalid_input", "Invalid regeneration request status.");
  }
  return mutateProject(projectId, (project, now) => {
    const request = project.regenerationRequests.find((item) => item.id === requestId);
    if (!request) {
      throw new StudioError("not_found", `Regeneration request ${requestId} does not exist.`);
    }
    return {
      ...project,
      regenerationRequests: project.regenerationRequests.map((item) =>
        item.id === requestId ? { ...item, status, updatedAt: now } : item,
      ),
      updatedAt: now,
    };
  });
}

export async function mediaFileExists(projectId: string, fileName: string): Promise<boolean> {
  assertSafeMediaFileName(fileName);
  try {
    const info = await stat(path.join(getProjectMediaDir(projectId), fileName));
    return info.isFile();
  } catch {
    return false;
  }
}

export { summarizeProject };
