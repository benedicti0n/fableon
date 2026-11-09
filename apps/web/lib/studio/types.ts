/**
 * Phase 3 Studio domain contracts.
 *
 * These types are safe to import from both server and client code. They do not
 * contain filesystem paths or provider SDK objects. Persisted references are
 * stable IDs into the project manifest.
 */

export const STUDIO_SCHEMA_VERSION = 1 as const;

export const RENDERING_METHODS = ["ai-video", "deterministic"] as const;
export type RenderingMethod = (typeof RENDERING_METHODS)[number];

export const REVIEW_STATUSES = ["not_reviewed", "needs_changes", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const ISSUE_CATEGORIES = [
  "character_inconsistency",
  "anatomy_defect",
  "temporal_flicker",
  "motion_problem",
  "background_morphing",
  "composition_issue",
  "lighting_issue",
  "audio_issue",
  "other",
] as const;
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_SEVERITIES = ["critical", "major", "minor"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_STATUSES = ["open", "resolved"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const TAKE_SOURCE_TYPES = ["ai-video", "deterministic-export", "imported-video"] as const;
export type TakeSourceType = (typeof TAKE_SOURCE_TYPES)[number];

export const MEDIA_KINDS = ["video", "image"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const REGENERATION_STATUSES = ["draft", "ready_for_authorization", "cancelled"] as const;
export type RegenerationStatus = (typeof REGENERATION_STATUSES)[number];

export interface StudioMediaAsset {
  readonly id: string;
  readonly kind: MediaKind;
  readonly fileName: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly durationSeconds: number | null;
  readonly frameRate: number | null;
  readonly codec: string | null;
  readonly hasAudio: boolean;
  readonly createdAt: string;
}

export interface ReviewIssue {
  readonly id: string;
  readonly category: IssueCategory;
  readonly severity: IssueSeverity;
  readonly description: string;
  readonly timestampSeconds: number | null;
  readonly frameImageMediaId: string | null;
  readonly status: IssueStatus;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

export interface ReviewHistoryEntry {
  readonly id: string;
  readonly status: ReviewStatus;
  readonly note: string;
  readonly createdAt: string;
}

export interface StudioTake {
  readonly id: string;
  readonly shotId: string;
  readonly takeNumber: number;
  readonly sourceType: TakeSourceType;
  readonly mediaId: string;
  readonly provider: string | null;
  readonly model: string | null;
  readonly generationPrompt: string;
  readonly durationSeconds: number;
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
  readonly codec: string;
  readonly hasAudio: boolean;
  readonly fileSizeBytes: number;
  readonly sha256: string;
  readonly reviewStatus: ReviewStatus;
  readonly reviewHistory: readonly ReviewHistoryEntry[];
  readonly issues: readonly ReviewIssue[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StudioShot {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly description: string;
  readonly targetDurationSeconds: number;
  readonly referenceImageMediaId: string | null;
  readonly generationPrompt: string;
  readonly renderingMethod: RenderingMethod;
  readonly currentTakeId: string | null;
  readonly takes: readonly StudioTake[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RegenerationRequest {
  readonly id: string;
  readonly projectId: string;
  readonly shotId: string;
  readonly sourceTakeId: string;
  readonly providerLabel: string;
  readonly modelLabel: string;
  readonly prompt: string;
  readonly startReferenceMediaId: string | null;
  readonly endReferenceMediaId: string | null;
  readonly desiredDurationSeconds: number;
  readonly desiredResolution: string;
  readonly preserveInstructions: string;
  readonly changeInstructions: string;
  readonly defectIssueIds: readonly string[];
  readonly budgetCeilingUsd: number;
  readonly status: RegenerationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StudioProject {
  readonly schemaVersion: typeof STUDIO_SCHEMA_VERSION;
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly targetFrameRate: number;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly shotOrder: readonly string[];
  readonly shots: readonly StudioShot[];
  readonly media: readonly StudioMediaAsset[];
  readonly regenerationRequests: readonly RegenerationRequest[];
  /** Set only for explicitly imported demonstration projects. */
  readonly demoKey: string | null;
}

export interface ProjectSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly shotCount: number;
  readonly approvedShotCount: number;
  readonly needsReviewShotCount: number;
}

export interface CreateProjectInput {
  readonly title: string;
  readonly description: string;
  readonly targetFrameRate: number;
  readonly targetWidth: number;
  readonly targetHeight: number;
}

export interface CreateShotInput {
  readonly title: string;
  readonly description: string;
  readonly targetDurationSeconds: number;
  readonly generationPrompt: string;
  readonly renderingMethod: RenderingMethod;
  readonly referenceImageMediaId: string | null;
}

export interface NewTakeRecord {
  readonly sourceType: TakeSourceType;
  readonly mediaId: string;
  readonly provider: string | null;
  readonly model: string | null;
  readonly generationPrompt: string;
  readonly durationSeconds: number;
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
  readonly codec: string;
  readonly hasAudio: boolean;
  readonly fileSizeBytes: number;
  readonly sha256: string;
}

export interface NewIssueInput {
  readonly category: IssueCategory;
  readonly severity: IssueSeverity;
  readonly description: string;
  readonly timestampSeconds: number | null;
  readonly frameImageMediaId: string | null;
}

export interface NewRegenerationRequestInput {
  readonly sourceTakeId: string;
  readonly providerLabel: string;
  readonly modelLabel: string;
  readonly prompt: string;
  readonly startReferenceMediaId: string | null;
  readonly endReferenceMediaId: string | null;
  readonly desiredDurationSeconds: number;
  readonly desiredResolution: string;
  readonly preserveInstructions: string;
  readonly changeInstructions: string;
  readonly defectIssueIds: readonly string[];
  readonly budgetCeilingUsd: number;
  readonly status: Extract<RegenerationStatus, "draft" | "ready_for_authorization">;
}
