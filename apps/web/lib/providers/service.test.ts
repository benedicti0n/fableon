import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProviderServiceError,
  estimateProviderRequest,
  executeProviderGeneration,
} from "./service";

const originalDataDir = process.env["FABLEON_DATA_DIR"];
const tempDir = await mkdtemp(path.join(os.tmpdir(), "fableon-provider-service-"));

beforeEach(() => {
  process.env["FABLEON_DATA_DIR"] = tempDir;
});

afterAll(async () => {
  if (originalDataDir === undefined) delete process.env["FABLEON_DATA_DIR"];
  else process.env["FABLEON_DATA_DIR"] = originalDataDir;
  await rm(tempDir, { recursive: true, force: true });
});

const input = {
  experimentId: "phase-05.1-folk-pilot",
  provider: "openai" as const,
  model: "gpt-image-2.6-sunburst",
  operation: "generate-master" as const,
  prompt: "An original folk-art master",
  width: 1536,
  height: 1024,
  quality: "medium" as const,
  aspectRatio: "3:2",
  outputCount: 1,
  references: [],
  transparentBackground: true,
  requestKey: "stage1-unauthorized",
};

describe("provider service safety", () => {
  it("estimates without any provider call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const estimate = await estimateProviderRequest(input);
    expect(estimate.estimate.estimatedCostUsd).toBeGreaterThan(0);
    expect(estimate.authorization).toBeNull();
    expect(estimate.authorizationError).toMatch(/approval|authorization/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("refuses execution when no explicit authorization exists", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(executeProviderGeneration(input)).rejects.toBeInstanceOf(ProviderServiceError);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("refuses execution when a model is not in the verified catalog", async () => {
    await expect(
      executeProviderGeneration({ ...input, model: "gpt-image-unknown" }),
    ).rejects.toThrow(/Unsupported/);
  });
});
