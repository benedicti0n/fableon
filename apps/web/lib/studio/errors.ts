export type StudioErrorCode =
  | "invalid_input"
  | "not_found"
  | "conflict"
  | "storage_corrupt"
  | "unsupported_media"
  | "payload_too_large"
  | "media_tool_missing"
  | "approval_requires_confirmation"
  | "range_not_satisfiable"
  | "internal";

const STATUS_BY_CODE: Record<StudioErrorCode, number> = {
  invalid_input: 400,
  not_found: 404,
  conflict: 409,
  storage_corrupt: 500,
  unsupported_media: 415,
  payload_too_large: 413,
  media_tool_missing: 503,
  approval_requires_confirmation: 422,
  range_not_satisfiable: 416,
  internal: 500,
};

export class StudioError extends Error {
  readonly code: StudioErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: StudioErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "StudioError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details ?? null;
  }
}

export function isStudioError(value: unknown): value is StudioError {
  return value instanceof StudioError;
}
