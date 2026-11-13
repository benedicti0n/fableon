import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { RIGBY2D_PROJECT_FILE, RIGBY2D_RUNTIME } from "./constants";
import { Rigby2DError } from "./errors";
import { Rigby2DMcpClient } from "./mcp-client";
import {
  assertCharacterId,
  assertInside,
  assertVersionId,
  atomicWriteJson,
  createJobWorkspace,
  getCharacterDir,
  getCharacterManifestPath,
  getCharactersRoot,
  getVersionDir,
  getVersionFile,
  getVersionJsonPath,
  removeJobWorkspace,
  sha256Bytes,
  slugify,
} from "./storage";

export const ARTISTIC_REVIEW_STATUSES = [
  "approved_arm_motion_only",
  "experimental_unreviewed",
  "pending_review",
] as const;

export type ArtisticReviewStatus = (typeof ARTISTIC_REVIEW_STATUSES)[number];

export interface Rigby2DAnimationInfo {
  readonly name: string;
  readonly duration: number;
  readonly timelines: number;
  readonly events: number;
}

export interface Rigby2DBoneInfo {
  readonly name: string;
  readonly parent: string | null;
  readonly length: number;
}

export interface Rigby2DSlotInfo {
  readonly name: string;
  readonly bone: string | null;
  readonly attachment: string | null;
}

export interface Rigby2DValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly checks: Readonly<Record<string, string>>;
}

export interface Rigby2DMcpEvidence {
  readonly protocolVersion: string;
  readonly toolCount: number;
  readonly elapsedMs: number;
  readonly peakRssKb: number;
  readonly requestCount: number;
  readonly trace: readonly {
    readonly at: string;
    readonly event: string;
    readonly tool?: string;
    readonly durationMs?: number;
    readonly ok: boolean;
    readonly detail?: string;
  }[];
  readonly stderr: string;
}

export interface Rigby2DCharacterVersion {
  readonly schemaVersion: 1;
  readonly characterId: string;
  readonly versionId: string;
  readonly runtime: typeof RIGBY2D_RUNTIME;
  readonly runtimeVersion: string;
  readonly runtimeCommit: string;
  readonly name: string;
  readonly sourceFileName: string;
  readonly sourceAttribution: string;
  readonly artisticReviewStatus: ArtisticReviewStatus;
  readonly sha256: string;
  readonly bytes: number;
  readonly importedAt: string;
  readonly format: string;
  readonly projectName: string;
  readonly counts: {
    readonly bones: number;
    readonly slots: number;
    readonly skins: number;
    readonly constraints: number;
    readonly events: number;
    readonly animations: number;
    readonly images: number;
  };
  readonly animations: readonly Rigby2DAnimationInfo[];
  readonly bones: readonly Rigby2DBoneInfo[];
  readonly slots: readonly Rigby2DSlotInfo[];
  readonly validation: Rigby2DValidationResult;
  readonly mcp: Rigby2DMcpEvidence;
}

export interface Rigby2DCharacterVersionSummary {
  readonly versionId: string;
  readonly sha256: string;
  readonly importedAt: string;
  readonly animations: readonly Rigby2DAnimationInfo[];
  readonly validationValid: boolean;
}

export interface Rigby2DCharacterManifest {
  readonly schemaVersion: 1;
  readonly characterId: string;
  readonly name: string;
  readonly runtime: typeof RIGBY2D_RUNTIME;
  readonly runtimeVersion: string;
  readonly runtimeCommit: string;
  readonly sourceAttribution: string;
  readonly artisticReviewStatus: ArtisticReviewStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly currentVersionId: string;
  readonly versions: readonly Rigby2DCharacterVersionSummary[];
}

export interface ImportCharacterInput {
  readonly bytes: Uint8Array;
  readonly fileName: string;
  readonly name: string;
  readonly sourceAttribution: string;
  readonly artisticReviewStatus: ArtisticReviewStatus;
  readonly characterId?: string;
  readonly dataRoot?: string;
}

export interface ImportCharacterResult {
  readonly manifest: Rigby2DCharacterManifest;
  readonly version: Rigby2DCharacterVersion;
  readonly created: boolean;
}

interface InspectPayload {
  readonly format?: unknown;
  readonly name?: unknown;
  readonly counts?: Record<string, unknown>;
  readonly animations?: readonly Record<string, unknown>[];
  readonly warnings?: readonly unknown[];
}

interface RigPayload {
  readonly bones?: readonly Record<string, unknown>[];
  readonly slots?: readonly Record<string, unknown>[];
}

interface ValidatePayload {
  readonly valid?: unknown;
  readonly errors?: readonly unknown[];
  readonly warnings?: readonly unknown[];
  readonly checks?: Record<string, unknown>;
}

const characterLocks = new Map<string, Promise<unknown>>();

function withCharacterLock<T>(characterId: string, task: () => Promise<T>): Promise<T> {
  const previous = characterLocks.get(characterId) ?? Promise.resolve();
  const run = previous.then(task, task);
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  characterLocks.set(characterId, settled);
  void settled.finally(() => {
    if (characterLocks.get(characterId) === settled) characterLocks.delete(characterId);
  });
  return run;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function checks(value: unknown): Record<string, string> {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, String(entry)]));
}

function parseValidation(value: unknown): Rigby2DValidationResult {
  const payload = isObject(value) ? (value as ValidatePayload) : {};
  return {
    valid: payload.valid === true,
    errors: stringArray(payload.errors),
    warnings: stringArray(payload.warnings),
    checks: checks(payload.checks),
  };
}

function parseAnimations(value: unknown): Rigby2DAnimationInfo[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isObject).map((entry) => ({
    name: stringField(entry["name"]),
    duration: numberField(entry["duration"]),
    timelines: numberField(entry["timelines"]),
    events: numberField(entry["events"]),
  }));
}

function parseBones(value: unknown): Rigby2DBoneInfo[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isObject).map((entry) => ({
    name: stringField(entry["name"]),
    parent: typeof entry["parent"] === "string" ? entry["parent"] : null,
    length: numberField(entry["length"]),
  }));
}

function parseSlots(value: unknown): Rigby2DSlotInfo[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isObject).map((entry) => ({
    name: stringField(entry["name"]),
    bone: typeof entry["bone"] === "string" ? entry["bone"] : null,
    attachment: typeof entry["attachment"] === "string" ? entry["attachment"] : null,
  }));
}

function parseCounts(value: unknown): Rigby2DCharacterVersion["counts"] {
  const counts = isObject(value) ? value : {};
  return {
    bones: numberField(counts["bones"]),
    slots: numberField(counts["slots"]),
    skins: numberField(counts["skins"]),
    constraints: numberField(counts["constraints"]),
    events: numberField(counts["events"]),
    animations: numberField(counts["animations"]),
    images: numberField(counts["images"]),
  };
}

function parseManifest(value: unknown, characterId: string): Rigby2DCharacterManifest {
  if (!isObject(value)) {
    throw new Rigby2DError(
      "STORAGE_CORRUPT",
      `Character ${characterId} manifest is not an object.`,
    );
  }
  if (value["schemaVersion"] !== 1 || value["characterId"] !== characterId) {
    throw new Rigby2DError("STORAGE_CORRUPT", `Character ${characterId} manifest is invalid.`);
  }
  const versions = Array.isArray(value["versions"])
    ? value["versions"].filter(isObject).map((entry) => ({
        versionId: stringField(entry["versionId"]),
        sha256: stringField(entry["sha256"]),
        importedAt: stringField(entry["importedAt"]),
        animations: parseAnimations(entry["animations"]),
        validationValid: entry["validationValid"] === true,
      }))
    : [];
  const status = value["artisticReviewStatus"];
  if (!ARTISTIC_REVIEW_STATUSES.includes(status as ArtisticReviewStatus)) {
    throw new Rigby2DError("STORAGE_CORRUPT", `Character ${characterId} review status is invalid.`);
  }
  return {
    schemaVersion: 1,
    characterId,
    name: stringField(value["name"]),
    runtime: RIGBY2D_RUNTIME,
    runtimeVersion: stringField(value["runtimeVersion"]),
    runtimeCommit: stringField(value["runtimeCommit"]),
    sourceAttribution: stringField(value["sourceAttribution"]),
    artisticReviewStatus: status as ArtisticReviewStatus,
    createdAt: stringField(value["createdAt"]),
    updatedAt: stringField(value["updatedAt"]),
    currentVersionId: stringField(value["currentVersionId"]),
    versions,
  };
}

function parseVersion(
  value: unknown,
  characterId: string,
  versionId: string,
): Rigby2DCharacterVersion {
  if (!isObject(value)) {
    throw new Rigby2DError("STORAGE_CORRUPT", `Version ${versionId} metadata is not an object.`);
  }
  if (
    value["schemaVersion"] !== 1 ||
    value["characterId"] !== characterId ||
    value["versionId"] !== versionId
  ) {
    throw new Rigby2DError("STORAGE_CORRUPT", `Version ${versionId} metadata is invalid.`);
  }
  const status = value["artisticReviewStatus"];
  if (!ARTISTIC_REVIEW_STATUSES.includes(status as ArtisticReviewStatus)) {
    throw new Rigby2DError("STORAGE_CORRUPT", `Version ${versionId} review status is invalid.`);
  }
  const mcp = isObject(value["mcp"]) ? value["mcp"] : {};
  return {
    schemaVersion: 1,
    characterId,
    versionId,
    runtime: RIGBY2D_RUNTIME,
    runtimeVersion: stringField(value["runtimeVersion"]),
    runtimeCommit: stringField(value["runtimeCommit"]),
    name: stringField(value["name"]),
    sourceFileName: stringField(value["sourceFileName"]),
    sourceAttribution: stringField(value["sourceAttribution"]),
    artisticReviewStatus: status as ArtisticReviewStatus,
    sha256: stringField(value["sha256"]),
    bytes: numberField(value["bytes"]),
    importedAt: stringField(value["importedAt"]),
    format: stringField(value["format"]),
    projectName: stringField(value["projectName"]),
    counts: parseCounts(value["counts"]),
    animations: parseAnimations(value["animations"]),
    bones: parseBones(value["bones"]),
    slots: parseSlots(value["slots"]),
    validation: parseValidation(value["validation"]),
    mcp: {
      protocolVersion: stringField(mcp["protocolVersion"]),
      toolCount: numberField(mcp["toolCount"]),
      elapsedMs: numberField(mcp["elapsedMs"]),
      peakRssKb: numberField(mcp["peakRssKb"]),
      requestCount: numberField(mcp["requestCount"]),
      trace: Array.isArray(mcp["trace"])
        ? mcp["trace"].filter(isObject).map((entry) => ({
            at: stringField(entry["at"]),
            event: stringField(entry["event"]),
            ...(typeof entry["tool"] === "string" ? { tool: entry["tool"] } : {}),
            ...(typeof entry["durationMs"] === "number" ? { durationMs: entry["durationMs"] } : {}),
            ok: entry["ok"] === true,
            ...(typeof entry["detail"] === "string" ? { detail: entry["detail"] } : {}),
          }))
        : [],
      stderr: stringField(mcp["stderr"]),
    },
  };
}

export async function listCharacters(dataRoot?: string): Promise<Rigby2DCharacterManifest[]> {
  const root = getCharactersRoot(dataRoot);
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
  const manifests: Rigby2DCharacterManifest[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      manifests.push(await readCharacter(entry.name, dataRoot));
    } catch (error) {
      if (error instanceof Rigby2DError && error.code === "CHARACTER_NOT_FOUND") continue;
      throw error;
    }
  }
  return manifests.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readCharacter(
  characterId: string,
  dataRoot?: string,
): Promise<Rigby2DCharacterManifest> {
  assertCharacterId(characterId);
  try {
    const raw = await readFile(getCharacterManifestPath(characterId, dataRoot), "utf8");
    return parseManifest(JSON.parse(raw) as unknown, characterId);
  } catch (error) {
    if (error instanceof Rigby2DError) throw error;
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Rigby2DError("CHARACTER_NOT_FOUND", `Character ${characterId} does not exist.`);
    }
    throw new Rigby2DError(
      "STORAGE_CORRUPT",
      `Character ${characterId} manifest could not be read.`,
    );
  }
}

export async function readVersion(
  characterId: string,
  versionId: string,
  dataRoot?: string,
): Promise<Rigby2DCharacterVersion> {
  assertCharacterId(characterId);
  assertVersionId(versionId);
  try {
    const raw = await readFile(getVersionJsonPath(characterId, versionId, dataRoot), "utf8");
    return parseVersion(JSON.parse(raw) as unknown, characterId, versionId);
  } catch (error) {
    if (error instanceof Rigby2DError) throw error;
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Rigby2DError("VERSION_NOT_FOUND", `Version ${versionId} does not exist.`);
    }
    throw new Rigby2DError("STORAGE_CORRUPT", `Version ${versionId} metadata could not be read.`);
  }
}

export async function readCurrentVersion(
  characterId: string,
  dataRoot?: string,
): Promise<Rigby2DCharacterVersion> {
  const manifest = await readCharacter(characterId, dataRoot);
  if (!manifest.currentVersionId) {
    throw new Rigby2DError("VERSION_NOT_FOUND", `Character ${characterId} has no current version.`);
  }
  return readVersion(characterId, manifest.currentVersionId, dataRoot);
}

export async function getVersionProjectPath(
  characterId: string,
  versionId: string,
  dataRoot?: string,
): Promise<string> {
  const file = getVersionFile(characterId, versionId, dataRoot);
  const versionDir = getVersionDir(characterId, versionId, dataRoot);
  assertInside(versionDir, file);
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size === 0) throw new Error("not a file");
  } catch {
    throw new Rigby2DError("VERSION_NOT_FOUND", `Version ${versionId} has no project file.`);
  }
  return file;
}

export async function importCharacter(input: ImportCharacterInput): Promise<ImportCharacterResult> {
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > 32 * 1024 * 1024) {
    throw new Rigby2DError("INVALID_PROJECT", "The .rigby file is empty or larger than 32 MB.");
  }
  const signature = Buffer.from(input.bytes.subarray(0, 4)).toString("binary");
  if (signature !== "PK\u0003\u0004") {
    throw new Rigby2DError(
      "INVALID_PROJECT",
      "The uploaded file is not a ZIP-based .rigby project.",
    );
  }
  const name = input.name.trim();
  if (name.length === 0 || name.length > 80) {
    throw new Rigby2DError("INVALID_INPUT", "Character name must be 1-80 characters.");
  }
  const sourceAttribution = input.sourceAttribution.trim().slice(0, 300);
  if (sourceAttribution.length === 0) {
    throw new Rigby2DError("INVALID_INPUT", "Source attribution is required.");
  }
  if (!ARTISTIC_REVIEW_STATUSES.includes(input.artisticReviewStatus)) {
    throw new Rigby2DError("INVALID_INPUT", "Unknown artistic review status.");
  }
  const sha256 = sha256Bytes(input.bytes);
  const characterId =
    input.characterId !== undefined && input.characterId.length > 0
      ? assertCharacterId(input.characterId)
      : `${slugify(name, "rigby2d")}-${sha256.slice(0, 8)}`;

  return withCharacterLock(characterId, async () => {
    const existing = await readCharacter(characterId, input.dataRoot).catch((error: unknown) => {
      if (error instanceof Rigby2DError && error.code === "CHARACTER_NOT_FOUND") return null;
      throw error;
    });
    if (existing) {
      const duplicate = existing.versions.find((version) => version.sha256 === sha256);
      if (duplicate) {
        return {
          manifest: existing,
          version: await readVersion(characterId, duplicate.versionId, input.dataRoot),
          created: false,
        };
      }
    }

    const tempDir = path.join(
      getCharacterDir(characterId, input.dataRoot),
      "..",
      "..",
      "tmp",
      `import-${randomUUID()}`,
    );
    const tempWorkspace = path.join(tempDir, "workspace");
    const tempProject = path.join(tempWorkspace, RIGBY2D_PROJECT_FILE);
    await mkdir(tempWorkspace, { recursive: true });
    await writeFile(tempProject, input.bytes, { flag: "wx" });

    let client: Rigby2DMcpClient | null = null;
    let createdVersionDirPath: string | null = null;
    let versionCommitted = false;
    try {
      client = await Rigby2DMcpClient.open(tempWorkspace);
      const inspectRaw = await client.call<InspectPayload>("inspect_project", {
        path: RIGBY2D_PROJECT_FILE,
      });
      const describeRaw = await client.call<RigPayload>("describe_rig", {
        path: RIGBY2D_PROJECT_FILE,
      });
      const validateRaw = await client.call<ValidatePayload>("validate_project", {
        path: RIGBY2D_PROJECT_FILE,
      });
      const validation = parseValidation(validateRaw);
      if (!validation.valid) {
        throw new Rigby2DError("INVALID_PROJECT", "Rigby2D rejected the project.", {
          errors: validation.errors,
          checks: validation.checks,
        });
      }
      const format = stringField(inspectRaw.format);
      if (!format.toLowerCase().includes("rigby")) {
        throw new Rigby2DError(
          "INVALID_PROJECT",
          `Unexpected project format ${format || "(empty)"}.`,
        );
      }
      const animations = parseAnimations(inspectRaw.animations);
      const bones = parseBones(describeRaw.bones);
      const slots = parseSlots(describeRaw.slots);
      const counts = parseCounts(inspectRaw.counts);
      const now = new Date().toISOString();
      const importedAt = now;
      const nextNumber = (existing?.versions.length ?? 0) + 1;
      let versionId = `v${nextNumber}`;
      let versionDir = getVersionDir(characterId, versionId, input.dataRoot);
      await mkdir(path.dirname(versionDir), { recursive: true });
      let createdVersionDir = false;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
          await mkdir(versionDir, { recursive: false });
          createdVersionDir = true;
          break;
        } catch (error) {
          if (error instanceof Error && "code" in error && error.code === "EEXIST") {
            versionId = `v${nextNumber + attempt + 1}`;
            versionDir = getVersionDir(characterId, versionId, input.dataRoot);
            continue;
          }
          throw error;
        }
      }
      if (!createdVersionDir) {
        throw new Rigby2DError(
          "CACHE_WRITE_FAILED",
          "Could not allocate a character version directory.",
        );
      }
      createdVersionDirPath = versionDir;
      const versionFile = getVersionFile(characterId, versionId, input.dataRoot);
      await rename(tempProject, versionFile);
      const mcp = {
        protocolVersion: client.protocolVersion,
        toolCount: client.discovery.length,
        elapsedMs: client.resourceUsage.elapsedMs,
        peakRssKb: client.resourceUsage.peakRssKb,
        requestCount: client.resourceUsage.requestCount,
        trace: client.trace,
        stderr: client.stderrText(),
      };
      const version: Rigby2DCharacterVersion = {
        schemaVersion: 1,
        characterId,
        versionId,
        runtime: RIGBY2D_RUNTIME,
        runtimeVersion: client.installationInfo.version,
        runtimeCommit: client.installationInfo.commit,
        name: existing?.name ?? name,
        sourceFileName: path.basename(input.fileName).slice(0, 160) || "character.rigby",
        sourceAttribution: existing?.sourceAttribution ?? sourceAttribution,
        artisticReviewStatus: existing?.artisticReviewStatus ?? input.artisticReviewStatus,
        sha256,
        bytes: input.bytes.byteLength,
        importedAt,
        format,
        projectName: stringField(inspectRaw.name),
        counts,
        animations,
        bones,
        slots,
        validation,
        mcp,
      };
      await atomicWriteJson(getVersionJsonPath(characterId, versionId, input.dataRoot), version);
      const summary: Rigby2DCharacterVersionSummary = {
        versionId,
        sha256,
        importedAt,
        animations,
        validationValid: validation.valid,
      };
      const manifest: Rigby2DCharacterManifest = {
        schemaVersion: 1,
        characterId,
        name: existing?.name ?? name,
        runtime: RIGBY2D_RUNTIME,
        runtimeVersion: client.installationInfo.version,
        runtimeCommit: client.installationInfo.commit,
        sourceAttribution: existing?.sourceAttribution ?? sourceAttribution,
        artisticReviewStatus: existing?.artisticReviewStatus ?? input.artisticReviewStatus,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        currentVersionId: versionId,
        versions: [...(existing?.versions ?? []), summary],
      };
      await atomicWriteJson(getCharacterManifestPath(characterId, input.dataRoot), manifest);
      versionCommitted = true;
      return { manifest, version, created: true };
    } finally {
      if (client) await client.close().catch(() => undefined);
      if (createdVersionDirPath && !versionCommitted) {
        await rm(createdVersionDirPath, { recursive: true, force: true }).catch(() => undefined);
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });
}

export async function recordFrameExport(input: {
  readonly characterId: string;
  readonly versionId: string;
  readonly metadata: {
    readonly cacheKey: string;
    readonly animation: string;
    readonly fps: number;
    readonly scale: number;
    readonly frameCount: number;
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly pivot: { readonly x: number; readonly y: number };
    readonly origin: { readonly x: number; readonly y: number };
    readonly durationSeconds: number;
    readonly cacheBytes: number;
    readonly sourceSha256: string;
    readonly runtimeVersion: string;
    readonly runtimeCommit: string;
    readonly mcp: Rigby2DMcpEvidence;
  };
  readonly dataRoot?: string;
}): Promise<void> {
  const dir = path.join(getCharacterDir(input.characterId, input.dataRoot), "frame-exports");
  await atomicWriteJson(path.join(dir, `${input.metadata.cacheKey}.json`), {
    schemaVersion: 1,
    characterId: input.characterId,
    versionId: input.versionId,
    exportedAt: new Date().toISOString(),
    cacheKey: input.metadata.cacheKey,
    animation: input.metadata.animation,
    fps: input.metadata.fps,
    scale: input.metadata.scale,
    frameCount: input.metadata.frameCount,
    frameWidth: input.metadata.frameWidth,
    frameHeight: input.metadata.frameHeight,
    pivot: input.metadata.pivot,
    origin: input.metadata.origin,
    durationSeconds: input.metadata.durationSeconds,
    cacheBytes: input.metadata.cacheBytes,
    sourceSha256: input.metadata.sourceSha256,
    runtimeVersion: input.metadata.runtimeVersion,
    runtimeCommit: input.metadata.runtimeCommit,
    mcp: {
      protocolVersion: input.metadata.mcp.protocolVersion,
      toolCount: input.metadata.mcp.toolCount,
      elapsedMs: input.metadata.mcp.elapsedMs,
      peakRssKb: input.metadata.mcp.peakRssKb,
      requestCount: input.metadata.mcp.requestCount,
    },
  });
}

export async function validateCharacterVersion(
  characterId: string,
  versionId: string,
  dataRoot?: string,
): Promise<{ readonly validation: Rigby2DValidationResult; readonly mcp: Rigby2DMcpEvidence }> {
  const version = await readVersion(characterId, versionId, dataRoot);
  const project = await getVersionProjectPath(characterId, versionId, dataRoot);
  const job = await createJobWorkspace(dataRoot);
  let client: Rigby2DMcpClient | null = null;
  try {
    const { copyFile } = await import("node:fs/promises");
    await copyFile(project, path.join(job.workspaceDir, RIGBY2D_PROJECT_FILE));
    client = await Rigby2DMcpClient.open(job.workspaceDir);
    const raw = await client.call<ValidatePayload>("validate_project", {
      path: RIGBY2D_PROJECT_FILE,
    });
    const validation = parseValidation(raw);
    const mcp = {
      protocolVersion: client.protocolVersion,
      toolCount: client.discovery.length,
      elapsedMs: client.resourceUsage.elapsedMs,
      peakRssKb: client.resourceUsage.peakRssKb,
      requestCount: client.resourceUsage.requestCount,
      trace: client.trace,
      stderr: client.stderrText(),
    };
    const record = { version, validation, mcp, checkedAt: new Date().toISOString() };
    await atomicWriteJson(
      path.join(
        getCharacterDir(characterId, dataRoot),
        "validations",
        `${versionId}-${Date.now()}.json`,
      ),
      record,
    );
    return { validation, mcp };
  } finally {
    if (client) await client.close().catch(() => undefined);
    await removeJobWorkspace(job.jobDir);
  }
}
