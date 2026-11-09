"use client";

import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { studioPatchJson, studioPostJson, StudioApiError } from "@/lib/studio/client";
import { buildRegenerationGuidance, formatDateTime, formatDuration } from "@/lib/studio/model";
import type {
  RegenerationRequest,
  RegenerationStatus,
  StudioProject,
  StudioShot,
  StudioTake,
} from "@/lib/studio/types";

import { IssueSeverityBadge, RegenerationStatusBadge } from "./status-badges";
import {
  studioInputClassName,
  studioLabelClassName,
  studioPrimaryButtonClassName,
  studioSecondaryButtonClassName,
  studioSelectClassName,
  studioTextareaClassName,
} from "./ui";

interface RegenerationPanelProps {
  readonly project: StudioProject;
  readonly shot: StudioShot;
  readonly selectedTake: StudioTake | null;
  readonly onUpdated: (project: StudioProject) => void;
}

export function RegenerationPanel({
  project,
  shot,
  selectedTake,
  onUpdated,
}: RegenerationPanelProps) {
  const firstTake = selectedTake ?? shot.takes[0] ?? null;
  const [sourceTakeId, setSourceTakeId] = useState(firstTake?.id ?? "");
  const [providerLabel, setProviderLabel] = useState(firstTake?.provider ?? "Google");
  const [modelLabel, setModelLabel] = useState(firstTake?.model ?? "gemini-omni-1.2-flash");
  const [prompt, setPrompt] = useState(shot.generationPrompt);
  const [startReferenceMediaId, setStartReferenceMediaId] = useState(
    shot.referenceImageMediaId ?? "",
  );
  const [endReferenceMediaId, setEndReferenceMediaId] = useState("");
  const [duration, setDuration] = useState(
    String(firstTake?.durationSeconds ?? shot.targetDurationSeconds),
  );
  const [resolution, setResolution] = useState("720p");
  const [preserveInstructions, setPreserveInstructions] = useState("");
  const [changeInstructions, setChangeInstructions] = useState("");
  const [budget, setBudget] = useState("0.25");
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (shot.takes.length === 0) {
    return (
      <EmptyState
        title="A source take is required"
        description="Import a take before preparing a regeneration request."
        phase="Regeneration planning"
      />
    );
  }

  const sourceTake = shot.takes.find((take) => take.id === sourceTakeId) ?? firstTake;
  const sourceIssues = sourceTake?.issues ?? [];
  const selectedIssues = sourceIssues.filter((issue) => selectedIssueIds.includes(issue.id));
  const guidance = buildRegenerationGuidance(selectedIssues);
  const imageAssets = project.media.filter((media) => media.kind === "image");
  const requests = project.regenerationRequests
    .filter((request) => request.shotId === shot.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function changeSourceTake(takeId: string): void {
    const take = shot.takes.find((item) => item.id === takeId);
    setSourceTakeId(takeId);
    setSelectedIssueIds([]);
    if (take) {
      setProviderLabel(take.provider ?? "Google");
      setModelLabel(take.model ?? "gemini-omni-1.2-flash");
      setDuration(String(take.durationSeconds));
    }
  }

  function toggleIssue(issueId: string): void {
    setSelectedIssueIds((current) =>
      current.includes(issueId) ? current.filter((id) => id !== issueId) : [...current, issueId],
    );
  }

  function useGuidance(): void {
    if (guidance.length === 0) return;
    setChangeInstructions((current) =>
      current.trim().length === 0 ? guidance : `${current.trim()}\n${guidance}`,
    );
  }

  async function submit(status: "draft" | "ready_for_authorization"): Promise<void> {
    if (!sourceTake) {
      setError("Choose a source take.");
      return;
    }
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await studioPostJson<{
        project: StudioProject;
        request: RegenerationRequest;
      }>(`/api/studio/projects/${project.id}/shots/${shot.id}/regeneration`, {
        sourceTakeId: sourceTake.id,
        providerLabel,
        modelLabel,
        prompt,
        startReferenceMediaId: startReferenceMediaId === "" ? null : startReferenceMediaId,
        endReferenceMediaId: endReferenceMediaId === "" ? null : endReferenceMediaId,
        desiredDurationSeconds: Number(duration),
        desiredResolution: resolution,
        preserveInstructions,
        changeInstructions,
        defectIssueIds: selectedIssueIds.filter((id) =>
          sourceTake.issues.some((issue) => issue.id === id),
        ),
        budgetCeilingUsd: Number(budget),
        status,
      });
      onUpdated(response.project);
      setMessage(
        status === "draft"
          ? "Regeneration request saved as a draft."
          : "Regeneration request marked ready for authorization. No provider call was made.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof StudioApiError
          ? saveError.message
          : "The regeneration request could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(requestId: string, status: RegenerationStatus): Promise<void> {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await studioPatchJson<{ project: StudioProject }>(
        `/api/studio/projects/${project.id}/shots/${shot.id}/regeneration/${requestId}`,
        { status },
      );
      onUpdated(response.project);
      setMessage(`Regeneration request status: ${status}.`);
    } catch (updateError) {
      setError(
        updateError instanceof StudioApiError
          ? updateError.message
          : "The regeneration request could not be updated.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div data-testid="regeneration-panel" className="space-y-6">
      <div className="rounded-md border border-ochre-500/30 bg-ochre-500/5 px-3 py-2 text-xs leading-5 text-ochre-200">
        Planning only. This form persists a request; it does not call Gemini, spend money, start a
        job, or execute a generation. Execution requires a separate provider authorization.
      </div>

      <form
        data-testid="prepare-regeneration-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit("draft");
        }}
        className="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={studioLabelClassName} htmlFor="regen-source-take">
              Source take
            </label>
            <select
              id="regen-source-take"
              value={sourceTake?.id ?? ""}
              onChange={(event) => changeSourceTake(event.currentTarget.value)}
              className={studioSelectClassName}
            >
              {shot.takes.map((take) => (
                <option key={take.id} value={take.id}>
                  Take #{take.takeNumber} · {take.provider ?? "unknown provider"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={studioLabelClassName} htmlFor="regen-budget">
              Maximum future spend (USD)
            </label>
            <input
              id="regen-budget"
              type="number"
              min={0}
              step={0.01}
              value={budget}
              onChange={(event) => setBudget(event.currentTarget.value)}
              className={studioInputClassName}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={studioLabelClassName} htmlFor="regen-provider">
              Provider label
            </label>
            <input
              id="regen-provider"
              value={providerLabel}
              onChange={(event) => setProviderLabel(event.currentTarget.value)}
              className={studioInputClassName}
              required
            />
          </div>
          <div>
            <label className={studioLabelClassName} htmlFor="regen-model">
              Model label
            </label>
            <input
              id="regen-model"
              value={modelLabel}
              onChange={(event) => setModelLabel(event.currentTarget.value)}
              className={studioInputClassName}
              required
            />
          </div>
        </div>

        <div>
          <label className={studioLabelClassName} htmlFor="regen-prompt">
            Motion prompt
          </label>
          <textarea
            id="regen-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.currentTarget.value)}
            required
            className={studioTextareaClassName}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={studioLabelClassName} htmlFor="regen-start-ref">
              Starting reference
            </label>
            <select
              id="regen-start-ref"
              value={startReferenceMediaId}
              onChange={(event) => setStartReferenceMediaId(event.currentTarget.value)}
              className={studioSelectClassName}
            >
              <option value="">None</option>
              {imageAssets.map((media) => (
                <option key={media.id} value={media.id}>
                  {media.originalName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={studioLabelClassName} htmlFor="regen-end-ref">
              Ending reference
            </label>
            <select
              id="regen-end-ref"
              value={endReferenceMediaId}
              onChange={(event) => setEndReferenceMediaId(event.currentTarget.value)}
              className={studioSelectClassName}
            >
              <option value="">None</option>
              {imageAssets.map((media) => (
                <option key={media.id} value={media.id}>
                  {media.originalName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={studioLabelClassName} htmlFor="regen-duration">
              Desired duration (seconds)
            </label>
            <input
              id="regen-duration"
              type="number"
              min={1}
              max={60}
              step={0.1}
              value={duration}
              onChange={(event) => setDuration(event.currentTarget.value)}
              className={studioInputClassName}
            />
          </div>
          <div>
            <label className={studioLabelClassName} htmlFor="regen-resolution">
              Desired resolution
            </label>
            <select
              id="regen-resolution"
              value={resolution}
              onChange={(event) => setResolution(event.currentTarget.value)}
              className={studioSelectClassName}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4K">4K</option>
            </select>
            <p className="mt-1 text-[10px] text-mist-500">
              Capability is not validated in Studio. Provider support remains unverified.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={studioLabelClassName} htmlFor="regen-preserve">
              Preserve instructions
            </label>
            <textarea
              id="regen-preserve"
              value={preserveInstructions}
              onChange={(event) => setPreserveInstructions(event.currentTarget.value)}
              className={studioTextareaClassName}
              placeholder="What must remain unchanged?"
            />
          </div>
          <div>
            <label className={studioLabelClassName} htmlFor="regen-change">
              Change instructions
            </label>
            <textarea
              id="regen-change"
              value={changeInstructions}
              onChange={(event) => setChangeInstructions(event.currentTarget.value)}
              className={studioTextareaClassName}
              placeholder="What should be corrected?"
            />
          </div>
        </div>

        <div className="rounded-md border border-ink-700 bg-ink-950/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-mono text-[10px] tracking-[0.14em] text-mist-400 uppercase">
              Quality-aware guidance from{" "}
              {sourceTake ? `Take #${sourceTake.takeNumber}` : "this take"}
            </h3>
            <Badge variant="outline">Deterministic template</Badge>
          </div>
          {sourceIssues.length === 0 ? (
            <p className="mt-2 text-xs text-mist-500">No issues recorded on the source take.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {sourceIssues.map((issue) => (
                <li key={issue.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIssueIds.includes(issue.id)}
                    onChange={() => toggleIssue(issue.id)}
                    className="mt-1"
                    aria-label={`Use issue: ${issue.description}`}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <IssueSeverityBadge severity={issue.severity} />
                      <span className="text-xs text-mist-200">{issue.description}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] text-mist-500">
                      {issue.timestampSeconds === null
                        ? "No timestamp"
                        : `${issue.timestampSeconds.toFixed(2)} s`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {guidance ? (
            <div className="mt-3 space-y-2 border-t border-ink-700 pt-3">
              <p className="text-xs leading-5 whitespace-pre-line text-mist-300">{guidance}</p>
              <button
                type="button"
                onClick={useGuidance}
                className={studioSecondaryButtonClassName}
              >
                Add guidance to change instructions
              </button>
            </div>
          ) : null}
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

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={isSaving} className={studioSecondaryButtonClassName}>
            {isSaving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void submit("ready_for_authorization")}
            className={studioPrimaryButtonClassName}
          >
            Mark ready for authorization
          </button>
        </div>
      </form>

      <div className="border-t border-ink-700 pt-4">
        <h3 className="font-mono text-[10px] tracking-[0.14em] text-mist-400 uppercase">
          Prepared requests
        </h3>
        {requests.length === 0 ? (
          <p className="mt-2 text-xs text-mist-500">No regeneration requests prepared yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {requests.map((request) => {
              const source = shot.takes.find((take) => take.id === request.sourceTakeId);
              return (
                <li key={request.id} className="rounded-md border border-ink-700 bg-ink-950/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <RegenerationStatusBadge status={request.status} />
                    <span className="font-mono text-[10px] text-mist-400">
                      {source ? `Take #${source.takeNumber}` : "Unknown source"}
                    </span>
                    <span className="font-mono text-[10px] text-mist-500">
                      ${request.budgetCeilingUsd.toFixed(2)} cap
                    </span>
                    <span className="font-mono text-[10px] text-mist-500">
                      {formatDateTime(request.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-mist-300">
                    {request.providerLabel} · {request.modelLabel} · {request.desiredResolution} ·{" "}
                    {formatDuration(request.desiredDurationSeconds)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-mist-500">
                    {request.prompt}
                  </p>
                  {request.defectIssueIds.length > 0 ? (
                    <p className="mt-1 font-mono text-[9px] text-mist-500">
                      {request.defectIssueIds.length} defect reference(s)
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {request.status === "draft" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus(request.id, "ready_for_authorization")}
                        disabled={isSaving}
                        className={studioSecondaryButtonClassName}
                      >
                        Mark ready
                      </button>
                    ) : null}
                    {request.status !== "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => void updateStatus(request.id, "cancelled")}
                        disabled={isSaving}
                        className={studioSecondaryButtonClassName}
                      >
                        Cancel request
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
