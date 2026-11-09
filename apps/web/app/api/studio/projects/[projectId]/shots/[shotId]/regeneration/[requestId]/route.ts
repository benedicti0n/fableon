import { NextResponse } from "next/server";

import { StudioError } from "@/lib/studio/errors";
import { errorResponse, readBodyString, readJsonObject } from "@/lib/studio/http";
import { updateRegenerationRequestStatus } from "@/lib/studio/repository";
import { REGENERATION_STATUSES, type RegenerationStatus } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

interface RegenerationRequestContext {
  readonly params: Promise<{
    readonly projectId: string;
    readonly shotId: string;
    readonly requestId: string;
  }>;
}

export async function PATCH(
  request: Request,
  context: RegenerationRequestContext,
): Promise<NextResponse> {
  try {
    const { projectId, requestId } = await context.params;
    const body = await readJsonObject(request);
    const status = readBodyString(body, "status", { required: true }) as RegenerationStatus;
    if (!REGENERATION_STATUSES.includes(status)) {
      throw new StudioError("invalid_input", "Invalid regeneration request status.");
    }
    const project = await updateRegenerationRequestStatus(projectId, requestId, status);
    const regenerationRequest = project.regenerationRequests.find((item) => item.id === requestId);
    if (!regenerationRequest) {
      throw new StudioError("internal", "The updated regeneration request could not be located.");
    }
    return NextResponse.json({ project, request: regenerationRequest });
  } catch (error) {
    return errorResponse(error);
  }
}
