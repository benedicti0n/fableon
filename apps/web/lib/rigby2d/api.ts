import { NextResponse } from "next/server";

import { isRigby2DError } from "./errors";

export function rigby2dErrorResponse(error: unknown): NextResponse {
  if (isRigby2DError(error)) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected Rigby2D runtime error.";
  return NextResponse.json(
    { error: { code: "RIGBY2D_INTERNAL", message, details: null } },
    { status: 500 },
  );
}
