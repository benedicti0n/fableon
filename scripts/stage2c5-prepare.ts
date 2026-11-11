import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import {
  createMask,
  cropRgba,
  extractWithMask,
  maskBounds,
} from "../apps/web/lib/providers/stage2c5-mask.ts";
import {
  createSeedMask,
  getSourcePath,
  getStage2C5State,
  sniffImageFormat,
  type Stage2C5PartDefinition,
} from "../apps/web/lib/providers/stage2c5-storage.ts";

const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const sharp = require("sharp");

interface CandidateRecord {
  provider: "openai" | "gemini";
  part: string;
  label: string;
  role: string;
  sourceSheet: string;
  sourcePath: string;
  sourceSha256: string;
  sourceFormat: string;
  sourceWidth: number;
  sourceHeight: number;
  maskFile: string;
  maskSha256: string;
  maskDimensions: { width: number; height: number };
  candidateFile: string;
  candidateSha256: string;
  candidateDimensions: { width: number; height: number };
  crop: { x: number; y: number; width: number; height: number };
  splitY: number | null;
  alphaCounts: { transparent: number; translucent: number; opaque: number; greenDominant: number };
  revision: number;
  editOrigin: string;
  reviewStatus: "pending";
  technicalValidity: "pass";
  extractionCorrectness: "needs_review";
  articulationCompatibility: "unknown";
}

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function buildCandidate(
  definition: Stage2C5PartDefinition,
  root: string,
  source: { sha256: string; format: string; width: number; height: number },
): Promise<CandidateRecord> {
  const seed = await createSeedMask(definition.provider, definition.id);
  const mask = createMask(seed.metadata.width, seed.metadata.height);
  const { data: maskPixels } = await sharp(seed.bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let index = 0; index < mask.data.length; index += 1) {
    mask.data[index] = maskPixels[index * 4 + 3] ?? 0;
  }
  const box = maskBounds(mask);
  if (!box) throw new Error(`${definition.provider}/${definition.id} seed mask is empty.`);
  const sourceBytes = await readFile(getSourcePath(definition.provider, definition.sourceSheet));
  const { data, info } = await sharp(sourceBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sourceRgba = new Uint8ClampedArray(data);
  const extracted = extractWithMask(sourceRgba, mask);
  if (definition.provider === "gemini") {
    for (let index = 0; index < extracted.length; index += 4) {
      if ((extracted[index + 3] ?? 0) === 0) continue;
      const r = extracted[index] ?? 0;
      const g = extracted[index + 1] ?? 0;
      const b = extracted[index + 2] ?? 0;
      const maxRb = Math.max(r, b);
      if (g > maxRb + 18) extracted[index + 1] = maxRb;
    }
  }
  const cropped = cropRgba(extracted, info.width, info.height, box);
  const stage = path.join(
    root,
    "outputs",
    "folk-provider-benchmark",
    "stage-2c5",
    definition.provider,
  );
  const maskFile = path.join(stage, "masks", `${definition.id}.mask.png`);
  const candidateFile = path.join(stage, "parts", `${definition.id}.png`);
  await mkdir(path.dirname(maskFile), { recursive: true });
  await mkdir(path.dirname(candidateFile), { recursive: true });
  await writeFile(maskFile, seed.bytes);
  await writeFile(
    candidateFile,
    await sharp(cropped, { raw: { width: box.width, height: box.height, channels: 4 } })
      .png()
      .toBuffer(),
  );
  const candidateBytes = await readFile(candidateFile);
  const candidateRaw = await sharp(candidateBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let translucent = 0;
  let opaque = 0;
  let greenDominant = 0;
  for (let index = 0; index < candidateRaw.data.length; index += 4) {
    const alpha = candidateRaw.data[index + 3] ?? 0;
    if (alpha === 0) transparent += 1;
    else if (alpha === 255) opaque += 1;
    else translucent += 1;
    const r = candidateRaw.data[index] ?? 0;
    const g = candidateRaw.data[index + 1] ?? 0;
    const b = candidateRaw.data[index + 2] ?? 0;
    if (alpha > 0 && g > Math.max(r, b) + 40) greenDominant += 1;
  }
  const record: CandidateRecord = {
    provider: definition.provider,
    part: definition.id,
    label: definition.label,
    role: definition.role,
    sourceSheet: definition.sourceSheet,
    sourcePath: path.relative(root, getSourcePath(definition.provider, definition.sourceSheet)),
    sourceSha256: source.sha256,
    sourceFormat: source.format,
    sourceWidth: source.width,
    sourceHeight: source.height,
    maskFile: path.relative(root, maskFile),
    maskSha256: hash(seed.bytes),
    maskDimensions: { width: seed.metadata.width, height: seed.metadata.height },
    candidateFile: path.relative(root, candidateFile),
    candidateSha256: hash(candidateBytes),
    candidateDimensions: { width: box.width, height: box.height },
    crop: box,
    splitY: definition.splitY,
    alphaCounts: { transparent, translucent, opaque, greenDominant },
    revision: 1,
    editOrigin:
      definition.splitY === null
        ? "studio-stage2c5-seed-alpha"
        : `studio-stage2c5-seed-alpha-split-${definition.side}`,
    reviewStatus: "pending",
    technicalValidity: "pass",
    extractionCorrectness: "needs_review",
    articulationCompatibility: "unknown",
  };
  await writeFile(
    path.join(stage, "masks", `${definition.id}.mask-revision.json`),
    `${JSON.stringify(
      {
        format: "fableon.stage2c5.mask-revision",
        version: 1,
        provider: definition.provider,
        part: definition.id,
        sourceId: `${definition.provider}-${definition.sourceSheet}-sheet`,
        sourceHash: source.sha256,
        sourcePath: record.sourcePath,
        width: source.width,
        height: source.height,
        maskFile: record.maskFile,
        maskSha256: record.maskSha256,
        revision: 1,
        createdAt: new Date().toISOString(),
        editOrigin: record.editOrigin,
        notes: definition.notes,
        reviewStatus: "pending",
        technicalValidity: "pass",
        extractionCorrectness: "needs_review",
        articulationCompatibility: "unknown",
      },
      null,
      2,
    )}\n`,
  );
  return record;
}

async function main() {
  const root = process.cwd();
  const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c5");
  await mkdir(docs, { recursive: true });
  const state = await getStage2C5State();
  const records: CandidateRecord[] = [];
  for (const part of state.parts) {
    const source = state.sources.find(
      (entry) => entry.provider === part.provider && entry.sheet === part.sourceSheet,
    );
    if (!source) throw new Error(`Missing source for ${part.provider}/${part.part}`);
    const record = await buildCandidate(part, root, {
      sha256: source.sha256,
      format: sniffImageFormat(await readFile(getSourcePath(part.provider, part.sourceSheet))),
      width: source.width,
      height: source.height,
    });
    records.push(record);
    console.log(
      `${record.provider} ${record.part} ${record.candidateDimensions.width}x${record.candidateDimensions.height} green=${record.alphaCounts.greenDominant}`,
    );
  }
  await writeFile(
    path.join(docs, "candidate-inventory.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), parts: records }, null, 2)}\n`,
  );
  await writeFile(
    path.join(root, "outputs", "folk-provider-benchmark", "stage-2c5", "candidate-inventory.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), parts: records }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ parts: records.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
