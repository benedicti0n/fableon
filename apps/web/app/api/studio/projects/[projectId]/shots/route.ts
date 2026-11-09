import { NextResponse } from "next/server";

import { StudioError } from "@/lib/studio/errors";
import {
  errorResponse,
  readBodyNullableString,
  readBodyNumber,
  readBodyString,
  readJsonObject,
} from "@/lib/studio/http";
import { addShot } from "@/lib/studio/repository";
import { RENDERING_METHODS, type RenderingMethod } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

interface ShotsContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

export async function POST(request: Request, context: ShotsContext): Promise<NextResponse> {
  try {
    const { projectId } = await context.params;
    const body = await readJsonObject(request);
    const methodRaw = readBodyString(body, "renderingMethod");
    const renderingMethod: RenderingMethod =
      methodRaw === "" ? "ai-video" : (methodRaw as RenderingMethod);
    if (!RENDERING_METHODS.includes(renderingMethod)) {
      throw new StudioError("invalid_input", "Invalid rendering method.");
    }
    const targetDuration = readBodyNumber(body, "targetDurationSeconds", {
      required: true,
      min: 0.1,
      max: 120,
    });
    if (targetDuration === undefined) {
      throw new StudioError("invalid_input", "targetDurationSeconds is required.");
    }
    const referenceImageMediaId =
      "referenceImageMediaId" in body
        ? readBodyNullableString(body, "referenceImageMediaId")
        : null;
    const project = await addShot(projectId, {
      title: readBodyString(body, "title", { required: true, max: 240 }),
      description: readBodyString(body, "description", { max: 4000 }),
      targetDurationSeconds: targetDuration,
      generationPrompt: readBodyString(body, "generationPrompt", { max: 20_000 }),
      renderingMethod,
      referenceImageMediaId,
    });
    const shotId = project.shotOrder.at(-1);
    const shot = project.shots.find((item) => item.id === shotId);
    if (!shot) {
      throw new StudioError("internal", "The created shot could not be located.");
    }
    return NextResponse.json({ project, shot }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
