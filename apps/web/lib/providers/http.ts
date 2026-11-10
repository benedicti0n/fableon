import { NextResponse } from "next/server";

import { isStudioError } from "@/lib/studio/errors";

import { ProviderAuthorizationError } from "./authorization";
import { ProviderConfigurationError, ProviderRequestError } from "./catalog";
import { ProviderServiceError } from "./service";

export function providerErrorResponse(error: unknown): NextResponse {
  if (error instanceof ProviderAuthorizationError) {
    const status =
      error.code === "not_found"
        ? 404
        : error.code === "invalid_input"
          ? 400
          : error.code === "duplicate_request" || error.code === "concurrent_conflict"
            ? 409
            : error.code === "authorization_missing" ||
                error.code === "authorization_pending" ||
                error.code === "authorization_revoked" ||
                error.code === "authorization_expired" ||
                error.code === "authorization_exhausted" ||
                error.code === "budget_exceeded"
              ? 403
              : 500;
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: null } },
      { status },
    );
  }
  if (error instanceof ProviderConfigurationError) {
    return NextResponse.json(
      { error: { code: "configuration_error", message: error.message, details: null } },
      { status: 400 },
    );
  }
  if (error instanceof ProviderRequestError) {
    return NextResponse.json(
      {
        error: {
          code: "provider_error",
          message: error.message,
          details: error.providerBody,
        },
      },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
    );
  }
  if (error instanceof ProviderServiceError) {
    const status =
      error.code === "configuration_missing"
        ? 409
        : error.code === "authorization_missing"
          ? 403
          : error.code === "not_found"
            ? 404
            : error.code === "invalid_input"
              ? 400
              : 500;
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: null } },
      { status },
    );
  }
  if (isStudioError(error)) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected provider error.";
  return NextResponse.json(
    { error: { code: "internal", message, details: null } },
    { status: 500 },
  );
}
