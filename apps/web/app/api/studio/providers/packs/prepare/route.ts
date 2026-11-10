import path from "node:path";

import { NextResponse } from "next/server";

import { getHostedModel } from "@/lib/providers/catalog";
import { prepareProviderPack, type BackgroundInput, type PartInput } from "@/lib/providers/assets";
import { providerErrorResponse } from "@/lib/providers/http";
import { appendProviderEvent, providerDirectory } from "@/lib/providers/ledger";
import { ProviderServiceError } from "@/lib/providers/service";
import { getRepoRoot } from "@/lib/studio/repository";
import { readJsonObject } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ProviderServiceError("invalid_input", `${name} is required.`);
  }
  return value.trim();
}

function repoPath(value: unknown, name: string): string {
  const raw = requiredString(value, name);
  const root = path.resolve(getRepoRoot());
  const resolved = path.resolve(raw);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new ProviderServiceError("invalid_input", `${name} must be inside the repository.`);
  }
  return resolved;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonObject(request);
    const provider = requiredString(body["provider"], "provider");
    if (provider !== "openai" && provider !== "gemini") {
      throw new ProviderServiceError("invalid_input", "provider must be openai or gemini.");
    }
    const model = requiredString(body["model"], "model");
    getHostedModel(provider, model);
    const experimentId = requiredString(body["experimentId"], "experimentId");
    const title = requiredString(body["title"], "title");
    const partsRaw = body["parts"];
    const backgroundsRaw = body["backgrounds"];
    if (!Array.isArray(partsRaw) || partsRaw.length === 0) {
      throw new ProviderServiceError("invalid_input", "parts must be a non-empty array.");
    }
    if (!Array.isArray(backgroundsRaw)) {
      throw new ProviderServiceError("invalid_input", "backgrounds must be an array.");
    }
    const parts: PartInput[] = partsRaw.map((entry, index) => {
      if (typeof entry !== "object" || entry === null) {
        throw new ProviderServiceError("invalid_input", `parts[${index}] is invalid.`);
      }
      const record = entry as Record<string, unknown>;
      const pivot = record["sourcePivot"];
      if (
        typeof pivot !== "object" ||
        pivot === null ||
        typeof (pivot as Record<string, unknown>)["x"] !== "number" ||
        typeof (pivot as Record<string, unknown>)["y"] !== "number"
      ) {
        throw new ProviderServiceError(
          "invalid_input",
          `parts[${index}].sourcePivot must contain numeric x and y.`,
        );
      }
      return {
        slot: requiredString(record["slot"], `parts[${index}].slot`),
        sourcePath: repoPath(record["sourcePath"], `parts[${index}].sourcePath`),
        sourcePivot: {
          x: (pivot as Record<string, number>)["x"] as number,
          y: (pivot as Record<string, number>)["y"] as number,
        },
        ...(typeof record["scale"] === "number" ? { scale: record["scale"] } : {}),
        ...(record["maskPath"]
          ? { maskPath: repoPath(record["maskPath"], `parts[${index}].maskPath`) }
          : {}),
      };
    });
    const backgrounds: BackgroundInput[] = backgroundsRaw.map((entry, index) => {
      if (typeof entry !== "object" || entry === null) {
        throw new ProviderServiceError("invalid_input", `backgrounds[${index}] is invalid.`);
      }
      const record = entry as Record<string, unknown>;
      return {
        id: requiredString(record["id"], `backgrounds[${index}].id`),
        sourcePath: repoPath(record["sourcePath"], `backgrounds[${index}].sourcePath`),
      };
    });
    const outputDir = providerDirectory(provider);
    const result = await prepareProviderPack({
      provider,
      model,
      experimentId,
      title,
      outputDir,
      generationMode: "provider-generated",
      parts,
      backgrounds,
    });
    for (const part of result.parts) {
      await appendProviderEvent({
        type: part.notes.length > 0 ? "asset-repaired" : "asset-extracted",
        experimentId,
        provider,
        model,
        requestKey: null,
        authorizationId: null,
        operation: "prepare-pack",
        attempt: 1,
        outputCount: 1,
        inputReferenceCount: 0,
        status: part.status,
        estimatedCostUsd: 0,
        reconciledCostUsd: 0,
        usage: null,
        outputHashes: [part.sha256],
        note: `${part.id} → ${part.slot.actor}/${part.slot.nodeId}; alpha ${part.alpha.hasAlpha ? "valid" : "invalid"}.`,
        meta: { sourceFile: part.sourceFile, targetPivot: part.targetPivot },
      });
    }
    return NextResponse.json(
      {
        manifestPath: path.relative(getRepoRoot(), result.manifestPath).split(path.sep).join("/"),
        manifestUrl: `/api/studio/providers/packs/${provider}`,
        parts: result.parts.map((part) => ({
          id: part.id,
          actor: part.slot.actor,
          nodeId: part.slot.nodeId,
          status: part.status,
          alpha: part.alpha,
          sha256: part.sha256,
        })),
        missingSlots: result.missingSlots,
        backgrounds: result.backgrounds.map((background) => background.id),
      },
      { status: 201 },
    );
  } catch (error) {
    return providerErrorResponse(error);
  }
}
