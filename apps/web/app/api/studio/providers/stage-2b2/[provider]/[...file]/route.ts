import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getRepoRoot } from "@/lib/studio/repository";

export const dynamic = "force-dynamic";

interface Context {
  readonly params: Promise<{ readonly provider: string; readonly file: readonly string[] }>;
}

const TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
};

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  const { provider, file } = await context.params;
  if (provider !== "openai" && provider !== "gemini") {
    return NextResponse.json({ error: "Unknown provider." }, { status: 404 });
  }
  const relative = file.join("/");
  if (relative.includes(".."))
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  const root = path.resolve(
    getRepoRoot(),
    "outputs",
    "folk-provider-benchmark",
    "stage-2b2",
    provider,
  );
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not a file");
    return new NextResponse(await readFile(target), {
      headers: {
        "Content-Type": TYPES[path.extname(target)] ?? "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
}
