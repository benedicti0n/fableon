import { NextResponse } from "next/server";

import { StudioError } from "@/lib/studio/errors";
import { errorResponse, readBodyBoolean, readBodyString, readJsonObject } from "@/lib/studio/http";
import { setTakeReview } from "@/lib/studio/repository";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

interface TakeContext {
  readonly params: Promise<{
    readonly projectId: string;
    readonly shotId: string;
    readonly takeId: string;
  }>;
}

export async function PATCH(request: Request, context: TakeContext): Promise<NextResponse> {
  try {
    const { projectId, shotId, takeId } = await context.params;
    const body = await readJsonObject(request);
    const statusRaw = readBodyString(body, "reviewStatus", { required: true });
    if (!REVIEW_STATUSES.includes(statusRaw as ReviewStatus)) {
      throw new StudioError("invalid_input", "Invalid review status.");
    }
    const project = await setTakeReview(
      projectId,
      shotId,
      takeId,
      statusRaw as ReviewStatus,
      readBodyString(body, "note", { max: 2000 }),
      readBodyBoolean(body, "confirmCriticalIssues"),
    );
    const take = project.shots
      .find((shot) => shot.id === shotId)
      ?.takes.find((item) => item.id === takeId);
    if (!take) {
      throw new StudioError("internal", "The reviewed take could not be located.");
    }
    return NextResponse.json({ project, take });
  } catch (error) {
    return errorResponse(error);
  }
}
