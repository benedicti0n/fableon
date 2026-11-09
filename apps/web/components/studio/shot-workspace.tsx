"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { studioPatchJson, StudioApiError } from "@/lib/studio/client";
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  getCurrentTake,
  getShotReviewStatus,
  mediaUrl,
} from "@/lib/studio/model";
import type { StudioProject, StudioTake } from "@/lib/studio/types";

import { ComparisonPanel } from "./comparison-panel";
import { ReviewPanel } from "./review-panel";
import { MethodBadge, ReviewStatusBadge } from "./status-badges";
import { ShotProperties } from "./shot-properties";
import { TakeHistory } from "./take-history";
import { TakeImportForm } from "./take-import-form";
import { VideoPreview } from "./video-preview";
import { studioReadonlyClassName, studioSecondaryButtonClassName } from "./ui";

interface ShotWorkspaceProps {
  readonly project: StudioProject;
  readonly initialShotId: string;
  readonly initialTakeId: string | null;
}

function SelectTakeButton({
  take,
  selected,
  onSelect,
}: {
  readonly take: StudioTake;
  readonly selected: boolean;
  readonly onSelect: (takeId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(take.id)}
      aria-pressed={selected}
      className={`rounded-md border px-2.5 py-1.5 font-mono text-[10px] transition-colors ${
        selected
          ? "border-ochre-500/60 bg-ochre-500/10 text-ochre-300"
          : "border-ink-600 text-mist-400 hover:border-mist-400 hover:text-paper-50"
      }`}
    >
      Take #{take.takeNumber}
    </button>
  );
}

export function ShotWorkspace({
  project: initialProject,
  initialShotId,
  initialTakeId,
}: ShotWorkspaceProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [selectedTakeId, setSelectedTakeId] = useState(initialTakeId);
  const [error, setError] = useState<string | null>(null);

  const shot = project.shots.find((item) => item.id === initialShotId) ?? null;
  if (!shot) {
    return (
      <EmptyState
        title="Shot not found"
        description="This shot no longer exists in the project."
        phase="Studio"
      />
    );
  }

  const projectId = project.id;
  const shotId = shot.id;
  const selectedTake =
    shot.takes.find((take) => take.id === selectedTakeId) ??
    getCurrentTake(shot) ??
    shot.takes[0] ??
    null;
  const selectedMedia =
    selectedTake === null
      ? null
      : (project.media.find((media) => media.id === selectedTake.mediaId) ?? null);
  const reference = project.media.find((media) => media.id === shot.referenceImageMediaId) ?? null;

  function replaceTakeInUrl(takeId: string | null): void {
    const query = takeId ? `?take=${encodeURIComponent(takeId)}` : "";
    router.replace(`/studio/projects/${projectId}/shots/${shotId}${query}`, {
      scroll: false,
    });
  }

  async function selectTake(takeId: string): Promise<void> {
    const previous = selectedTakeId;
    setSelectedTakeId(takeId);
    replaceTakeInUrl(takeId);
    setError(null);
    try {
      const response = await studioPatchJson<{ project: StudioProject }>(
        `/api/studio/projects/${projectId}/shots/${shotId}`,
        { currentTakeId: takeId },
      );
      setProject(response.project);
    } catch (selectError) {
      setSelectedTakeId(previous);
      setError(
        selectError instanceof StudioApiError
          ? selectError.message
          : "The take could not be selected.",
      );
    }
  }

  function handleImported(updatedProject: StudioProject, take: StudioTake): void {
    setProject(updatedProject);
    setSelectedTakeId(take.id);
    replaceTakeInUrl(take.id);
    setError(null);
  }

  function handleProjectUpdated(updatedProject: StudioProject): void {
    setProject(updatedProject);
    const updatedShot = updatedProject.shots.find((item) => item.id === shotId);
    if (selectedTakeId !== null && !updatedShot?.takes.some((take) => take.id === selectedTakeId)) {
      const fallback = updatedShot?.currentTakeId ?? updatedShot?.takes[0]?.id ?? null;
      setSelectedTakeId(fallback);
    }
  }

  return (
    <div data-testid="shot-workspace" className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-xs text-mist-500"
          >
            <Link href="/studio/projects" className="hover:text-paper-50">
              Projects
            </Link>
            <span aria-hidden="true">/</span>
            <Link href={`/studio/projects/${project.id}`} className="hover:text-paper-50">
              {project.title}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-mist-300">Shot workspace</span>
          </nav>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl tracking-tight text-paper-50">{shot.title}</h1>
            <MethodBadge method={shot.renderingMethod} />
            <ReviewStatusBadge status={getShotReviewStatus(shot)} />
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-mist-400">
            {shot.description || "No shot description yet."}
          </p>
        </div>
        <Link href={`/studio/projects/${project.id}`} className={studioSecondaryButtonClassName}>
          Project overview
        </Link>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_330px]">
        <Panel
          title="Shots"
          status={`${project.shots.length} ordered`}
          className="xl:sticky xl:top-24 xl:self-start"
        >
          <ol className="space-y-1.5">
            {project.shotOrder.map((shotId, index) => {
              const item = project.shots.find((candidate) => candidate.id === shotId);
              if (!item) return null;
              const active = item.id === shot.id;
              return (
                <li key={item.id}>
                  <Link
                    href={`/studio/projects/${project.id}/shots/${item.id}`}
                    className={`block rounded-md border px-2.5 py-2 transition-colors ${
                      active
                        ? "border-ochre-500/50 bg-ochre-500/10"
                        : "border-transparent hover:border-ink-600 hover:bg-ink-850"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                      Shot {String(index + 1).padStart(3, "0")}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-paper-100">
                      {item.title}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="muted">{item.takes.length} take(s)</Badge>
                      <ReviewStatusBadge status={getShotReviewStatus(item)} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Panel>

        <div className="min-w-0 space-y-5">
          <Panel
            title="Preview"
            status={selectedTake ? `Take #${selectedTake.takeNumber}` : "No take"}
            bodyClassName="space-y-3"
          >
            {shot.takes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {shot.takes.map((take) => (
                  <SelectTakeButton
                    key={take.id}
                    take={take}
                    selected={take.id === selectedTake?.id}
                    onSelect={(takeId) => void selectTake(takeId)}
                  />
                ))}
              </div>
            ) : null}

            {selectedTake && selectedMedia ? (
              <>
                <VideoPreview
                  key={selectedTake.id}
                  src={mediaUrl(project.id, selectedMedia.id)}
                  title={`${shot.title} take ${selectedTake.takeNumber}`}
                  testId="shot-video-preview"
                />
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-mist-400">
                  <span className="font-mono">
                    {selectedTake.width}×{selectedTake.height} · {selectedTake.frameRate.toFixed(2)}{" "}
                    fps · {formatDuration(selectedTake.durationSeconds)}
                  </span>
                  <span>{selectedTake.provider ?? "Unknown provider"}</span>
                  <span className="font-mono text-mist-500">
                    {selectedTake.model ?? "Unknown model"}
                  </span>
                </div>
                <p className="text-xs leading-5 text-mist-500">
                  Original imported take. Playback uses the native HTML video element; imports never
                  overwrite previous takes.
                </p>
              </>
            ) : (
              <EmptyState
                title="No video take yet"
                description="Import an MP4 below to create the first take and enable preview, review, and comparison."
                phase="Preview"
              />
            )}
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Take history" status={`${shot.takes.length} take(s)`}>
              <TakeHistory
                shot={shot}
                selectedTakeId={selectedTake?.id ?? null}
                onSelect={(takeId) => void selectTake(takeId)}
              />
            </Panel>
            <Panel title="Import a new take" status="MP4">
              <TakeImportForm
                projectId={project.id}
                shotId={shot.id}
                shotPrompt={shot.generationPrompt}
                renderingMethod={shot.renderingMethod}
                onImported={handleImported}
              />
            </Panel>
          </div>

          <Panel
            title="Review"
            status={selectedTake ? `Take #${selectedTake.takeNumber}` : "No take"}
          >
            {selectedTake ? (
              <ReviewPanel
                key={selectedTake.id}
                projectId={projectId}
                shotId={shotId}
                take={selectedTake}
                onUpdated={handleProjectUpdated}
              />
            ) : (
              <EmptyState
                title="No take to review"
                description="Import a take before recording review status or visual defects."
                phase="Review"
              />
            )}
          </Panel>

          <Panel title="Compare takes" status="Manual sync">
            <ComparisonPanel
              key={`${shot.id}-${shot.takes.length}`}
              project={project}
              shot={shot}
              selectedTakeId={selectedTake?.id ?? null}
            />
          </Panel>

          <Panel title="Take metadata" status="Read-only">
            {selectedTake ? (
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                    Take ID
                  </dt>
                  <dd className={studioReadonlyClassName}>{selectedTake.id}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                    Media file
                  </dt>
                  <dd className={studioReadonlyClassName}>{selectedMedia?.originalName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                    Imported
                  </dt>
                  <dd className={studioReadonlyClassName}>
                    {formatDateTime(selectedTake.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                    Codec / audio
                  </dt>
                  <dd className={studioReadonlyClassName}>
                    {selectedTake.codec} · {selectedTake.hasAudio ? "audio present" : "silent"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                    File size
                  </dt>
                  <dd className={studioReadonlyClassName}>
                    {formatBytes(selectedTake.fileSizeBytes)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                    SHA-256
                  </dt>
                  <dd className={studioReadonlyClassName}>{selectedTake.sha256}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-mist-500">Import a take to inspect its metadata.</p>
            )}
          </Panel>
        </div>

        <Panel
          title="Shot properties"
          status="Editable"
          className="xl:sticky xl:top-24 xl:self-start"
        >
          <ShotProperties
            key={shot.id}
            projectId={project.id}
            shot={shot}
            media={project.media}
            onUpdated={handleProjectUpdated}
          />
          {reference ? (
            <p className="mt-4 border-t border-ink-700 pt-3 font-mono text-[10px] text-mist-500">
              Reference: {reference.originalName}
            </p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
