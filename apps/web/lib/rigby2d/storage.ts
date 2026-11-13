import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { getRigby2DDataRoot } from "./constants";
import { Rigby2DError } from "./errors";

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function sha256File(file: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

export function slugify(value: string, fallback = "character"): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length >= 2 ? slug : fallback;
}

const CHARACTER_ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
const VERSION_ID = /^v[1-9][0-9]*$/;

export function assertCharacterId(value: string): string {
  if (!CHARACTER_ID.test(value)) {
    throw new Rigby2DError(
      "INVALID_INPUT",
      "Character ID must use 2-64 lowercase letters, digits or hyphens and start with a letter or digit.",
    );
  }
  return value;
}

export function assertVersionId(value: string): string {
  if (!VERSION_ID.test(value)) {
    throw new Rigby2DError("VERSION_NOT_FOUND", `Invalid character version ID ${value}.`);
  }
  return value;
}

export function getCharactersRoot(dataRoot?: string): string {
  return path.join(getRigby2DDataRoot(dataRoot), "characters");
}

export function getCharacterDir(characterId: string, dataRoot?: string): string {
  assertCharacterId(characterId);
  return path.join(getCharactersRoot(dataRoot), characterId);
}

export function getCharacterManifestPath(characterId: string, dataRoot?: string): string {
  return path.join(getCharacterDir(characterId, dataRoot), "manifest.json");
}

export function getVersionDir(characterId: string, versionId: string, dataRoot?: string): string {
  assertCharacterId(characterId);
  assertVersionId(versionId);
  return path.join(getCharacterDir(characterId, dataRoot), "versions", versionId);
}

export function getVersionFile(characterId: string, versionId: string, dataRoot?: string): string {
  return path.join(getVersionDir(characterId, versionId, dataRoot), "character.rigby");
}

export function getVersionJsonPath(
  characterId: string,
  versionId: string,
  dataRoot?: string,
): string {
  return path.join(getVersionDir(characterId, versionId, dataRoot), "version.json");
}

export async function atomicWriteJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function atomicWriteBytes(file: string, bytes: Uint8Array): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, bytes, { flag: "wx" });
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }
}

export interface JobWorkspace {
  readonly jobId: string;
  readonly jobDir: string;
  readonly workspaceDir: string;
}

export async function createJobWorkspace(dataRoot?: string): Promise<JobWorkspace> {
  const jobId = randomUUID();
  const jobDir = path.join(getRigby2DDataRoot(dataRoot), "jobs", jobId);
  const workspaceDir = path.join(jobDir, "workspace");
  await mkdir(workspaceDir, { recursive: true });
  return { jobId, jobDir, workspaceDir };
}

export async function removeJobWorkspace(jobDir: string): Promise<void> {
  await rm(jobDir, { recursive: true, force: true });
}

export async function cleanupExpiredTemporaryJobs(
  dataRoot?: string,
  maxAgeMs = 24 * 60 * 60 * 1000,
): Promise<{ readonly removed: number }> {
  const root = getRigby2DDataRoot(dataRoot);
  let removed = 0;
  for (const subdirectory of ["tmp", "jobs"]) {
    const dir = path.join(root, subdirectory);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const target = path.join(dir, entry.name);
      try {
        const info = await stat(target);
        if (Date.now() - info.mtimeMs <= maxAgeMs) continue;
        await rm(target, { recursive: true, force: true });
        removed += 1;
      } catch {
        // A concurrent job may have removed it already.
      }
    }
  }
  return { removed };
}

export function assertInside(parent: string, child: string): string {
  const resolvedParent = path.resolve(parent);
  const resolved = path.resolve(child);
  if (resolved !== resolvedParent && !resolved.startsWith(`${resolvedParent}${path.sep}`)) {
    throw new Rigby2DError("INVALID_INPUT", "Path escapes its allowed root.");
  }
  return resolved;
}
