import { describe, expect, it } from "vitest";

import {
  HOSTED_MODELS,
  ProviderConfigurationError,
  estimateGenerationCost,
  getHostedModel,
  validateGenerationRequest,
  type GenerationRequest,
} from "./catalog";

const base: GenerationRequest = {
  provider: "openai",
  model: "gpt-image-2.6-sunburst",
  operation: "generate-master",
  prompt: "An original Rajasthani folk-art artisan, flat cutout style, bold outline",
  width: 1536,
  height: 1024,
  quality: "medium",
  aspectRatio: "3:2",
  outputCount: 1,
  references: [],
  transparentBackground: true,
};

describe("hosted provider catalog", () => {
  it("contains the verified OpenAI 2.6 and Gemini 2.1 model ids", () => {
    expect(HOSTED_MODELS.map((model) => model.id)).toEqual(
      expect.arrayContaining([
        "gpt-image-2.6-sunburst",
        "gpt-image-2.6-flare",
        "gemini-nano-banana-2.1",
      ]),
    );
  });

  it("records explicit capability differences", () => {
    const openai = getHostedModel("openai", "gpt-image-2.6-sunburst");
    const gemini = getHostedModel("gemini", "gemini-nano-banana-2.1");
    expect(openai.capabilities.nativeTransparentBackground).toBe(true);
    expect(openai.capabilities.maskGuidedEdit).toBe(true);
    expect(gemini.capabilities.nativeTransparentBackground).toBe(false);
    expect(gemini.capabilities.maskGuidedEdit).toBe(false);
    expect(gemini.capabilities.maxReferences).toBe(14);
  });

  it("estimates a conservative OpenAI cost", () => {
    const estimate = estimateGenerationCost(base);
    expect(estimate.pricingVerified).toBe(true);
    expect(estimate.estimatedCostUsd).toBeGreaterThan(0);
    expect(estimate.maxCostUsd).toBeGreaterThanOrEqual(estimate.estimatedCostUsd);
    expect(estimate.outputImageTokens).toBeGreaterThan(1000);
  });

  it("estimates the published Gemini 2K image price plus bounded input", () => {
    const estimate = estimateGenerationCost({
      ...base,
      provider: "gemini",
      model: "gemini-nano-banana-2.1",
      quality: "standard",
      imageSize: "2K",
      transparentBackground: false,
    });
    expect(estimate.outputImageTokens).toBe(1680);
    expect(estimate.estimatedCostUsd).toBeGreaterThan(0.0504);
    expect(estimate.estimatedCostUsd).toBeLessThan(0.06);
  });

  it("rejects Gemini transparency and mask requests instead of pretending parity", () => {
    expect(() =>
      validateGenerationRequest({
        ...base,
        provider: "gemini",
        model: "gemini-nano-banana-2.1",
        quality: "standard",
        imageSize: "2K",
        transparentBackground: true,
      }),
    ).toThrow(ProviderConfigurationError);
    expect(() =>
      validateGenerationRequest({
        ...base,
        provider: "gemini",
        model: "gemini-nano-banana-2.1",
        quality: "standard",
        imageSize: "2K",
        transparentBackground: false,
        mask: { id: "m", mimeType: "image/png", dataBase64: "AA==" },
      }),
    ).toThrow(/mask-guided/i);
  });

  it("rejects unverified model identifiers", () => {
    expect(() => getHostedModel("openai", "gpt-image-made-up")).toThrow(/Unsupported/);
  });
});
