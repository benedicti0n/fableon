import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudioHeader } from "@/components/studio/studio-header";
import { isStudioError } from "@/lib/studio/errors";
import { readProject } from "@/lib/studio/repository";

import { ShotWorkspace } from "@/components/studio/shot-workspace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shot Workspace",
  robots: { index: false, follow: false },
};

export default async function ShotPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly projectId: string; readonly shotId: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectId, shotId } = await params;
  const query = await searchParams;
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

  const shot = project.shots.find((item) => item.id === shotId);
  if (!shot) {
    notFound();
  }

  const requestedTake = typeof query.take === "string" ? query.take : null;
  const selectedTakeId =
    requestedTake !== null && shot.takes.some((take) => take.id === requestedTake)
      ? requestedTake
      : (shot.currentTakeId ?? shot.takes[0]?.id ?? null);

  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] px-5 py-8">
        <ShotWorkspace project={project} initialShotId={shot.id} initialTakeId={selectedTakeId} />
      </main>
    </div>
  );
}
