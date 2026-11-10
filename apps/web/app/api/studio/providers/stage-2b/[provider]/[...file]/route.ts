import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { stage2bAssetPath } from "@/lib/providers/stage2b-status";

export const dynamic = "force-dynamic";

interface Context {
  readonly params: Promise<{ readonly provider: string; readonly file: readonly string[] }>;
}

const TYPES: Readonly<Record<string, string>> = {
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
};

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const { provider, file } = await context.params;
  if (provider !== "openai" && provider !== "gemini") {
    return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  }
  const relative = file.join("/");
  if (relative.includes("..")) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }
  const root = path.resolve(stage2bAssetPath(provider, "."));
  const target = path.resolve(stage2bAssetPath(provider, relative));
  if (!target.startsWith(`${root}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not a file");
    const body = await readFile(target);
    return new NextResponse(body, {
      headers: {
        "Content-Type": TYPES[path.extname(target)] ?? "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Stage 2B asset not found." }, { status: 404 });
  }
}
