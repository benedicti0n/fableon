import { NextResponse } from "next/server";

import { StudioError } from "@/lib/studio/errors";
import { errorResponse, readFormFile, readFormString } from "@/lib/studio/http";
import { getUploadLimitBytes, importMediaBuffer } from "@/lib/studio/media";
import { addTake, readProject } from "@/lib/studio/repository";
import { TAKE_SOURCE_TYPES, type TakeSourceType } from "@/lib/studio/types";

export const dynamic = "force-dynamic";

interface TakesContext {
  readonly params: Promise<{ readonly projectId: string; readonly shotId: string }>;
}

export async function POST(request: Request, context: TakesContext): Promise<NextResponse> {
  try {
    const { projectId, shotId } = await context.params;
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new StudioError("invalid_input", "Expected a multipart video upload.");
    }
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new StudioError("invalid_input", "The video upload could not be read.");
    }

    const file = readFormFile(form, "file");
    const limit = getUploadLimitBytes("video");
    if (file.size > limit) {
      throw new StudioError(
        "payload_too_large",
        `The video exceeds the configured upload limit of ${Math.round(limit / (1024 * 1024))} MB.`,
      );
    }

    const project = await readProject(projectId);
    const shot = project.shots.find((item) => item.id === shotId);
    if (!shot) {
      throw new StudioError("not_found", `Shot ${shotId} does not exist in this project.`);
    }

    const sourceTypeValue = readFormString(form, "sourceType");
    const sourceType: TakeSourceType =
      sourceTypeValue === ""
        ? shot.renderingMethod === "ai-video"
          ? "ai-video"
          : "deterministic-export"
        : (() => {
            if (!TAKE_SOURCE_TYPES.includes(sourceTypeValue as TakeSourceType)) {
              throw new StudioError("invalid_input", "Invalid take source type.");
            }
            return sourceTypeValue as TakeSourceType;
          })();

    const provider = readFormString(form, "provider", { max: 120 });
    const model = readFormString(form, "model", { max: 160 });
    const prompt = readFormString(form, "prompt", { max: 20_000 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaResult = await importMediaBuffer(projectId, buffer, file.name, "video");
    const media = mediaResult.media;
    if (media.durationSeconds === null || media.frameRate === null || media.codec === null) {
      throw new StudioError("unsupported_media", "Video metadata is incomplete.");
    }

    const updated = await addTake(projectId, shotId, {
      sourceType,
      mediaId: media.id,
      provider: provider.length > 0 ? provider : null,
      model: model.length > 0 ? model : null,
      generationPrompt: prompt.length > 0 ? prompt : shot.generationPrompt,
      durationSeconds: media.durationSeconds,
      width: media.width,
      height: media.height,
      frameRate: media.frameRate,
      codec: media.codec,
      hasAudio: media.hasAudio,
      fileSizeBytes: media.sizeBytes,
      sha256: media.sha256,
    });

    const updatedShot = updated.shots.find((item) => item.id === shotId);
    const take = updatedShot?.takes.find((item) => item.mediaId === media.id);
    if (!take) {
      throw new StudioError("internal", "The imported take could not be located.");
    }

    return NextResponse.json(
      {
        project: updated,
        media,
        take,
        duplicateMedia: mediaResult.duplicate,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
