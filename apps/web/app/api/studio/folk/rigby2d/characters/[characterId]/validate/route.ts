import { NextResponse } from "next/server";

import { readCharacter, validateCharacterVersion } from "@/lib/rigby2d/assets";
import { rigby2dErrorResponse } from "@/lib/rigby2d/api";
import { readBodyString, readJsonObject } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

interface CharacterContext {
  readonly params: Promise<{ readonly characterId: string }>;
}

export async function POST(request: Request, context: CharacterContext): Promise<NextResponse> {
  try {
    const { characterId } = await context.params;
    const body = await readJsonObject(request).catch(() => ({}));
    const requestedVersion = readBodyString(body, "versionId", { max: 16 });
    const character = await readCharacter(characterId);
    const versionId = requestedVersion || character.currentVersionId;
    const result = await validateCharacterVersion(characterId, versionId);
    return NextResponse.json(result);
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
