import { NextResponse } from "next/server";

import { rigby2dErrorResponse } from "@/lib/rigby2d/api";
import { verifyRigby2DInstallation } from "@/lib/rigby2d/mcp-client";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const installation = await verifyRigby2DInstallation();
    return NextResponse.json({
      available: true,
      runtime: "rigby2d",
      version: installation.version,
      commit: installation.commit,
      sourceHash: installation.sourceHash,
    });
  } catch (error) {
    return rigby2dErrorResponse(error);
  }
}
