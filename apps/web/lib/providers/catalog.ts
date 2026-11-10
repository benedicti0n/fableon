export type HostedProviderId = "openai" | "gemini";
export type ImageQuality = "standard" | "low" | "medium" | "high" | "xhigh" | "max";
export type ImageSizeLabel = "1K" | "2K" | "4K";
export type ProviderOperation =
  "generate-master" | "edit-master" | "generate-part" | "generate-background" | "generate-prop";

export interface ProviderCapabilities {
  readonly generate: boolean;
  readonly edit: boolean;
  readonly referenceImages: boolean;
  readonly maskGuidedEdit: boolean;
  readonly nativeTransparentBackground: boolean;
  readonly svgOutput: boolean;
  readonly usageReporting: boolean;
  readonly maxReferences: number;
  readonly sizes: readonly string[];
  readonly qualities: readonly string[];
  readonly imageSizes: readonly ImageSizeLabel[];
  readonly aspectRatios: readonly string[];
}

export interface HostedModel {
  readonly provider: HostedProviderId;
  readonly id: string;
  readonly label: string;
  readonly guidance: string;
  readonly capabilities: ProviderCapabilities;
  readonly pricingVersion: string;
  readonly pricingSource: string;
  readonly pricingEffectiveDate: string;
}

export interface ReferenceImage {
  readonly id: string;
  readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
  /** Base64 bytes, server-side only. Never returned to the browser. */
  readonly dataBase64: string;
}

export interface GenerationRequest {
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
  readonly references: readonly ReferenceImage[];
  readonly mask?: ReferenceImage;
  readonly transparentBackground: boolean;
  readonly seed?: number;
  readonly previousInteractionId?: string;
}

export interface CostEstimate {
  readonly provider: HostedProviderId;
  readonly model: string;
  readonly pricingVersion: string;
  readonly pricingSource: string;
  readonly pricingVerified: boolean;
  readonly estimateBasis: string;
  readonly inputTextTokens: number;
  readonly inputImageTokens: number;
  readonly outputImageTokens: number;
  readonly estimatedCostUsd: number;
  readonly maxCostUsd: number;
  readonly currency: "USD";
  readonly assumptions: readonly string[];
}

export interface GenerationUsage {
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly totalTokens: number | null;
  readonly inputImageTokens: number | null;
  readonly outputImageTokens: number | null;
  readonly providerReportedCostUsd: number | null;
  readonly rawUsage: unknown;
}

export interface GeneratedImage {
  readonly index: number;
  readonly mimeType: "image/png" | "image/webp";
  readonly dataBase64: string;
  readonly revisedPrompt: string | null;
}

export interface ProviderGenerationResult {
  readonly provider: HostedProviderId;
  readonly model: string;
  readonly requestId: string | null;
  readonly images: readonly GeneratedImage[];
  readonly usage: GenerationUsage;
  readonly rawResponseHash: string;
  readonly createdAt: string;
}

const OPENAI_PRICING_VERSION = "openai-image-2026-11-10";
const GEMINI_PRICING_VERSION = "gemini-image-2026-11-10";
const OPENAI_PRICING_SOURCE = "https://developers.openai.com/api/docs/pricing#image-generation";
const GEMINI_PRICING_SOURCE = "https://ai.google.dev/gemini-api/docs/pricing";

const openAIBaseCapabilities = {
  generate: true,
  edit: true,
  referenceImages: true,
  maskGuidedEdit: true,
  nativeTransparentBackground: true,
  svgOutput: true,
  usageReporting: true,
  maxReferences: 16,
  sizes: ["1024x1024", "1536x1024", "1024x1536", "2048x2048", "2048x1152", "3840x2160"],
  qualities: ["low", "medium", "high", "xhigh", "max"],
  imageSizes: [],
  aspectRatios: ["1:1", "3:2", "2:3", "16:9", "9:16"],
} as const;

export const HOSTED_MODELS: readonly HostedModel[] = Object.freeze([
  {
    provider: "openai",
    id: "gpt-image-2.6-sunburst",
    label: "GPT Image 2.6 Sunburst",
    guidance:
      "Preferred for demanding character consistency, reference-guided asset edits, and precise part generation.",
    capabilities: openAIBaseCapabilities,
    pricingVersion: OPENAI_PRICING_VERSION,
    pricingSource: OPENAI_PRICING_SOURCE,
    pricingEffectiveDate: "2026-11-10",
  },
  {
    provider: "openai",
    id: "gpt-image-2.6-flare",
    label: "GPT Image 2.6 Flare",
    guidance:
      "Faster/iteration-oriented sibling. Use only after a measured quality comparison justifies it.",
    capabilities: openAIBaseCapabilities,
    pricingVersion: OPENAI_PRICING_VERSION,
    pricingSource: OPENAI_PRICING_SOURCE,
    pricingEffectiveDate: "2026-11-10",
  },
  {
    provider: "gemini",
    id: "gemini-nano-banana-2.1",
    label: "Gemini Nano Banana 2.1",
    guidance:
      "High-efficiency image generation and conversational editing with up to 14 references. No native transparent output; masking/repair is required.",
    capabilities: {
      generate: true,
      edit: true,
      referenceImages: true,
      maskGuidedEdit: false,
      nativeTransparentBackground: false,
      svgOutput: false,
      usageReporting: true,
      maxReferences: 14,
      sizes: [],
      qualities: ["standard"],
      imageSizes: ["1K", "2K", "4K"],
      aspectRatios: ["1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4"],
    },
    pricingVersion: GEMINI_PRICING_VERSION,
    pricingSource: GEMINI_PRICING_SOURCE,
    pricingEffectiveDate: "2026-11-10",
  },
]);

export function getHostedModel(provider: HostedProviderId, modelId: string): HostedModel {
  const model = HOSTED_MODELS.find((entry) => entry.provider === provider && entry.id === modelId);
  if (!model) {
    throw new ProviderConfigurationError(
      `Unsupported provider/model combination: ${provider}/${modelId}.`,
    );
  }
  return model;
}

export function modelsForProvider(provider: HostedProviderId): readonly HostedModel[] {
  return HOSTED_MODELS.filter((entry) => entry.provider === provider);
}

export class ProviderConfigurationError extends Error {
  override readonly name = "ProviderConfigurationError";
}

export class ProviderRequestError extends Error {
  override readonly name = "ProviderRequestError";
  readonly status: number;
  readonly providerBody: unknown;
  constructor(message: string, status = 502, providerBody: unknown = null) {
    super(message);
    this.status = status;
    this.providerBody = providerBody;
  }
}

function estimateTextTokens(prompt: string, negativePrompt?: string): number {
  const characters = prompt.length + (negativePrompt?.length ?? 0);
  return Math.max(1, Math.ceil(characters / 4) + 200);
}

function megapixels(request: GenerationRequest): number {
  return Math.max(0.25, (request.width * request.height) / (1024 * 1024));
}

function conservativeOpenAIOutputTokens(request: GenerationRequest): number {
  const perMegapixel = {
    standard: 1056,
    low: 272,
    medium: 1056,
    high: 4160,
    xhigh: 8320,
    max: 16640,
  }[request.quality];
  // The official 2.6 token counts differ by prompt/model. A 2× safety factor
  // makes this a conservative maximum rather than a pretend exact quote.
  return Math.ceil(perMegapixel * Math.max(1, megapixels(request)) * 2);
}

function openAIReferenceTokens(request: GenerationRequest): number {
  // One 1K reference is conservatively bounded at 1,120 image input tokens.
  const perReference = Math.ceil(1120 * Math.max(1, megapixels(request)));
  return request.references.length * perReference + (request.mask ? perReference : 0);
}

function geminiOutputTokens(request: GenerationRequest): number {
  const label = request.imageSize ?? "2K";
  if (label === "1K") return 1120;
  if (label === "4K") return 3780;
  return 1680;
}

function geminiInputImageTokens(request: GenerationRequest): number {
  return (request.references.length + (request.mask ? 1 : 0)) * 1120;
}

export function estimateGenerationCost(request: GenerationRequest): CostEstimate {
  const model = getHostedModel(request.provider, request.model);
  if (!Number.isInteger(request.outputCount) || request.outputCount < 1) {
    throw new ProviderConfigurationError("outputCount must be a positive integer.");
  }
  if (request.outputCount > 16) {
    throw new ProviderConfigurationError("A single request may not exceed 16 images.");
  }
  if (request.references.length > model.capabilities.maxReferences) {
    throw new ProviderConfigurationError(
      `${model.label} accepts at most ${model.capabilities.maxReferences} references.`,
    );
  }
  const inputTextTokens = estimateTextTokens(request.prompt, request.negativePrompt);
  if (request.provider === "openai") {
    const outputImageTokens = conservativeOpenAIOutputTokens(request) * request.outputCount;
    const inputImageTokens = openAIReferenceTokens(request) * request.outputCount;
    const cost = (outputImageTokens * 30 + inputImageTokens * 8 + inputTextTokens * 5) / 1_000_000;
    return {
      provider: "openai",
      model: model.id,
      pricingVersion: OPENAI_PRICING_VERSION,
      pricingSource: OPENAI_PRICING_SOURCE,
      pricingVerified: true,
      estimateBasis:
        "Conservative upper bound: documented image-token rates with a 2× safety factor for GPT Image 2.6 token variation.",
      inputTextTokens,
      inputImageTokens,
      outputImageTokens,
      estimatedCostUsd: cost,
      maxCostUsd: cost,
      currency: "USD",
      assumptions: [
        "Image input tokens are bounded at 1,120 per 1K reference.",
        "Output tokens use the documented earlier-model quality table scaled by requested megapixels, then doubled.",
        "Actual usage will be reconciled from the provider response; this is not an invoice.",
      ],
    };
  }
  const outputImageTokens = geminiOutputTokens(request) * request.outputCount;
  const inputImageTokens = geminiInputImageTokens(request);
  const cost =
    (outputImageTokens * 30 + inputImageTokens * 1.5 + inputTextTokens * 1.5) / 1_000_000;
  return {
    provider: "gemini",
    model: model.id,
    pricingVersion: GEMINI_PRICING_VERSION,
    pricingSource: GEMINI_PRICING_SOURCE,
    pricingVerified: true,
    estimateBasis:
      "Published token-equivalent pricing: 1K=1,120, 2K=1,680, 4K=3,780 image output tokens at $30/1M.",
    inputTextTokens,
    inputImageTokens,
    outputImageTokens,
    estimatedCostUsd: cost,
    maxCostUsd: cost,
    currency: "USD",
    assumptions: [
      "Reference images are bounded at 1,120 image input tokens each.",
      "Text input is bounded at one token per four characters plus 200 tokens.",
      "Actual token usage depends on the provider response and must be reconciled.",
    ],
  };
}

export function validateGenerationRequest(request: GenerationRequest): void {
  const model = getHostedModel(request.provider, request.model);
  if (!request.prompt.trim()) throw new ProviderConfigurationError("A prompt is required.");
  if (
    !model.capabilities.sizes.includes(`${request.width}x${request.height}`) &&
    request.provider === "openai"
  ) {
    throw new ProviderConfigurationError(
      `Unsupported OpenAI size ${request.width}x${request.height}.`,
    );
  }
  if (
    request.provider === "gemini" &&
    !model.capabilities.imageSizes.includes(request.imageSize ?? "2K")
  ) {
    throw new ProviderConfigurationError("Unsupported Gemini image size.");
  }
  if (!model.capabilities.qualities.includes(request.quality) && request.provider === "openai") {
    throw new ProviderConfigurationError(`Unsupported quality ${request.quality}.`);
  }
  if (request.transparentBackground && !model.capabilities.nativeTransparentBackground) {
    throw new ProviderConfigurationError(
      `${model.label} does not support native transparent output. Use the mask/repair path.`,
    );
  }
  if (request.mask && !model.capabilities.maskGuidedEdit) {
    throw new ProviderConfigurationError(`${model.label} does not support mask-guided edits.`);
  }
}
