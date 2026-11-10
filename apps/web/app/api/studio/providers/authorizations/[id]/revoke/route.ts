import { NextResponse } from "next/server";

import { revokeProviderAuthorization } from "@/lib/providers/authorization";
import { providerErrorResponse } from "@/lib/providers/http";
import { appendProviderEvent } from "@/lib/providers/ledger";
import { readBodyString, readJsonObject } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

interface Context {
  readonly params: Promise<{ readonly id: string }>;
}

export async function POST(request: Request, context: Context): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = await readJsonObject(request);
    const authorization = await revokeProviderAuthorization(
      id,
      readBodyString(body, "revokedBy") || "local-user",
    );
    await appendProviderEvent({
      type: "authorization-revoked",
      experimentId: authorization.experimentId,
      provider: authorization.provider,
      model: authorization.model,
      requestKey: null,
      authorizationId: authorization.id,
      operation: "authorization-revoke",
      attempt: 1,
      outputCount: 0,
      inputReferenceCount: 0,
      status: "revoked",
      estimatedCostUsd: 0,
      reconciledCostUsd: 0,
      usage: null,
      outputHashes: [],
      note: "Authorization revoked.",
      meta: {},
    });
    return NextResponse.json({ authorization });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
