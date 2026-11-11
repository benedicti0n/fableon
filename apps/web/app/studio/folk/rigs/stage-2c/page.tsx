/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRepoRoot } from "@/lib/studio/repository";
import { getStage2C5State } from "@/lib/providers/stage2c5-storage";
import { Stage2C5MaskWorkshop } from "@/components/studio/stage2c5-mask-workshop";
export const metadata: Metadata = {
  title: "Stage 2C Blueprints",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
interface Contract {
  readonly characterId: string;
  readonly master: { readonly source: string; readonly width: number; readonly height: number };
  readonly parts: readonly {
    readonly id: string;
    readonly role: string;
    readonly expectedSegmentLengthPx: number;
    readonly approvalStatus: string;
  }[];
}
async function load(provider: string): Promise<Contract | null> {
  try {
    return JSON.parse(
      await readFile(
        path.join(
          getRepoRoot(),
          "outputs",
          "folk-provider-benchmark",
          "stage-2c",
          provider,
          "contract.json",
        ),
        "utf8",
      ),
    ) as Contract;
  } catch {
    return null;
  }
}
export default async function Stage2CBlueprintsPage() {
  const [openai, gemini, stage2c5] = await Promise.all([
    load("openai"),
    load("gemini"),
    getStage2C5State(),
  ]);
  return (
    <main className="mx-auto max-w-[1500px] space-y-5 px-5 py-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ochre-400">
            Phase 5.1 · Stage 2C.5
          </p>
          <h1 className="mt-2 font-serif text-4xl text-paper-50">Precision mask workshop</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
            Edit source-resolution masks for the paid repair sheets, inspect the extracted part, and
            save versioned revisions. Source sheets are immutable.
          </p>
        </div>
        <Link
          href="/studio/folk/rigs/connectors"
          className="rounded border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300"
        >
          Connector editor
        </Link>
      </div>
      <Stage2C5MaskWorkshop state={stage2c5} />
      <div className="grid gap-5 md:grid-cols-2">
        {(
          [
            ["openai", openai],
            ["gemini", gemini],
          ] as const
        ).map(([provider, contract]) => (
          <section key={provider} className="rounded-lg border border-ink-700 bg-ink-950 p-4">
            <h2 className="font-serif text-2xl capitalize text-paper-50">{provider}</h2>
            {contract ? (
              <p className="mt-1 font-mono text-[10px] text-mist-500">
                {contract.characterId} · master {contract.master.width}×{contract.master.height}
              </p>
            ) : (
              <p className="text-xs text-clay-300">Contract missing.</p>
            )}
            <img
              src={`/api/studio/providers/stage-2c/${provider}/full-guide.png`}
              alt={`${provider} arm and leg blueprint`}
              className="mt-3 w-full rounded border border-ink-800 bg-black object-contain"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["nearUpperArm", "nearForearm", "nearThigh", "nearShin"].map((part) => (
                <div key={part} className="rounded border border-ink-800 p-2">
                  <p className="font-mono text-[10px] text-ochre-300">{part}</p>
                  <img
                    src={`/api/studio/providers/stage-2c/${provider}/visible-${part}.png`}
                    alt={`${provider} ${part} source region`}
                    className="mt-1 h-24 w-full object-contain"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {contract?.parts.map((part) => (
                <p key={part.id} className="font-mono text-[10px] text-mist-400">
                  {part.id} · {part.role} · {Math.round(part.expectedSegmentLengthPx)} px ·{" "}
                  {part.approvalStatus}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="rounded border border-clay-500/30 bg-clay-500/10 p-3 text-xs text-clay-300">
        Stage 2C paid generation is blocked pending explicit approval. These are offline source
        extracts, not approved production sprites.
      </p>
    </main>
  );
}
