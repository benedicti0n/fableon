import { NextResponse } from "next/server";

import { errorResponse, readFormFile } from "@/lib/studio/http";
import { getUploadLimitBytes, importMediaBuffer } from "@/lib/studio/media";
import { StudioError } from "@/lib/studio/errors";

export const dynamic = "force-dynamic";

interface MediaCollectionContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

export async function POST(
  request: Request,
  context: MediaCollectionContext,
): Promise<NextResponse> {
  try {
    const { projectId } = await context.params;
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new StudioError("invalid_input", "Expected a multipart image upload.");
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new StudioError("invalid_input", "The image upload could not be read.");
    }
    const file = readFormFile(form, "file");
    const limit = getUploadLimitBytes("image");
    if (file.size > limit) {
      throw new StudioError(
        "payload_too_large",
        `The image exceeds the configured upload limit of ${Math.round(limit / (1024 * 1024))} MB.`,
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importMediaBuffer(projectId, buffer, file.name, "image");
    return NextResponse.json(
      { project: result.project, media: result.media, duplicate: result.duplicate },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
