import { NextResponse } from "next/server";

import { readCharacter } from "@/lib/rigby2d/assets";
import { rigby2dErrorResponse } from "@/lib/rigby2d/api";
import { listRenderJobs, reconcileRenderJob, startRender } from "@/lib/rigby2d/jobs";
import { readBodyNumber, readBodyString, readJsonObject } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const jobs = await Promise.all((await listRenderJobs()).map((job) => reconcileRenderJob(job)));
    return NextResponse.json({ jobs });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonObject(request);
    const characterId = readBodyString(body, "characterId", { required: true, max: 64 });
    const requestedVersion = readBodyString(body, "versionId", { max: 16 });
    const animation = readBodyString(body, "animation", { required: true, max: 120 });
    const fps = readBodyNumber(body, "fps", { min: 1, max: 60 }) ?? 24;
    const scale = readBodyNumber(body, "scale", { min: 0.25, max: 2 }) ?? 1;
    const character = await readCharacter(characterId);
    const versionId = requestedVersion || character.currentVersionId;
    const job = await startRender({ characterId, versionId, animation, fps, scale });
    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
