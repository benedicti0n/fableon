import {
  getHostedModel,
  type HostedProviderId,
  type ImageQuality,
  type ImageSizeLabel,
  type ProviderOperation,
} from "./catalog";
import { ProviderServiceError, type GenerationInput, type ReferenceInput } from "./service";

const OPERATIONS: readonly ProviderOperation[] = [
  "generate-master",
  "edit-master",
  "generate-part",
  "generate-background",
  "generate-prop",
];

const MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

function stringField(body: Record<string, unknown>, key: string, required = false): string {
  const value = body[key];
  if (value === undefined || value === null || value === "") {
    if (required) throw new ProviderServiceError("invalid_input", `${key} is required.`);
    return "";
  }
  if (typeof value !== "string") {
    throw new ProviderServiceError("invalid_input", `${key} must be a string.`);
  }
  return value.trim();
}

function numberField(
  body: Record<string, unknown>,
  key: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = body[key];
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new ProviderServiceError(
      "invalid_input",
      `${key} must be between ${minimum} and ${maximum}.`,
    );
  }
  return parsed;
}

function references(body: Record<string, unknown>): ReferenceInput[] {
  const value = body["references"];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new ProviderServiceError("invalid_input", "references must be an array.");
  }
  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new ProviderServiceError("invalid_input", `references[${index}] is invalid.`);
    }
    const record = entry as Record<string, unknown>;
    const path = stringField(record, "path", true);
    const id = stringField(record, "id", true);
    const mimeType = stringField(record, "mimeType", true);
    if (!MIME_TYPES.includes(mimeType as (typeof MIME_TYPES)[number])) {
      throw new ProviderServiceError(
        "invalid_input",
        `references[${index}].mimeType must be image/png, image/jpeg, or image/webp.`,
      );
    }
    return { id, path, mimeType: mimeType as ReferenceInput["mimeType"] };
  });
}

export function parseGenerationInput(
  body: Record<string, unknown>,
  options: { readonly requireRequestKey: boolean },
): GenerationInput {
  const provider = stringField(body, "provider", true) as HostedProviderId;
  if (provider !== "openai" && provider !== "gemini") {
    throw new ProviderServiceError("invalid_input", "provider must be openai or gemini.");
  }
  const model = stringField(body, "model", true);
  getHostedModel(provider, model);
  const operation = stringField(body, "operation", true) as ProviderOperation;
  if (!OPERATIONS.includes(operation)) {
    throw new ProviderServiceError("invalid_input", "Unsupported operation.");
  }
  const prompt = stringField(body, "prompt", true);
  const experimentId = stringField(body, "experimentId") || "phase-05.1-folk-pilot";
  const aspectRatio = stringField(body, "aspectRatio") || "3:2";
  const width = numberField(body, "width", 1536, 256, 3840);
  const height = numberField(body, "height", 1024, 256, 3840);
  const outputCount = numberField(body, "outputCount", 1, 1, 8);
  const qualityRaw =
    stringField(body, "quality") || (provider === "openai" ? "medium" : "standard");
  const quality = qualityRaw as ImageQuality;
  const imageSizeRaw = stringField(body, "imageSize");
  const imageSize = imageSizeRaw ? (imageSizeRaw as ImageSizeLabel) : undefined;
  const requestKey = stringField(body, "requestKey");
  if (options.requireRequestKey && !requestKey) {
    throw new ProviderServiceError("invalid_input", "requestKey is required for execution.");
  }
  const authorizationId = stringField(body, "authorizationId");
  const previousInteractionId = stringField(body, "previousInteractionId");
  const maskPath = stringField(body, "maskPath");
  const negativePrompt = stringField(body, "negativePrompt");
  const seedRaw = body["seed"];
  const seed =
    seedRaw === undefined || seedRaw === null || seedRaw === ""
      ? undefined
      : numberField(body, "seed", 0, 0, Number.MAX_SAFE_INTEGER);
  return {
    experimentId,
    provider,
    model,
    operation,
    prompt,
    ...(negativePrompt ? { negativePrompt } : {}),
    width,
    height,
    quality,
    ...(imageSize ? { imageSize } : {}),
    aspectRatio,
    outputCount,
    references: references(body),
    ...(maskPath ? { maskPath } : {}),
    transparentBackground: body["transparentBackground"] === true,
    requestKey: requestKey || `estimate-${Date.now()}`,
    ...(authorizationId ? { authorizationId } : {}),
    ...(previousInteractionId ? { previousInteractionId } : {}),
    ...(seed !== undefined ? { seed } : {}),
  };
}
