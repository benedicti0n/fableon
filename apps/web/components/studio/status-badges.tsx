import { Badge } from "@/components/ui/badge";

import {
  ISSUE_SEVERITY_LABELS,
  REGENERATION_STATUS_LABELS,
  RENDERING_METHOD_LABELS,
  REVIEW_STATUS_LABELS,
} from "@/lib/studio/model";
import type {
  IssueSeverity,
  RegenerationStatus,
  RenderingMethod,
  ReviewStatus,
} from "@/lib/studio/types";

const reviewVariant: Record<ReviewStatus, "neutral" | "accent" | "muted" | "outline"> = {
  not_reviewed: "muted",
  needs_changes: "outline",
  approved: "accent",
  rejected: "outline",
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return <Badge variant={reviewVariant[status]}>{REVIEW_STATUS_LABELS[status]}</Badge>;
}

export function MethodBadge({ method }: { method: RenderingMethod }) {
  return <Badge variant="outline">{RENDERING_METHOD_LABELS[method]}</Badge>;
}

export function RegenerationStatusBadge({ status }: { status: RegenerationStatus }) {
  return (
    <Badge variant={status === "ready_for_authorization" ? "accent" : "muted"}>
      {REGENERATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function IssueSeverityBadge({ severity }: { severity: IssueSeverity }) {
  return (
    <Badge
      variant={severity === "critical" ? "outline" : "muted"}
      className={severity === "critical" ? "border-clay-500/60 text-clay-500" : ""}
    >
      {ISSUE_SEVERITY_LABELS[severity]}
    </Badge>
  );
}
