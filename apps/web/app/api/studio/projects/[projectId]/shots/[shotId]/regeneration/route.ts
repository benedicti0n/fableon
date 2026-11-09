import { NextResponse } from "next/server";

import { StudioError } from "@/lib/studio/errors";
import {
  errorResponse,
  readBodyNullableString,
  readBodyNumber,
  readBodyString,
  readBodyStringArray,
  readJsonObject,
} from "@/lib/studio/http";
import { createRegenerationRequest } from "@/lib/studio/repository";

export const dynamic = "force-dynamic";

interface RegenerationContext {
  readonly params: Promise<{ readonly projectId: string; readonly shotId: string }>;
}

export async function POST(request: Request, context: RegenerationContext): Promise<NextResponse> {
  try {
    const { projectId, shotId } = await context.params;
    const body = await readJsonObject(request);
    const status = readBodyString(body, "status", { required: true });
    if (status !== "draft" && status !== "ready_for_authorization") {
      throw new StudioError(
        "invalid_input",
        "New regeneration requests must be draft or ready_for_authorization.",
      );
    }
    const duration = readBodyNumber(body, "desiredDurationSeconds", {
      required: true,
      min: 1,
      max: 60,
    });
    const budget = readBodyNumber(body, "budgetCeilingUsd", {
      required: true,
      min: 0,
      max: 10_000,
    });
    if (duration === undefined || budget === undefined) {
      throw new StudioError("invalid_input", "Duration and budget are required.");
    }
    const project = await createRegenerationRequest(projectId, shotId, {
      sourceTakeId: readBodyString(body, "sourceTakeId", { required: true }),
      providerLabel: readBodyString(body, "providerLabel", { required: true, max: 120 }),
      modelLabel: readBodyString(body, "modelLabel", { required: true, max: 160 }),
      prompt: readBodyString(body, "prompt", { required: true, max: 20_000 }),
      startReferenceMediaId: readBodyNullableString(body, "startReferenceMediaId"),
      endReferenceMediaId: readBodyNullableString(body, "endReferenceMediaId"),
      desiredDurationSeconds: duration,
      desiredResolution: readBodyString(body, "desiredResolution", { required: true, max: 80 }),
      preserveInstructions: readBodyString(body, "preserveInstructions", { max: 8000 }),
      changeInstructions: readBodyString(body, "changeInstructions", { max: 8000 }),
      defectIssueIds: readBodyStringArray(body, "defectIssueIds"),
      budgetCeilingUsd: budget,
      status,
    });
    const regenerationRequest = project.regenerationRequests.at(-1);
    if (!regenerationRequest) {
      throw new StudioError("internal", "The prepared regeneration request could not be located.");
    }
    return NextResponse.json({ project, request: regenerationRequest }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
