import { createHash } from "node:crypto";

import {
  ProviderConfigurationError,
  ProviderRequestError,
  getHostedModel,
  validateGenerationRequest,
  type GenerationRequest,
  type ProviderGenerationResult,
} from "./catalog";

export interface GeminiAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function usageFrom(body: unknown): ProviderGenerationResult["usage"] {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const raw =
    (typeof record["usage"] === "object" && record["usage"] !== null ? record["usage"] : null) ??
    (typeof record["usage_metadata"] === "object" && record["usage_metadata"] !== null
      ? record["usage_metadata"]
      : null);
  const usage = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const number = (key: string): number | null =>
    typeof usage[key] === "number" && Number.isFinite(usage[key]) ? usage[key] : null;
  return {
    inputTokens:
      number("total_input_tokens") ?? number("prompt_token_count") ?? number("input_tokens"),
    outputTokens:
      number("total_output_tokens") ?? number("candidates_token_count") ?? number("output_tokens"),
    totalTokens: number("total_tokens") ?? number("total_token_count"),
    inputImageTokens: null,
    outputImageTokens: null,
    providerReportedCostUsd: null,
    rawUsage: raw,
  };
}

interface ExtractedGeminiImage {
  readonly data: string;
  readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
}

function mimeType(value: unknown): ExtractedGeminiImage["mimeType"] {
  return value === "image/png" || value === "image/webp" ? value : "image/jpeg";
}

function findImageInValue(value: unknown, depth = 0): ExtractedGeminiImage | null {
  if (depth > 8) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageInValue(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    (record["type"] === "image" || record["type"] === "output_image") &&
    typeof record["data"] === "string"
  ) {
    return { data: record["data"], mimeType: mimeType(record["mime_type"]) };
  }
  if (typeof record["output_image"] === "object" && record["output_image"] !== null) {
    const output = record["output_image"] as Record<string, unknown>;
    if (typeof output["data"] === "string") {
      return { data: output["data"], mimeType: mimeType(output["mime_type"]) };
    }
  }
  for (const key of ["steps", "content", "contents", "output", "outputs", "candidates"]) {
    const child = record[key];
    if (child === undefined) continue;
    const found = findImageInValue(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function responseShape(value: unknown): Record<string, unknown> {
  const record =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    status: record["status"] ?? null,
    id: record["id"] ?? null,
    stepTypes: Array.isArray(record["steps"])
      ? record["steps"].map((step) =>
          typeof step === "object" && step !== null
            ? ((step as Record<string, unknown>)["type"] ?? "unknown")
            : typeof step,
        )
      : null,
    outputImagePresent: Boolean(record["output_image"]),
  };
}

export class GeminiImageAdapter {
  readonly provider = "gemini" as const;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiAdapterOptions = {}) {
    this.apiKey = options.apiKey ?? process.env["GEMINI_API_KEY"];
    this.baseUrl = (options.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta").replace(
      /\/+$/,
      "",
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  async generate(request: GenerationRequest): Promise<ProviderGenerationResult> {
    if (!this.isConfigured()) {
      throw new ProviderConfigurationError("GEMINI_API_KEY is not configured on the server.");
    }
    getHostedModel("gemini", request.model);
    validateGenerationRequest(request);
    if (request.mask) {
      throw new ProviderConfigurationError(
        "Gemini Nano Banana 2.1 does not support mask-guided editing in this adapter. Use reference-guided generation and the explicit masking/repair path.",
      );
    }
    const input: unknown[] = [
      { type: "text", text: request.prompt },
      ...request.references.map((reference) => ({
        type: "image",
        mime_type: reference.mimeType,
        data: reference.dataBase64,
      })),
    ];
    const body = {
      model: request.model,
      input,
      response_format: {
        type: "image",
        mime_type: "image/jpeg",
        aspect_ratio: request.aspectRatio,
        image_size: request.imageSize ?? "2K",
      },
      ...(request.previousInteractionId
        ? { previous_interaction_id: request.previousInteractionId }
        : {}),
    };
    const response = await this.fetchImpl(`${this.baseUrl}/interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey as string,
        "Api-Revision": "2026-05-20",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text.length > 0 ? (JSON.parse(text) as unknown) : null;
    } catch {
      parsed = null;
    }
    if (!response.ok) {
      const message =
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as Record<string, unknown>)["error"] === "object" &&
        (parsed as Record<string, unknown>)["error"] !== null
          ? String(
              ((parsed as Record<string, unknown>)["error"] as Record<string, unknown>)[
                "message"
              ] ?? `Gemini image request failed with HTTP ${response.status}.`,
            )
          : `Gemini image request failed with HTTP ${response.status}.`;
      throw new ProviderRequestError(message, response.status, parsed);
    }
    const record =
      typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    const image = findImageInValue(parsed);
    if (!image) {
      throw new ProviderRequestError(
        `Gemini returned no image content (${JSON.stringify(responseShape(parsed))}).`,
        502,
        responseShape(parsed),
      );
    }
    return {
      provider: "gemini",
      model: request.model,
      requestId:
        typeof record["id"] === "string" ? record["id"] : response.headers.get("x-request-id"),
      images: [
        {
          index: 0,
          mimeType: image.mimeType,
          dataBase64: image.data,
          revisedPrompt: null,
        },
      ],
      usage: usageFrom(parsed),
      rawResponseHash: hash(text),
      createdAt: new Date().toISOString(),
    };
  }
}
