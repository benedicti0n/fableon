import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { providerErrorResponse } from "@/lib/providers/http";
import { resolveProviderPackFile } from "@/lib/providers/service";

export const dynamic = "force-dynamic";

interface Context {
  readonly params: Promise<{
    readonly provider: string;
    readonly file: readonly string[];
  }>;
}

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

export async function GET(_request: Request, context: Context): Promise<Response> {
  try {
    const { provider, file } = await context.params;
    if (provider !== "openai" && provider !== "gemini") {
      return NextResponse.json(
        { error: { code: "not_found", message: "Unknown provider." } },
        { status: 404 },
      );
    }
    const { file: absolute } = await resolveProviderPackFile(
      provider,
      file.map((part) => decodeURIComponent(part)).join("/"),
    );
    const bytes = await readFile(absolute);
    const contentType =
      CONTENT_TYPES[path.extname(absolute).toLowerCase()] ?? "application/octet-stream";
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
