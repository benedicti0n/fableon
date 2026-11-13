import { NextResponse } from "next/server";

import {
  importCharacter,
  listCharacters,
  ARTISTIC_REVIEW_STATUSES,
  type ArtisticReviewStatus,
} from "@/lib/rigby2d/assets";
import { rigby2dErrorResponse } from "@/lib/rigby2d/api";
import { Rigby2DError } from "@/lib/rigby2d/errors";
import { readFormFile, readFormString } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ characters: await listCharacters() });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const form = await request.formData();
    const file = readFormFile(form, "file");
    if (file.size > 32 * 1024 * 1024) {
      throw new Rigby2DError("INVALID_PROJECT", "The .rigby file must be 32 MB or smaller.");
    }
    const name = readFormString(form, "name", { required: true, max: 80 });
    const sourceAttribution = readFormString(form, "sourceAttribution", { max: 300 });
    const characterId = readFormString(form, "characterId", { max: 64 });
    const rawStatus = readFormString(form, "artisticReviewStatus", { max: 40 });
    const artisticReviewStatus: ArtisticReviewStatus = ARTISTIC_REVIEW_STATUSES.includes(
      rawStatus as ArtisticReviewStatus,
    )
      ? (rawStatus as ArtisticReviewStatus)
      : "experimental_unreviewed";
    const result = await importCharacter({
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      name,
      sourceAttribution: sourceAttribution || "Uploaded .rigby project",
      artisticReviewStatus,
      ...(characterId ? { characterId } : {}),
    });
    return NextResponse.json(
      { character: result.manifest, version: result.version, created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
