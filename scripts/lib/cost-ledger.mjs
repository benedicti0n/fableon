import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const PRICING_REFERENCES = Object.freeze({
  local: {
    provider: "fableon-local",
    model: "original-vector + canvas2d + ffmpeg",
    source: "local hardware; no provider invoice",
    effectiveDate: "2026-11-10",
    outputUsd: 0,
  },
  bfl: {
    provider: "Black Forest Labs",
    model: "FLUX 3 Image Klein",
    source: "planning-phase indicative price supplied in Phase 5 brief",
    effectiveDate: "2026-11-10",
    outputUsd: 0.014,
  },
  gemini: {
    provider: "Google",
    model: "gemini-nano-banana-2.1",
    source: "planning-phase indicative price supplied in Phase 5 brief",
    effectiveDate: "2026-11-10",
    outputUsd: 0.0504,
  },
  openai: {
    provider: "OpenAI",
    model: "gpt-image-2 medium 1536x1024",
    source: "planning-phase indicative price supplied in Phase 5 brief",
    effectiveDate: "2026-11-10",
    outputUsd: 0.041,
  },
});

export function costPaths(root) {
  const dir = join(root, "outputs", "folk-pilot");
  return {
    dir,
    events: join(dir, "cost-events.jsonl"),
    ledger: join(dir, "cost-ledger.json"),
    csv: join(dir, "generation-costs.csv"),
    report: join(dir, "final-cost-report.json"),
  };
}

export function createCostEvent(input) {
  const now = new Date().toISOString();
  return {
    id: `cost_${Date.now()}_${randomUUID().slice(0, 8)}`,
    operation: input.operation,
    assetId: input.assetId ?? null,
    shotId: input.shotId ?? null,
    provider: input.provider,
    model: input.model,
    startedAt: input.startedAt ?? now,
    finishedAt: input.finishedAt ?? now,
    status: input.status ?? "completed",
    attempt: input.attempt ?? 1,
    inputReferences: input.inputReferences ?? [],
    outputHash: input.outputHash ?? null,
    outputCount: input.outputCount ?? 0,
    runtimeMs: input.runtimeMs ?? 0,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    pricingSource: input.pricingSource ?? "local-no-charge",
    pricingEffectiveDate: input.pricingEffectiveDate ?? "2026-11-10",
    estimatedChargeUsd: input.estimatedChargeUsd ?? 0,
    actualChargeUsd: input.actualChargeUsd ?? null,
    billingReconciliation: input.billingReconciliation ?? "not_applicable_local",
    note: input.note ?? "",
  };
}

export function appendCostEvent(root, event) {
  const paths = costPaths(root);
  mkdirSync(paths.dir, { recursive: true });
  appendFileSync(paths.events, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

export function readCostEvents(root) {
  const paths = costPaths(root);
  if (!existsSync(paths.events)) return [];
  return readFileSync(paths.events, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function writeCostArtifacts(root, events, metadata = {}) {
  const paths = costPaths(root);
  mkdirSync(paths.dir, { recursive: true });
  writeFileSync(paths.ledger, `${JSON.stringify(events, null, 2)}\n`, "utf8");
  const header = [
    "id",
    "operation",
    "assetId",
    "shotId",
    "provider",
    "model",
    "status",
    "attempt",
    "startedAt",
    "finishedAt",
    "runtimeMs",
    "outputCount",
    "outputHash",
    "estimatedChargeUsd",
    "actualChargeUsd",
    "billingReconciliation",
  ];
  const rows = [header.join(",")];
  for (const event of events) {
    rows.push(header.map((key) => csvCell(event[key])).join(","));
  }
  writeFileSync(paths.csv, `${rows.join("\n")}\n`, "utf8");

  const apiEvents = events.filter((event) => event.provider !== "fableon-local-vector");
  const renderEvents = events.filter((event) => event.operation.startsWith("render"));
  const assetEvents = events.filter((event) => event.operation === "asset-generation");
  const actualApiSpend = apiEvents.reduce(
    (sum, event) => sum + (event.actualChargeUsd ?? event.estimatedChargeUsd ?? 0),
    0,
  );
  const approvedAssets = events
    .filter((event) => event.operation === "asset-generation" && event.status === "completed")
    .reduce((sum, event) => sum + event.outputCount, 0);
  const approvedMasterArtworks = metadata.approvedMasterArtworks ?? 6;
  const scenarioOutputs = metadata.scenarioOutputs ?? approvedMasterArtworks * 2;
  const totalFrames = renderEvents.reduce((sum, event) => sum + event.outputCount, 0);
  const runtimeMs = renderEvents.reduce((sum, event) => sum + event.runtimeMs, 0);
  const report = {
    generatedAt: new Date().toISOString(),
    production: "The Little Brass Bell",
    ledgerPath: "outputs/folk-pilot/cost-ledger.json",
    events: events.length,
    totalApiSpendUsd: actualApiSpend,
    totalGenerationAttempts: assetEvents.reduce((sum, event) => sum + event.attempt, 0),
    successfulGenerations: assetEvents.filter((event) => event.status === "completed").length,
    approvedAssets,
    approvedMasterArtworks,
    approvedParts: approvedAssets,
    rejectedAssets: 0,
    apiCostPerApprovedAsset: approvedAssets > 0 ? actualApiSpend / approvedAssets : 0,
    apiCostPerCharacter: 0,
    apiCostPerBackground: 0,
    localGenerationRuntimeMs: assetEvents.reduce((sum, event) => sum + event.runtimeMs, 0),
    localRenderRuntimeMs: runtimeMs,
    measuredOrEstimatedEnergy: "unknown",
    manualPreparationMinutes: 0,
    agentAuthoringMinutes: metadata.agentAuthoringMinutes ?? null,
    firstFilmApiCostUsd: actualApiSpend,
    repeatRenderApiCostUsd: 0,
    framesRendered: totalFrames,
    scenarioOutputs,
    scenarioAssumption:
      "Hosted-provider scenarios assume six master artworks (artisan, horse, cart, bell, two backgrounds) with two candidate attempts each. They are price-based estimates, not observed calls.",
    electricity: {
      status: "unknown",
      reason:
        "No calibrated wall-power meter or GPU power telemetry is available on the Apple M1 test host.",
      instructions:
        "Measure whole-system wall power with a calibrated meter during a 60-second render and multiply mean kW by hours; do not label GPU-only data as total system energy.",
    },
    hypotheticalAlternatives: [
      {
        provider: PRICING_REFERENCES.bfl.provider,
        model: PRICING_REFERENCES.bfl.model,
        kind: "price-based scenario, not executed",
        outputs: scenarioOutputs,
        estimatedCostUsd: scenarioOutputs * PRICING_REFERENCES.bfl.outputUsd,
        assumption: `${approvedMasterArtworks} master artworks × 2 candidate attempts; not executed`,
        costPerMasterUsd: 2 * PRICING_REFERENCES.bfl.outputUsd,
        pricingSource: PRICING_REFERENCES.bfl.source,
      },
      {
        provider: PRICING_REFERENCES.gemini.provider,
        model: PRICING_REFERENCES.gemini.model,
        kind: "price-based scenario, not executed",
        outputs: scenarioOutputs,
        estimatedCostUsd: scenarioOutputs * PRICING_REFERENCES.gemini.outputUsd,
        assumption: `${approvedMasterArtworks} master artworks × 2 candidate attempts; not executed`,
        costPerMasterUsd: 2 * PRICING_REFERENCES.gemini.outputUsd,
        pricingSource: PRICING_REFERENCES.gemini.source,
      },
      {
        provider: PRICING_REFERENCES.openai.provider,
        model: PRICING_REFERENCES.openai.model,
        kind: "price-based scenario, not executed",
        outputs: scenarioOutputs,
        estimatedCostUsd: scenarioOutputs * PRICING_REFERENCES.openai.outputUsd,
        assumption: `${approvedMasterArtworks} master artworks × 2 candidate attempts; not executed`,
        costPerMasterUsd: 2 * PRICING_REFERENCES.openai.outputUsd,
        pricingSource: PRICING_REFERENCES.openai.source,
      },
    ],
    notes: metadata.notes ?? [],
  };
  writeFileSync(paths.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}
