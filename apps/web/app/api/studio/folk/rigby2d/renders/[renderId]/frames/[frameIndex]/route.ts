import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { rigby2dErrorResponse } from "@/lib/rigby2d/api";
import { readRenderJob } from "@/lib/rigby2d/jobs";
import { getFrameFile } from "@/lib/rigby2d/frames";

export const dynamic = "force-dynamic";

interface FrameContext {
  readonly params: Promise<{ readonly renderId: string; readonly frameIndex: string }>;
}

export async function GET(_request: Request, context: FrameContext): Promise<NextResponse> {
  try {
    const { renderId, frameIndex: rawIndex } = await context.params;
    const frameIndex = Number(rawIndex);
    if (!Number.isInteger(frameIndex)) {
      return NextResponse.json(
        {
          error: {
            code: "FRAME_NOT_FOUND",
            message: "Frame index must be an integer.",
            details: null,
          },
        },
        { status: 404 },
      );
    }
    const job = await readRenderJob(renderId);
    if (!job.frameRender || job.status !== "completed") {
      return NextResponse.json(
        { error: { code: "RENDER_NOT_FOUND", message: "Render is not complete.", details: null } },
        { status: 404 },
      );
    }
    const frame = await getFrameFile(job.cacheKey, frameIndex);
    const bytes = await readFile(frame.path);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Rigby2D-Frame-Width": String(job.frameRender.frameWidth),
        "X-Rigby2D-Frame-Height": String(job.frameRender.frameHeight),
        "X-Rigby2D-Frame-Pivot": `${job.frameRender.pivot.x},${job.frameRender.pivot.y}`,
      },
    });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
