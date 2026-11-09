import { StudioError } from "./errors";
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  MEDIA_KINDS,
  REGENERATION_STATUSES,
  RENDERING_METHODS,
  REVIEW_STATUSES,
  STUDIO_SCHEMA_VERSION,
  TAKE_SOURCE_TYPES,
  type IssueCategory,
  type IssueSeverity,
  type IssueStatus,
  type MediaKind,
  type RegenerationRequest,
  type RegenerationStatus,
  type RenderingMethod,
  type ReviewHistoryEntry,
  type ReviewIssue,
  type ReviewStatus,
  type StudioMediaAsset,
  type StudioProject,
  type StudioShot,
  type StudioTake,
  type TakeSourceType,
} from "./types";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const MEDIA_FILE_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}\.[a-z0-9]{2,8}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function fail(path: string, message: string): never {
  throw new StudioError("invalid_input", `${path}: ${message}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(path, "expected an object");
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(path, "expected an array");
  }
  return value;
}

function string(value: unknown, path: string, options?: { min?: number; max?: number }): string {
  if (typeof value !== "string") {
    fail(path, "expected a string");
  }
  const min = options?.min ?? 0;
  const max = options?.max ?? 10_000;
  if (value.length < min) {
    fail(path, `must be at least ${min} character(s)`);
  }
  if (value.length > max) {
    fail(path, `must be at most ${max} character(s)`);
  }
  return value;
}

function nonEmptyString(value: unknown, path: string, max = 10_000): string {
  return string(value, path, { min: 1, max });
}

function numberValue(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, "expected a finite number");
  }
  return value;
}

function integer(value: unknown, path: string): number {
  const parsed = numberValue(value, path);
  if (!Number.isInteger(parsed)) {
    fail(path, "expected an integer");
  }
  return parsed;
}

function positiveNumber(value: unknown, path: string): number {
  const parsed = numberValue(value, path);
  if (parsed <= 0) {
    fail(path, "must be greater than zero");
  }
  return parsed;
}

function nonNegativeNumber(value: unknown, path: string): number {
  const parsed = numberValue(value, path);
  if (parsed < 0) {
    fail(path, "must be zero or greater");
  }
  return parsed;
}

function positiveInteger(value: unknown, path: string): number {
  const parsed = integer(value, path);
  if (parsed <= 0) {
    fail(path, "must be greater than zero");
  }
  return parsed;
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    fail(path, "expected a boolean");
  }
  return value;
}

function isoDate(value: unknown, path: string): string {
  const parsed = nonEmptyString(value, path, 64);
  if (Number.isNaN(Date.parse(parsed))) {
    fail(path, "expected an ISO date string");
  }
  return parsed;
}

function nullableIsoDate(value: unknown, path: string): string | null {
  if (value === null) return null;
  return isoDate(value, path);
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    fail(path, `expected one of: ${allowed.join(", ")}`);
  }
  return value as T[number];
}

function id(value: unknown, path: string): string {
  const parsed = nonEmptyString(value, path, 64);
  if (!ID_PATTERN.test(parsed)) {
    fail(path, "must be a lowercase alphanumeric ID with optional hyphens");
  }
  return parsed;
}

function nullableId(value: unknown, path: string): string | null {
  if (value === null) return null;
  return id(value, path);
}

function sha256(value: unknown, path: string): string {
  const parsed = nonEmptyString(value, path, 64);
  if (!SHA256_PATTERN.test(parsed)) {
    fail(path, "expected a lowercase SHA-256 hex digest");
  }
  return parsed;
}

function mediaFileName(value: unknown, path: string): string {
  const parsed = nonEmptyString(value, path, 80);
  if (!MEDIA_FILE_PATTERN.test(parsed)) {
    fail(path, "expected a safe media file name");
  }
  return parsed;
}

export function assertStudioId(value: string, path = "id"): string {
  if (!ID_PATTERN.test(value)) {
    fail(path, "must be a lowercase alphanumeric ID with optional hyphens");
  }
  return value;
}

export function assertSafeMediaFileName(value: string, path = "fileName"): string {
  if (!MEDIA_FILE_PATTERN.test(value)) {
    fail(path, "expected a safe media file name");
  }
  return value;
}

function parseMedia(value: unknown, path: string): StudioMediaAsset {
  const item = record(value, path);
  return {
    id: id(item.id, `${path}.id`),
    kind: enumValue<typeof MEDIA_KINDS>(item.kind, MEDIA_KINDS, `${path}.kind`) as MediaKind,
    fileName: mediaFileName(item.fileName, `${path}.fileName`),
    originalName: nonEmptyString(item.originalName, `${path}.originalName`, 255),
    mimeType: nonEmptyString(item.mimeType, `${path}.mimeType`, 100),
    sizeBytes: positiveInteger(item.sizeBytes, `${path}.sizeBytes`),
    sha256: sha256(item.sha256, `${path}.sha256`),
    width: positiveInteger(item.width, `${path}.width`),
    height: positiveInteger(item.height, `${path}.height`),
    durationSeconds:
      item.durationSeconds === null
        ? null
        : positiveNumber(item.durationSeconds, `${path}.durationSeconds`),
    frameRate: item.frameRate === null ? null : positiveNumber(item.frameRate, `${path}.frameRate`),
    codec: item.codec === null ? null : nonEmptyString(item.codec, `${path}.codec`, 80),
    hasAudio: booleanValue(item.hasAudio, `${path}.hasAudio`),
    createdAt: isoDate(item.createdAt, `${path}.createdAt`),
  };
}

function parseReviewHistoryEntry(value: unknown, path: string): ReviewHistoryEntry {
  const item = record(value, path);
  return {
    id: id(item.id, `${path}.id`),
    status: enumValue<typeof REVIEW_STATUSES>(
      item.status,
      REVIEW_STATUSES,
      `${path}.status`,
    ) as ReviewStatus,
    note: string(item.note, `${path}.note`, { max: 2000 }),
    createdAt: isoDate(item.createdAt, `${path}.createdAt`),
  };
}

function parseIssue(value: unknown, path: string): ReviewIssue {
  const item = record(value, path);
  const status = enumValue<typeof ISSUE_STATUSES>(
    item.status,
    ISSUE_STATUSES,
    `${path}.status`,
  ) as IssueStatus;
  const resolvedAt = nullableIsoDate(item.resolvedAt, `${path}.resolvedAt`);
  if (status === "resolved" && resolvedAt === null) {
    fail(`${path}.resolvedAt`, "must be set when the issue is resolved");
  }
  if (status === "open" && resolvedAt !== null) {
    fail(`${path}.resolvedAt`, "must be null while the issue is open");
  }
  return {
    id: id(item.id, `${path}.id`),
    category: enumValue<typeof ISSUE_CATEGORIES>(
      item.category,
      ISSUE_CATEGORIES,
      `${path}.category`,
    ) as IssueCategory,
    severity: enumValue<typeof ISSUE_SEVERITIES>(
      item.severity,
      ISSUE_SEVERITIES,
      `${path}.severity`,
    ) as IssueSeverity,
    description: nonEmptyString(item.description, `${path}.description`, 4000),
    timestampSeconds:
      item.timestampSeconds === null
        ? null
        : nonNegativeNumber(item.timestampSeconds, `${path}.timestampSeconds`),
    frameImageMediaId: nullableId(item.frameImageMediaId, `${path}.frameImageMediaId`),
    status,
    createdAt: isoDate(item.createdAt, `${path}.createdAt`),
    resolvedAt,
  };
}

function parseTake(value: unknown, path: string, shotId: string): StudioTake {
  const item = record(value, path);
  if (id(item.shotId, `${path}.shotId`) !== shotId) {
    fail(`${path}.shotId`, "must match the parent shot");
  }
  return {
    id: id(item.id, `${path}.id`),
    shotId,
    takeNumber: positiveInteger(item.takeNumber, `${path}.takeNumber`),
    sourceType: enumValue<typeof TAKE_SOURCE_TYPES>(
      item.sourceType,
      TAKE_SOURCE_TYPES,
      `${path}.sourceType`,
    ) as TakeSourceType,
    mediaId: id(item.mediaId, `${path}.mediaId`),
    provider:
      item.provider === null ? null : nonEmptyString(item.provider, `${path}.provider`, 120),
    model: item.model === null ? null : nonEmptyString(item.model, `${path}.model`, 160),
    generationPrompt: string(item.generationPrompt, `${path}.generationPrompt`, { max: 20_000 }),
    durationSeconds: positiveNumber(item.durationSeconds, `${path}.durationSeconds`),
    width: positiveInteger(item.width, `${path}.width`),
    height: positiveInteger(item.height, `${path}.height`),
    frameRate: positiveNumber(item.frameRate, `${path}.frameRate`),
    codec: nonEmptyString(item.codec, `${path}.codec`, 80),
    hasAudio: booleanValue(item.hasAudio, `${path}.hasAudio`),
    fileSizeBytes: positiveInteger(item.fileSizeBytes, `${path}.fileSizeBytes`),
    sha256: sha256(item.sha256, `${path}.sha256`),
    reviewStatus: enumValue<typeof REVIEW_STATUSES>(
      item.reviewStatus,
      REVIEW_STATUSES,
      `${path}.reviewStatus`,
    ) as ReviewStatus,
    reviewHistory: array(item.reviewHistory, `${path}.reviewHistory`).map((entry, index) =>
      parseReviewHistoryEntry(entry, `${path}.reviewHistory[${index}]`),
    ),
    issues: array(item.issues, `${path}.issues`).map((issue, index) =>
      parseIssue(issue, `${path}.issues[${index}]`),
    ),
    createdAt: isoDate(item.createdAt, `${path}.createdAt`),
    updatedAt: isoDate(item.updatedAt, `${path}.updatedAt`),
  };
}

function parseShot(value: unknown, path: string, projectId: string): StudioShot {
  const item = record(value, path);
  if (id(item.projectId, `${path}.projectId`) !== projectId) {
    fail(`${path}.projectId`, "must match the parent project");
  }
  const shotId = id(item.id, `${path}.id`);
  const takes = array(item.takes, `${path}.takes`).map((take, index) =>
    parseTake(take, `${path}.takes[${index}]`, shotId),
  );
  const currentTakeId = nullableId(item.currentTakeId, `${path}.currentTakeId`);
  if (currentTakeId !== null && !takes.some((take) => take.id === currentTakeId)) {
    fail(`${path}.currentTakeId`, "must reference a take in this shot");
  }
  return {
    id: shotId,
    projectId,
    title: nonEmptyString(item.title, `${path}.title`, 240),
    description: string(item.description, `${path}.description`, { max: 4000 }),
    targetDurationSeconds: positiveNumber(
      item.targetDurationSeconds,
      `${path}.targetDurationSeconds`,
    ),
    referenceImageMediaId: nullableId(item.referenceImageMediaId, `${path}.referenceImageMediaId`),
    generationPrompt: string(item.generationPrompt, `${path}.generationPrompt`, { max: 20_000 }),
    renderingMethod: enumValue<typeof RENDERING_METHODS>(
      item.renderingMethod,
      RENDERING_METHODS,
      `${path}.renderingMethod`,
    ) as RenderingMethod,
    currentTakeId,
    takes,
    createdAt: isoDate(item.createdAt, `${path}.createdAt`),
    updatedAt: isoDate(item.updatedAt, `${path}.updatedAt`),
  };
}

function parseRegenerationRequest(
  value: unknown,
  path: string,
  projectId: string,
): RegenerationRequest {
  const item = record(value, path);
  if (id(item.projectId, `${path}.projectId`) !== projectId) {
    fail(`${path}.projectId`, "must match the parent project");
  }
  return {
    id: id(item.id, `${path}.id`),
    projectId,
    shotId: id(item.shotId, `${path}.shotId`),
    sourceTakeId: id(item.sourceTakeId, `${path}.sourceTakeId`),
    providerLabel: nonEmptyString(item.providerLabel, `${path}.providerLabel`, 120),
    modelLabel: nonEmptyString(item.modelLabel, `${path}.modelLabel`, 160),
    prompt: string(item.prompt, `${path}.prompt`, { max: 20_000 }),
    startReferenceMediaId: nullableId(item.startReferenceMediaId, `${path}.startReferenceMediaId`),
    endReferenceMediaId: nullableId(item.endReferenceMediaId, `${path}.endReferenceMediaId`),
    desiredDurationSeconds: positiveNumber(
      item.desiredDurationSeconds,
      `${path}.desiredDurationSeconds`,
    ),
    desiredResolution: nonEmptyString(item.desiredResolution, `${path}.desiredResolution`, 80),
    preserveInstructions: string(item.preserveInstructions, `${path}.preserveInstructions`, {
      max: 8000,
    }),
    changeInstructions: string(item.changeInstructions, `${path}.changeInstructions`, {
      max: 8000,
    }),
    defectIssueIds: array(item.defectIssueIds, `${path}.defectIssueIds`).map((issueId, index) =>
      id(issueId, `${path}.defectIssueIds[${index}]`),
    ),
    budgetCeilingUsd: nonNegativeNumber(item.budgetCeilingUsd, `${path}.budgetCeilingUsd`),
    status: enumValue<typeof REGENERATION_STATUSES>(
      item.status,
      REGENERATION_STATUSES,
      `${path}.status`,
    ) as RegenerationStatus,
    createdAt: isoDate(item.createdAt, `${path}.createdAt`),
    updatedAt: isoDate(item.updatedAt, `${path}.updatedAt`),
  };
}

export function parseProjectDocument(value: unknown): StudioProject {
  const root = record(value, "project");
  const schemaVersion = integer(root.schemaVersion, "project.schemaVersion");
  if (schemaVersion !== STUDIO_SCHEMA_VERSION) {
    fail("project.schemaVersion", `unsupported schema version ${schemaVersion}`);
  }
  const projectId = id(root.id, "project.id");
  const media = array(root.media, "project.media").map((item, index) =>
    parseMedia(item, `project.media[${index}]`),
  );
  const mediaById = new Map(media.map((item) => [item.id, item]));
  if (mediaById.size !== media.length) {
    fail("project.media", "contains duplicate media IDs");
  }

  const shots = array(root.shots, "project.shots").map((item, index) =>
    parseShot(item, `project.shots[${index}]`, projectId),
  );
  const shotById = new Map(shots.map((shot) => [shot.id, shot]));
  if (shotById.size !== shots.length) {
    fail("project.shots", "contains duplicate shot IDs");
  }

  const shotOrder = array(root.shotOrder, "project.shotOrder").map((item, index) =>
    id(item, `project.shotOrder[${index}]`),
  );
  if (shotOrder.length !== shots.length) {
    fail("project.shotOrder", "must contain every shot exactly once");
  }
  const orderSet = new Set(shotOrder);
  if (orderSet.size !== shotOrder.length) {
    fail("project.shotOrder", "contains duplicate shot IDs");
  }
  for (const shotId of shotOrder) {
    if (!shotById.has(shotId)) {
      fail("project.shotOrder", `references unknown shot ${shotId}`);
    }
  }

  const takeById = new Map<string, StudioTake>();
  for (const shot of shots) {
    if (shot.referenceImageMediaId !== null) {
      const mediaItem = mediaById.get(shot.referenceImageMediaId);
      if (!mediaItem || mediaItem.kind !== "image") {
        fail(
          `project.shots.${shot.id}.referenceImageMediaId`,
          "must reference an image media asset",
        );
      }
    }
    for (const take of shot.takes) {
      if (takeById.has(take.id)) {
        fail("project.shots", `duplicate take ID ${take.id}`);
      }
      takeById.set(take.id, take);
      const mediaItem = mediaById.get(take.mediaId);
      if (!mediaItem || mediaItem.kind !== "video") {
        fail(`project.shots.${shot.id}.takes.${take.id}.mediaId`, "must reference a video asset");
      }
      for (const issue of take.issues) {
        if (issue.frameImageMediaId !== null) {
          const issueMedia = mediaById.get(issue.frameImageMediaId);
          if (!issueMedia || issueMedia.kind !== "image") {
            fail(
              `project.shots.${shot.id}.takes.${take.id}.issues.${issue.id}.frameImageMediaId`,
              "must reference an image media asset",
            );
          }
        }
        if (
          issue.timestampSeconds !== null &&
          issue.timestampSeconds > take.durationSeconds + 0.05
        ) {
          fail(
            `project.shots.${shot.id}.takes.${take.id}.issues.${issue.id}.timestampSeconds`,
            "must fall within the take duration",
          );
        }
      }
    }
  }

  const regenerationRequests = array(root.regenerationRequests, "project.regenerationRequests").map(
    (item, index) =>
      parseRegenerationRequest(item, `project.regenerationRequests[${index}]`, projectId),
  );
  const regenerationIds = new Set<string>();
  for (const request of regenerationRequests) {
    if (regenerationIds.has(request.id)) {
      fail("project.regenerationRequests", `duplicate request ID ${request.id}`);
    }
    regenerationIds.add(request.id);
    const shot = shotById.get(request.shotId);
    if (!shot) {
      fail(
        `project.regenerationRequests.${request.id}.shotId`,
        "must reference a shot in this project",
      );
    }
    const sourceTake = takeById.get(request.sourceTakeId);
    if (!sourceTake || sourceTake.shotId !== shot.id) {
      fail(
        `project.regenerationRequests.${request.id}.sourceTakeId`,
        "must reference a take in the target shot",
      );
    }
    for (const issueId of request.defectIssueIds) {
      if (!sourceTake.issues.some((issue) => issue.id === issueId)) {
        fail(
          `project.regenerationRequests.${request.id}.defectIssueIds`,
          `references unknown issue ${issueId}`,
        );
      }
    }
    for (const referenceId of [request.startReferenceMediaId, request.endReferenceMediaId]) {
      if (referenceId !== null) {
        const mediaItem = mediaById.get(referenceId);
        if (!mediaItem || mediaItem.kind !== "image") {
          fail(
            `project.regenerationRequests.${request.id}`,
            "reference media must be an image asset",
          );
        }
      }
    }
  }

  const demoKey =
    root.demoKey === null ? null : nonEmptyString(root.demoKey, "project.demoKey", 120);

  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    id: projectId,
    title: nonEmptyString(root.title, "project.title", 240),
    description: string(root.description, "project.description", { max: 4000 }),
    createdAt: isoDate(root.createdAt, "project.createdAt"),
    updatedAt: isoDate(root.updatedAt, "project.updatedAt"),
    targetFrameRate: positiveNumber(root.targetFrameRate, "project.targetFrameRate"),
    targetWidth: positiveInteger(root.targetWidth, "project.targetWidth"),
    targetHeight: positiveInteger(root.targetHeight, "project.targetHeight"),
    shotOrder,
    shots,
    media,
    regenerationRequests,
    demoKey,
  };
}
