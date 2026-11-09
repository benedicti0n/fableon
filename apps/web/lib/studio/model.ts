import type {
  IssueCategory,
  IssueSeverity,
  RegenerationStatus,
  RenderingMethod,
  ReviewIssue,
  ReviewStatus,
  StudioShot,
  StudioTake,
} from "./types";

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  not_reviewed: "Not reviewed",
  needs_changes: "Needs changes",
  approved: "Approved",
  rejected: "Rejected",
};

export const RENDERING_METHOD_LABELS: Record<RenderingMethod, string> = {
  "ai-video": "AI video",
  deterministic: "Deterministic",
};

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  character_inconsistency: "Character inconsistency",
  anatomy_defect: "Anatomy defect",
  temporal_flicker: "Temporal flicker",
  motion_problem: "Motion problem",
  background_morphing: "Background morphing",
  composition_issue: "Composition issue",
  lighting_issue: "Lighting issue",
  audio_issue: "Audio issue",
  other: "Other",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
};

export const REGENERATION_STATUS_LABELS: Record<RegenerationStatus, string> = {
  draft: "Draft",
  ready_for_authorization: "Ready for authorization",
  cancelled: "Cancelled",
};

export function getCurrentTake(shot: StudioShot): StudioTake | null {
  if (shot.currentTakeId === null) return null;
  return shot.takes.find((take) => take.id === shot.currentTakeId) ?? null;
}

export function getShotReviewStatus(shot: StudioShot): ReviewStatus {
  return getCurrentTake(shot)?.reviewStatus ?? "not_reviewed";
}

export function countOpenIssues(take: StudioTake, severity?: IssueSeverity): number {
  return take.issues.filter(
    (issue) => issue.status === "open" && (severity === undefined || issue.severity === severity),
  ).length;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return minutes > 0
    ? `${minutes}:${remaining.toFixed(2).padStart(5, "0")}`
    : `${remaining.toFixed(2)} s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function mediaUrl(projectId: string, mediaId: string): string {
  return `/api/studio/media/${encodeURIComponent(mediaId)}?projectId=${encodeURIComponent(projectId)}`;
}

export function issueGuidance(issue: ReviewIssue): string {
  const correction = issue.description.trim();
  switch (issue.category) {
    case "character_inconsistency":
      return `Preserve the approved character identity and correct: ${correction}`;
    case "anatomy_defect":
      return `Preserve natural anatomy and correct the attachment or anatomy issue: ${correction}`;
    case "temporal_flicker":
      return `Maintain temporal stability and remove the flicker or popping: ${correction}`;
    case "motion_problem":
      return `Keep the motion physically plausible and correct: ${correction}`;
    case "background_morphing":
      return `Preserve the background geometry and correct the morphing: ${correction}`;
    case "composition_issue":
      return `Preserve the intended composition and correct: ${correction}`;
    case "lighting_issue":
      return `Preserve the lighting direction and correct: ${correction}`;
    case "audio_issue":
      return `Preserve the intended audio and correct: ${correction}`;
    case "other":
      return `Correct: ${correction}`;
  }
}

export function buildRegenerationGuidance(issues: readonly ReviewIssue[]): string {
  if (issues.length === 0) return "";
  return issues.map((issue) => `- ${issueGuidance(issue)}`).join("\n");
}
