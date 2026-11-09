"use client";

/* eslint-disable @next/next/no-img-element -- issue screenshots are local media served through a constrained API route. */

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { studioPatchJson, studioPostJson, studioUpload, StudioApiError } from "@/lib/studio/client";
import {
  ISSUE_CATEGORY_LABELS,
  ISSUE_SEVERITY_LABELS,
  REVIEW_STATUS_LABELS,
  countOpenIssues,
  formatDateTime,
  mediaUrl,
} from "@/lib/studio/model";
import type { ReviewStatus, StudioMediaAsset, StudioProject, StudioTake } from "@/lib/studio/types";

import { IssueSeverityBadge, ReviewStatusBadge } from "./status-badges";
import {
  studioDangerButtonClassName,
  studioInputClassName,
  studioLabelClassName,
  studioPrimaryButtonClassName,
  studioReadonlyClassName,
  studioSecondaryButtonClassName,
  studioSelectClassName,
  studioTextareaClassName,
} from "./ui";

interface ReviewPanelProps {
  readonly projectId: string;
  readonly shotId: string;
  readonly take: StudioTake;
  readonly onUpdated: (project: StudioProject) => void;
}

const REVIEW_ACTIONS: readonly { readonly status: ReviewStatus; readonly label: string }[] = [
  { status: "not_reviewed", label: "Mark not reviewed" },
  { status: "needs_changes", label: "Needs changes" },
  { status: "approved", label: "Approve take" },
  { status: "rejected", label: "Reject take" },
];

export function ReviewPanel({ projectId, shotId, take, onUpdated }: ReviewPanelProps) {
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const criticalOpen = countOpenIssues(take, "critical");

  async function changeStatus(status: ReviewStatus): Promise<void> {
    if (status === "approved" && criticalOpen > 0 && !acknowledged) {
      setError(
        `This take has ${criticalOpen} unresolved critical issue(s). Acknowledge them before approving.`,
      );
      return;
    }
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await studioPatchJson<{ project: StudioProject }>(
        `/api/studio/projects/${projectId}/shots/${shotId}/takes/${take.id}`,
        {
          reviewStatus: status,
          note,
          confirmCriticalIssues: acknowledged,
        },
      );
      onUpdated(response.project);
      setNote("");
      setMessage(`Review status saved: ${REVIEW_STATUS_LABELS[status]}.`);
    } catch (saveError) {
      setError(
        saveError instanceof StudioApiError
          ? saveError.message
          : "The review status could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function addIssue(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      let frameImageMediaId: string | null = null;
      const screenshot = form.get("screenshot");
      if (screenshot instanceof File && screenshot.size > 0) {
        const uploadForm = new FormData();
        uploadForm.set("file", screenshot);
        const upload = await studioUpload<{ media: StudioMediaAsset }>(
          `/api/studio/projects/${projectId}/media`,
          uploadForm,
        );
        frameImageMediaId = upload.media.id;
      }
      const timestampRaw = String(form.get("timestampSeconds") ?? "").trim();
      const response = await studioPostJson<{ project: StudioProject }>(
        `/api/studio/projects/${projectId}/shots/${shotId}/takes/${take.id}/issues`,
        {
          category: String(form.get("category") ?? "other"),
          severity: String(form.get("severity") ?? "major"),
          description: String(form.get("description") ?? ""),
          timestampSeconds: timestampRaw.length > 0 ? Number(timestampRaw) : null,
          frameImageMediaId,
        },
      );
      onUpdated(response.project);
      formElement.reset();
      setMessage("Issue added to this take.");
    } catch (issueError) {
      setError(
        issueError instanceof StudioApiError ? issueError.message : "The issue could not be added.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleIssue(issueId: string, status: "open" | "resolved"): Promise<void> {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await studioPatchJson<{ project: StudioProject }>(
        `/api/studio/projects/${projectId}/shots/${shotId}/takes/${take.id}/issues/${issueId}`,
        { status },
      );
      onUpdated(response.project);
      setMessage(status === "resolved" ? "Issue marked resolved." : "Issue reopened.");
    } catch (issueError) {
      setError(
        issueError instanceof StudioApiError
          ? issueError.message
          : "The issue could not be updated.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div data-testid="review-panel" className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <ReviewStatusBadge status={take.reviewStatus} />
        <Badge variant="muted">{take.issues.length} issue(s)</Badge>
        {criticalOpen > 0 ? <Badge variant="outline">{criticalOpen} critical open</Badge> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {REVIEW_ACTIONS.map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={() => void changeStatus(action.status)}
            disabled={isSaving}
            className={
              action.status === "approved"
                ? studioPrimaryButtonClassName
                : action.status === "rejected"
                  ? studioDangerButtonClassName
                  : studioSecondaryButtonClassName
            }
          >
            {action.label}
          </button>
        ))}
      </div>

      {criticalOpen > 0 ? (
        <label className="flex items-start gap-2 rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.currentTarget.checked)}
            className="mt-0.5"
          />
          <span>
            I acknowledge the unresolved critical issues and still want to approve this take.
          </span>
        </label>
      ) : null}

      <div>
        <label className={studioLabelClassName} htmlFor="review-note">
          Review note
        </label>
        <textarea
          id="review-note"
          value={note}
          onChange={(event) => setNote(event.currentTarget.value)}
          className={studioTextareaClassName}
          placeholder="Optional note recorded with the next status change."
        />
      </div>

      {message ? (
        <p
          role="status"
          className="rounded-md border border-sage-500/40 bg-sage-500/10 px-3 py-2 text-xs text-sage-400"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}

      <div className="border-t border-ink-700 pt-4">
        <h3 className="font-mono text-[10px] tracking-[0.14em] text-mist-400 uppercase">
          Issues on this take
        </h3>
        {take.issues.length === 0 ? (
          <p className="mt-2 text-xs text-mist-500">No issues recorded for this take.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {take.issues.map((issue) => (
              <li key={issue.id} className="rounded-md border border-ink-700 bg-ink-950/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <IssueSeverityBadge severity={issue.severity} />
                  <Badge variant="muted">{ISSUE_CATEGORY_LABELS[issue.category]}</Badge>
                  <span className="font-mono text-[10px] text-mist-500">
                    {issue.timestampSeconds === null
                      ? "No timestamp"
                      : `${issue.timestampSeconds.toFixed(2)} s`}
                  </span>
                  <Badge variant={issue.status === "open" ? "outline" : "muted"}>
                    {issue.status}
                  </Badge>
                  <button
                    type="button"
                    onClick={() =>
                      void toggleIssue(issue.id, issue.status === "open" ? "resolved" : "open")
                    }
                    disabled={isSaving}
                    className={`ml-auto ${studioSecondaryButtonClassName}`}
                  >
                    {issue.status === "open" ? "Mark resolved" : "Reopen"}
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-mist-300">{issue.description}</p>
                {issue.frameImageMediaId ? (
                  <img
                    src={mediaUrl(projectId, issue.frameImageMediaId)}
                    alt="Issue frame evidence"
                    className="mt-2 aspect-video w-full max-w-xs rounded border border-ink-700 object-cover"
                  />
                ) : null}
                <p className="mt-2 font-mono text-[9px] text-mist-500">
                  {formatDateTime(issue.createdAt)}
                  {issue.resolvedAt ? ` · resolved ${formatDateTime(issue.resolvedAt)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        data-testid="add-issue-form"
        onSubmit={(event) => void addIssue(event)}
        className="space-y-3 border-t border-ink-700 pt-4"
      >
        <h3 className="font-mono text-[10px] tracking-[0.14em] text-mist-400 uppercase">
          Add issue to this take
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={studioLabelClassName} htmlFor="issue-category">
              Category
            </label>
            <select
              id="issue-category"
              name="category"
              className={studioSelectClassName}
              defaultValue="anatomy_defect"
            >
              {Object.entries(ISSUE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={studioLabelClassName} htmlFor="issue-severity">
              Severity
            </label>
            <select
              id="issue-severity"
              name="severity"
              className={studioSelectClassName}
              defaultValue="major"
            >
              {Object.entries(ISSUE_SEVERITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={studioLabelClassName} htmlFor="issue-timestamp">
            Video timestamp (seconds)
          </label>
          <input
            id="issue-timestamp"
            name="timestampSeconds"
            type="number"
            min={0}
            step={0.01}
            defaultValue={0}
            className={studioInputClassName}
          />
        </div>
        <div>
          <label className={studioLabelClassName} htmlFor="issue-description">
            Description
          </label>
          <textarea
            id="issue-description"
            name="description"
            required
            maxLength={4000}
            className={studioTextareaClassName}
            placeholder="What is wrong, and when does it occur?"
          />
        </div>
        <div>
          <label className={studioLabelClassName} htmlFor="issue-screenshot">
            Optional frame screenshot
          </label>
          <input
            id="issue-screenshot"
            name="screenshot"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className={studioInputClassName}
          />
        </div>
        <button type="submit" disabled={isSaving} className={studioPrimaryButtonClassName}>
          {isSaving ? "Saving…" : "Add issue"}
        </button>
      </form>

      <div className="border-t border-ink-700 pt-4">
        <h3 className="font-mono text-[10px] tracking-[0.14em] text-mist-400 uppercase">
          Review history
        </h3>
        {take.reviewHistory.length === 0 ? (
          <p className="mt-2 text-xs text-mist-500">No status changes recorded yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {[...take.reviewHistory].reverse().map((entry) => (
              <li key={entry.id} className="rounded-md border border-ink-700 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ReviewStatusBadge status={entry.status} />
                  <span className="font-mono text-[9px] text-mist-500">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                {entry.note ? (
                  <p className="mt-1 text-xs leading-5 text-mist-300">{entry.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={studioReadonlyClassName}>Review data belongs to this take only.</p>
    </div>
  );
}
