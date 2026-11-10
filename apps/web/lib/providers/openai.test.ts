import { describe, expect, it, vi } from "vitest";

import { OpenAIImageAdapter } from "./openai";
import type { GenerationRequest } from "./catalog";

const request: GenerationRequest = {
  provider: "openai",
  model: "gpt-image-2.6-sunburst",
  operation: "generate-master",
  prompt: "An original folk-art artisan",
  width: 1536,
  height: 1024,
  quality: "medium",
  aspectRatio: "3:2",
  outputCount: 1,
  references: [],
  transparentBackground: true,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "x-request-id": "req_test" },
  });
}

describe("OpenAI image adapter", () => {
  it("sends the selected model and transparent PNG generation request", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        data: [{ b64_json: "aGVsbG8=", revised_prompt: "revised" }],
        usage: { input_tokens: 100, output_tokens: 2000, total_tokens: 2100 },
      }),
    );
    const adapter = new OpenAIImageAdapter({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await adapter.generate(request);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/images/generations");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body["model"]).toBe("gpt-image-2.6-sunburst");
    expect(body["background"]).toBe("transparent");
    expect(body["output_format"]).toBe("png");
    expect(result.requestId).toBe("req_test");
    expect(result.images[0]?.dataBase64).toBe("aGVsbG8=");
    expect(result.usage.outputTokens).toBe(2000);
  });

  it("uses multipart edits when a reference image is provided", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: [{ b64_json: "aGVsbG8=" }], usage: {} }),
    );
    const adapter = new OpenAIImageAdapter({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await adapter.generate({
      ...request,
      operation: "generate-part",
      references: [{ id: "master", mimeType: "image/png", dataBase64: "aGVsbG8=" }],
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/images/edits");
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get("model")).toBe("gpt-image-2.6-sunburst");
    expect(form.get("image[]")).toBeInstanceOf(Blob);
    expect(form.get("background")).toBe("transparent");
  });

  it("surfaces provider errors without retrying", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { message: "quota exceeded" } }, 429),
    );
    const adapter = new OpenAIImageAdapter({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(adapter.generate(request)).rejects.toThrow(/quota exceeded/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refuses to build a request without a server key", async () => {
    const adapter = new OpenAIImageAdapter({ apiKey: "" });
    await expect(adapter.generate(request)).rejects.toThrow(/OPENAI_API_KEY/);
  });
});
