import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/studio/http";
import { readRenderJob, reconcileRenderJob } from "@/lib/film/render-jobs";

export const dynamic = "force-dynamic";

interface JobContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

export async function GET(_request: Request, context: JobContext): Promise<NextResponse> {
  try {
    const { jobId } = await context.params;
    return NextResponse.json({ job: await reconcileRenderJob(await readRenderJob(jobId)) });
  } catch (error) {
    return errorResponse(error);
  }
}
