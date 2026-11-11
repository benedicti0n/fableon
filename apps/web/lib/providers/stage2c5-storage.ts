import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { getDataRoot, getRepoRoot } from "@/lib/studio/repository";

export type Stage2C5Provider = "openai" | "gemini";
export type Stage2C5SourceSheet = "arm" | "leg";
export type Stage2C5SplitSide = "none" | "above" | "below";

export interface Stage2C5SourceDefinition {
  readonly sheet: Stage2C5SourceSheet;
  readonly relativePath: string;
}

export interface Stage2C5PartDefinition {
  readonly id: string;
  readonly provider: Stage2C5Provider;
  readonly role: "upper-arm" | "forearm" | "hand" | "thigh" | "shin" | "foot";
  readonly label: string;
  readonly sourceSheet: Stage2C5SourceSheet;
  readonly cell: 0 | 1;
  /** Absolute source-sheet Y. Null means the whole selected cell. */
  readonly splitY: number | null;
  readonly side: Stage2C5SplitSide;
  readonly rigNodeId: string;
  readonly notes: string;
}

export interface Stage2C5MaskRevision {
  readonly format: "fableon.stage2c5.mask-revision";
  readonly version: 1;
  readonly provider: Stage2C5Provider;
  readonly part: string;
  readonly sourceId: string;
  readonly sourceHash: string;
  readonly sourcePath: string;
  readonly width: number;
  readonly height: number;
  readonly maskFile: string;
  readonly maskSha256: string;
  readonly revision: number;
  readonly createdAt: string;
  readonly editOrigin: string;
  readonly notes: string;
  readonly reviewStatus: "pending" | "rejected" | "approved";
  readonly technicalValidity: "pass" | "fail";
  readonly extractionCorrectness: "pass" | "needs_review" | "fail";
  readonly articulationCompatibility: "pass" | "partial" | "blocked" | "unknown";
}

export interface Stage2C5SourceInfo {
  readonly id: string;
  readonly provider: Stage2C5Provider;
  readonly sheet: Stage2C5SourceSheet;
  readonly path: string;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly format: "png" | "jpeg" | "unknown";
}

export const STAGE2C5_SOURCES: Readonly<
  Record<Stage2C5Provider, Readonly<Record<Stage2C5SourceSheet, Stage2C5SourceDefinition>>>
> = {
  openai: {
    arm: {
      sheet: "arm",
      relativePath: "docs/benchmarks/phase-05.1/stage-2c2/openai/arm-sheet.png",
    },
    leg: {
      sheet: "leg",
      relativePath: "docs/benchmarks/phase-05.1/stage-2c2/openai/leg-sheet.png",
    },
  },
  gemini: {
    arm: {
      sheet: "arm",
      relativePath: "docs/benchmarks/phase-05.1/stage-2c2/gemini/arm-sheet.png",
    },
    leg: {
      sheet: "leg",
      relativePath: "docs/benchmarks/phase-05.1/stage-2c2/gemini/leg-sheet.png",
    },
  },
};

const OPENAI_ARM_SPLIT = 612;
const GEMINI_ARM_SPLIT = 1166;
const OPENAI_LEG_SPLIT = 825;
const GEMINI_LEG_SPLIT = 1341;

export const STAGE2C5_PARTS: readonly Stage2C5PartDefinition[] = [
  {
    id: "nearUpperArm",
    provider: "openai",
    role: "upper-arm",
    label: "OpenAI · near upper arm",
    sourceSheet: "arm",
    cell: 0,
    splitY: null,
    side: "none",
    rigNodeId: "nearUpperArm",
    notes: "Shoulder cap and sleeve border are owned by this part.",
  },
  {
    id: "nearForearm",
    provider: "openai",
    role: "forearm",
    label: "OpenAI · near forearm",
    sourceSheet: "arm",
    cell: 1,
    splitY: OPENAI_ARM_SPLIT,
    side: "above",
    rigNodeId: "nearForearm",
    notes: "Wrist cuff is owned by the forearm.",
  },
  {
    id: "handOpen",
    provider: "openai",
    role: "hand",
    label: "OpenAI · near hand",
    sourceSheet: "arm",
    cell: 1,
    splitY: OPENAI_ARM_SPLIT,
    side: "below",
    rigNodeId: "handOpen",
    notes: "Independent wrist candidate. Grip-pose art is not present in the paid sheet.",
  },
  {
    id: "nearThigh",
    provider: "openai",
    role: "thigh",
    label: "OpenAI · near thigh",
    sourceSheet: "leg",
    cell: 0,
    splitY: null,
    side: "none",
    rigNodeId: "nearThigh",
    notes: "Dhoti border is owned by the thigh. The old nearDhoti sprite stays hidden.",
  },
  {
    id: "nearShin",
    provider: "openai",
    role: "shin",
    label: "OpenAI · near shin",
    sourceSheet: "leg",
    cell: 1,
    splitY: OPENAI_LEG_SPLIT,
    side: "above",
    rigNodeId: "nearShin",
    notes: "Knee cuff and ankle skin are owned by the shin.",
  },
  {
    id: "nearFoot",
    provider: "openai",
    role: "foot",
    label: "OpenAI · near foot",
    sourceSheet: "leg",
    cell: 1,
    splitY: OPENAI_LEG_SPLIT,
    side: "below",
    rigNodeId: "nearFoot",
    notes: "Shoe outline is owned by the foot; independent ankle candidate.",
  },
  {
    id: "nearUpperArm",
    provider: "gemini",
    role: "upper-arm",
    label: "Gemini · near upper arm",
    sourceSheet: "arm",
    cell: 0,
    splitY: null,
    side: "none",
    rigNodeId: "nearUpperArm",
    notes: "Shoulder cap and sleeve border are owned by this part.",
  },
  {
    id: "nearForearm",
    provider: "gemini",
    role: "forearm",
    label: "Gemini · near forearm",
    sourceSheet: "arm",
    cell: 1,
    splitY: GEMINI_ARM_SPLIT,
    side: "above",
    rigNodeId: "nearForearm",
    notes: "Bangle stack is owned by the forearm.",
  },
  {
    id: "handOpen",
    provider: "gemini",
    role: "hand",
    label: "Gemini · near hand",
    sourceSheet: "arm",
    cell: 1,
    splitY: GEMINI_ARM_SPLIT,
    side: "below",
    rigNodeId: "handOpen",
    notes: "Independent wrist candidate. Grip-pose art is not present in the paid sheet.",
  },
  {
    id: "nearThigh",
    provider: "gemini",
    role: "thigh",
    label: "Gemini · near thigh",
    sourceSheet: "leg",
    cell: 0,
    splitY: null,
    side: "none",
    rigNodeId: "nearThigh",
    notes: "Dhoti border is owned by the thigh. The old nearDhoti sprite stays hidden.",
  },
  {
    id: "nearShin",
    provider: "gemini",
    role: "shin",
    label: "Gemini · near shin",
    sourceSheet: "leg",
    cell: 1,
    splitY: GEMINI_LEG_SPLIT,
    side: "above",
    rigNodeId: "nearShin",
    notes: "Dhoti hem and ankle skin are owned by the shin.",
  },
  {
    id: "nearFoot",
    provider: "gemini",
    role: "foot",
    label: "Gemini · near foot",
    sourceSheet: "leg",
    cell: 1,
    splitY: GEMINI_LEG_SPLIT,
    side: "below",
    rigNodeId: "nearFoot",
    notes: "Shoe outline is owned by the foot; independent ankle candidate.",
  },
];

export class Stage2C5StorageError extends Error {
  override readonly name = "Stage2C5StorageError";
  readonly code: "invalid" | "conflict" | "not_found";
  readonly currentRevision?: number;
  constructor(
    code: "invalid" | "conflict" | "not_found",
    message: string,
    currentRevision?: number,
  ) {
    super(message);
    this.code = code;
    if (currentRevision !== undefined) this.currentRevision = currentRevision;
  }
}

const locks = new Map<string, Promise<unknown>>();

function withMaskLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.then(task, task);
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  locks.set(key, settled);
  void settled.finally(() => {
    if (locks.get(key) === settled) locks.delete(key);
  });
  return run;
}

export function sniffImageFormat(bytes: Uint8Array): "png" | "jpeg" | "unknown" {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  return "unknown";
}

export function getStage2C5DataRoot(): string {
  return path.join(getDataRoot(), "stage-2c5", "masks");
}

export function getStage2C5Part(provider: Stage2C5Provider, part: string): Stage2C5PartDefinition {
  const definition = STAGE2C5_PARTS.find(
    (entry) => entry.provider === provider && entry.id === part,
  );
  if (!definition) {
    throw new Stage2C5StorageError("not_found", "Unknown Stage 2C.5 part.");
  }
  return definition;
}

export function getSourceDefinition(
  provider: Stage2C5Provider,
  sheet: Stage2C5SourceSheet,
): Stage2C5SourceDefinition {
  return STAGE2C5_SOURCES[provider][sheet];
}

export function getSourcePath(provider: Stage2C5Provider, sheet: Stage2C5SourceSheet): string {
  return path.join(getRepoRoot(), getSourceDefinition(provider, sheet).relativePath);
}

export function sourceIdFor(provider: Stage2C5Provider, sheet: Stage2C5SourceSheet): string {
  return `${provider}-${sheet}-sheet`;
}

export async function sourceInfo(
  provider: Stage2C5Provider,
  sheet: Stage2C5SourceSheet,
): Promise<Stage2C5SourceInfo> {
  const file = getSourcePath(provider, sheet);
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Source image has no dimensions.");
  return {
    id: sourceIdFor(provider, sheet),
    provider,
    sheet,
    path: getSourceDefinition(provider, sheet).relativePath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    width: metadata.width,
    height: metadata.height,
    format: sniffImageFormat(bytes),
  };
}

export async function getStage2C5State(): Promise<{
  providers: Stage2C5Provider[];
  sources: Stage2C5SourceInfo[];
  parts: Stage2C5PartDefinition[];
}> {
  const sources: Stage2C5SourceInfo[] = [];
  for (const provider of ["openai", "gemini"] as const) {
    for (const sheet of ["arm", "leg"] as const) sources.push(await sourceInfo(provider, sheet));
  }
  return { providers: ["openai", "gemini"], sources, parts: [...STAGE2C5_PARTS] };
}

function partDir(provider: Stage2C5Provider, part: string): string {
  const definition = getStage2C5Part(provider, part);
  return path.join(getStage2C5DataRoot(), provider, definition.id);
}

function revisionPaths(provider: Stage2C5Provider, part: string, revision: number) {
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Stage2C5StorageError("invalid", "Mask revision must be a positive integer.");
  }
  const dir = partDir(provider, part);
  const stem = `revision-${String(revision).padStart(6, "0")}`;
  return {
    dir,
    mask: path.join(dir, `${stem}.png`),
    metadata: path.join(dir, `${stem}.json`),
    latest: path.join(dir, "latest.json"),
  };
}

async function readLatestMetadata(
  provider: Stage2C5Provider,
  part: string,
): Promise<Stage2C5MaskRevision | null> {
  const { latest } = revisionPaths(provider, part, 1);
  try {
    const parsed = JSON.parse(await readFile(latest, "utf8")) as {
      revisionFile: string;
      revision: number;
    };
    const metadata = JSON.parse(
      await readFile(
        path.join(path.dirname(latest), parsed.revisionFile.replace(/\.png$/, ".json")),
        "utf8",
      ),
    ) as Stage2C5MaskRevision;
    return metadata.revision === parsed.revision ? metadata : null;
  } catch {
    return null;
  }
}

export async function readLatestMaskRevision(
  provider: Stage2C5Provider,
  part: string,
): Promise<Stage2C5MaskRevision | null> {
  return readLatestMetadata(provider, part);
}

export async function listMaskRevisions(
  provider: Stage2C5Provider,
  part: string,
): Promise<Stage2C5MaskRevision[]> {
  const dir = partDir(provider, part);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const revisions: Stage2C5MaskRevision[] = [];
  for (const file of files) {
    if (!/^revision-\d{6}\.json$/.test(file)) continue;
    try {
      revisions.push(
        JSON.parse(await readFile(path.join(dir, file), "utf8")) as Stage2C5MaskRevision,
      );
    } catch {
      // A corrupt revision must not hide the rest of the inventory.
    }
  }
  return revisions.sort((left, right) => right.revision - left.revision);
}

export async function readMaskBuffer(
  provider: Stage2C5Provider,
  part: string,
  revision: number | "latest",
): Promise<{ bytes: Buffer; metadata: Stage2C5MaskRevision }> {
  const metadata =
    revision === "latest"
      ? await readLatestMaskRevision(provider, part)
      : (JSON.parse(
          await readFile(revisionPaths(provider, part, revision).metadata, "utf8"),
        ) as Stage2C5MaskRevision);
  if (!metadata) throw new Stage2C5StorageError("not_found", "No saved mask revision exists.");
  const file = path.resolve(getRepoRoot(), metadata.maskFile);
  const root = path.resolve(getStage2C5DataRoot());
  if (!file.startsWith(`${root}${path.sep}`)) {
    throw new Stage2C5StorageError("invalid", "Stored mask path escaped the mask root.");
  }
  try {
    return { bytes: await readFile(file), metadata };
  } catch {
    throw new Stage2C5StorageError("not_found", "Mask file is missing.");
  }
}

async function atomicWrite(file: string, bytes: Buffer | string): Promise<void> {
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, bytes);
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => undefined);
    throw error;
  }
}

export interface SaveMaskInput {
  readonly maskPngBase64: string;
  readonly sourceSha256: string;
  readonly width: number;
  readonly height: number;
  readonly expectedRevision: number;
  readonly editOrigin: string;
  readonly notes?: string;
}

export async function saveMaskRevision(
  provider: Stage2C5Provider,
  part: string,
  input: SaveMaskInput,
): Promise<Stage2C5MaskRevision> {
  const definition = getStage2C5Part(provider, part);
  return withMaskLock(`${provider}/${part}`, async () => {
    const source = await sourceInfo(provider, definition.sourceSheet);
    if (input.sourceSha256 !== source.sha256) {
      throw new Stage2C5StorageError(
        "invalid",
        `Source hash mismatch for ${definition.id}. The source sheet is immutable.`,
      );
    }
    if (
      !Number.isInteger(input.width) ||
      !Number.isInteger(input.height) ||
      input.width !== source.width ||
      input.height !== source.height
    ) {
      throw new Stage2C5StorageError(
        "invalid",
        `Mask dimensions ${input.width}×${input.height} do not match source ${source.width}×${source.height}.`,
      );
    }
    let maskBytes: Buffer;
    try {
      maskBytes = Buffer.from(input.maskPngBase64, "base64");
    } catch {
      throw new Stage2C5StorageError("invalid", "Mask is not valid base64.");
    }
    if (sniffImageFormat(maskBytes) !== "png") {
      throw new Stage2C5StorageError("invalid", "Mask must be a PNG.");
    }
    let metadata: { width?: number; height?: number; hasAlpha?: boolean };
    try {
      metadata = await sharp(maskBytes).metadata();
    } catch {
      throw new Stage2C5StorageError("invalid", "Mask PNG could not be decoded.");
    }
    if (metadata.width !== source.width || metadata.height !== source.height) {
      throw new Stage2C5StorageError(
        "invalid",
        `Mask image is ${metadata.width}×${metadata.height}; expected ${source.width}×${source.height}.`,
      );
    }
    if (!metadata.hasAlpha) {
      throw new Stage2C5StorageError("invalid", "Mask PNG must have an alpha channel.");
    }
    const current = await readLatestMetadata(provider, part);
    const currentRevision = current?.revision ?? 0;
    if (input.expectedRevision !== currentRevision) {
      throw new Stage2C5StorageError(
        "conflict",
        `Mask revision changed from ${input.expectedRevision} to ${currentRevision}. Reload before saving.`,
        currentRevision,
      );
    }
    const revision = currentRevision + 1;
    const paths = revisionPaths(provider, part, revision);
    await mkdir(paths.dir, { recursive: true });
    await atomicWrite(paths.mask, maskBytes);
    const maskSha256 = createHash("sha256").update(maskBytes).digest("hex");
    const record: Stage2C5MaskRevision = {
      format: "fableon.stage2c5.mask-revision",
      version: 1,
      provider,
      part: definition.id,
      sourceId: source.id,
      sourceHash: source.sha256,
      sourcePath: source.path,
      width: source.width,
      height: source.height,
      maskFile: path.relative(getRepoRoot(), paths.mask),
      maskSha256,
      revision,
      createdAt: new Date().toISOString(),
      editOrigin: input.editOrigin.slice(0, 200),
      notes: (input.notes ?? "").slice(0, 1000),
      reviewStatus: "pending",
      technicalValidity: "pass",
      extractionCorrectness: "needs_review",
      articulationCompatibility: "unknown",
    };
    await atomicWrite(paths.metadata, `${JSON.stringify(record, null, 2)}\n`);
    const latest = {
      provider,
      part: definition.id,
      revision,
      revisionFile: path.basename(paths.mask),
      metadataFile: path.basename(paths.metadata),
      maskSha256,
      updatedAt: record.createdAt,
    };
    await atomicWrite(paths.latest, `${JSON.stringify(latest, null, 2)}\n`);
    return record;
  });
}

function cellBounds(
  width: number,
  height: number,
  cell: 0 | 1,
): { left: number; right: number; top: number; bottom: number } {
  const midpoint = Math.floor(width / 2);
  return {
    left: cell === 0 ? 0 : midpoint,
    right: cell === 0 ? midpoint : width,
    top: 0,
    bottom: height,
  };
}

export async function createSeedMask(
  provider: Stage2C5Provider,
  part: string,
): Promise<{ bytes: Buffer; metadata: { width: number; height: number; sourceSha256: string } }> {
  const definition = getStage2C5Part(provider, part);
  if (definition.splitY !== null && definition.side === "none") {
    throw new Stage2C5StorageError("invalid", "Split side is missing.");
  }
  const source = await sourceInfo(provider, definition.sourceSheet);
  const file = getSourcePath(provider, definition.sourceSheet);
  const { data, info } = await sharp(await readFile(file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== source.width || info.height !== source.height) {
    throw new Error("Source dimensions changed while seeding.");
  }
  const cell = cellBounds(info.width, info.height, definition.cell);
  const alpha = Buffer.alloc(info.width * info.height);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = cell.left; x < cell.right; x += 1) {
      if (definition.splitY !== null) {
        if (definition.side === "above" && y >= definition.splitY) continue;
        if (definition.side === "below" && y < definition.splitY) continue;
      }
      const offset = (y * info.width + x) * 4;
      if (provider === "openai") {
        alpha[y * info.width + x] = data[offset + 3] ?? 0;
      } else {
        const r = data[offset] ?? 0;
        const g = data[offset + 1] ?? 0;
        const b = data[offset + 2] ?? 0;
        const maxRb = Math.max(r, b);
        const dominance = g - maxRb;
        let value = 255;
        if (dominance > 32 && g > 45) value = 0;
        else if (dominance > 2) value = Math.round(255 - (dominance - 2) * 18);
        alpha[y * info.width + x] = Math.max(0, Math.min(255, value));
      }
    }
  }
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let index = 0; index < alpha.length; index += 1) {
    const offset = index * 4;
    rgba[offset] = 255;
    rgba[offset + 1] = 255;
    rgba[offset + 2] = 255;
    rgba[offset + 3] = alpha[index] ?? 0;
  }
  const bytes = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  return {
    bytes,
    metadata: { width: info.width, height: info.height, sourceSha256: source.sha256 },
  };
}

export async function readMaskBytes(
  provider: Stage2C5Provider,
  part: string,
  revision: number | "latest",
): Promise<Buffer> {
  return (await readMaskBuffer(provider, part, revision)).bytes;
}

export async function countRevisions(provider: Stage2C5Provider, part: string): Promise<number> {
  return (await listMaskRevisions(provider, part)).length;
}

export function isStage2C5Provider(value: string): value is Stage2C5Provider {
  return value === "openai" || value === "gemini";
}
