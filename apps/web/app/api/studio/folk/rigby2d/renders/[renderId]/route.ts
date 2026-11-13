import { NextResponse } from "next/server";

import { rigby2dErrorResponse } from "@/lib/rigby2d/api";
import { readRenderJob, reconcileRenderJob } from "@/lib/rigby2d/jobs";

export const dynamic = "force-dynamic";

interface RenderContext {
  readonly params: Promise<{ readonly renderId: string }>;
}

export async function GET(_request: Request, context: RenderContext): Promise<NextResponse> {
  try {
    const { renderId } = await context.params;
    const job = await reconcileRenderJob(await readRenderJob(renderId));
    return NextResponse.json({ job });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
