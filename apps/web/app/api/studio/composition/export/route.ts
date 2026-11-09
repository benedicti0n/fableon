import { spawn } from "node:child_process";
import path from "node:path";

import { NextResponse } from "next/server";

import { StudioError } from "@/lib/studio/errors";
import { errorResponse, readBodyNumber, readJsonObject } from "@/lib/studio/http";
import {
  createRenderJob,
  getRenderJobFile,
  isActiveRenderJob,
  listRenderJobs,
  renderJobOutputPath,
} from "@/lib/film/render-jobs";
import { getRepoRoot } from "@/lib/studio/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonObject(request);
    const startFrame = readBodyNumber(body, "startFrame", {
      required: true,
      min: 0,
      max: 719,
    });
    const endFrame = readBodyNumber(body, "endFrame", {
      required: true,
      min: 0,
      max: 719,
    });
    const width = readBodyNumber(body, "width", {
      required: true,
      min: 640,
      max: 1920,
    });
    const height = readBodyNumber(body, "height", {
      required: true,
      min: 360,
      max: 1080,
    });
    if (
      startFrame === undefined ||
      endFrame === undefined ||
      width === undefined ||
      height === undefined
    ) {
      throw new StudioError("invalid_input", "Frame range and resolution are required.");
    }
    if (endFrame < startFrame) {
      throw new StudioError("invalid_input", "End frame must be at or after the start frame.");
    }
    if (Math.abs(width / height - 16 / 9) > 0.001) {
      throw new StudioError("invalid_input", "Phase 4 export requires a 16:9 resolution.");
    }
    const active = (await listRenderJobs()).find(isActiveRenderJob);
    if (active) {
      throw new StudioError(
        "conflict",
        `Render job ${active.id} is already active. Wait for it or cancel it before starting another.`,
      );
    }

    const job = await createRenderJob({
      startFrame,
      endFrame,
      width,
      height,
      fps: 24,
    });
    const outputPath = renderJobOutputPath(job.id);
    const scriptPath = path.join(getRepoRoot(), "scripts/render-phase-04.mjs");
    const origin = new URL(request.url).origin;
    const child = spawn(
      process.execPath,
      [
        scriptPath,
        "--base-url",
        origin,
        "--start",
        String(startFrame),
        "--end",
        String(endFrame),
        "--resolution",
        `${width}x${height}`,
        "--output",
        outputPath,
        "--job-id",
        job.id,
        "--status-file",
        getRenderJobFile(job.id),
      ],
      {
        cwd: getRepoRoot(),
        detached: true,
        stdio: "ignore",
      },
    );
    child.unref();

    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
