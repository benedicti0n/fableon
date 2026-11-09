import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = join(ROOT, "assets/premium-bird-v1/parts");
const PUBLIC_DIR = join(ROOT, "apps/web/public/assets/premium-bird-v1");
const PUBLIC_PARTS = join(PUBLIC_DIR, "parts");

const PARTS = [
  {
    id: "body",
    name: "Body",
    parentId: null,
    zIndex: 50,
    pivot: { x: 133, y: 80 },
    registration: { x: 300, y: 225 },
    note: "Inferred reconstruction from the approved reference; original body art was obscured by the wing. Artist sign-off pending.",
  },
  {
    id: "head",
    name: "Head",
    parentId: "body",
    zIndex: 70,
    pivot: { x: 30, y: 150 },
    registration: { x: 451, y: 191 },
    note: "Inferred reconstruction without baked eye/beak; artist sign-off pending.",
  },
  {
    id: "eye",
    name: "Eye",
    parentId: "head",
    zIndex: 85,
    pivot: { x: 22, y: 22 },
    registration: { x: 569, y: 225 },
    note: "Extracted from the candidate reference board.",
  },
  {
    id: "beak",
    name: "Beak",
    parentId: "head",
    zIndex: 80,
    pivot: { x: 8, y: 22 },
    registration: { x: 618, y: 234 },
    note: "Extracted from the candidate reference board.",
  },
  {
    id: "wing-near",
    name: "Near wing",
    parentId: "body",
    zIndex: 60,
    pivot: { x: 148, y: 23 },
    registration: { x: 297, y: 267 },
    note: "Extracted from the candidate reference board; shoulder coverage inferred.",
  },
  {
    id: "wing-far",
    name: "Far wing",
    parentId: "body",
    zIndex: 20,
    pivot: { x: 147, y: 25 },
    registration: { x: 316, y: 251 },
    note: "Extracted from the candidate reference board; hidden shoulder inferred.",
  },
  {
    id: "tail",
    name: "Tail",
    parentId: "body",
    zIndex: 10,
    pivot: { x: 118, y: 18 },
    registration: { x: 259, y: 321 },
    note: "Extracted from the candidate reference board.",
  },
  {
    id: "leg-left",
    name: "Left leg",
    parentId: "body",
    zIndex: 30,
    pivot: { x: 53, y: 13 },
    registration: { x: 389, y: 357 },
    note: "Extracted from the candidate reference board.",
  },
  {
    id: "leg-right",
    name: "Right leg",
    parentId: "body",
    zIndex: 31,
    pivot: { x: 53, y: 12 },
    registration: { x: 440, y: 367 },
    note: "Extracted from the candidate reference board; vertical placement adjusted during Gate 2 integration for branch contact.",
  },
];

function pngDimensions(bytes) {
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Expected a PNG source part.");
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

mkdirSync(PUBLIC_PARTS, { recursive: true });
const parts = [];

for (const definition of PARTS) {
  const sourcePath = join(SOURCE_DIR, `${definition.id}.png`);
  const bytes = readFileSync(sourcePath);
  const dimensions = pngDimensions(bytes);
  const hash = sha256(bytes);
  copyFileSync(sourcePath, join(PUBLIC_PARTS, `${definition.id}.png`));

  parts.push({
    id: definition.id,
    name: definition.name,
    category: "character-part",
    source: `parts/${definition.id}.png`,
    originalSize: dimensions,
    preparedSize: dimensions,
    registration: definition.registration,
    pivot: { space: "source", ...definition.pivot },
    preparedOffset: { x: 0, y: 0 },
    trim: {
      applied: false,
      alphaThreshold: 0,
      contentBounds: { x: 0, y: 0, ...dimensions },
    },
    alpha: "required",
    parentId: definition.parentId,
    zIndex: definition.zIndex,
    characterId: "premium-bird-v1",
    role: definition.id,
    hashes: {
      algorithm: "sha256",
      source: hash,
      prepared: hash,
    },
    provenance: {
      kind: "ai-generated",
      creator: "External Gate 2 candidate v2",
      sourceRef: "incoming/fableon-gate2-repaired-candidate-v2.zip",
      license: "Candidate review only; not approved for production",
      notes: definition.note,
    },
  });
}

const manifest = {
  format: "fableon.illustration-pack",
  version: 1,
  id: "premium-bird-v1",
  name: "The Little Bird — Gate 2 Candidate v2",
  kind: "character",
  canvas: { width: 960, height: 540 },
  parts,
};

const provenance = {
  packId: manifest.id,
  status: "NOT_APPROVED_ARTWORK",
  sourceArchive: "incoming/fableon-gate2-repaired-candidate-v2.zip",
  sourceArchiveSha256: "7b4f732c3b70d51da9bbcd25db96439791f34ee24094e62811110ab95c43f309",
  reference: "assets/premium-bird-v1/references/approved-master-reference.png",
  coordinateNote:
    "Pack registration is in the candidate's 960x540 diagnostic layout. The Gate 2 benchmark applies a 2x display scale and scene offset; the rig uses source-space pivots, not registration.",
  reconstruction:
    "Body and head are inferred reconstructions. Near/far shoulders and hidden body coverage require human review.",
  approval: "Gate 1 is externally claimed; Gate 2 artistic approval remains pending.",
};

writeFileSync(join(PUBLIC_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(PUBLIC_DIR, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      pack: manifest.id,
      parts: parts.length,
      canvas: manifest.canvas,
      output: PUBLIC_DIR,
      hashes: parts.map((part) => ({ id: part.id, sha256: part.hashes.source })),
    },
    null,
    2,
  ),
);
