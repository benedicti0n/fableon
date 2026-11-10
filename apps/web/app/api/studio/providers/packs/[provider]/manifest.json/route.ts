import { NextResponse } from "next/server";

import { providerErrorResponse } from "@/lib/providers/http";
import { readProviderPackManifest } from "@/lib/providers/service";

export const dynamic = "force-dynamic";

interface Context {
  readonly params: Promise<{ readonly provider: string }>;
}

export async function GET(_request: Request, context: Context): Promise<NextResponse> {
  try {
    const { provider } = await context.params;
    if (provider !== "openai" && provider !== "gemini") {
      return NextResponse.json(
        { error: { code: "not_found", message: "Unknown provider." } },
        { status: 404 },
      );
    }
    return NextResponse.json(await readProviderPackManifest(provider));
  } catch (error) {
    return providerErrorResponse(error);
  }
}
