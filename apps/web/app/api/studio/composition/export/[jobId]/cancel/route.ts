import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/studio/http";
import { requestRenderJobCancel } from "@/lib/film/render-jobs";

export const dynamic = "force-dynamic";

interface CancelContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

export async function POST(_request: Request, context: CancelContext): Promise<NextResponse> {
  try {
    const { jobId } = await context.params;
    return NextResponse.json({ job: await requestRenderJobCancel(jobId) });
  } catch (error) {
    return errorResponse(error);
  }
}
