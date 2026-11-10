import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createIllustrationArchive,
  parseIllustrationPack,
  readIllustrationArchive,
  serializeIllustrationPack,
  validateCharacterPreparation,
  validateIllustrationPack,
  type IllustrationPack,
} from "@fableon/illustration-pipeline";

const ROOT = resolve(process.cwd());
const PACK_DIR = join(ROOT, "apps/web/public/assets/premium-bird-v1");
const SOURCE_DIR = join(ROOT, "assets/premium-bird-v1/parts");
const manifest = JSON.parse(readFileSync(join(PACK_DIR, "manifest.json"), "utf8")) as unknown;

function assetBytes(partId: string): Uint8Array {
  return new Uint8Array(readFileSync(join(SOURCE_DIR, `${partId}.png`)));
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

describe("Gate 2 premium bird illustration pack", () => {
  it("validates as a v1 character pack with all nine parts", () => {
    const pack = parseIllustrationPack(manifest);
    expect(pack.id).toBe("premium-bird-v1");
    expect(pack.kind).toBe("character");
    expect(pack.canvas).toEqual({ width: 960, height: 540 });
    expect(pack.parts.map((part) => part.id)).toEqual([
      "body",
      "head",
      "eye",
      "beak",
      "wing-near",
      "wing-far",
      "tail",
      "leg-left",
      "leg-right",
    ]);

    const report = validateCharacterPreparation(pack);
    expect(report.ready).toBe(true);
    expect(report.missingPartIds).toEqual([]);
  });

  it("preserves source dimensions, pivots, and hashes exactly", () => {
    const pack = parseIllustrationPack(manifest);
    for (const part of pack.parts) {
      const bytes = assetBytes(part.id);
      expect(part.hashes?.source).toBe(sha256(bytes));
      expect(part.hashes?.prepared).toBe(sha256(bytes));
      expect(part.originalSize).toEqual(part.preparedSize);
      expect(part.preparedOffset).toEqual({ x: 0, y: 0 });
      expect(part.trim.applied).toBe(false);
      expect(part.alpha).toBe("required");
    }

    expect(pack.parts.find((part) => part.id === "body")?.pivot).toEqual({
      space: "source",
      x: 133,
      y: 80,
    });
    expect(pack.parts.find((part) => part.id === "head")?.pivot).toEqual({
      space: "source",
      x: 30,
      y: 150,
    });
    expect(pack.parts.find((part) => part.id === "leg-right")?.registration).toEqual({
      x: 440,
      y: 367,
    });
  });

  it("exports and re-imports the pack without changing metadata", () => {
    const pack = parseIllustrationPack(manifest);
    const preparedAssets = new Map<string, Uint8Array>();
    for (const part of pack.parts) {
      preparedAssets.set(part.source, assetBytes(part.id));
    }

    const archive = createIllustrationArchive({ pack, preparedAssets });
    const roundTrip = readIllustrationArchive(archive);
    expect(roundTrip.pack).toEqual(pack);
    expect(roundTrip.files.size).toBe(pack.parts.length + 2);
    expect(serializeIllustrationPack(roundTrip.pack)).toBe(serializeIllustrationPack(pack));
  });

  it("reads the exported portable pack archive", () => {
    const archive = new Uint8Array(
      readFileSync(join(ROOT, "docs/benchmarks/phase-02-7-gate2/premium-bird-v1.fableon-pack.zip")),
    );
    const result = readIllustrationArchive(archive);
    expect(result.pack).toEqual(parseIllustrationPack(manifest));
    expect(result.files.has("manifest.json")).toBe(true);
    expect(result.files.has("provenance.json")).toBe(true);
    for (const part of result.pack.parts) {
      expect(result.files.has(part.source)).toBe(true);
    }
  });

  it("remains deterministic and does not mutate source bytes", { timeout: 20_000 }, () => {
    const pack = parseIllustrationPack(manifest);
    const before = pack.parts.map((part) => part.hashes?.source);
    const preparedAssets = new Map<string, Uint8Array>();
    for (const part of pack.parts) preparedAssets.set(part.source, assetBytes(part.id));

    const first = createIllustrationArchive({ pack, preparedAssets });
    const second = createIllustrationArchive({ pack, preparedAssets });
    const after = pack.parts.map((part) => part.hashes?.source);

    expect(second).toEqual(first);
    expect(after).toEqual(before);
  });

  it("rejects an incomplete pack for animation readiness", () => {
    const pack = parseIllustrationPack(manifest);
    const incomplete: IllustrationPack = {
      ...pack,
      parts: pack.parts.filter((part) => !["head", "eye", "beak"].includes(part.id)),
    };
    const validation = validateIllustrationPack(incomplete);
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    const report = validateCharacterPreparation(validation.pack);
    expect(report.ready).toBe(false);
    expect(report.missingPartIds).toEqual(["head", "eye", "beak"]);
  });
});
