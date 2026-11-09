export type ImageProviderId = "local-comfyui" | "bfl" | "gemini" | "openai";

export interface ImagePricing {
  readonly provider: ImageProviderId;
  readonly model: string;
  readonly outputUsd: number;
  readonly source: string;
  readonly effectiveDate: string;
}

export const IMAGE_PRICING: Readonly<
  Record<Exclude<ImageProviderId, "local-comfyui">, ImagePricing>
> = Object.freeze({
  bfl: {
    provider: "bfl",
    model: "FLUX 3 Image Klein 2K",
    outputUsd: 0.014,
    source: "planning brief; verify against official invoice before a paid call",
    effectiveDate: "2026-11-10",
  },
  gemini: {
    provider: "gemini",
    model: "gemini-nano-banana-2.1 2K",
    outputUsd: 0.0504,
    source: "planning brief; verify against official invoice before a paid call",
    effectiveDate: "2026-11-10",
  },
  openai: {
    provider: "openai",
    model: "gpt-image-2 medium 1536x1024",
    outputUsd: 0.041,
    source: "planning brief; approximate output-only price; edits may differ",
    effectiveDate: "2026-11-10",
  },
});

export interface ImageGenerationRequest {
  readonly provider: ImageProviderId;
  readonly model: string;
  readonly prompt: string;
  readonly negativePrompt?: string;
  readonly width: number;
  readonly height: number;
  readonly outputCount: number;
  readonly seed?: number;
  readonly references?: readonly string[];
}

export interface RemoteSpendAuthorization {
  readonly id: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly provider: Exclude<ImageProviderId, "local-comfyui">;
  readonly model: string;
  readonly maxCostUsd: number;
  readonly maxOutputs: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
}

export interface AuthorizedRemoteRequest {
  readonly authorizationId: string;
  readonly provider: RemoteSpendAuthorization["provider"];
  readonly model: string;
  readonly estimatedCostUsd: number;
  readonly request: ImageGenerationRequest;
}

export class ImageProviderError extends Error {
  override readonly name = "ImageProviderError";
}

export function estimateImageCost(
  request: ImageGenerationRequest,
  pricing: ImagePricing = IMAGE_PRICING[
    request.provider === "local-comfyui" ? "bfl" : request.provider
  ],
): number {
  if (request.provider === "local-comfyui") return 0;
  if (!Number.isInteger(request.outputCount) || request.outputCount < 1) {
    throw new ImageProviderError("outputCount must be a positive integer.");
  }
  if (!Number.isFinite(pricing.outputUsd) || pricing.outputUsd < 0) {
    throw new ImageProviderError("A non-negative provider price is required.");
  }
  return pricing.outputUsd * request.outputCount;
}

/**
 * Remote generation is disabled by default. This function is the only path to
 * a hosted request and requires a persisted, explicit authorization record.
 */
export function authorizeRemoteRequest(
  request: ImageGenerationRequest,
  authorization: RemoteSpendAuthorization | null,
  pricing: ImagePricing,
): AuthorizedRemoteRequest {
  if (request.provider === "local-comfyui") {
    throw new ImageProviderError("Local ComfyUI requests do not use the remote spending gate.");
  }
  if (!authorization) {
    throw new ImageProviderError(
      "Remote image generation is disabled. A persisted spending authorization is required.",
    );
  }
  if (authorization.provider !== request.provider || authorization.model !== request.model) {
    throw new ImageProviderError("The authorization does not match the provider or model.");
  }
  if (pricing.provider !== request.provider || pricing.model !== request.model) {
    throw new ImageProviderError("The pricing record does not match the provider or model.");
  }
  if (request.outputCount > authorization.maxOutputs) {
    throw new ImageProviderError("The request exceeds the authorized output count.");
  }
  if (request.width > authorization.maxWidth || request.height > authorization.maxHeight) {
    throw new ImageProviderError("The request exceeds the authorized resolution.");
  }
  if (!Number.isFinite(authorization.maxCostUsd) || authorization.maxCostUsd <= 0) {
    throw new ImageProviderError("The authorized spending cap must be positive.");
  }
  const estimatedCostUsd = estimateImageCost(request, pricing);
  if (estimatedCostUsd > authorization.maxCostUsd) {
    throw new ImageProviderError(
      `Estimated cost $${estimatedCostUsd.toFixed(4)} exceeds the authorized cap $${authorization.maxCostUsd.toFixed(4)}.`,
    );
  }
  return {
    authorizationId: authorization.id,
    provider: request.provider,
    model: request.model,
    estimatedCostUsd,
    request,
  };
}

export function localComfyRequest(request: ImageGenerationRequest): ImageGenerationRequest {
  if (request.provider !== "local-comfyui") {
    throw new ImageProviderError("This request is not a local ComfyUI request.");
  }
  if (!Number.isInteger(request.width) || !Number.isInteger(request.height)) {
    throw new ImageProviderError("Local ComfyUI dimensions must be integers.");
  }
  if (request.width < 64 || request.height < 64) {
    throw new ImageProviderError("Local ComfyUI dimensions are too small.");
  }
  return request;
}

export interface ComfyWorkflowNode {
  readonly class_type: string;
  readonly inputs: Record<string, unknown>;
}

export interface ComfyWorkflow {
  readonly [nodeId: string]: ComfyWorkflowNode;
}

export interface ComfyWorkflowBinding {
  readonly workflow: ComfyWorkflow;
  readonly promptNodeId: string;
  readonly seedNodeId: string;
  readonly promptInput?: string;
  readonly seedInput?: string;
}

/**
 * Injects a prompt and seed into an operator-supplied, verified ComfyUI API
 * workflow. No node names are invented here; the caller must provide the node
 * IDs and input keys from a workflow they have actually exported from ComfyUI.
 */
export function buildComfyWorkflow(
  binding: ComfyWorkflowBinding,
  request: ImageGenerationRequest,
): ComfyWorkflow {
  const promptNode = binding.workflow[binding.promptNodeId];
  const seedNode = binding.workflow[binding.seedNodeId];
  if (!promptNode) throw new ImageProviderError("The prompt node does not exist in the workflow.");
  if (!seedNode) throw new ImageProviderError("The seed node does not exist in the workflow.");
  const promptInput = binding.promptInput ?? "text";
  const seedInput = binding.seedInput ?? "seed";
  if (!(promptInput in promptNode.inputs)) {
    throw new ImageProviderError(`Prompt node has no "${promptInput}" input.`);
  }
  if (!(seedInput in seedNode.inputs)) {
    throw new ImageProviderError(`Seed node has no "${seedInput}" input.`);
  }
  return {
    ...binding.workflow,
    [binding.promptNodeId]: {
      ...promptNode,
      inputs: { ...promptNode.inputs, [promptInput]: request.prompt },
    },
    [binding.seedNodeId]: {
      ...seedNode,
      inputs: { ...seedNode.inputs, [seedInput]: request.seed ?? 0 },
    },
  };
}

export interface ComfyClientOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: typeof fetch;
}

export class ComfyUIClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ComfyClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async systemStats(): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}/system_stats`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      throw new ImageProviderError(`ComfyUI system_stats returned ${response.status}.`);
    return (await response.json()) as unknown;
  }

  async submit(workflow: ComfyWorkflow): Promise<string> {
    const response = await this.fetchImpl(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: `fableon-${Date.now()}` }),
    });
    if (!response.ok) throw new ImageProviderError(`ComfyUI prompt returned ${response.status}.`);
    const body = (await response.json()) as { prompt_id?: unknown };
    if (typeof body.prompt_id !== "string" || body.prompt_id.length === 0) {
      throw new ImageProviderError("ComfyUI did not return a prompt_id.");
    }
    return body.prompt_id;
  }

  async history(promptId: string): Promise<unknown> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/history/${encodeURIComponent(promptId)}`,
      {
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) throw new ImageProviderError(`ComfyUI history returned ${response.status}.`);
    return (await response.json()) as unknown;
  }

  async view(filename: string, subfolder = "", type = "output"): Promise<Uint8Array> {
    const query = new URLSearchParams({ filename, subfolder, type });
    const response = await this.fetchImpl(`${this.baseUrl}/view?${query.toString()}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new ImageProviderError(`ComfyUI view returned ${response.status}.`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
