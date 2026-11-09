import type { Metadata } from "next";

import { StudioHeader } from "@/components/studio/studio-header";
import { listProjects } from "@/lib/studio/repository";
import type { ProjectSummary } from "@/lib/studio/types";

import { ProjectsDashboard } from "./projects-dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Video Projects",
  description: "Local-first project, shot, take, and review workspace for Fableon.",
  robots: { index: false, follow: false },
};

export default async function ProjectsPage() {
  let projects: ProjectSummary[] = [];
  let error: string | null = null;
  try {
    projects = await listProjects();
  } catch (loadError) {
    error = loadError instanceof Error ? loadError.message : String(loadError);
  }

  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <ProjectsDashboard projects={projects} loadError={error} />
      </main>
    </div>
  );
}
