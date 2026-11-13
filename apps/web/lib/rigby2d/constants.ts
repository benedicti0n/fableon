import path from "node:path";

import { getDataRoot, getRepoRoot } from "@/lib/studio/repository";

export const RIGBY2D_RUNTIME = "rigby2d" as const;
export const RIGBY2D_PINNED_COMMIT = "307f7bf00d086a776b4a3c88c6fcca6fab97c531";
export const RIGBY2D_VERSION = "0.5.1";

export const RIGBY2D_PROJECT_FILE = "character.rigby";
export const RIGBY2D_MAX_PROJECT_BYTES = 32 * 1024 * 1024;
export const RIGBY2D_MAX_FPS = 60;
export const RIGBY2D_MIN_FPS = 1;
export const RIGBY2D_MAX_SCALE = 2;
export const RIGBY2D_MIN_SCALE = 0.25;

export const RIGBY2D_DEFAULT_TIMEOUT_MS = 30_000;
export const RIGBY2D_EXPORT_TIMEOUT_MS = 180_000;
export const RIGBY2D_HANDSHAKE_TIMEOUT_MS = 15_000;

export const RIGBY2D_ALLOWED_TOOLS = [
  "inspect_project",
  "validate_project",
  "describe_rig",
  "describe_animation",
  "sample_pose",
  "export_sprite_sheet",
] as const;

export type Rigby2DToolName = (typeof RIGBY2D_ALLOWED_TOOLS)[number];

const ALLOWED = new Set<string>(RIGBY2D_ALLOWED_TOOLS);

export function isRigby2DToolAllowed(name: string): name is Rigby2DToolName {
  return ALLOWED.has(name);
}

export function getRigby2DVendorRoot(): string {
  return path.join(getRepoRoot(), "vendor", "rigby2d");
}

export function getRigby2DServerPath(): string {
  return path.join(getRigby2DVendorRoot(), "src", "mcp", "server.js");
}

export function getRigby2DDataRoot(dataRoot?: string): string {
  return path.join(dataRoot ?? getDataRoot(), "rigby2d");
}
