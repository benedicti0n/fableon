import { NextResponse } from "next/server";

import { StudioError, isStudioError } from "./errors";

export function errorResponse(error: unknown): NextResponse {
  if (isStudioError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }
  const message = error instanceof Error ? error.message : "Unexpected Studio error.";
  return NextResponse.json(
    { error: { code: "internal", message, details: null } },
    { status: 500 },
  );
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new StudioError("invalid_input", "Request body must be valid JSON.");
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new StudioError("invalid_input", "Request body must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

export function readBodyString(
  body: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; max?: number },
): string {
  const value = body[key];
  if (value === undefined || value === null) {
    if (options?.required) throw new StudioError("invalid_input", `${key} is required.`);
    return "";
  }
  if (typeof value !== "string") {
    throw new StudioError("invalid_input", `${key} must be a string.`);
  }
  const trimmed = value.trim();
  if (options?.required && trimmed.length === 0) {
    throw new StudioError("invalid_input", `${key} is required.`);
  }
  if (trimmed.length > (options?.max ?? 10_000)) {
    throw new StudioError("invalid_input", `${key} is too long.`);
  }
  return trimmed;
}

export function readBodyNullableString(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new StudioError("invalid_input", `${key} must be a string or null.`);
  }
  return value.trim();
}

export function readBodyNumber(
  body: Record<string, unknown>,
  key: string,
  options?: { required?: boolean; min?: number; max?: number },
): number | undefined {
  const value = body[key];
  if (value === undefined || value === null || value === "") {
    if (options?.required) throw new StudioError("invalid_input", `${key} is required.`);
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new StudioError("invalid_input", `${key} must be a number.`);
  }
  if (options?.min !== undefined && parsed < options.min) {
    throw new StudioError("invalid_input", `${key} must be at least ${options.min}.`);
  }
  if (options?.max !== undefined && parsed > options.max) {
    throw new StudioError("invalid_input", `${key} must be at most ${options.max}.`);
  }
  return parsed;
}

export function readBodyBoolean(body: Record<string, unknown>, key: string): boolean {
  return body[key] === true;
}

export function readBodyStringArray(
  body: Record<string, unknown>,
  key: string,
): string[] {
  const value = body[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new StudioError("invalid_input", `${key} must be an array of strings.`);
  }
  return value.map((item) => (item as string).trim()).filter((item) => item.length > 0);
}

export function readBodyNullableNumber(body: Record<string, unknown>, key: string): number | null {
  const value = body[key];
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new StudioError("invalid_input", `${key} must be a number or null.`);
  }
  return parsed;
}

export function readFormString(
  form: FormData,
  key: string,
  options?: { required?: boolean; max?: number },
): string {
  const value = form.get(key);
  if (value === null) {
    if (options?.required) throw new StudioError("invalid_input", `${key} is required.`);
    return "";
  }
  if (typeof value !== "string") {
    throw new StudioError("invalid_input", `${key} must be a text field.`);
  }
  const trimmed = value.trim();
  if (options?.required && trimmed.length === 0) {
    throw new StudioError("invalid_input", `${key} is required.`);
  }
  if (trimmed.length > (options?.max ?? 10_000)) {
    throw new StudioError("invalid_input", `${key} is too long.`);
  }
  return trimmed;
}

export function readFormFile(form: FormData, key: string): File {
  const value = form.get(key);
  if (
    value === null ||
    typeof value === "string" ||
    typeof value.arrayBuffer !== "function" ||
    typeof value.size !== "number"
  ) {
    throw new StudioError("invalid_input", `${key} file is required.`);
  }
  return value;
}
