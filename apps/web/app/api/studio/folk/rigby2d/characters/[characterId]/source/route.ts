import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getVersionProjectPath, readCharacter } from "@/lib/rigby2d/assets";
import { rigby2dErrorResponse } from "@/lib/rigby2d/api";

export const dynamic = "force-dynamic";

interface CharacterContext {
  readonly params: Promise<{ readonly characterId: string }>;
}

export async function GET(request: Request, context: CharacterContext): Promise<NextResponse> {
  try {
    const { characterId } = await context.params;
    const requested = new URL(request.url).searchParams.get("versionId");
    const character = await readCharacter(characterId);
    const versionId = requested || character.currentVersionId;
    const file = await getVersionProjectPath(characterId, versionId);
    const bytes = await readFile(file);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${characterId}-${versionId}.rigby"`,
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
