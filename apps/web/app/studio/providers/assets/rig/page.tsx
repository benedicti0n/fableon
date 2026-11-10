import type { Metadata } from "next";
import Link from "next/link";

import { FolkRigEditor } from "@/components/studio/folk-rig-editor";
import { providerWorkspaceStatus } from "@/lib/providers/service";

export const metadata: Metadata = {
  title: "Provider Joint Stress Test",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProviderRigPage() {
  const status = await providerWorkspaceStatus();
  const complete = status.packs.find((pack) => pack.missingSlots.length === 0);
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-[1600px] space-y-4 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5.1 · generated rig stress test
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              Joint and pivot inspection
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
              Loads a complete provider pack through the same rig evaluator as the film. Use the
              preset frames and extra-rotation slider to inspect shoulders, elbows, hips, knees,
              neck, horse legs and harness attachment.
            </p>
          </div>
          <Link
            href="/studio/providers/assets"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300"
          >
            Back to slots
          </Link>
        </div>
        {complete ? (
          <FolkRigEditor packUrl={complete.manifestUrl.replace(/\/manifest\.json$/, "")} />
        ) : (
          <p className="rounded border border-clay-500/30 bg-clay-500/10 p-4 text-sm text-clay-300">
            No complete provider pack exists. The stress-test surface is implemented but has no
            generated artwork to load. Stage 1 does not substitute the vector baseline here.
          </p>
        )}
      </main>
    </div>
  );
}
