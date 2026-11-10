import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { getRepoRoot } from "@/lib/studio/repository";

import {
  HOSTED_MODELS,
  estimateGenerationCost,
  validateGenerationRequest,
  type CostEstimate,
  type GenerationRequest,
  type GenerationUsage,
  type HostedProviderId,
  type ImageQuality,
  type ImageSizeLabel,
  type ProviderGenerationResult,
  type ProviderOperation,
  type ReferenceImage,
} from "./catalog";
import {
  findUsableAuthorization,
  listProviderAuthorizations,
  reconcileProviderSpend,
  reserveProviderSpend,
} from "./authorization";
import { appendProviderEvent, providerBenchmarkRoot, providerDirectory } from "./ledger";
import { GeminiImageAdapter } from "./gemini";
import { OpenAIImageAdapter } from "./openai";

export interface ReferenceInput {
  readonly id: string;
  readonly path: string;
  readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
}

export interface GenerationInput {
  readonly experimentId: string;
  readonly provider: HostedProviderId;
  readonly model: string;
  readonly operation: ProviderOperation;
  readonly prompt: string;
  readonly negativePrompt?: string;
  readonly width: number;
  readonly height: number;
  readonly quality: ImageQuality;
  readonly imageSize?: ImageSizeLabel;
  readonly aspectRatio: string;
  readonly outputCount: number;
  readonly references: readonly ReferenceInput[];
  readonly maskPath?: string;
  readonly transparentBackground: boolean;
  readonly requestKey: string;
  readonly authorizationId?: string;
  readonly previousInteractionId?: string;
  readonly seed?: number;
}

export interface GenerationResult {
  readonly request: GenerationRequest;
  readonly estimate: CostEstimate;
  readonly result: ProviderGenerationResult;
  readonly files: readonly {
    readonly index: number;
    readonly path: string;
    readonly relativePath: string;
    readonly sha256: string;
    readonly bytes: number;
  }[];
  readonly reconciledCostUsd: number;
  readonly costBasis: string;
}

export class ProviderServiceError extends Error {
  override readonly name = "ProviderServiceError";
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function providerAdapter(
  provider: HostedProviderId,
  overrides?: {
    readonly openai?: OpenAIImageAdapter;
    readonly gemini?: GeminiImageAdapter;
  },
): OpenAIImageAdapter | GeminiImageAdapter {
  if (provider === "openai") return overrides?.openai ?? new OpenAIImageAdapter();
  return overrides?.gemini ?? new GeminiImageAdapter();
}

async function loadReference(input: ReferenceInput): Promise<ReferenceImage> {
  const root = path.resolve(getRepoRoot());
  const file = path.resolve(input.path);
  if (!file.startsWith(`${root}${path.sep}`)) {
    throw new ProviderServiceError(
      "invalid_input",
      "Reference images must be stored inside the Fableon repository.",
    );
  }
  const bytes = await readFile(file);
  return {
    id: input.id,
    mimeType: input.mimeType,
    dataBase64: bytes.toString("base64"),
  };
}

function costFromUsage(
  provider: HostedProviderId,
  usage: GenerationUsage,
  estimate: CostEstimate,
  outputCount: number,
): { cost: number; basis: string } {
  if (provider === "openai" && usage.outputTokens !== null) {
    const outputTokens = usage.outputTokens;
    const imageTokens = usage.inputImageTokens ?? 0;
    const textTokens = Math.max(0, (usage.inputTokens ?? estimate.inputTextTokens) - imageTokens);
    return {
      cost: (outputTokens * 30 + imageTokens * 8 + textTokens * 5) / 1_000_000,
      basis: "provider usage tokens (image input at $8/M, text at $5/M)",
    };
  }
  if (provider === "gemini") {
    const perImage = estimate.outputImageTokens / Math.max(1, outputCount);
    const inputTokens = usage.inputTokens ?? estimate.inputTextTokens;
    return {
      cost: (perImage * outputCount * 30 + inputTokens * 1.5) / 1_000_000,
      basis: "published per-image token equivalent plus reported input tokens",
    };
  }
  return { cost: estimate.estimatedCostUsd, basis: "conservative estimate (usage incomplete)" };
}

async function writeAttempt(
  provider: HostedProviderId,
  requestKey: string,
  result: ProviderGenerationResult,
): Promise<GenerationResult["files"]> {
  const safeKey = requestKey.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const dir = path.join(providerDirectory(provider), "attempts", safeKey);
  await mkdir(dir, { recursive: true });
  const files: Array<GenerationResult["files"][number]> = [];
  for (const image of result.images) {
    const bytes = Buffer.from(image.dataBase64, "base64");
    const file = path.join(
      dir,
      `output-${String(image.index).padStart(2, "0")}.${image.mimeType === "image/webp" ? "webp" : "png"}`,
    );
    await writeFile(file, bytes);
    files.push({
      index: image.index,
      path: file,
      relativePath: path.relative(getRepoRoot(), file).split(path.sep).join("/"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    });
  }
  await writeFile(
    path.join(dir, "attempt.json"),
    `${JSON.stringify(
      {
        provider,
        model: result.model,
        requestKey,
        requestId: result.requestId,
        createdAt: result.createdAt,
        usage: result.usage,
        outputHashes: files.map((file) => ({
          index: file.index,
          sha256: file.sha256,
          bytes: file.bytes,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return files;
}

export async function estimateProviderRequest(input: GenerationInput): Promise<{
  readonly request: GenerationRequest;
  readonly estimate: CostEstimate;
  readonly authorization: Awaited<ReturnType<typeof findUsableAuthorization>> | null;
  readonly authorizationError: string | null;
  readonly keyConfigured: boolean;
}> {
  const references = await Promise.all(input.references.map(loadReference));
  const mask = input.maskPath
    ? await loadReference({ id: "mask", path: input.maskPath, mimeType: "image/png" })
    : undefined;
  const request: GenerationRequest = {
    provider: input.provider,
    model: input.model,
    operation: input.operation,
    prompt: input.prompt,
    ...(input.negativePrompt ? { negativePrompt: input.negativePrompt } : {}),
    width: input.width,
    height: input.height,
    quality: input.quality,
    ...(input.imageSize ? { imageSize: input.imageSize } : {}),
    aspectRatio: input.aspectRatio,
    outputCount: input.outputCount,
    references,
    ...(mask ? { mask } : {}),
    transparentBackground: input.transparentBackground,
    ...(input.seed !== undefined ? { seed: input.seed } : {}),
    ...(input.previousInteractionId ? { previousInteractionId: input.previousInteractionId } : {}),
  };
  validateGenerationRequest(request);
  const estimate = estimateGenerationCost(request);
  const adapter = providerAdapter(input.provider);
  let authorization = null;
  let authorizationError: string | null = null;
  try {
    authorization = await findUsableAuthorization({
      ...(input.authorizationId ? { authorizationId: input.authorizationId } : {}),
      experimentId: input.experimentId,
      provider: input.provider,
      model: input.model,
      estimatedMaxCostUsd: estimate.maxCostUsd,
      outputCount: input.outputCount,
      width: input.width,
      height: input.height,
    });
  } catch (error) {
    authorizationError = error instanceof Error ? error.message : String(error);
  }
  return {
    request,
    estimate,
    authorization,
    authorizationError,
    keyConfigured: adapter.isConfigured(),
  };
}

export async function executeProviderGeneration(
  input: GenerationInput,
  overrides?: {
    readonly openai?: OpenAIImageAdapter;
    readonly gemini?: GeminiImageAdapter;
  },
): Promise<GenerationResult> {
  if (!input.requestKey.trim()) {
    throw new ProviderServiceError("invalid_input", "A stable requestKey is required.");
  }
  if (!input.prompt.trim()) {
    throw new ProviderServiceError("invalid_input", "A prompt is required.");
  }
  const { request, estimate, authorization } = await estimateProviderRequest(input);
  if (!authorization) {
    throw new ProviderServiceError(
      "authorization_missing",
      "No active, matching spending authorization. No paid request was made.",
    );
  }
  const adapter = providerAdapter(input.provider, overrides);
  if (!adapter.isConfigured()) {
    throw new ProviderServiceError(
      "configuration_missing",
      `${input.provider} credentials are not configured on the server. No paid request was made.`,
    );
  }
  const reservation = await reserveProviderSpend({
    authorizationId: authorization.id,
    requestKey: input.requestKey,
    maxCostUsd: estimate.maxCostUsd,
    outputCount: input.outputCount,
    width: input.width,
    height: input.height,
  });
  await appendProviderEvent({
    type: "generation-requested",
    experimentId: input.experimentId,
    provider: input.provider,
    model: input.model,
    requestKey: input.requestKey,
    authorizationId: authorization.id,
    operation: input.operation,
    attempt: 1,
    outputCount: input.outputCount,
    inputReferenceCount: request.references.length,
    status: "requested",
    estimatedCostUsd: estimate.estimatedCostUsd,
    reconciledCostUsd: null,
    usage: null,
    outputHashes: [],
    note: "A paid request was explicitly authorized and reserved.",
    meta: { estimateBasis: estimate.estimateBasis },
  });
  await appendProviderEvent({
    type: "generation-authorized",
    experimentId: input.experimentId,
    provider: input.provider,
    model: input.model,
    requestKey: input.requestKey,
    authorizationId: authorization.id,
    operation: input.operation,
    attempt: 1,
    outputCount: input.outputCount,
    inputReferenceCount: request.references.length,
    status: "reserved",
    estimatedCostUsd: estimate.maxCostUsd,
    reconciledCostUsd: null,
    usage: null,
    outputHashes: [],
    note: "Reservation persisted before the provider call.",
    meta: { remainingBeforeUsd: reservation.remainingBeforeUsd },
  });
  try {
    await appendProviderEvent({
      type: "generation-submitted",
      experimentId: input.experimentId,
      provider: input.provider,
      model: input.model,
      requestKey: input.requestKey,
      authorizationId: authorization.id,
      operation: input.operation,
      attempt: 1,
      outputCount: input.outputCount,
      inputReferenceCount: request.references.length,
      status: "submitted",
      estimatedCostUsd: estimate.maxCostUsd,
      reconciledCostUsd: null,
      usage: null,
      outputHashes: [],
      note: "At most one attempt; no automatic retry.",
      meta: {},
    });
    const result = await adapter.generate(request);
    const files = await writeAttempt(input.provider, input.requestKey, result);
    const reconciled = costFromUsage(input.provider, result.usage, estimate, input.outputCount);
    await reconcileProviderSpend({
      authorizationId: authorization.id,
      requestKey: input.requestKey,
      actualCostUsd: reconciled.cost,
      outcome: "completed",
    });
    await appendProviderEvent({
      type: "generation-completed",
      experimentId: input.experimentId,
      provider: input.provider,
      model: input.model,
      requestKey: input.requestKey,
      authorizationId: authorization.id,
      operation: input.operation,
      attempt: 1,
      outputCount: files.length,
      inputReferenceCount: request.references.length,
      status: "completed",
      estimatedCostUsd: estimate.estimatedCostUsd,
      reconciledCostUsd: reconciled.cost,
      usage: result.usage,
      outputHashes: files.map((file) => file.sha256),
      note: `Cost basis: ${reconciled.basis}. Outputs await visual review; not auto-accepted.`,
      meta: { requestId: result.requestId, files: files.map((file) => file.relativePath) },
    });
    return {
      request,
      estimate,
      result,
      files,
      reconciledCostUsd: reconciled.cost,
      costBasis: reconciled.basis,
    };
  } catch (error) {
    await reconcileProviderSpend({
      authorizationId: authorization.id,
      requestKey: input.requestKey,
      actualCostUsd: estimate.maxCostUsd,
      outcome: "failed-after-submit",
    });
    await appendProviderEvent({
      type: "generation-failed",
      experimentId: input.experimentId,
      provider: input.provider,
      model: input.model,
      requestKey: input.requestKey,
      authorizationId: authorization.id,
      operation: input.operation,
      attempt: 1,
      outputCount: 0,
      inputReferenceCount: request.references.length,
      status: "failed",
      estimatedCostUsd: estimate.estimatedCostUsd,
      reconciledCostUsd: estimate.maxCostUsd,
      usage: null,
      outputHashes: [],
      note:
        error instanceof Error
          ? `Failed after submission; reserved maximum retained until invoice reconciliation: ${error.message}`
          : "Failed after submission; reserved maximum retained until invoice reconciliation.",
      meta: {},
    });
    throw error;
  }
}

export interface ProviderWorkspaceStatus {
  readonly providers: readonly {
    readonly provider: HostedProviderId;
    readonly configured: boolean;
    readonly models: readonly {
      readonly id: string;
      readonly label: string;
      readonly guidance: string;
      readonly capabilities: unknown;
      readonly pricingVersion: string;
      readonly pricingSource: string;
    }[];
  }[];
  readonly authorizations: Awaited<ReturnType<typeof listProviderAuthorizations>>;
  readonly packs: readonly {
    readonly provider: HostedProviderId;
    readonly manifestPath: string;
    readonly manifestUrl: string;
    readonly title: string;
    readonly generationMode: string;
    readonly model: string | null;
    readonly missingSlots: readonly string[];
  }[];
}

export async function providerWorkspaceStatus(): Promise<ProviderWorkspaceStatus> {
  const openai = new OpenAIImageAdapter();
  const gemini = new GeminiImageAdapter();
  const providers: ProviderWorkspaceStatus["providers"][number][] = [
    {
      provider: "openai",
      configured: openai.isConfigured(),
      models: HOSTED_MODELS.filter((model) => model.provider === "openai").map((model) => ({
        id: model.id,
        label: model.label,
        guidance: model.guidance,
        capabilities: model.capabilities,
        pricingVersion: model.pricingVersion,
        pricingSource: model.pricingSource,
      })),
    },
    {
      provider: "gemini",
      configured: gemini.isConfigured(),
      models: HOSTED_MODELS.filter((model) => model.provider === "gemini").map((model) => ({
        id: model.id,
        label: model.label,
        guidance: model.guidance,
        capabilities: model.capabilities,
        pricingVersion: model.pricingVersion,
        pricingSource: model.pricingSource,
      })),
    },
  ];
  const packs = [];
  for (const provider of ["openai", "gemini"] as const) {
    const manifestPath = path.join(providerDirectory(provider), "manifest.json");
    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
      packs.push({
        provider,
        manifestPath,
        manifestUrl: `/api/studio/providers/packs/${provider}`,
        title: String(manifest["title"] ?? "Untitled"),
        generationMode: String(manifest["generationMode"] ?? "unknown"),
        model: typeof manifest["model"] === "string" ? manifest["model"] : null,
        missingSlots: Array.isArray(manifest["missingSlots"])
          ? (manifest["missingSlots"] as string[])
          : [],
      });
    } catch {
      // No pack yet.
    }
  }
  return {
    providers,
    authorizations: await listProviderAuthorizations(),
    packs,
  };
}

export async function readProviderPackManifest(
  provider: HostedProviderId,
): Promise<Record<string, unknown>> {
  const file = path.join(providerDirectory(provider), "manifest.json");
  return JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
}

export async function resolveProviderPackFile(
  provider: HostedProviderId,
  relativePath: string,
): Promise<{ file: string; size: number }> {
  const root = path.resolve(providerDirectory(provider));
  const file = path.resolve(root, relativePath);
  if (!file.startsWith(`${root}${path.sep}`) && file !== root) {
    throw new ProviderServiceError("invalid_input", "Pack path escapes the provider directory.");
  }
  const info = await stat(file);
  if (!info.isFile()) throw new ProviderServiceError("not_found", "Provider asset not found.");
  return { file, size: info.size };
}

export async function listProviderAttempts(provider: HostedProviderId): Promise<string[]> {
  try {
    return await readdir(path.join(providerDirectory(provider), "attempts"));
  } catch {
    return [];
  }
}

export function providerRootForDisplay(): string {
  return path.relative(getRepoRoot(), providerBenchmarkRoot());
}
