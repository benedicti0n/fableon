import { NextResponse } from "next/server";

import { getHostedModel } from "@/lib/providers/catalog";
import {
  createProviderAuthorizationRequest,
  listProviderAuthorizations,
} from "@/lib/providers/authorization";
import { providerErrorResponse } from "@/lib/providers/http";
import { appendProviderEvent } from "@/lib/providers/ledger";
import { ProviderServiceError } from "@/lib/providers/service";
import { readBodyNumber, readBodyString, readJsonObject } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ authorizations: await listProviderAuthorizations() });
  } catch (error) {
    return providerErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await readJsonObject(request);
    const provider = readBodyString(body, "provider", { required: true });
    if (provider !== "openai" && provider !== "gemini") {
      throw new ProviderServiceError("invalid_input", "provider must be openai or gemini.");
    }
    const model = readBodyString(body, "model", { required: true });
    const metadata = getHostedModel(provider, model);
    const maxCostUsd = readBodyNumber(body, "maxCostUsd", { required: true, min: 0.0001 });
    const maxRequests = readBodyNumber(body, "maxRequests", { required: true, min: 1 });
    const maxOutputsPerRequest = readBodyNumber(body, "maxOutputsPerRequest", {
      required: true,
      min: 1,
      max: 8,
    });
    const maxWidth = readBodyNumber(body, "maxWidth", { required: true, min: 256 });
    const maxHeight = readBodyNumber(body, "maxHeight", { required: true, min: 256 });
    const expiresAt =
      readBodyString(body, "expiresAt") ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    if (
      maxCostUsd === undefined ||
      maxRequests === undefined ||
      maxOutputsPerRequest === undefined ||
      maxWidth === undefined ||
      maxHeight === undefined
    ) {
      throw new ProviderServiceError("invalid_input", "Authorization limits are incomplete.");
    }
    const authorization = await createProviderAuthorizationRequest({
      experimentId: readBodyString(body, "experimentId") || "phase-05.1-folk-pilot",
      provider,
      model,
      requestedBy: readBodyString(body, "requestedBy") || "local-user",
      maxCostUsd,
      maxRequests,
      maxOutputsPerRequest,
      maxWidth,
      maxHeight,
      pricingVersion: metadata.pricingVersion,
      expiresAt,
      notes: readBodyString(body, "notes"),
    });
    await appendProviderEvent({
      type: "authorization-requested",
      experimentId: authorization.experimentId,
      provider: authorization.provider,
      model: authorization.model,
      requestKey: null,
      authorizationId: authorization.id,
      operation: "authorization-request",
      attempt: 1,
      outputCount: 0,
      inputReferenceCount: 0,
      status: "pending",
      estimatedCostUsd: 0,
      reconciledCostUsd: 0,
      usage: null,
      outputHashes: [],
      note: "Pending request only; no spending authorized.",
      meta: { maxCostUsd: authorization.maxCostUsd },
    });
    return NextResponse.json(
      {
        authorization,
        message:
          "Pending only. No spending is authorized until a separate explicit approval with the exact confirmation string.",
      },
      { status: 201 },
    );
  } catch (error) {
    return providerErrorResponse(error);
  }
}
