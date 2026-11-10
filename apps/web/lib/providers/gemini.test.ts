import { describe, expect, it, vi } from "vitest";

import type { GenerationRequest } from "./catalog";
import { GeminiImageAdapter } from "./gemini";

const request: GenerationRequest = {
  provider: "gemini",
  model: "gemini-nano-banana-2.1",
  operation: "generate-master",
  prompt: "An original folk-art artisan",
  width: 1536,
  height: 1024,
  quality: "standard",
  imageSize: "2K",
  aspectRatio: "3:2",
  outputCount: 1,
  references: [],
  transparentBackground: false,
};

describe("Gemini Nano Banana adapter", () => {
  it("uses the documented Interactions endpoint and image response format", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "interaction_1",
            output_image: { data: "aGVsbG8=" },
            usage: { prompt_token_count: 20, candidates_token_count: 30, total_token_count: 50 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    const adapter = new GeminiImageAdapter({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await adapter.generate(request);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    expect((init.headers as Record<string, string>)["Api-Revision"]).toBe("2026-05-20");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body["model"]).toBe("gemini-nano-banana-2.1");
    expect((body["response_format"] as Record<string, unknown>)["image_size"]).toBe("2K");
    expect(result.images[0]?.dataBase64).toBe("aGVsbG8=");
    expect(result.requestId).toBe("interaction_1");
  });

  it("sends reference images as image input blocks", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ output_image: { data: "aGVsbG8=" } }), { status: 200 }),
    );
    const adapter = new GeminiImageAdapter({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await adapter.generate({
      ...request,
      references: [{ id: "master", mimeType: "image/png", dataBase64: "aGVsbG8=" }],
    });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { input: unknown[] };
    expect(body.input).toHaveLength(2);
    expect(body.input[1]).toMatchObject({ type: "image", mime_type: "image/png" });
  });

  it("parses the raw Interactions steps image shape and JPEG mime", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "interaction_steps",
            status: "completed",
            steps: [
              {
                type: "model_output",
                content: [
                  { type: "text", text: "Here is the part." },
                  { type: "image", mime_type: "image/jpeg", data: "aGVsbG8=" },
                ],
              },
            ],
            usage: {
              total_input_tokens: 120,
              total_output_tokens: 1680,
              total_tokens: 1800,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    const adapter = new GeminiImageAdapter({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await adapter.generate(request);
    expect(result.images[0]?.mimeType).toBe("image/jpeg");
    expect(result.images[0]?.dataBase64).toBe("aGVsbG8=");
    expect(result.usage.inputTokens).toBe(120);
    expect(result.usage.outputTokens).toBe(1680);
  });

  it("rejects native transparency and mask requests", async () => {
    const adapter = new GeminiImageAdapter({ apiKey: "test-key" });
    await expect(adapter.generate({ ...request, transparentBackground: true })).rejects.toThrow(
      /transparent/i,
    );
    await expect(
      adapter.generate({
        ...request,
        mask: { id: "mask", mimeType: "image/png", dataBase64: "aGVsbG8=" },
      }),
    ).rejects.toThrow(/mask/i);
  });

  it("refuses to build a request without a server key", async () => {
    const adapter = new GeminiImageAdapter({ apiKey: "" });
    await expect(adapter.generate(request)).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
