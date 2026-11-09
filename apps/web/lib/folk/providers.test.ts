import { describe, expect, it } from "vitest";

import {
  IMAGE_PRICING,
  ImageProviderError,
  authorizeRemoteRequest,
  buildComfyWorkflow,
  estimateImageCost,
  localComfyRequest,
  type ComfyWorkflow,
  type ImageGenerationRequest,
  type RemoteSpendAuthorization,
} from "./providers";

const request: ImageGenerationRequest = {
  provider: "bfl",
  model: "FLUX 3 Image Klein 2K",
  prompt: "A folk-art horse",
  width: 1024,
  height: 1024,
  outputCount: 2,
  seed: 42,
};

const authorization: RemoteSpendAuthorization = {
  id: "auth_test",
  approvedBy: "test",
  approvedAt: "2026-11-10T00:00:00.000Z",
  provider: "bfl",
  model: "FLUX 3 Image Klein 2K",
  maxCostUsd: 0.05,
  maxOutputs: 4,
  maxWidth: 2048,
  maxHeight: 2048,
};

describe("remote image spending gate", () => {
  it("blocks remote generation without an explicit authorization", () => {
    expect(() => authorizeRemoteRequest(request, null, IMAGE_PRICING.bfl)).toThrow(
      ImageProviderError,
    );
  });

  it("blocks requests above the approved cost or output limits", () => {
    expect(() =>
      authorizeRemoteRequest({ ...request, outputCount: 6 }, authorization, IMAGE_PRICING.bfl),
    ).toThrow(/output count/i);
    expect(() =>
      authorizeRemoteRequest(
        { ...request, outputCount: 4 },
        { ...authorization, maxCostUsd: 0.01 },
        IMAGE_PRICING.bfl,
      ),
    ).toThrow(/cap/i);
  });

  it("returns a persisted-estimate record when every limit matches", () => {
    const authorized = authorizeRemoteRequest(request, authorization, IMAGE_PRICING.bfl);
    expect(authorized.authorizationId).toBe("auth_test");
    expect(authorized.estimatedCostUsd).toBeCloseTo(0.028, 6);
  });

  it("keeps local ComfyUI requests free and outside the paid gate", () => {
    expect(estimateImageCost({ ...request, provider: "local-comfyui" })).toBe(0);
    expect(() =>
      localComfyRequest({ ...request, provider: "local-comfyui", width: 1024, height: 1024 }),
    ).not.toThrow();
  });
});

describe("ComfyUI workflow binding", () => {
  const workflow: ComfyWorkflow = {
    "6": { class_type: "CLIPTextEncode", inputs: { text: "old prompt", clip: ["4", 1] } },
    "3": { class_type: "KSampler", inputs: { seed: 1, steps: 20, model: ["4", 0] } },
    "9": { class_type: "SaveImage", inputs: { filename_prefix: "folk" } },
  };

  it("injects the prompt and seed into an exported workflow", () => {
    const bound = buildComfyWorkflow(
      { workflow, promptNodeId: "6", seedNodeId: "3" },
      { ...request, provider: "local-comfyui" },
    );
    expect(bound["6"]?.inputs["text"]).toBe("A folk-art horse");
    expect(bound["3"]?.inputs["seed"]).toBe(42);
    expect(bound["9"]?.inputs["filename_prefix"]).toBe("folk");
  });

  it("rejects invented node IDs instead of guessing a workflow shape", () => {
    expect(() =>
      buildComfyWorkflow({ workflow, promptNodeId: "missing", seedNodeId: "3" }, request),
    ).toThrow(/prompt node/i);
  });
});
