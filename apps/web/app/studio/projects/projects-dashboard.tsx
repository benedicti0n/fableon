"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { studioPostJson, StudioApiError } from "@/lib/studio/client";
import { formatDateTime } from "@/lib/studio/model";
import type { ProjectSummary, StudioProject } from "@/lib/studio/types";

import {
  studioInputClassName,
  studioLabelClassName,
  studioPrimaryButtonClassName,
  studioSecondaryButtonClassName,
  studioSelectClassName,
  studioTextareaClassName,
} from "@/components/studio/ui";

interface ProjectsDashboardProps {
  readonly projects: readonly ProjectSummary[];
  readonly loadError: string | null;
}

const RESOLUTIONS = {
  "1920x1080": { width: 1920, height: 1080 },
  "1280x720": { width: 1280, height: 720 },
} as const;

export function ProjectsDashboard({ projects, loadError }: ProjectsDashboardProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isImportingDemo, setIsImportingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createProject(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const resolution = String(form.get("resolution") ?? "1920x1080");
    const size = RESOLUTIONS[resolution as keyof typeof RESOLUTIONS] ?? RESOLUTIONS["1920x1080"];
    setIsCreating(true);
    setError(null);
    try {
      const response = await studioPostJson<{ project: StudioProject }>("/api/studio/projects", {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        targetFrameRate: Number(form.get("frameRate") ?? 24),
        targetWidth: size.width,
        targetHeight: size.height,
      });
      router.push(`/studio/projects/${response.project.id}`);
    } catch (createError) {
      setError(
        createError instanceof StudioApiError
          ? createError.message
          : "The project could not be created.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function importDemo(): Promise<void> {
    setIsImportingDemo(true);
    setError(null);
    try {
      const response = await studioPostJson<{ project: StudioProject; created: boolean }>(
        "/api/studio/demo",
        {},
      );
      router.push(`/studio/projects/${response.project.id}`);
    } catch (importError) {
      setError(
        importError instanceof StudioApiError
          ? importError.message
          : "The demonstration project could not be imported.",
      );
    } finally {
      setIsImportingDemo(false);
    }
  }

  return (
    <div data-testid="projects-page" className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
            Phase 3 · AI video studio
          </p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-paper-50">
            Projects and shots
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-mist-300">
            A local-first workspace for imported AI video and deterministic exports. Create a
            project, import a real take, annotate visual defects, and prepare a regeneration
            request. Nothing here calls a paid provider.
          </p>
        </div>
        <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
          <p className="font-mono text-[10px] tracking-[0.14em] text-mist-500 uppercase">
            Local storage boundary
          </p>
          <p className="mt-2 text-xs leading-5 text-mist-400">
            Projects live under <code className="text-mist-200">.fableon-data/</code>. This MVP is
            for local development or a persistent single server, not stateless serverless hosting.
          </p>
        </div>
      </div>

      {loadError ? (
        <p
          role="alert"
          className="rounded-lg border border-clay-500/40 bg-clay-500/10 px-4 py-3 text-sm text-clay-500"
        >
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="project-list-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="project-list-heading" className="font-serif text-2xl text-paper-100">
              Your projects
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="muted">{projects.length} total</Badge>
              <button
                type="button"
                data-testid="import-demo-button"
                onClick={() => void importDemo()}
                disabled={isImportingDemo}
                className={studioSecondaryButtonClassName}
              >
                {isImportingDemo ? "Importing demo…" : "Import demo project"}
              </button>
            </div>
          </div>
          <p className="text-xs leading-5 text-mist-500">
            The demo imports the real Phase 2.8 AI take and the Phase 2.7 deterministic take into
            one project. Running it again reopens the existing demo without duplicating media or
            shots.
          </p>
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Create a project to add shots, import real MP4 takes, and start a review workflow."
              phase="Projects"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/studio/projects/${project.id}`}
                  data-testid="project-card"
                  className="group rounded-lg border border-ink-700 bg-ink-900 p-4 transition-colors hover:border-ochre-500/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl text-paper-50 group-hover:text-ochre-200">
                      {project.title}
                    </h3>
                    <Badge variant={project.approvedShotCount > 0 ? "accent" : "muted"}>
                      {project.approvedShotCount}/{project.shotCount} approved
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-mist-400">
                    {project.description || "No description."}
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-800 pt-3">
                    <div>
                      <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                        Shots
                      </dt>
                      <dd className="mt-0.5 font-mono text-sm text-paper-100">
                        {project.shotCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                        Needs review
                      </dt>
                      <dd className="mt-0.5 font-mono text-sm text-paper-100">
                        {project.needsReviewShotCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                        Updated
                      </dt>
                      <dd className="mt-0.5 truncate font-mono text-[10px] text-mist-300">
                        {formatDateTime(project.updatedAt)}
                      </dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section
          aria-labelledby="create-project-heading"
          className="rounded-lg border border-ink-700 bg-ink-900"
        >
          <header className="border-b border-ink-700 px-4 py-3">
            <h2 id="create-project-heading" className="font-serif text-lg text-paper-100">
              New project
            </h2>
          </header>
          <form
            data-testid="create-project-form"
            onSubmit={(event) => void createProject(event)}
            className="space-y-3 p-4"
          >
            <div>
              <label className={studioLabelClassName} htmlFor="project-title">
                Title
              </label>
              <input
                id="project-title"
                name="title"
                required
                maxLength={240}
                className={studioInputClassName}
                placeholder="Where the Light Lands"
              />
            </div>
            <div>
              <label className={studioLabelClassName} htmlFor="project-description">
                Description
              </label>
              <textarea
                id="project-description"
                name="description"
                className={studioTextareaClassName}
                placeholder="A short bird-in-the-forest film."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={studioLabelClassName} htmlFor="project-frame-rate">
                  Frame rate
                </label>
                <select
                  id="project-frame-rate"
                  name="frameRate"
                  className={studioSelectClassName}
                  defaultValue="24"
                >
                  <option value="24">24 fps</option>
                  <option value="30">30 fps</option>
                  <option value="25">25 fps</option>
                </select>
              </div>
              <div>
                <label className={studioLabelClassName} htmlFor="project-resolution">
                  Resolution
                </label>
                <select id="project-resolution" name="resolution" className={studioSelectClassName}>
                  <option value="1920x1080">1920×1080</option>
                  <option value="1280x720">1280×720</option>
                </select>
              </div>
            </div>
            {error ? (
              <p
                role="alert"
                className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
              >
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={isCreating} className={studioPrimaryButtonClassName}>
              {isCreating ? "Creating…" : "Create project"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
