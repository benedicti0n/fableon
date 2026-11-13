import { NextResponse } from "next/server";

import { rigby2dErrorResponse } from "@/lib/rigby2d/api";
import { releaseRenderJob } from "@/lib/rigby2d/jobs";

export const dynamic = "force-dynamic";

interface RenderContext {
  readonly params: Promise<{ readonly renderId: string }>;
}

export async function POST(_request: Request, context: RenderContext): Promise<NextResponse> {
  try {
    const { renderId } = await context.params;
    return NextResponse.json(await releaseRenderJob(renderId));
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
