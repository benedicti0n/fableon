import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudioHeader } from "@/components/studio/studio-header";
import { isStudioError } from "@/lib/studio/errors";
import { readProject } from "@/lib/studio/repository";

import { ProjectWorkspace } from "./project-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Project",
  robots: { index: false, follow: false },
};

export default async function ProjectPage({
  params,
}: {
  readonly params: Promise<{ readonly projectId: string }>;
}) {
  const { projectId } = await params;
  let project;
  try {
    project = await readProject(projectId);
  } catch (error) {
    if (isStudioError(error) && error.code === "not_found") {
      notFound();
    }
    const message = error instanceof Error ? error.message : String(error);
    return (
      <div className="min-h-screen">
        <StudioHeader />
        <main className="mx-auto max-w-4xl px-5 py-12">
          <p
            role="alert"
            className="rounded-lg border border-clay-500/40 bg-clay-500/10 px-4 py-3 text-sm text-clay-500"
          >
            {message}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <ProjectWorkspace project={project} />
      </main>
    </div>
  );
}
