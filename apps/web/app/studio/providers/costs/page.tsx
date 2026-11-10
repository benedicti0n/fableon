import type { Metadata } from "next";
import Link from "next/link";

import { StudioHeader } from "@/components/studio/studio-header";
import { listProviderAuthorizations } from "@/lib/providers/authorization";
import { buildProviderCostSummary } from "@/lib/providers/ledger";

export const metadata: Metadata = {
  title: "Provider Cost Comparison",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function money(value: number | null): string {
  return value === null ? "unknown" : `$${value.toFixed(4)}`;
}

export default async function ProviderCostsPage() {
  const [summary, authorizations] = await Promise.all([
    buildProviderCostSummary(),
    listProviderAuthorizations(),
  ]);
  const stage2b = authorizations.filter(
    (authorization) => authorization.experimentId === "phase-05.1-stage-2b",
  );
  const rows = [
    ["Generation requests", summary.openai.generationRequests, summary.gemini.generationRequests],
    [
      "Completed generations",
      summary.openai.generationCompleted,
      summary.gemini.generationCompleted,
    ],
    ["Failed generations", summary.openai.generationFailed, summary.gemini.generationFailed],
    ["Images accepted", summary.openai.imagesAccepted, summary.gemini.imagesAccepted],
    ["Images rejected", summary.openai.imagesRejected, summary.gemini.imagesRejected],
    ["Assets extracted", summary.openai.assetsExtracted, summary.gemini.assetsExtracted],
    ["Assets repaired", summary.openai.assetsRepaired, summary.gemini.assetsRepaired],
    ["Parts approved", summary.openai.partsApproved, summary.gemini.partsApproved],
    [
      "Estimated spend",
      money(summary.openai.estimatedCostUsd),
      money(summary.gemini.estimatedCostUsd),
    ],
    [
      "Reconciled spend",
      money(summary.openai.reconciledCostUsd),
      money(summary.gemini.reconciledCostUsd),
    ],
    [
      "Cost / accepted asset",
      money(summary.openai.acceptedCostPerAssetUsd),
      money(summary.gemini.acceptedCostPerAssetUsd),
    ],
    ["Rigs completed", summary.openai.completedRigs, summary.gemini.completedRigs],
    ["Animations exported", summary.openai.exportedAnimations, summary.gemini.exportedAnimations],
  ] as const;
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1500px] space-y-5 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5.1 · cost comparison
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              OpenAI vs Gemini
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
              Actuals from completed provider work. Unknown charges are shown as unknown, not zero.
              Authorization caps are separate from reported usage; Stage 2B has made no paid
              request.
            </p>
          </div>
          <Link
            href="/studio/providers"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300"
          >
            Back to generation gate
          </Link>
        </div>

        <div className="rounded-lg border border-ochre-500/40 bg-ochre-500/10 p-4 text-sm text-ochre-100">
          Spend status: <strong>{authorizations.length}</strong> authorization record(s),{" "}
          <strong>
            {summary.actualCashSpendUsd === 0 ? "$0.00" : money(summary.actualCashSpendUsd)}
          </strong>{" "}
          actual reconciled spend. Stage 2B records: <strong>{stage2b.length}</strong>, with{" "}
          <strong>{stage2b.filter((entry) => entry.status === "active").length}</strong> active. No
          film has been claimed for either provider.
        </div>

        <div className="overflow-x-auto rounded-lg border border-ink-700">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-ink-900 font-mono text-[9px] uppercase tracking-wide text-mist-500">
              <tr>
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">OpenAI</th>
                <th className="px-4 py-3">Gemini</th>
              </tr>
            </thead>
            <tbody className="bg-ink-950 text-mist-300">
              {rows.map(([label, openai, gemini]) => (
                <tr key={label} className="border-t border-ink-800">
                  <td className="px-4 py-2">{label}</td>
                  <td className="px-4 py-2 font-mono">{String(openai)}</td>
                  <td className="px-4 py-2 font-mono">{String(gemini)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {authorizations.map((authorization) => (
            <div
              key={authorization.id}
              className="rounded-lg border border-ink-700 bg-ink-950 p-4 text-xs text-mist-400"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg capitalize text-paper-50">
                  {authorization.provider}
                </span>
                <span
                  className={authorization.status === "active" ? "text-sage-400" : "text-clay-400"}
                >
                  {authorization.status}
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px]">{authorization.model}</p>
              <p className="mt-2">
                cap {money(authorization.maxCostUsd)} · spent {money(authorization.spentCostUsd)} ·
                reserved {money(authorization.reservedCostUsd)}
              </p>
              <p className="mt-1 text-[10px]">
                {authorization.experimentId} · expires{" "}
                {new Date(authorization.expiresAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-ink-700 bg-ink-950 p-4 text-[11px] leading-6 text-mist-400">
          <h2 className="font-serif text-xl text-paper-50">What is not yet claimed</h2>
          <p className="mt-2">
            No complete 31-part Stage 2B rig, eight-second provider animation, or provider film is
            claimed yet. The Stage 2A masters, parts and costs are real and preserved. Stage 2B
            generation waits for explicit approval of its separate experiment-scoped caps.
          </p>
          <p className="mt-1 text-mist-500">{summary.notes.join(" ")}</p>
        </div>
      </main>
    </div>
  );
}
