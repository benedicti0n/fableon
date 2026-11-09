"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { studioPatchJson, studioPostJson, StudioApiError } from "@/lib/studio/client";
import {
  formatDateTime,
  formatDuration,
  getCurrentTake,
  getShotReviewStatus,
} from "@/lib/studio/model";
import type { StudioProject, StudioShot } from "@/lib/studio/types";

import { MethodBadge, ReviewStatusBadge } from "@/components/studio/status-badges";
import {
  studioInputClassName,
  studioLabelClassName,
  studioPrimaryButtonClassName,
  studioSecondaryButtonClassName,
  studioSelectClassName,
  studioTextareaClassName,
} from "@/components/studio/ui";

interface ProjectWorkspaceProps {
  readonly project: StudioProject;
}

export function ProjectWorkspace({ project: initialProject }: ProjectWorkspaceProps) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [error, setError] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isCreatingShot, setIsCreatingShot] = useState(false);
  const [projectMessage, setProjectMessage] = useState<string | null>(null);

  const shots = project.shotOrder
    .map((id) => project.shots.find((shot) => shot.id === id))
    .filter((shot): shot is StudioShot => shot !== undefined);
  const approved = shots.filter((shot) => getShotReviewStatus(shot) === "approved").length;
  const needsReview = shots.filter((shot) => getShotReviewStatus(shot) !== "approved").length;

  async function saveProject(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSavingProject(true);
    setProjectMessage(null);
    setError(null);
    try {
      const response = await studioPatchJson<{ project: StudioProject }>(
        `/api/studio/projects/${project.id}`,
        {
          title: String(form.get("title") ?? ""),
          description: String(form.get("description") ?? ""),
          targetFrameRate: Number(form.get("targetFrameRate") ?? 24),
          targetWidth: Number(form.get("targetWidth") ?? 1920),
          targetHeight: Number(form.get("targetHeight") ?? 1080),
        },
      );
      setProject(response.project);
      setProjectMessage("Project metadata saved.");
    } catch (saveError) {
      setError(
        saveError instanceof StudioApiError ? saveError.message : "The project could not be saved.",
      );
    } finally {
      setIsSavingProject(false);
    }
  }

  async function createShot(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setIsCreatingShot(true);
    setError(null);
    try {
      const response = await studioPostJson<{ project: StudioProject; shot: StudioShot }>(
        `/api/studio/projects/${project.id}/shots`,
        {
          title: String(form.get("title") ?? ""),
          description: String(form.get("description") ?? ""),
          targetDurationSeconds: Number(form.get("targetDurationSeconds") ?? 3),
          generationPrompt: String(form.get("generationPrompt") ?? ""),
          renderingMethod: String(form.get("renderingMethod") ?? "ai-video"),
        },
      );
      setProject(response.project);
      formElement.reset();
      router.push(`/studio/projects/${project.id}/shots/${response.shot.id}`);
    } catch (createError) {
      setError(
        createError instanceof StudioApiError
          ? createError.message
          : "The shot could not be created.",
      );
    } finally {
      setIsCreatingShot(false);
    }
  }

  async function moveShot(index: number, direction: -1 | 1): Promise<void> {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= project.shotOrder.length) return;
    const nextOrder = [...project.shotOrder];
    const current = nextOrder[index];
    const target = nextOrder[targetIndex];
    if (!current || !target) return;
    nextOrder[index] = target;
    nextOrder[targetIndex] = current;
    setError(null);
    try {
      const response = await studioPatchJson<{ project: StudioProject }>(
        `/api/studio/projects/${project.id}`,
        { shotOrder: nextOrder },
      );
      setProject(response.project);
    } catch (moveError) {
      setError(
        moveError instanceof StudioApiError
          ? moveError.message
          : "The shot order could not be saved.",
      );
    }
  }

  return (
    <div data-testid="project-page" className="space-y-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="text-xs text-mist-500">
            <Link href="/studio/projects" className="hover:text-paper-50">
              Projects
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-mist-300">Project</span>
          </nav>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">{project.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-mist-300">
            {project.description || "No project description."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="muted">{project.targetFrameRate} fps</Badge>
          <Badge variant="muted">
            {project.targetWidth}×{project.targetHeight}
          </Badge>
          <Badge variant="accent">Phase 3 workspace</Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Shots", value: shots.length },
          { label: "Approved", value: approved },
          { label: "Needs review", value: needsReview },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-ink-700 bg-ink-900 p-4">
            <p className="font-mono text-[10px] tracking-[0.14em] text-mist-500 uppercase">
              {stat.label}
            </p>
            <p className="mt-2 font-serif text-3xl text-paper-50">{stat.value}</p>
          </div>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-2xl text-paper-100">Shot list</h2>
            <span className="font-mono text-[10px] tracking-[0.14em] text-mist-500 uppercase">
              Ordered production sequence
            </span>
          </div>

          {shots.length === 0 ? (
            <EmptyState
              title="No shots yet"
              description="Add a shot, import an MP4, and start reviewing takes."
              phase="Shot management"
            />
          ) : (
            <ol className="space-y-2" data-testid="shot-list">
              {shots.map((shot, index) => {
                const take = getCurrentTake(shot);
                return (
                  <li
                    key={shot.id}
                    data-testid="shot-row"
                    className="rounded-lg border border-ink-700 bg-ink-900 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[10px] tracking-[0.12em] text-mist-500">
                        {String(index + 1).padStart(3, "0")}
                      </span>
                      <Link
                        href={`/studio/projects/${project.id}/shots/${shot.id}`}
                        className="min-w-0 flex-1 text-sm font-medium text-paper-100 hover:text-ochre-200"
                      >
                        {shot.title}
                      </Link>
                      <MethodBadge method={shot.renderingMethod} />
                      <ReviewStatusBadge status={getShotReviewStatus(shot)} />
                      <Badge variant="muted">{take ? `Take #${take.takeNumber}` : "No take"}</Badge>
                      <span className="font-mono text-[10px] text-mist-500">
                        {formatDuration(shot.targetDurationSeconds)}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => void moveShot(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${shot.title} up`}
                          className={studioSecondaryButtonClassName}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveShot(index, 1)}
                          disabled={index === shots.length - 1}
                          aria-label={`Move ${shot.title} down`}
                          className={studioSecondaryButtonClassName}
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    {shot.description ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-mist-400">
                        {shot.description}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-lg border border-ink-700 bg-ink-900">
            <header className="border-b border-ink-700 px-4 py-3">
              <h2 className="font-serif text-lg text-paper-100">Add shot</h2>
            </header>
            <form
              data-testid="add-shot-form"
              onSubmit={(event) => void createShot(event)}
              className="space-y-3 p-4"
            >
              <div>
                <label className={studioLabelClassName} htmlFor="new-shot-title">
                  Title
                </label>
                <input
                  id="new-shot-title"
                  name="title"
                  required
                  maxLength={240}
                  className={studioInputClassName}
                  placeholder="Shot 001 — Bird Landing"
                />
              </div>
              <div>
                <label className={studioLabelClassName} htmlFor="new-shot-description">
                  Description
                </label>
                <textarea
                  id="new-shot-description"
                  name="description"
                  className={studioTextareaClassName}
                  placeholder="What happens in this shot?"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={studioLabelClassName} htmlFor="new-shot-method">
                    Method
                  </label>
                  <select
                    id="new-shot-method"
                    name="renderingMethod"
                    className={studioSelectClassName}
                    defaultValue="ai-video"
                  >
                    <option value="ai-video">AI video</option>
                    <option value="deterministic">Deterministic</option>
                  </select>
                </div>
                <div>
                  <label className={studioLabelClassName} htmlFor="new-shot-duration">
                    Target seconds
                  </label>
                  <input
                    id="new-shot-duration"
                    name="targetDurationSeconds"
                    type="number"
                    min={0.1}
                    max={120}
                    step={0.1}
                    defaultValue={3}
                    className={studioInputClassName}
                  />
                </div>
              </div>
              <div>
                <label className={studioLabelClassName} htmlFor="new-shot-prompt">
                  Generation prompt
                </label>
                <textarea
                  id="new-shot-prompt"
                  name="generationPrompt"
                  className={studioTextareaClassName}
                  placeholder="Describe the motion and visual intent."
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingShot}
                className={studioPrimaryButtonClassName}
              >
                {isCreatingShot ? "Creating…" : "Add shot"}
              </button>
            </form>
          </section>

          <details className="rounded-lg border border-ink-700 bg-ink-900">
            <summary className="cursor-pointer px-4 py-3 font-serif text-lg text-paper-100">
              Edit project metadata
            </summary>
            <form
              onSubmit={(event) => void saveProject(event)}
              className="space-y-3 border-t border-ink-700 p-4"
            >
              <div>
                <label className={studioLabelClassName} htmlFor="edit-project-title">
                  Title
                </label>
                <input
                  id="edit-project-title"
                  name="title"
                  defaultValue={project.title}
                  required
                  className={studioInputClassName}
                />
              </div>
              <div>
                <label className={studioLabelClassName} htmlFor="edit-project-description">
                  Description
                </label>
                <textarea
                  id="edit-project-description"
                  name="description"
                  defaultValue={project.description}
                  className={studioTextareaClassName}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={studioLabelClassName} htmlFor="edit-project-fps">
                    FPS
                  </label>
                  <input
                    id="edit-project-fps"
                    name="targetFrameRate"
                    type="number"
                    min={1}
                    max={120}
                    defaultValue={project.targetFrameRate}
                    className={studioInputClassName}
                  />
                </div>
                <div>
                  <label className={studioLabelClassName} htmlFor="edit-project-width">
                    Width
                  </label>
                  <input
                    id="edit-project-width"
                    name="targetWidth"
                    type="number"
                    min={1}
                    defaultValue={project.targetWidth}
                    className={studioInputClassName}
                  />
                </div>
                <div>
                  <label className={studioLabelClassName} htmlFor="edit-project-height">
                    Height
                  </label>
                  <input
                    id="edit-project-height"
                    name="targetHeight"
                    type="number"
                    min={1}
                    defaultValue={project.targetHeight}
                    className={studioInputClassName}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSavingProject}
                className={studioSecondaryButtonClassName}
              >
                {isSavingProject ? "Saving…" : "Save project metadata"}
              </button>
              {projectMessage ? (
                <p role="status" className="text-xs text-sage-400">
                  {projectMessage}
                </p>
              ) : null}
            </form>
          </details>

          <p className="font-mono text-[10px] leading-5 text-mist-500">
            Project ID {project.id}
            <br />
            Created {formatDateTime(project.createdAt)} · Updated{" "}
            {formatDateTime(project.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
