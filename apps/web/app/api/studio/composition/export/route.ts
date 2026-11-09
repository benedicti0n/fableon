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
  readRenderJob,
  reconcileRenderJob,
  renderJobOutputPath,
  writeRenderJob,
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
    const active = (await Promise.all((await listRenderJobs()).map(reconcileRenderJob))).find(
      isActiveRenderJob,
    );
    if (active) {
      throw new StudioError(
        "conflict",
        `Render job ${active.id} is already active. Wait for it or cancel it before starting another.`,
      );
    }

    const production = body["production"] === "folk-pilot" ? "folk-pilot" : "where-the-light-lands";
    const job = await createRenderJob({
      startFrame,
      endFrame,
      width,
      height,
      fps: 24,
      production,
    });
    const outputPath = renderJobOutputPath(job.id, production);
    const scriptPath = path.join(
      getRepoRoot(),
      production === "folk-pilot" ? "scripts/render-folk.mjs" : "scripts/render-phase-04.mjs",
    );
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
        ...(production === "folk-pilot" ? ["--production", "folk-pilot"] : []),
      ],
      {
        cwd: getRepoRoot(),
        detached: true,
        stdio: "ignore",
      },
    );
    child.unref();

    // Record the child PID as early as possible so cancellation can terminate
    // the process group even before the render script's first status write.
    const current = await readRenderJob(job.id);
    if (isActiveRenderJob(current) && child.pid !== undefined) {
      await writeRenderJob({
        ...current,
        pid: child.pid,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
