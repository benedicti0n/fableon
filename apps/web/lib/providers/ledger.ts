import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getRepoRoot } from "@/lib/studio/repository";

import type { HostedProviderId } from "./catalog";

export type ProviderEventType =
  | "authorization-requested"
  | "authorization-approved"
  | "authorization-revoked"
  | "generation-requested"
  | "generation-authorized"
  | "generation-reserved"
  | "generation-submitted"
  | "generation-completed"
  | "generation-failed"
  | "image-accepted"
  | "image-rejected"
  | "asset-extracted"
  | "asset-repaired"
  | "part-approved"
  | "rig-completed"
  | "animation-exported";

export interface ProviderCostEvent {
  readonly id: string;
  readonly type: ProviderEventType;
  readonly at: string;
  readonly experimentId: string;
  readonly provider: HostedProviderId;
  readonly model: string | null;
  readonly requestKey: string | null;
  readonly authorizationId: string | null;
  readonly operation: string | null;
  readonly attempt: number;
  readonly outputCount: number;
  readonly inputReferenceCount: number;
  readonly status: string;
  readonly estimatedCostUsd: number | null;
  readonly reconciledCostUsd: number | null;
  readonly usage: unknown;
  readonly outputHashes: readonly string[];
  readonly note: string;
  readonly meta: Readonly<Record<string, unknown>>;
}

export interface ProviderSummary {
  readonly provider: HostedProviderId;
  readonly generationRequests: number;
  readonly generationCompleted: number;
  readonly generationFailed: number;
  readonly imagesAccepted: number;
  readonly imagesRejected: number;
  readonly assetsExtracted: number;
  readonly assetsRepaired: number;
  readonly partsApproved: number;
  readonly estimatedCostUsd: number;
  readonly reconciledCostUsd: number;
  readonly unknownChargeEvents: number;
  readonly acceptedCostPerAssetUsd: number | null;
  readonly completedRigs: number;
  readonly exportedAnimations: number;
}

export interface ProviderCostSummary {
  readonly generatedAt: string;
  readonly openai: ProviderSummary;
  readonly gemini: ProviderSummary;
  readonly actualCashSpendUsd: number;
  readonly unknownChargeEventCount: number;
  readonly notes: readonly string[];
}

export function providerBenchmarkRoot(): string {
  return path.join(getRepoRoot(), "outputs", "folk-provider-benchmark");
}

export function providerDirectory(provider: HostedProviderId): string {
  return path.join(providerBenchmarkRoot(), provider);
}

export function globalLedgerPath(): string {
  return path.join(providerBenchmarkRoot(), "usage-ledger.jsonl");
}

export function providerLedgerPath(provider: HostedProviderId): string {
  return path.join(providerDirectory(provider), "usage-ledger.json");
}

export async function appendProviderEvent(
  input: Omit<ProviderCostEvent, "id" | "at"> & { readonly at?: string },
): Promise<ProviderCostEvent> {
  const event: ProviderCostEvent = {
    id: `evt_${Date.now()}_${randomUUID().slice(0, 8)}`,
    at: input.at ?? new Date().toISOString(),
    ...input,
  };
  await mkdir(providerDirectory(event.provider), { recursive: true });
  await appendFile(globalLedgerPath(), `${JSON.stringify(event)}\n`, "utf8");
  const existing = await readProviderEvents(event.provider);
  await writeFile(
    providerLedgerPath(event.provider),
    `${JSON.stringify(existing, null, 2)}\n`,
    "utf8",
  );
  return event;
}

export async function readProviderEvents(
  provider?: HostedProviderId,
): Promise<readonly ProviderCostEvent[]> {
  try {
    const raw = await readFile(globalLedgerPath(), "utf8");
    const events = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as ProviderCostEvent);
    return provider ? events.filter((event) => event.provider === provider) : events;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

function summarize(
  provider: HostedProviderId,
  events: readonly ProviderCostEvent[],
): ProviderSummary {
  const scoped = events.filter((event) => event.provider === provider);
  const count = (type: ProviderEventType) => scoped.filter((event) => event.type === type).length;
  const requests = scoped.filter((event) => event.type === "generation-requested");
  const completed = scoped.filter((event) => event.type === "generation-completed");
  const failed = scoped.filter((event) => event.type === "generation-failed");
  const accepted = scoped.filter((event) => event.type === "image-accepted");
  const rejected = scoped.filter((event) => event.type === "image-rejected");
  const extracted = scoped.filter((event) => event.type === "asset-extracted");
  const repaired = scoped.filter((event) => event.type === "asset-repaired");
  const approved = scoped.filter((event) => event.type === "part-approved");
  const estimatedCostUsd = completed.reduce((sum, event) => sum + (event.estimatedCostUsd ?? 0), 0);
  const reconciledCostUsd = completed.reduce(
    (sum, event) => sum + (event.reconciledCostUsd ?? 0),
    0,
  );
  const unknownChargeEvents = completed.filter((event) => event.reconciledCostUsd === null).length;
  const acceptedAssetCount = accepted.length + approved.length;
  return {
    provider,
    generationRequests: requests.length,
    generationCompleted: completed.length,
    generationFailed: failed.length,
    imagesAccepted: accepted.length,
    imagesRejected: rejected.length,
    assetsExtracted: extracted.length,
    assetsRepaired: repaired.length,
    partsApproved: approved.length,
    estimatedCostUsd,
    reconciledCostUsd,
    unknownChargeEvents,
    acceptedCostPerAssetUsd: acceptedAssetCount > 0 ? reconciledCostUsd / acceptedAssetCount : null,
    completedRigs: count("rig-completed"),
    exportedAnimations: count("animation-exported"),
  };
}

export async function buildProviderCostSummary(): Promise<ProviderCostSummary> {
  const events = await readProviderEvents();
  const openai = summarize("openai", events);
  const gemini = summarize("gemini", events);
  const unknownChargeEventCount = openai.unknownChargeEvents + gemini.unknownChargeEvents;
  return {
    generatedAt: new Date().toISOString(),
    openai,
    gemini,
    actualCashSpendUsd: openai.reconciledCostUsd + gemini.reconciledCostUsd,
    unknownChargeEventCount,
    notes: [
      "Reconciled cost is taken from provider-reported usage when available; otherwise the event is counted as unknown, not zero.",
      "Accepted-asset counts are based on explicit image-accepted/part-approved events, not on generated output count.",
      "No paid request is authorized until a persisted spending authorization exists.",
    ],
  };
}

export async function writeProviderCostArtifacts(): Promise<ProviderCostSummary> {
  const summary = await buildProviderCostSummary();
  const dir = path.join(providerBenchmarkRoot(), "comparison");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "cost-comparison.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  return summary;
}
