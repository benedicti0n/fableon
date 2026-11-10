import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { getRepoRoot } from "@/lib/studio/repository";

import { listProviderAuthorizations } from "./authorization";
import type { HostedProviderId } from "./catalog";
import { STAGE2B_SHEET_ORDER, STAGE2B_SHEETS } from "./stage2b-plan";

export interface Stage2BProviderStatus {
  readonly provider: HostedProviderId;
  readonly authorization: {
    readonly id: string;
    readonly status: string;
    readonly maxCostUsd: number;
    readonly maxRequests: number;
    readonly requestCount: number;
    readonly approvedBy: string | null;
    readonly expiresAt: string;
  } | null;
  readonly estimates: readonly { readonly sheet: string; readonly usd: number | null }[];
  readonly estimatedTotalUsd: number;
  readonly generatedSheets: readonly string[];
  readonly packStatus: "missing" | "invalid" | "ready";
  readonly partCount: number;
  readonly missingParts: readonly string[];
  readonly validationErrors: readonly string[];
  readonly characterVideo: string | null;
  readonly variationVideo: string | null;
}

function stageRoot(): string {
  return path.join(getRepoRoot(), "outputs", "folk-provider-benchmark", "stage-2b");
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function stage2bWorkspaceStatus(): Promise<{
  readonly experimentId: string;
  readonly providers: readonly Stage2BProviderStatus[];
  readonly combinedEstimateUsd: number;
  readonly combinedCapUsd: number;
}> {
  const authorizations = await listProviderAuthorizations();
  const providers: Stage2BProviderStatus[] = [];
  for (const provider of ["openai", "gemini"] as const) {
    const root = path.join(stageRoot(), provider);
    const authorization = authorizations.find(
      (entry) => entry.experimentId === "phase-05.1-stage-2b" && entry.provider === provider,
    );
    const estimates: Array<{ sheet: string; usd: number | null }> = [];
    for (const sheet of STAGE2B_SHEET_ORDER) {
      const record = await readJson<{ estimate?: { estimatedCostUsd?: number } }>(
        path.join(root, "requests", `stage2b-${provider}-${sheet}-estimate.request.json`),
      );
      estimates.push({ sheet, usd: record?.estimate?.estimatedCostUsd ?? null });
    }
    const generated = await readdir(path.join(root, "generated")).catch(() => []);
    const validation = await readJson<{
      ok: boolean;
      presentPartCount: number;
      missingPartIds: string[];
      errors: Array<{ message: string }>;
    }>(path.join(root, "validation.json"));
    const packStatus = validation ? (validation.ok ? "ready" : "invalid") : "missing";
    const characterVideo = await readJson<unknown>(path.join(root, "render-base.json"));
    const variationVideo = await readJson<unknown>(path.join(root, "render-variation.json"));
    providers.push({
      provider,
      authorization: authorization
        ? {
            id: authorization.id,
            status: authorization.status,
            maxCostUsd: authorization.maxCostUsd,
            maxRequests: authorization.maxRequests,
            requestCount: authorization.requestCount,
            approvedBy: authorization.approvedBy,
            expiresAt: authorization.expiresAt,
          }
        : null,
      estimates,
      estimatedTotalUsd: estimates.reduce((sum, entry) => sum + (entry.usd ?? 0), 0),
      generatedSheets: generated
        .filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file))
        .map((file) => file.replace(/\.[^.]+$/, ""))
        .filter((id) => (STAGE2B_SHEET_ORDER as readonly string[]).includes(id)),
      packStatus,
      partCount: validation?.presentPartCount ?? 0,
      missingParts:
        validation?.missingPartIds ??
        STAGE2B_SHEET_ORDER.flatMap((id) => STAGE2B_SHEETS[id].slots).filter(Boolean),
      validationErrors: validation?.errors.map((entry) => entry.message) ?? [],
      characterVideo: characterVideo
        ? `/api/studio/providers/stage-2b/${provider}/character-test.mp4`
        : null,
      variationVideo: variationVideo
        ? `/api/studio/providers/stage-2b/${provider}/variation.mp4`
        : null,
    });
  }
  return {
    experimentId: "phase-05.1-stage-2b",
    providers,
    combinedEstimateUsd: providers.reduce((sum, entry) => sum + entry.estimatedTotalUsd, 0),
    combinedCapUsd: providers.reduce(
      (sum, entry) => sum + (entry.authorization?.maxCostUsd ?? 0),
      0,
    ),
  };
}

export function stage2bAssetPath(provider: HostedProviderId, file: string): string {
  return path.join(stageRoot(), provider, file);
}
