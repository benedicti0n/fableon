import { NextResponse } from "next/server";

import { rigby2dErrorResponse } from "@/lib/rigby2d/api";
import { readRenderJob } from "@/lib/rigby2d/jobs";

export const dynamic = "force-dynamic";

interface RenderContext {
  readonly params: Promise<{ readonly renderId: string }>;
}

export async function GET(_request: Request, context: RenderContext): Promise<NextResponse> {
  try {
    const { renderId } = await context.params;
    const job = await readRenderJob(renderId);
    if (!job.frameRender) {
      return NextResponse.json(
        {
          error: {
            code: "RENDER_NOT_FOUND",
            message: "Render has no completed frame metadata.",
            details: null,
          },
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      renderId,
      metadata: job.frameRender,
      cacheKey: job.cacheKey,
      frameCount: job.frameRender.frameCount,
      fps: job.frameRender.fps,
      scale: job.frameRender.scale,
      frameWidth: job.frameRender.frameWidth,
      frameHeight: job.frameRender.frameHeight,
      pivot: job.frameRender.pivot,
      origin: job.frameRender.origin,
    });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
