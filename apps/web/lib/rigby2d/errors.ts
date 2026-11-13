export type Rigby2DErrorCode =
  | "RIGBY2D_UNAVAILABLE"
  | "RIGBY2D_SOURCE_MISMATCH"
  | "MCP_SPAWN_FAILED"
  | "MCP_HANDSHAKE_FAILED"
  | "MCP_PROCESS_EXITED"
  | "MCP_TOOL_NOT_ALLOWED"
  | "MCP_TOOL_SCHEMA_INVALID"
  | "MCP_TOOL_FAILED"
  | "MCP_TIMEOUT"
  | "MCP_CANCELLED"
  | "INVALID_PROJECT"
  | "INVALID_INPUT"
  | "RENDER_BUSY"
  | "CHARACTER_NOT_FOUND"
  | "VERSION_NOT_FOUND"
  | "RENDER_NOT_FOUND"
  | "ANIMATION_NOT_FOUND"
  | "FRAME_NOT_FOUND"
  | "FRAME_ORIGIN_UNSTABLE"
  | "CACHE_WRITE_FAILED"
  | "POSE_CHAIN_INVALID"
  | "STORAGE_CORRUPT";

const STATUS_BY_CODE: Record<Rigby2DErrorCode, number> = {
  RIGBY2D_UNAVAILABLE: 503,
  RIGBY2D_SOURCE_MISMATCH: 500,
  MCP_SPAWN_FAILED: 502,
  MCP_HANDSHAKE_FAILED: 502,
  MCP_PROCESS_EXITED: 502,
  MCP_TOOL_NOT_ALLOWED: 400,
  MCP_TOOL_SCHEMA_INVALID: 400,
  MCP_TOOL_FAILED: 502,
  MCP_TIMEOUT: 504,
  MCP_CANCELLED: 409,
  INVALID_PROJECT: 422,
  INVALID_INPUT: 400,
  RENDER_BUSY: 409,
  CHARACTER_NOT_FOUND: 404,
  VERSION_NOT_FOUND: 404,
  RENDER_NOT_FOUND: 404,
  ANIMATION_NOT_FOUND: 400,
  FRAME_NOT_FOUND: 404,
  FRAME_ORIGIN_UNSTABLE: 422,
  CACHE_WRITE_FAILED: 500,
  POSE_CHAIN_INVALID: 400,
  STORAGE_CORRUPT: 500,
};

export class Rigby2DError extends Error {
  readonly code: Rigby2DErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: Rigby2DErrorCode, message: string, details: unknown = null) {
    super(message);
    this.name = "Rigby2DError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export function isRigby2DError(value: unknown): value is Rigby2DError {
  return value instanceof Rigby2DError;
}
