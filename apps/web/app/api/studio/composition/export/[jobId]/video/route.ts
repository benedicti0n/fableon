import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { errorResponse } from "@/lib/studio/http";
import { StudioError } from "@/lib/studio/errors";
import { parseRangeHeader } from "@/lib/studio/media";
import { getRepoRoot } from "@/lib/studio/repository";
import { readRenderJob, safeFilmOutputPath } from "@/lib/film/render-jobs";

export const dynamic = "force-dynamic";

interface VideoContext {
  readonly params: Promise<{ readonly jobId: string }>;
}

async function resolveVideo(context: VideoContext) {
  const { jobId } = await context.params;
  const job = await readRenderJob(jobId);
  if (job.status !== "completed" || !job.outputPath) {
    throw new StudioError("not_found", "The render job has no completed video yet.");
  }
  const absolute = path.isAbsolute(job.outputPath)
    ? job.outputPath
    : path.join(getRepoRoot(), job.outputPath);
  const filePath = safeFilmOutputPath(absolute);
  let size: number;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    size = info.size;
  } catch {
    throw new StudioError("not_found", "The rendered video is missing from local storage.");
  }
  return { job, filePath, size };
}

function headers(size: number, range: { start: number; end: number } | null): Headers {
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, must-revalidate",
    "Content-Disposition": 'inline; filename="fableon-film.mp4"',
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

export async function GET(request: Request, context: VideoContext): Promise<Response> {
  try {
    const { filePath, size } = await resolveVideo(context);
    const range = parseRangeHeader(size, request.headers.get("range"));
    if (range) {
      return new Response(
        Readable.toWeb(
          createReadStream(filePath, { start: range.start, end: range.end }),
        ) as unknown as ReadableStream,
        { status: 206, headers: headers(size, range) },
      );
    }
    return new Response(Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream, {
      status: 200,
      headers: headers(size, null),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function HEAD(_request: Request, context: VideoContext): Promise<Response> {
  try {
    const { size } = await resolveVideo(context);
    return new Response(null, { status: 200, headers: headers(size, null) });
  } catch (error) {
    return errorResponse(error);
  }
}
