import type { Metadata } from "next";
import Link from "next/link";

import { FolkStudio } from "@/components/studio/folk-studio";
import { StudioHeader } from "@/components/studio/studio-header";
import { providerWorkspaceStatus } from "@/lib/providers/service";

export const metadata: Metadata = {
  title: "Provider Film Production",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProviderProductionPage() {
  const status = await providerWorkspaceStatus();
  const completePack = status.packs.find((pack) => pack.missingSlots.length === 0);
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] space-y-5 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5.1 · provider film
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              Generated-artwork production
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
              This route becomes a real provider-film workspace only after a complete generated pack
              exists. It never substitutes the Phase 5 vector baseline for provider artwork.
            </p>
          </div>
          <Link
            href="/studio/providers"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300"
          >
            Generation gate
          </Link>
        </div>

        {completePack ? (
          <FolkStudio
            packUrl={completePack.manifestUrl.replace(/\/manifest\.json$/, "")}
            exportEnabled={false}
            heading={`${completePack.provider} · The Little Brass Bell`}
            subtitle="Provider-generated asset pack preview. Export remains gated until Stage 2 production authorization."
          />
        ) : (
          <div className="space-y-3 rounded-lg border border-ink-700 bg-ink-950 p-6">
            <h2 className="font-serif text-2xl text-paper-50">No complete provider pack</h2>
            <p className="text-sm leading-6 text-mist-400">
              Stage 1 stops at the paid-generation gate. A 30-second provider film is not claimed.
              To proceed, approve a provider/model/experiment budget, run the small art-quality
              gate, generate and review masters/parts/backgrounds, prepare the pack, and only then
              render the canonical five-shot film locally.
            </p>
            <p className="text-xs text-mist-500">
              Existing Phase 5 vector film remains intact at{" "}
              <code className="text-paper-200">outputs/folk-pilot/final.mp4</code> and is labelled
              the engineering baseline.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
