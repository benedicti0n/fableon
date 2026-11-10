import { NextResponse } from "next/server";

import { providerErrorResponse } from "@/lib/providers/http";
import { parseGenerationInput } from "@/lib/providers/request-body";
import { estimateProviderRequest } from "@/lib/providers/service";
import { readJsonObject } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = parseGenerationInput(await readJsonObject(request), {
      requireRequestKey: false,
    });
    const result = await estimateProviderRequest(input);
    const { authorization, ...rest } = result;
    return NextResponse.json({
      ...rest,
      request: {
        provider: result.request.provider,
        model: result.request.model,
        operation: result.request.operation,
        width: result.request.width,
        height: result.request.height,
        quality: result.request.quality,
        imageSize: result.request.imageSize ?? null,
        outputCount: result.request.outputCount,
        referenceCount: result.request.references.length,
        transparentBackground: result.request.transparentBackground,
      },
      authorization: authorization
        ? {
            id: authorization.id,
            status: authorization.status,
            maxCostUsd: authorization.maxCostUsd,
            spentCostUsd: authorization.spentCostUsd,
            reservedCostUsd: authorization.reservedCostUsd,
            remainingUsd:
              authorization.maxCostUsd - authorization.spentCostUsd - authorization.reservedCostUsd,
            expiresAt: authorization.expiresAt,
          }
        : null,
    });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
