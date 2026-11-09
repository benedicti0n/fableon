import { NextResponse } from "next/server";

import { StudioError } from "@/lib/studio/errors";
import {
  errorResponse,
  readBodyNullableString,
  readBodyNumber,
  readBodyString,
  readJsonObject,
} from "@/lib/studio/http";
import { readProject, updateShot, type ShotPatch } from "@/lib/studio/repository";
import { RENDERING_METHODS, type RenderingMethod } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

interface ShotContext {
  readonly params: Promise<{ readonly projectId: string; readonly shotId: string }>;
}

export async function GET(_request: Request, context: ShotContext): Promise<NextResponse> {
  try {
    const { projectId, shotId } = await context.params;
    const project = await readProject(projectId);
    const shot = project.shots.find((item) => item.id === shotId);
    if (!shot) {
      throw new StudioError("not_found", `Shot ${shotId} does not exist in this project.`);
    }
    return NextResponse.json({ shot });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: ShotContext): Promise<NextResponse> {
  try {
    const { projectId, shotId } = await context.params;
    const body = await readJsonObject(request);
    const patch: {
      title?: string;
      description?: string;
      targetDurationSeconds?: number;
      generationPrompt?: string;
      renderingMethod?: RenderingMethod;
      referenceImageMediaId?: string | null;
      currentTakeId?: string | null;
    } = {};

    if ("title" in body) {
      patch.title = readBodyString(body, "title", { required: true, max: 240 });
    }
    if ("description" in body) {
      patch.description = readBodyString(body, "description", { max: 4000 });
    }
    if ("targetDurationSeconds" in body) {
      const value = readBodyNumber(body, "targetDurationSeconds", {
        required: true,
        min: 0.1,
        max: 120,
      });
      if (value !== undefined) patch.targetDurationSeconds = value;
    }
    if ("generationPrompt" in body) {
      patch.generationPrompt = readBodyString(body, "generationPrompt", { max: 20_000 });
    }
    if ("renderingMethod" in body) {
      const method = readBodyString(body, "renderingMethod", { required: true });
      if (!RENDERING_METHODS.includes(method as RenderingMethod)) {
        throw new StudioError("invalid_input", "Invalid rendering method.");
      }
      patch.renderingMethod = method as RenderingMethod;
    }
    if ("referenceImageMediaId" in body) {
      patch.referenceImageMediaId = readBodyNullableString(body, "referenceImageMediaId");
    }
    if ("currentTakeId" in body) {
      patch.currentTakeId = readBodyNullableString(body, "currentTakeId");
    }
    if (Object.keys(patch).length === 0) {
      throw new StudioError("invalid_input", "No shot fields were provided.");
    }

    const project = await updateShot(projectId, shotId, patch as ShotPatch);
    const shot = project.shots.find((item) => item.id === shotId);
    if (!shot) {
      throw new StudioError("internal", "The updated shot could not be located.");
    }
    return NextResponse.json({ project, shot });
  } catch (error) {
    return errorResponse(error);
  }
}
