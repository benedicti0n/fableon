"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Panel } from "@/components/ui/panel";
import { studioFetch, studioPostJson, StudioApiError } from "@/lib/studio/client";

import {
  studioInputClassName,
  studioLabelClassName,
  studioPrimaryButtonClassName,
  studioSecondaryButtonClassName,
  studioSelectClassName,
} from "./ui";

interface ProviderModelStatus {
  readonly id: string;
  readonly label: string;
  readonly guidance: string;
  readonly pricingVersion: string;
  readonly pricingSource: string;
  readonly capabilities: {
    readonly nativeTransparentBackground: boolean;
    readonly maskGuidedEdit: boolean;
    readonly maxReferences: number;
    readonly imageSizes: readonly string[];
    readonly qualities: readonly string[];
  };
}

interface ProviderStatus {
  readonly providers: readonly {
    readonly provider: "openai" | "gemini";
    readonly configured: boolean;
    readonly models: readonly ProviderModelStatus[];
  }[];
  readonly authorizations: readonly {
    readonly id: string;
    readonly experimentId: string;
    readonly provider: "openai" | "gemini";
    readonly model: string;
    readonly status: string;
    readonly maxCostUsd: number;
    readonly spentCostUsd: number;
    readonly reservedCostUsd: number;
    readonly maxRequests: number;
    readonly requestCount: number;
    readonly expiresAt: string;
  }[];
  readonly packs: readonly {
    readonly provider: "openai" | "gemini";
    readonly manifestUrl: string;
    readonly title: string;
    readonly generationMode: string;
    readonly model: string | null;
    readonly missingSlots: readonly string[];
  }[];
  readonly outputRoot: string;
}

interface EstimateResponse {
  readonly estimate: {
    readonly estimatedCostUsd: number;
    readonly maxCostUsd: number;
    readonly pricingSource: string;
    readonly pricingVersion: string;
    readonly pricingVerified: boolean;
    readonly estimateBasis: string;
    readonly assumptions: readonly string[];
  };
  readonly keyConfigured: boolean;
  readonly authorizationError: string | null;
  readonly authorization: {
    readonly id: string;
    readonly remainingUsd: number;
    readonly expiresAt: string;
  } | null;
}

function money(value: number): string {
  return `$${value.toFixed(4)}`;
}

export function ProviderWorkspace() {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [model, setModel] = useState("gpt-image-2.6-sunburst");
  const [operation, setOperation] = useState("generate-master");
  const [prompt, setPrompt] = useState(
    "Original Rajasthani folk-art cutaway illustration of a village artisan, full-body side profile, bold black outline, flat ochre and indigo clothing, stable facial identity, no text, clean silhouette, rig-friendly separate limbs.",
  );
  const [width, setWidth] = useState(1536);
  const [height, setHeight] = useState(1024);
  const [quality, setQuality] = useState("medium");
  const [imageSize, setImageSize] = useState("2K");
  const [aspectRatio, setAspectRatio] = useState("3:2");
  const [outputCount, setOutputCount] = useState(1);
  const [transparent, setTransparent] = useState(true);
  const [references, setReferences] = useState("");
  const [experimentId, setExperimentId] = useState("phase-05.1-folk-pilot");
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [maxCostUsd, setMaxCostUsd] = useState(1);
  const [maxRequests, setMaxRequests] = useState(4);
  const [maxOutputs, setMaxOutputs] = useState(2);
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const providerStatus = status?.providers.find((entry) => entry.provider === provider);
  const models = useMemo(() => providerStatus?.models ?? [], [providerStatus]);
  const currentModel = useMemo(
    () => models.find((entry) => entry.id === model) ?? models[0],
    [models, model],
  );

  async function refresh(): Promise<void> {
    try {
      const next = await studioFetch<ProviderStatus>("/api/studio/providers/status");
      setStatus(next);
      const first = next.providers.find((entry) => entry.provider === provider)?.models[0];
      if (
        first &&
        !next.providers.some((entry) => entry.models.some((modelEntry) => modelEntry.id === model))
      ) {
        setModel(first.id);
        setTransparent(first.capabilities.nativeTransparentBackground);
        setQuality(first.capabilities.qualities.includes("medium") ? "medium" : "standard");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
    // Fetch once on mount; provider/model changes are handled by explicit controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runEstimate(): Promise<void> {
    setEstimateError(null);
    setMessage(null);
    try {
      const parsedReferences = references
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((reference, index) => ({
          id: `ref-${index + 1}`,
          path: reference,
          mimeType: "image/png",
        }));
      const response = await studioPostJson<EstimateResponse>("/api/studio/providers/estimate", {
        experimentId,
        provider,
        model,
        operation,
        prompt,
        width,
        height,
        quality,
        imageSize,
        aspectRatio,
        outputCount,
        transparentBackground: transparent,
        references: parsedReferences,
      });
      setEstimate(response);
    } catch (caught) {
      setEstimateError(caught instanceof StudioApiError ? caught.message : String(caught));
    }
  }

  async function requestAuthorization(): Promise<void> {
    setMessage(null);
    try {
      const response = await studioPostJson<{ authorization: { id: string } }>(
        "/api/studio/providers/authorizations",
        {
          experimentId,
          provider,
          model,
          requestedBy: "local-user",
          maxCostUsd,
          maxRequests,
          maxOutputsPerRequest: maxOutputs,
          maxWidth: 2048,
          maxHeight: 2048,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          notes: "Stage 1 pending request; approval requires explicit user confirmation.",
        },
      );
      setMessage(
        `Pending authorization ${response.authorization.id}. No spending is authorized yet.`,
      );
      setConfirmation(`APPROVE $${maxCostUsd.toFixed(2)}`);
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof StudioApiError ? caught.message : String(caught));
    }
  }

  async function approve(id: string): Promise<void> {
    setMessage(null);
    try {
      await studioPostJson(`/api/studio/providers/authorizations/${id}/approve`, {
        approvedBy: "local-user",
        confirmation,
      });
      setMessage("Authorization approved. No generation has run yet.");
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof StudioApiError ? caught.message : String(caught));
    }
  }

  async function revoke(id: string): Promise<void> {
    setMessage(null);
    try {
      await studioPostJson(`/api/studio/providers/authorizations/${id}/revoke`, {
        revokedBy: "local-user",
      });
      setMessage("Authorization revoked.");
      await refresh();
    } catch (caught) {
      setMessage(caught instanceof StudioApiError ? caught.message : String(caught));
    }
  }

  async function generate(): Promise<void> {
    setMessage(null);
    if (!estimate?.authorization || !estimate.keyConfigured) {
      setMessage(
        "Generation is blocked: an active authorization and a server-side key are both required. No paid request was made.",
      );
      return;
    }
    try {
      const requestKey = `stage1-dry-${Date.now()}`;
      const parsedReferences = references
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((reference, index) => ({
          id: `ref-${index + 1}`,
          path: reference,
          mimeType: "image/png",
        }));
      await studioPostJson("/api/studio/providers/generate", {
        experimentId,
        provider,
        model,
        operation,
        prompt,
        width,
        height,
        quality,
        imageSize,
        aspectRatio,
        outputCount,
        transparentBackground: transparent,
        requestKey,
        references: parsedReferences,
        authorizationId: estimate.authorization.id,
      });
      setMessage("Generation completed. Outputs await visual review; they were not auto-accepted.");
    } catch (caught) {
      setMessage(caught instanceof StudioApiError ? caught.message : String(caught));
    }
  }

  return (
    <div className="space-y-5" data-testid="provider-workspace">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
            Phase 5.1 · provider artwork
          </p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
            OpenAI / Gemini generation gate
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-mist-400">
            Stage 1 implementation. The adapters, pricing, authorizations, asset registration and
            cost ledger are real. No paid request has been made. A configured key is not permission
            to spend; each provider and experiment requires a separate explicit authorization.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link className={studioSecondaryButtonClassName} href="/studio/providers/costs">
            Cost comparison
          </Link>
          <Link className={studioSecondaryButtonClassName} href="/studio/providers/assets">
            Rig slots
          </Link>
          <Link className={studioSecondaryButtonClassName} href="/studio/providers/production">
            Production
          </Link>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {status?.providers.map((entry) => (
          <button
            key={entry.provider}
            type="button"
            onClick={() => {
              setProvider(entry.provider);
              const first = entry.models[0];
              if (first) {
                setModel(first.id);
                setTransparent(first.capabilities.nativeTransparentBackground);
                setQuality(first.capabilities.qualities.includes("medium") ? "medium" : "standard");
              }
              setEstimate(null);
            }}
            className={`rounded-lg border p-4 text-left ${
              provider === entry.provider
                ? "border-ochre-500/70 bg-ochre-500/10"
                : "border-ink-700 bg-ink-950"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-xl capitalize text-paper-50">{entry.provider}</span>
              <span
                className={`font-mono text-[10px] ${entry.configured ? "text-sage-400" : "text-clay-400"}`}
              >
                key {entry.configured ? "configured" : "absent"}
              </span>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-mist-400">
              {entry.models.map((modelEntry) => modelEntry.id).join(" · ")}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Panel title="Generation request" status="Dry estimate first" bodyClassName="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className={studioLabelClassName}>Model</span>
                <select
                  aria-label="Provider model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className={studioSelectClassName}
                >
                  {models.map((modelEntry) => (
                    <option key={modelEntry.id} value={modelEntry.id}>
                      {modelEntry.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Operation</span>
                <select
                  aria-label="Generation operation"
                  value={operation}
                  onChange={(event) => setOperation(event.target.value)}
                  className={studioSelectClassName}
                >
                  <option value="generate-master">Generate master</option>
                  <option value="edit-master">Edit master</option>
                  <option value="generate-part">Generate part</option>
                  <option value="generate-background">Generate background</option>
                  <option value="generate-prop">Generate prop</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className={studioLabelClassName}>Prompt</span>
              <textarea
                aria-label="Generation prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={5}
                className={studioInputClassName}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="space-y-1">
                <span className={studioLabelClassName}>Width</span>
                <input
                  aria-label="Request width"
                  type="number"
                  value={width}
                  onChange={(event) => setWidth(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Height</span>
                <input
                  aria-label="Request height"
                  type="number"
                  value={height}
                  onChange={(event) => setHeight(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Quality</span>
                <select
                  aria-label="Image quality"
                  value={quality}
                  onChange={(event) => setQuality(event.target.value)}
                  className={studioSelectClassName}
                >
                  {(currentModel?.capabilities.qualities ?? ["medium"]).map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Outputs</span>
                <input
                  aria-label="Output count"
                  type="number"
                  min={1}
                  max={8}
                  value={outputCount}
                  onChange={(event) => setOutputCount(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className={studioLabelClassName}>Gemini image size</span>
                <select
                  aria-label="Gemini image size"
                  value={imageSize}
                  onChange={(event) => setImageSize(event.target.value)}
                  className={studioSelectClassName}
                >
                  {(currentModel?.capabilities.imageSizes.length
                    ? currentModel.capabilities.imageSizes
                    : ["1K", "2K", "4K"]
                  ).map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Aspect ratio</span>
                <input
                  aria-label="Aspect ratio"
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value)}
                  className={studioInputClassName}
                />
              </label>
              <label className="flex items-center gap-2 pt-6 text-xs text-mist-300">
                <input
                  type="checkbox"
                  checked={transparent}
                  onChange={(event) => setTransparent(event.target.checked)}
                />
                Transparent PNG requested
              </label>
            </div>
            <label className="block space-y-1">
              <span className={studioLabelClassName}>
                Server-side reference paths (one per line)
              </span>
              <textarea
                aria-label="Reference image paths"
                value={references}
                onChange={(event) => setReferences(event.target.value)}
                rows={2}
                placeholder="outputs/folk-provider-benchmark/openai/character-masters/artisan.png"
                className={studioInputClassName}
              />
            </label>
            <button
              type="button"
              onClick={() => void runEstimate()}
              className={studioPrimaryButtonClassName}
            >
              Estimate cost · no provider call
            </button>
            {estimateError ? (
              <p role="alert" className="text-xs text-clay-500">
                {estimateError}
              </p>
            ) : null}
            {estimate ? (
              <div
                data-testid="provider-estimate"
                className="space-y-1 rounded border border-ink-700 bg-ink-950 p-3 text-xs text-mist-400"
              >
                <p className="font-mono text-paper-100">
                  Estimate {money(estimate.estimate.estimatedCostUsd)} · max reserve{" "}
                  {money(estimate.estimate.maxCostUsd)}
                </p>
                <p>{estimate.estimate.estimateBasis}</p>
                <p>
                  Key {estimate.keyConfigured ? "configured" : "absent"} · Authorization{" "}
                  {estimate.authorization
                    ? `active, ${money(estimate.authorization.remainingUsd)} remaining`
                    : (estimate.authorizationError ?? "none")}
                </p>
                <p className="text-[10px] text-mist-600">{estimate.estimate.pricingSource}</p>
              </div>
            ) : null}
          </Panel>

          <Panel title="Run generation" status="Paid gate" bodyClassName="space-y-3">
            <p className="text-[11px] leading-5 text-mist-400">
              This button calls the provider only when all of the following are true: the model is
              explicitly selected, the server key is present, an approval bound to this experiment
              is active, and the conservative maximum fits the remaining budget.
            </p>
            <button
              type="button"
              data-testid="provider-generate"
              onClick={() => void generate()}
              disabled={!estimate?.authorization || !estimate.keyConfigured}
              className={studioPrimaryButtonClassName}
            >
              Generate one authorized batch
            </button>
            <p className="text-[10px] text-mist-500">
              No automatic retry. No provider fallback. No video generation.
            </p>
            {message ? (
              <p
                data-testid="provider-message"
                className="rounded border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-paper-200"
              >
                {message}
              </p>
            ) : null}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Spending authorization" status="Explicit only" bodyClassName="space-y-3">
            <p className="text-[11px] leading-5 text-mist-400">
              This creates a <strong className="text-paper-100">pending</strong> request, not an
              approval. Approval requires the exact confirmation string and is bound to this
              provider, model, and experiment.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className={studioLabelClassName}>Experiment</span>
                <input
                  value={experimentId}
                  onChange={(event) => setExperimentId(event.target.value)}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Max spend</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={maxCostUsd}
                  onChange={(event) => setMaxCostUsd(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Max requests</span>
                <input
                  type="number"
                  min="1"
                  value={maxRequests}
                  onChange={(event) => setMaxRequests(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
              <label className="space-y-1">
                <span className={studioLabelClassName}>Max outputs / request</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={maxOutputs}
                  onChange={(event) => setMaxOutputs(Number(event.target.value))}
                  className={studioInputClassName}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void requestAuthorization()}
              className={studioSecondaryButtonClassName}
            >
              Create pending authorization request
            </button>
            <div className="space-y-2">
              {status?.authorizations.map((authorization) => (
                <div
                  key={authorization.id}
                  className="rounded border border-ink-800 bg-ink-900 p-2 text-[10px] text-mist-400"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-paper-200">
                      {authorization.provider} / {authorization.model}
                    </span>
                    <span
                      className={
                        authorization.status === "active" ? "text-sage-400" : "text-clay-400"
                      }
                    >
                      {authorization.status}
                    </span>
                  </div>
                  <p className="mt-1">
                    cap {money(authorization.maxCostUsd)} · spent{" "}
                    {money(authorization.spentCostUsd)} · reserved{" "}
                    {money(authorization.reservedCostUsd)} · {authorization.requestCount}/
                    {authorization.maxRequests} requests
                  </p>
                  {authorization.status === "pending" ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        aria-label="Authorization confirmation"
                        value={confirmation}
                        onChange={(event) => setConfirmation(event.target.value)}
                        className={studioInputClassName}
                      />
                      <button
                        type="button"
                        onClick={() => void approve(authorization.id)}
                        className={studioPrimaryButtonClassName}
                      >
                        Approve explicitly
                      </button>
                    </div>
                  ) : null}
                  {authorization.status === "active" ? (
                    <button
                      type="button"
                      onClick={() => void revoke(authorization.id)}
                      className="mt-2 text-[10px] text-clay-400 underline"
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
              ))}
              {status?.authorizations.length === 0 ? (
                <p className="text-[10px] text-mist-500">
                  No authorizations exist. Paid generation is disabled.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel
            title="Provider packs"
            status="Stage 2 input"
            bodyClassName="space-y-2 text-[11px] text-mist-400"
          >
            {status?.packs.length ? (
              status.packs.map((pack) => (
                <div key={pack.provider} className="rounded border border-ink-800 bg-ink-900 p-2">
                  <p className="text-paper-200">
                    {pack.provider} · {pack.title}
                  </p>
                  <p className="font-mono text-[9px] text-mist-500">{pack.manifestUrl}</p>
                  <p className="mt-1 text-clay-400">
                    {pack.missingSlots.length === 0
                      ? "all rig slots present"
                      : `${pack.missingSlots.length} missing rig slots`}
                  </p>
                </div>
              ))
            ) : (
              <p>
                No provider pack has been produced. Stage 1 intentionally stops before paid
                generation.
              </p>
            )}
            <p className="font-mono text-[9px] text-mist-600">
              output root: {status?.outputRoot ?? "outputs/folk-provider-benchmark"}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
