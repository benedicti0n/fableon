import { NextResponse } from "next/server";

import { errorResponse, readBodyNumber, readBodyString, readJsonObject } from "@/lib/studio/http";
import { StudioError } from "@/lib/studio/errors";
import { readProject, reorderShots, updateProjectMetadata } from "@/lib/studio/repository";

export const dynamic = "force-dynamic";

interface ProjectContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

export async function GET(_request: Request, context: ProjectContext): Promise<NextResponse> {
  try {
    const { projectId } = await context.params;
    return NextResponse.json({ project: await readProject(projectId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: ProjectContext): Promise<NextResponse> {
  try {
    const { projectId } = await context.params;
    const body = await readJsonObject(request);
    const hasOrder = "shotOrder" in body;
    const hasMetadata = [
      "title",
      "description",
      "targetFrameRate",
      "targetWidth",
      "targetHeight",
    ].some((key) => key in body);
    if (hasOrder && hasMetadata) {
      throw new StudioError(
        "invalid_input",
        "Update shot order or project metadata in separate requests.",
      );
    }
    if (hasOrder) {
      if (!Array.isArray(body.shotOrder) || body.shotOrder.some((id) => typeof id !== "string")) {
        throw new StudioError("invalid_input", "shotOrder must be an array of shot IDs.");
      }
      const project = await reorderShots(projectId, body.shotOrder as string[]);
      return NextResponse.json({ project });
    }
    if (!hasMetadata) {
      throw new StudioError("invalid_input", "No project fields were provided.");
    }
    const metadata: {
      title?: string;
      description?: string;
      targetFrameRate?: number;
      targetWidth?: number;
      targetHeight?: number;
    } = {};
    if ("title" in body) {
      metadata.title = readBodyString(body, "title", { required: true, max: 240 });
    }
    if ("description" in body) {
      metadata.description = readBodyString(body, "description", { max: 4000 });
    }
    if ("targetFrameRate" in body) {
      const value = readBodyNumber(body, "targetFrameRate", {
        required: true,
        min: 1,
        max: 120,
      });
      if (value !== undefined) metadata.targetFrameRate = value;
    }
    if ("targetWidth" in body) {
      const value = readBodyNumber(body, "targetWidth", {
        required: true,
        min: 1,
        max: 16_384,
      });
      if (value !== undefined) metadata.targetWidth = value;
    }
    if ("targetHeight" in body) {
      const value = readBodyNumber(body, "targetHeight", {
        required: true,
        min: 1,
        max: 16_384,
      });
      if (value !== undefined) metadata.targetHeight = value;
    }
    const project = await updateProjectMetadata(projectId, metadata);
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}
