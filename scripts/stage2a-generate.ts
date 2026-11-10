#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildMasterPrompt, buildPartPrompt } from "../apps/web/lib/providers/design.ts";

type Provider = "openai" | "gemini";

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || process.argv[index + 1] === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing --${name}`);
  }
  return process.argv[index + 1]!;
}

async function api<T = unknown>(pathname: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `${process.env.FABLEON_BASE_URL ?? "http://localhost:3173"}${pathname}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const errorBody =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)["error"]
        : null;
    const message =
      typeof errorBody === "object" &&
      errorBody !== null &&
      typeof (errorBody as Record<string, unknown>)["message"] === "string"
        ? String((errorBody as Record<string, unknown>)["message"])
        : text;
    throw new Error(`${pathname} → ${response.status}: ${message}`);
  }
  return parsed as T;
}

function geminiChroma(prompt: string): string {
  return `${prompt}

Provider-specific transparency workaround: place only this isolated body part on a perfectly flat, uniform chroma-key green (#00FF00) background. Do not use green on the character. No shadow, no ground, no other parts, no text, no labels. Keep the part fully inside the frame with clean separation from the background.`;
}

async function main() {
  const mode = arg("mode"); // master | part
  const provider = arg("provider") as Provider;
  if (provider !== "openai" && provider !== "gemini")
    throw new Error("provider must be openai or gemini");
  const experimentId = "phase-05.1-folk-pilot";
  const status = await api<{
    authorizations: Array<{
      experimentId: string;
      provider: string;
      status: string;
      maxCostUsd: number;
      spentCostUsd: number;
      reservedCostUsd: number;
    }>;
  }>("/api/studio/providers/status");
  const authorization = status.authorizations.find(
    (record) =>
      record.experimentId === experimentId &&
      record.provider === provider &&
      record.status === "active",
  );
  if (!authorization) throw new Error(`No active authorization for ${provider}/${experimentId}.`);
  const remaining =
    authorization.maxCostUsd - authorization.spentCostUsd - authorization.reservedCostUsd;
  if (remaining <= 0) throw new Error(`No remaining budget for ${provider}.`);

  const model = provider === "openai" ? "gpt-image-2.6-sunburst" : "gemini-nano-banana-2.1";
  const requestKey = arg("request-key", `stage2a-${provider}-${mode}`);
  let prompt: string;
  let operation: string;
  let references: { id: string; path: string; mimeType: "image/png" }[] = [];
  if (mode === "master") {
    prompt = buildMasterPrompt("artisan", provider);
    operation = "generate-master";
  } else if (mode === "sheet") {
    const masterPath = arg("master");
    prompt = `Use the approved artisan master as the exact identity and style reference.

Create a single 2x2 rig-part sheet on a perfectly flat, uniform chroma-key green (#00FF00) background. No green on the character. No grid lines, labels, text, shadows, or extra pieces.

Top-left: ONLY the head — face, ear, moustache, earring, saffron turban and indigo turban tail, with a short neck stump and 24 px of hidden neck overlap.
Top-right: ONLY the torso/shoulder anchor — ochre angrakha torso with collar, buttons, sash and shoulder area; no head, no arms, no legs.
Bottom-left: ONLY the near upper arm — indigo sleeve segment with a rounded shoulder end and a rounded elbow end, with hidden overlap at both joints.
Bottom-right: ONLY the near forearm — indigo elbow cuff, warm-skin forearm, gold wrist band and open hand, with hidden overlap at the elbow.

Keep all four pieces fully separated by green gutters, same palette, same outline weight, same proportions as the master. Do not include other body parts or a full character.`;
    operation = "generate-part";
    references = [{ id: "artisan-master", path: path.resolve(masterPath), mimeType: "image/png" }];
  } else {
    const partId = arg("part");
    const masterPath = arg("master");
    prompt = buildPartPrompt({ character: "artisan", partId, provider });
    if (provider === "gemini") prompt = geminiChroma(prompt);
    operation = "generate-part";
    references = [{ id: "artisan-master", path: path.resolve(masterPath), mimeType: "image/png" }];
  }

  const width = mode === "master" ? 1536 : 1024;
  const height = 1024;
  const body = {
    experimentId,
    provider,
    model,
    operation,
    prompt,
    width,
    height,
    quality: provider === "openai" ? "medium" : "standard",
    ...(provider === "gemini" ? { imageSize: "2K" } : {}),
    aspectRatio: mode === "master" ? "3:2" : "1:1",
    outputCount: 1,
    transparentBackground: provider === "openai",
    requestKey,
    references,
    ...(provider === "gemini" && mode === "part"
      ? { note: "Chroma-key green background for explicit mask/repair." }
      : {}),
  };

  const estimate = await api<{ estimate: unknown; authorization?: { remainingUsd: number } }>(
    "/api/studio/providers/estimate",
    body,
  );
  const dir = path.join("outputs", "folk-provider-benchmark", "stage-2a", "requests");
  await mkdir(dir, { recursive: true });
  const requestRecord = {
    requestKey,
    provider,
    model,
    mode,
    operation,
    prompt,
    body,
    estimate: estimate.estimate,
    authorization: estimate.authorization,
    attemptedAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(dir, `${requestKey}.request.json`),
    `${JSON.stringify(requestRecord, null, 2)}\n`,
  );

  console.log(
    JSON.stringify(
      {
        requestKey,
        provider,
        model,
        mode,
        estimate: estimate.estimate,
        authorizationRemaining: estimate.authorization?.remainingUsd,
      },
      null,
      2,
    ),
  );

  const result = await api<{
    files: unknown;
    usage: unknown;
    reconciledCostUsd: number;
    estimate: unknown;
    requestId: string | null;
  }>("/api/studio/providers/generate", body);
  await writeFile(
    path.join(dir, `${requestKey}.response.json`),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        requestKey,
        provider,
        operation,
        files: result.files,
        usage: result.usage,
        reconciledCostUsd: result.reconciledCostUsd,
        estimate: result.estimate,
        requestId: result.requestId,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
