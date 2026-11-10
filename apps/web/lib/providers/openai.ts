import { createHash } from "node:crypto";

import {
  ProviderConfigurationError,
  ProviderRequestError,
  getHostedModel,
  validateGenerationRequest,
  type GeneratedImage,
  type GenerationRequest,
  type ProviderGenerationResult,
} from "./catalog";

export interface OpenAIAdapterOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly organization?: string;
  readonly safetyIdentifier?: string;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function usageFrom(body: unknown): ProviderGenerationResult["usage"] {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const usage =
    typeof record["usage"] === "object" && record["usage"] !== null
      ? (record["usage"] as Record<string, unknown>)
      : {};
  const number = (key: string): number | null =>
    typeof usage[key] === "number" && Number.isFinite(usage[key]) ? usage[key] : null;
  return {
    inputTokens: number("input_tokens") ?? number("total_tokens"),
    outputTokens: number("output_tokens"),
    totalTokens: number("total_tokens"),
    inputImageTokens: number("input_image_tokens"),
    outputImageTokens: number("output_image_tokens"),
    providerReportedCostUsd: null,
    rawUsage: usage,
  };
}

export class OpenAIImageAdapter {
  readonly provider = "openai" as const;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly organization: string | undefined;
  private readonly safetyIdentifier: string | undefined;

  constructor(options: OpenAIAdapterOptions = {}) {
    this.apiKey = options.apiKey ?? process.env["OPENAI_API_KEY"];
    this.baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.organization = options.organization ?? process.env["OPENAI_ORG_ID"];
    this.safetyIdentifier = options.safetyIdentifier;
  }

  isConfigured(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  async generate(request: GenerationRequest): Promise<ProviderGenerationResult> {
    if (!this.isConfigured()) {
      throw new ProviderConfigurationError("OPENAI_API_KEY is not configured on the server.");
    }
    getHostedModel("openai", request.model);
    validateGenerationRequest(request);
    const useEdit = request.references.length > 0 || Boolean(request.mask);
    const url = useEdit ? `${this.baseUrl}/images/edits` : `${this.baseUrl}/images/generations`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey as string}`,
    };
    if (this.organization) headers["OpenAI-Organization"] = this.organization;
    let body: BodyInit;
    if (useEdit) {
      const form = new FormData();
      form.append("model", request.model);
      form.append("prompt", request.prompt);
      form.append("n", String(request.outputCount));
      form.append("size", `${request.width}x${request.height}`);
      form.append("quality", request.quality);
      form.append("output_format", "png");
      form.append("background", request.transparentBackground ? "transparent" : "opaque");
      for (const [index, reference] of request.references.entries()) {
        const bytes = Buffer.from(reference.dataBase64, "base64");
        form.append(
          "image[]",
          new Blob([bytes], { type: reference.mimeType }),
          `reference-${index}.${reference.mimeType === "image/jpeg" ? "jpg" : "png"}`,
        );
      }
      if (request.mask) {
        const bytes = Buffer.from(request.mask.dataBase64, "base64");
        form.append("mask", new Blob([bytes], { type: request.mask.mimeType }), "mask.png");
      }
      if (this.safetyIdentifier) form.append("safety_identifier", this.safetyIdentifier);
      body = form;
    } else {
      body = JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        n: request.outputCount,
        size: `${request.width}x${request.height}`,
        quality: request.quality,
        output_format: "png",
        background: request.transparentBackground ? "transparent" : "opaque",
        ...(this.safetyIdentifier ? { safety_identifier: this.safetyIdentifier } : {}),
      });
      headers["Content-Type"] = "application/json";
    }

    const response = await this.fetchImpl(url, {
      method: "POST",
      headers,
      body,
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
              ] ?? `OpenAI image request failed with HTTP ${response.status}.`,
            )
          : `OpenAI image request failed with HTTP ${response.status}.`;
      throw new ProviderRequestError(message, response.status, parsed);
    }
    const record =
      typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
    const data = Array.isArray(record["data"]) ? record["data"] : [];
    const images: GeneratedImage[] = data.flatMap((entry, index) => {
      if (typeof entry !== "object" || entry === null) return [];
      const image = entry as Record<string, unknown>;
      if (typeof image["b64_json"] !== "string") return [];
      return [
        {
          index,
          mimeType: "image/png" as const,
          dataBase64: image["b64_json"],
          revisedPrompt:
            typeof image["revised_prompt"] === "string" ? image["revised_prompt"] : null,
        },
      ];
    });
    if (images.length === 0) {
      throw new ProviderRequestError("OpenAI returned no image bytes.", 502, parsed);
    }
    return {
      provider: "openai",
      model: request.model,
      requestId: response.headers.get("x-request-id"),
      images,
      usage: usageFrom(parsed),
      rawResponseHash: hash(text),
      createdAt: new Date().toISOString(),
    };
  }
}
