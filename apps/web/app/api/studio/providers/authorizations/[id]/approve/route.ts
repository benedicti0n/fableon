import { NextResponse } from "next/server";

import { approveProviderAuthorization } from "@/lib/providers/authorization";
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
    const authorization = await approveProviderAuthorization(id, {
      approvedBy: readBodyString(body, "approvedBy", { required: true }),
      confirmation: readBodyString(body, "confirmation", { required: true }),
    });
    await appendProviderEvent({
      type: "authorization-approved",
      experimentId: authorization.experimentId,
      provider: authorization.provider,
      model: authorization.model,
      requestKey: null,
      authorizationId: authorization.id,
      operation: "authorization-approve",
      attempt: 1,
      outputCount: 0,
      inputReferenceCount: 0,
      status: "active",
      estimatedCostUsd: 0,
      reconciledCostUsd: 0,
      usage: null,
      outputHashes: [],
      note: "Explicit user approval persisted. No generation was executed by this action.",
      meta: { maxCostUsd: authorization.maxCostUsd },
    });
    return NextResponse.json({ authorization });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
