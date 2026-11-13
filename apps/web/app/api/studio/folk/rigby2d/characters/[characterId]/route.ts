import { NextResponse } from "next/server";

import { readCharacter, readVersion } from "@/lib/rigby2d/assets";
import { rigby2dErrorResponse } from "@/lib/rigby2d/api";

export const dynamic = "force-dynamic";

interface CharacterContext {
  readonly params: Promise<{ readonly characterId: string }>;
}

export async function GET(request: Request, context: CharacterContext): Promise<NextResponse> {
  try {
    const { characterId } = await context.params;
    const versionId = new URL(request.url).searchParams.get("versionId");
    const character = await readCharacter(characterId);
    const version = versionId
      ? await readVersion(characterId, versionId)
      : await readVersion(characterId, character.currentVersionId);
    return NextResponse.json({ character, version });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
