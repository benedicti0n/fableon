#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  STAGE2B_SHEETS,
  stage2bSheetPrompt,
  type Stage2BSheetId,
} from "../apps/web/lib/providers/stage2b-plan.ts";

type Provider = "openai" | "gemini";
type Mode = "estimate" | "generate";

interface ReferenceInput {
  readonly id: string;
  readonly path: string;
  readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
}

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || process.argv[index + 1] === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing --${name}`);
  }
  return process.argv[index + 1]!;
}

async function imageMime(file: string): Promise<ReferenceInput["mimeType"]> {
  const bytes = await readFile(file);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF") return "image/webp";
  return "image/png";
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
    const message =
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>)["error"] === "object"
        ? String(
            ((parsed as Record<string, unknown>)["error"] as Record<string, unknown>)["message"] ??
              text,
          )
        : text;
    throw new Error(`${pathname} → ${response.status}: ${message}`);
  }
  return parsed as T;
}

async function reference(id: string, file: string, required = true): Promise<ReferenceInput[]> {
  try {
    await readFile(file);
  } catch {
    if (required) throw new Error(`Missing reference ${id}: ${file}`);
    return [];
  }
  return [{ id, path: path.resolve(file), mimeType: await imageMime(file) }];
}

async function main() {
  const mode = arg("mode", "estimate") as Mode;
  if (mode !== "estimate" && mode !== "generate")
    throw new Error("mode must be estimate or generate");
  if (mode === "generate" && !process.argv.includes("--paid")) {
    throw new Error(
      "Paid generation requires --paid. Stage 2B authorization must be activated explicitly first.",
    );
  }
  const provider = arg("provider") as Provider;
  if (provider !== "openai" && provider !== "gemini")
    throw new Error("provider must be openai or gemini");
  const sheetId = arg("sheet") as Stage2BSheetId;
  const sheet = STAGE2B_SHEETS[sheetId];
  if (!sheet) throw new Error(`Unknown sheet ${sheetId}`);
  const experimentId = "phase-05.1-stage-2b";
  const model = provider === "openai" ? "gpt-image-2.6-sunburst" : "gemini-nano-banana-2.1";
  const requestKey = arg("request-key", `stage2b-${provider}-${sheetId}`);
  const root = process.cwd();
  const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2b");
  const requestDir = path.join(stage, provider, "requests");
  await mkdir(requestDir, { recursive: true });

  const master = path.resolve(
    arg(
      "master",
      path.join(
        root,
        "outputs",
        "folk-provider-benchmark",
        provider,
        "attempts",
        provider === "openai" ? "stage2a-openai-master" : "stage2a-gemini-master-retry2",
        "output-00.png",
      ),
    ),
  );
  const stage2a = path.join(
    root,
    "outputs",
    "folk-provider-benchmark",
    "stage-2a",
    `${provider}-pack`,
    "parts",
  );
  const references: ReferenceInput[] = [
    ...(await reference("artisan-master", master)),
    ...(sheetId === "head"
      ? await reference("stage2a-head", path.join(stage2a, "artisan_head.png"), false)
      : []),
    ...(sheetId === "body"
      ? await reference("stage2a-torso", path.join(stage2a, "artisan_torso.png"), false)
      : []),
    ...(sheetId === "arms"
      ? [
          ...(await reference(
            "stage2a-near-upper-arm",
            path.join(stage2a, "artisan_nearUpperArm.png"),
            false,
          )),
          ...(await reference(
            "stage2a-near-forearm",
            path.join(stage2a, "artisan_nearForearm.png"),
            false,
          )),
        ]
      : []),
  ];

  const prompt = stage2bSheetPrompt(provider, sheet);
  const width = provider === "openai" ? 2048 : 1024;
  const height = provider === "openai" ? 2048 : 1024;
  const body = {
    experimentId,
    provider,
    model,
    operation: "generate-part",
    prompt,
    width,
    height,
    quality: provider === "openai" ? "medium" : "standard",
    ...(provider === "gemini" ? { imageSize: "2K" } : {}),
    aspectRatio: "1:1",
    outputCount: 1,
    transparentBackground: provider === "openai",
    requestKey,
    references,
    ...(provider === "gemini"
      ? { note: "Chroma-key green sheet for explicit mask/repair; no native transparency." }
      : {}),
  };

  if (mode === "generate") {
    const status = await api<{
      authorizations: Array<{
        id: string;
        experimentId: string;
        provider: string;
        model: string;
        status: string;
      }>;
    }>("/api/studio/providers/status");
    const authorization = status.authorizations.find(
      (entry) =>
        entry.experimentId === experimentId &&
        entry.provider === provider &&
        entry.model === model &&
        entry.status === "active",
    );
    if (!authorization) {
      throw new Error(
        `No active Stage 2B authorization for ${provider}/${model}. No paid request was made.`,
      );
    }
  }

  const estimate = await api<{
    estimate: unknown;
    authorization: unknown;
    authorizationError: string | null;
  }>("/api/studio/providers/estimate", body);
  const record = {
    requestKey,
    mode,
    provider,
    model,
    experimentId,
    sheet: sheet.id,
    prompt,
    body,
    references: references.map((entry) => ({ id: entry.id, path: entry.path })),
    estimate: estimate.estimate,
    authorization: estimate.authorization,
    authorizationError: estimate.authorizationError,
    attemptedAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(requestDir, `${requestKey}.request.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        requestKey,
        mode,
        estimate: estimate.estimate,
        authorizationError: estimate.authorizationError,
      },
      null,
      2,
    ),
  );

  if (mode === "estimate") return;
  const response = await api<unknown>("/api/studio/providers/generate", body);
  await writeFile(
    path.join(requestDir, `${requestKey}.response.json`),
    `${JSON.stringify(response, null, 2)}\n`,
  );
  console.log(JSON.stringify(response, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
