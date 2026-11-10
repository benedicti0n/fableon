import { NextResponse } from "next/server";

import { providerWorkspaceStatus, providerRootForDisplay } from "@/lib/providers/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const status = await providerWorkspaceStatus();
  return NextResponse.json({
    ...status,
    outputRoot: providerRootForDisplay(),
    paidAuthorizationDefault: "none",
    testsNeverCallProviders: true,
  });
}
