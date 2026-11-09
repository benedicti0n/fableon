import { NextResponse } from "next/server";

import { importDemoProject } from "@/lib/studio/demo";
import { errorResponse } from "@/lib/studio/http";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  try {
    const result = await importDemoProject();
    return NextResponse.json(
      { project: result.project, created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
