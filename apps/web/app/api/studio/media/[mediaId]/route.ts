import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { errorResponse } from "@/lib/studio/http";
import { getMediaFilePath, parseRangeHeader } from "@/lib/studio/media";
import { isStudioError, StudioError } from "@/lib/studio/errors";

export const dynamic = "force-dynamic";

interface MediaRouteContext {
  readonly params: Promise<{ readonly mediaId: string }>;
}

async function resolveMedia(request: Request, context: MediaRouteContext) {
  const { mediaId } = await context.params;
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    throw new StudioError("invalid_input", "projectId query parameter is required.");
  }
  const resolved = await getMediaFilePath(projectId, mediaId);
  let size: number;
  try {
    const info = await stat(resolved.filePath);
    if (!info.isFile()) throw new Error("not a file");
    size = info.size;
  } catch {
    throw new StudioError("not_found", "The media file is missing from local storage.");
  }
  return { ...resolved, size };
}

function headersFor(
  fileName: string,
  mimeType: string,
  size: number,
  range: { start: number; end: number } | null,
): Headers {
  const headers = new Headers({
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, must-revalidate",
    "Content-Disposition": `inline; filename="${fileName}"`,
    "X-Content-Type-Options": "nosniff",
  });
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
  } else {
    headers.set("Content-Length", String(size));
  }
  return headers;
}

export async function GET(request: Request, context: MediaRouteContext): Promise<Response> {
  try {
    const { asset, filePath, size } = await resolveMedia(request, context);
    const range = parseRangeHeader(size, request.headers.get("range"));
    if (range) {
      const stream = createReadStream(filePath, { start: range.start, end: range.end });
      return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
        status: 206,
        headers: headersFor(asset.fileName, asset.mimeType, size, range),
      });
    }
    const stream = createReadStream(filePath);
    return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
      status: 200,
      headers: headersFor(asset.fileName, asset.mimeType, size, null),
    });
  } catch (error) {
    if (isStudioError(error) && error.code === "range_not_satisfiable") {
      return errorResponse(error);
    }
    return errorResponse(error);
  }
}

export async function HEAD(request: Request, context: MediaRouteContext): Promise<Response> {
  try {
    const { asset, size } = await resolveMedia(request, context);
    return new Response(null, {
      status: 200,
      headers: headersFor(asset.fileName, asset.mimeType, size, null),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
