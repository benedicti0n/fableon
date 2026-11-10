import type { Metadata } from "next";
import Link from "next/link";

import { StudioHeader } from "@/components/studio/studio-header";
import { RIG_SLOTS } from "@/lib/providers/rig-slots";
import { providerWorkspaceStatus } from "@/lib/providers/service";

export const metadata: Metadata = {
  title: "Provider Rig Slots",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProviderAssetsPage() {
  const status = await providerWorkspaceStatus();
  const actors = ["artisan", "horse", "cart", "bell"] as const;
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1500px] space-y-5 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5.1 · generated asset contract
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              Semantic rig slots
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
              Provider artwork must map to these named slots. The pack preparation step validates
              alpha, records measured pivots/offsets, and reports every missing slot. Generated
              artwork is not accepted merely because it looks good as a flat image.
            </p>
          </div>
          <Link
            href="/studio/providers"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300"
          >
            Back to generation gate
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-ink-700 bg-ink-950 p-4">
            <p className="font-mono text-[9px] uppercase text-mist-500">Required slots</p>
            <p className="mt-1 text-2xl text-paper-50">{RIG_SLOTS.length}</p>
          </div>
          <div className="rounded-lg border border-ink-700 bg-ink-950 p-4">
            <p className="font-mono text-[9px] uppercase text-mist-500">Provider packs</p>
            <p className="mt-1 text-2xl text-paper-50">{status.packs.length}</p>
          </div>
          <div className="rounded-lg border border-ink-700 bg-ink-950 p-4">
            <p className="font-mono text-[9px] uppercase text-mist-500">Paid generations</p>
            <p className="mt-1 text-2xl text-paper-50">0</p>
          </div>
        </div>

        {status.packs.length > 0 ? (
          <div className="rounded-lg border border-ink-700 bg-ink-950 p-4 text-xs text-mist-400">
            {status.packs.map((pack) => (
              <p key={pack.provider}>
                {pack.provider} · {pack.title} ·{" "}
                {pack.missingSlots.length === 0
                  ? "complete"
                  : `${pack.missingSlots.length} missing slots`}
              </p>
            ))}
          </div>
        ) : (
          <p className="rounded border border-clay-500/30 bg-clay-500/10 p-3 text-xs text-clay-300">
            No provider pack exists yet. Stage 1 does not fabricate assets or placeholders.
          </p>
        )}

        {actors.map((actor) => {
          const slots = RIG_SLOTS.filter((slot) => slot.actor === actor);
          return (
            <section key={actor} className="rounded-lg border border-ink-700 bg-ink-950">
              <div className="border-b border-ink-800 px-4 py-3">
                <h2 className="font-serif text-xl capitalize text-paper-50">{actor}</h2>
                <p className="font-mono text-[9px] text-mist-500">{slots.length} slots</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="font-mono text-[9px] uppercase text-mist-500">
                    <tr>
                      <th className="px-4 py-2">Part ID</th>
                      <th className="px-4 py-2">Node</th>
                      <th className="px-4 py-2">Parent</th>
                      <th className="px-4 py-2">Pivot</th>
                      <th className="px-4 py-2">Draw order</th>
                    </tr>
                  </thead>
                  <tbody className="text-mist-300">
                    {slots.map((slot) => (
                      <tr key={slot.partId} className="border-t border-ink-800">
                        <td className="px-4 py-1.5 font-mono text-[10px]">{slot.partId}</td>
                        <td className="px-4 py-1.5">{slot.nodeId}</td>
                        <td className="px-4 py-1.5 text-mist-500">{slot.parentNodeId ?? "root"}</td>
                        <td className="px-4 py-1.5 font-mono text-[10px]">
                          {slot.pivot.x.toFixed(0)},{slot.pivot.y.toFixed(0)}
                        </td>
                        <td className="px-4 py-1.5">{slot.drawOrder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
