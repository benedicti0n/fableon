import type { Metadata } from "next";
import Link from "next/link";

import { StudioHeader } from "@/components/studio/studio-header";
import { stage2bWorkspaceStatus } from "@/lib/providers/stage2b-status";

export const metadata: Metadata = {
  title: "Stage 2B Character Rigs",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Stage2BPage() {
  const status = await stage2bWorkspaceStatus();
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1500px] space-y-5 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5.1 · Stage 2B
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              Complete character rigs
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
              Open provider packs, inspect the 31-part contract, and watch the local eight-second
              walk–reach–grip test. Authorization remains explicit; this page never spends.
            </p>
          </div>
          <Link
            href="/studio/providers"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300"
          >
            Back to providers
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {status.providers.map((provider) => (
            <section
              key={provider.provider}
              className="rounded-lg border border-ink-700 bg-ink-950 p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-2xl capitalize text-paper-50">
                  {provider.provider}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">
                  {provider.authorization?.status ?? "no authorization"}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-mist-500">Cap</dt>
                  <dd className="text-paper-100">
                    {provider.authorization
                      ? `$${provider.authorization.maxCostUsd.toFixed(2)}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-mist-500">Requests</dt>
                  <dd className="text-paper-100">
                    {provider.authorization
                      ? `${provider.authorization.requestCount} / ${provider.authorization.maxRequests}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-mist-500">Estimated sheets</dt>
                  <dd className="text-paper-100">${provider.estimatedTotalUsd.toFixed(6)}</dd>
                </div>
                <div>
                  <dt className="text-mist-500">Pack</dt>
                  <dd className="text-paper-100">
                    {provider.packStatus} · {provider.partCount} / 31 parts
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {provider.estimates.map((estimate) => (
                  <span
                    key={estimate.sheet}
                    className="rounded border border-ink-700 px-2 py-1 font-mono text-[10px] text-mist-400"
                  >
                    {estimate.sheet} · {estimate.usd === null ? "—" : `$${estimate.usd.toFixed(6)}`}
                  </span>
                ))}
              </div>
              {provider.missingParts.length > 0 ? (
                <p className="mt-3 text-[11px] leading-5 text-mist-500">
                  Missing: {provider.missingParts.slice(0, 10).join(", ")}
                  {provider.missingParts.length > 10
                    ? ` +${provider.missingParts.length - 10}`
                    : ""}
                </p>
              ) : null}
              {provider.validationErrors.length > 0 ? (
                <p className="mt-3 rounded border border-clay-500/30 bg-clay-500/10 p-2 text-[11px] text-clay-300">
                  {provider.validationErrors[0]}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {provider.characterVideo ? (
                  <a
                    href={provider.characterVideo}
                    className="rounded border border-ochre-500/60 px-3 py-1.5 text-xs text-ochre-300"
                  >
                    Download character test
                  </a>
                ) : (
                  <span className="text-[11px] text-mist-500">
                    Character test not rendered yet.
                  </span>
                )}
                {provider.variationVideo ? (
                  <a
                    href={provider.variationVideo}
                    className="rounded border border-ink-700 px-3 py-1.5 text-xs text-mist-300"
                  >
                    Download variation
                  </a>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-lg border border-ink-700 bg-ink-950 p-5">
          <h2 className="font-serif text-xl text-paper-50">Authorization summary</h2>
          <p className="mt-2 text-sm leading-6 text-mist-400">
            Combined estimate ${status.combinedEstimateUsd.toFixed(6)}. Combined cap is currently $
            {status.combinedCapUsd.toFixed(2)} and is not active unless both records show
            <span className="text-paper-100"> active</span> with an approver. The Stage 2A
            experiment is separate and cannot be reused.
          </p>
        </section>
      </main>
    </div>
  );
}
