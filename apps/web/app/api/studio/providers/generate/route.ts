import { NextResponse } from "next/server";

import { providerErrorResponse } from "@/lib/providers/http";
import { parseGenerationInput } from "@/lib/providers/request-body";
import { executeProviderGeneration } from "@/lib/providers/service";
import { readJsonObject } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = parseGenerationInput(await readJsonObject(request), {
      requireRequestKey: true,
    });
    const result = await executeProviderGeneration(input);
    return NextResponse.json(
      {
        requestKey: input.requestKey,
        provider: result.result.provider,
        model: result.result.model,
        requestId: result.result.requestId,
        estimate: result.estimate,
        reconciledCostUsd: result.reconciledCostUsd,
        costBasis: result.costBasis,
        usage: result.result.usage,
        files: result.files.map((file) => ({
          index: file.index,
          path: file.relativePath,
          sha256: file.sha256,
          bytes: file.bytes,
          url: `/api/studio/providers/packs/${input.provider}/${file.relativePath.replace(/^.*?\/attempts\//, "attempts/")}`,
        })),
        reviewStatus: "pending",
        message: "Generated outputs are not auto-accepted. Review them in Studio.",
      },
      { status: 201 },
    );
  } catch (error) {
    return providerErrorResponse(error);
  }
}
