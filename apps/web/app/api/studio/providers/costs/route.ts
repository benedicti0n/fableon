import { NextResponse } from "next/server";

import { providerErrorResponse } from "@/lib/providers/http";
import { buildProviderCostSummary } from "@/lib/providers/ledger";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ summary: await buildProviderCostSummary() });
  } catch (error) {
    return providerErrorResponse(error);
  }
}
