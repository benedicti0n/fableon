import { NextResponse } from "next/server";

import { errorResponse, readBodyNumber, readBodyString, readJsonObject } from "@/lib/studio/http";
import { createProject, listProjects } from "@/lib/studio/repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ projects: await listProjects() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonObject(request);
    const project = await createProject({
      title: readBodyString(body, "title", { required: true, max: 240 }),
      description: readBodyString(body, "description", { max: 4000 }),
      targetFrameRate: readBodyNumber(body, "targetFrameRate", {
        required: true,
        min: 1,
        max: 120,
      })!,
      targetWidth: readBodyNumber(body, "targetWidth", {
        required: true,
        min: 1,
        max: 16_384,
      })!,
      targetHeight: readBodyNumber(body, "targetHeight", {
        required: true,
        min: 1,
        max: 16_384,
      })!,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
