import { NextResponse } from "next/server";

import { rigby2dErrorResponse } from "@/lib/rigby2d/api";
import { Rigby2DError } from "@/lib/rigby2d/errors";
import { Rigby2DCharacterRuntime } from "@/lib/rigby2d/runtime";
import { readBodyNumber, readBodyString, readJsonObject } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonObject(request);
    const characterId = readBodyString(body, "characterId", { required: true, max: 64 });
    const versionId = readBodyString(body, "versionId", { max: 16 });
    const animation = readBodyString(body, "animation", { required: true, max: 120 });
    const timeSeconds = readBodyNumber(body, "timeSeconds", { required: true, min: 0, max: 600 });
    const requestedFlexion = readBodyNumber(body, "requestedFlexion", {
      required: true,
      min: 0,
      max: 180,
    });
    const tolerance = readBodyNumber(body, "tolerance", { min: 0.01, max: 45 }) ?? 3;
    const chain = isObject(body["chain"]) ? body["chain"] : null;
    if (
      !chain ||
      typeof chain["a"] !== "string" ||
      typeof chain["b"] !== "string" ||
      typeof chain["c"] !== "string"
    ) {
      throw new Rigby2DError("POSE_CHAIN_INVALID", "chain must contain a, b and c bone names.");
    }
    const ikTargetBone = readBodyString(body, "ikTargetBone", { max: 80 });
    if (timeSeconds === undefined || requestedFlexion === undefined) {
      throw new Rigby2DError("INVALID_INPUT", "timeSeconds and requestedFlexion are required.");
    }
    const runtime = new Rigby2DCharacterRuntime();
    const check = await runtime.measureFlexion(characterId, {
      animation,
      timeSeconds,
      requestedFlexion,
      tolerance,
      chain: { a: chain["a"], b: chain["b"], c: chain["c"] },
      ...(versionId ? { versionId } : {}),
      ...(ikTargetBone ? { ikTargetBone } : {}),
    });
    return NextResponse.json({ check });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
