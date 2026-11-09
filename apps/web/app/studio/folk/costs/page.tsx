import type { Metadata } from "next";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { StudioHeader } from "@/components/studio/studio-header";

export const metadata: Metadata = {
  title: "Folk Cost Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface CostReport {
  readonly generatedAt: string;
  readonly totalApiSpendUsd: number;
  readonly totalGenerationAttempts: number;
  readonly successfulGenerations: number;
  readonly approvedAssets: number;
  readonly rejectedAssets: number;
  readonly apiCostPerApprovedAsset: number;
  readonly localGenerationRuntimeMs: number;
  readonly localRenderRuntimeMs: number;
  readonly measuredOrEstimatedEnergy: string;
  readonly manualPreparationMinutes: number;
  readonly framesRendered: number;
  readonly firstFilmApiCostUsd: number;
  readonly repeatRenderApiCostUsd: number;
  readonly hypotheticalAlternatives: readonly {
    readonly provider: string;
    readonly model: string;
    readonly kind: string;
    readonly outputs: number;
    readonly estimatedCostUsd: number;
    readonly pricingSource: string;
  }[];
  readonly electricity: {
    readonly status: string;
    readonly reason: string;
    readonly instructions: string;
  };
  readonly notes?: readonly string[];
}

async function readReport(): Promise<CostReport | null> {
  const candidates = [
    path.join(process.cwd(), "..", "outputs", "folk-pilot", "final-cost-report.json"),
    path.join(process.cwd(), "outputs", "folk-pilot", "final-cost-report.json"),
    path.join(process.cwd(), "..", "..", "outputs", "folk-pilot", "final-cost-report.json"),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(await readFile(candidate, "utf8")) as CostReport;
    } catch {
      // Try the next location.
    }
  }
  return null;
}

function money(value: number): string {
  return `$${value.toFixed(4)}`;
}

export default async function FolkCostsPage() {
  const report = await readReport();
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] space-y-5 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5 · cost dashboard
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              Real production cost
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
              Actual API spend, local compute runtime, and clearly labeled price-based scenarios. No
              provider invoice is invented. Local electricity remains unknown without a calibrated
              meter.
            </p>
          </div>
          <Link
            href="/studio/folk"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300 hover:text-paper-50"
          >
            Back to production
          </Link>
        </div>

        {!report ? (
          <p className="rounded border border-ink-700 bg-ink-900 p-4 text-sm text-mist-400">
            No final cost report exists yet. Run the folk render script to generate
            <code className="mx-1 text-paper-200">outputs/folk-pilot/final-cost-report.json</code>.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Actual API spend", money(report.totalApiSpendUsd)],
                ["Approved assets", String(report.approvedAssets)],
                ["Generation attempts", String(report.totalGenerationAttempts)],
                ["Frames rendered", String(report.framesRendered)],
                ["Local asset runtime", `${(report.localGenerationRuntimeMs / 1000).toFixed(1)} s`],
                ["Local render runtime", `${(report.localRenderRuntimeMs / 1000).toFixed(1)} s`],
                ["Manual preparation", `${report.manualPreparationMinutes} min`],
                ["Electricity", report.electricity.status],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-ink-700 bg-ink-950 p-4">
                  <span className="font-mono text-[9px] uppercase tracking-wide text-mist-500">
                    {label}
                  </span>
                  <p className="mt-1 text-xl text-paper-50">{value}</p>
                </div>
              ))}
            </div>

            <section className="rounded-lg border border-ink-700 bg-ink-950 p-4">
              <h2 className="font-serif text-2xl text-paper-50">Marginal cost</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded border border-ink-800 bg-ink-900 p-3">
                  <p className="font-mono text-[9px] uppercase text-mist-500">
                    First film API cash
                  </p>
                  <p className="mt-1 text-lg text-paper-50">{money(report.firstFilmApiCostUsd)}</p>
                </div>
                <div className="rounded border border-ink-800 bg-ink-900 p-3">
                  <p className="font-mono text-[9px] uppercase text-mist-500">
                    Repeat render API cash
                  </p>
                  <p className="mt-1 text-lg text-paper-50">
                    {money(report.repeatRenderApiCostUsd)}
                  </p>
                </div>
                <div className="rounded border border-ink-800 bg-ink-900 p-3">
                  <p className="font-mono text-[9px] uppercase text-mist-500">
                    API per approved asset
                  </p>
                  <p className="mt-1 text-lg text-paper-50">
                    {money(report.apiCostPerApprovedAsset)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-ink-700 bg-ink-950 p-4">
              <h2 className="font-serif text-2xl text-paper-50">Provider comparison</h2>
              <p className="mt-1 text-[11px] text-mist-500">
                Only the local provider was executed. The rows below are price-based scenarios, not
                observed outputs.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="font-mono text-[9px] uppercase text-mist-500">
                    <tr>
                      <th className="border-b border-ink-700 py-2">Provider</th>
                      <th className="border-b border-ink-700 py-2">Model</th>
                      <th className="border-b border-ink-700 py-2">Kind</th>
                      <th className="border-b border-ink-700 py-2">Outputs</th>
                      <th className="border-b border-ink-700 py-2">Estimated</th>
                    </tr>
                  </thead>
                  <tbody className="text-mist-300">
                    <tr>
                      <td className="border-b border-ink-800 py-2">Fableon local</td>
                      <td className="border-b border-ink-800 py-2">vector + Canvas + FFmpeg</td>
                      <td className="border-b border-ink-800 py-2">executed</td>
                      <td className="border-b border-ink-800 py-2">{report.approvedAssets}</td>
                      <td className="border-b border-ink-800 py-2">$0.0000</td>
                    </tr>
                    {report.hypotheticalAlternatives.map((row) => (
                      <tr key={`${row.provider}-${row.model}`}>
                        <td className="border-b border-ink-800 py-2">{row.provider}</td>
                        <td className="border-b border-ink-800 py-2">{row.model}</td>
                        <td className="border-b border-ink-800 py-2 text-clay-400">{row.kind}</td>
                        <td className="border-b border-ink-800 py-2">{row.outputs}</td>
                        <td className="border-b border-ink-800 py-2">
                          {money(row.estimatedCostUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-ink-700 bg-ink-950 p-4 text-xs leading-6 text-mist-400">
              <h2 className="font-serif text-2xl text-paper-50">Electricity limitation</h2>
              <p className="mt-2">{report.electricity.reason}</p>
              <p className="mt-1 text-mist-500">{report.electricity.instructions}</p>
              <p className="mt-2 font-mono text-[10px] text-mist-600">
                report generated {report.generatedAt}
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
