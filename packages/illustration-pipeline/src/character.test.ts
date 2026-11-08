import { describe, expect, it } from "vitest";

import {
  analyzePixels,
  assignCharacterPart,
  CHARACTER_RIG_TEMPLATE,
  characterPreparationSummary,
  createEmptyCharacterPack,
  findTemplatePart,
  removePartAndDescendants,
  templatePartFor,
  updatePartOcclusion,
  updatePartPivot,
  updatePartRegistration,
  validateCharacterPreparation,
  type IllustrationPack,
  type PreparedImageImport,
} from "./index";

function makeImported(fileName: string, size = 100): PreparedImageImport {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const transparent = x < 2 || y < 2;
      data[index] = 180;
      data[index + 1] = 110;
      data[index + 2] = 50;
      data[index + 3] = transparent ? 0 : 255;
    }
  }

  const pixelBuffer = { width: size, height: size, data };
  const analysis = analyzePixels(pixelBuffer);

  return {
    inspection: {
      fileName,
      mimeType: "image/png",
      format: "png",
      width: size,
      height: size,
      fileSize: 100,
      sourceHash: "a".repeat(64),
      analysis,
      warnings: analysis.warnings,
    },
    preparedBlob: new Blob(),
    preparedBytes: new Uint8Array([1]),
    preparedHash: "b".repeat(64),
    preparedWidth: size,
    preparedHeight: size,
    preparedOffsetX: 0,
    preparedOffsetY: 0,
    trim: {
      width: size,
      height: size,
      data,
      offsetX: 0,
      offsetY: 0,
      applied: false,
      contentBounds: { x: 0, y: 0, width: size, height: size },
    },
  };
}

function makeCompletePack(): IllustrationPack {
  let pack = createEmptyCharacterPack({
    id: "storybook-bird",
    name: "Storybook Bird",
    canvas: { width: 1024, height: 1024 },
  });

  for (const template of CHARACTER_RIG_TEMPLATE) {
    pack = assignCharacterPart(pack, {
      templateId: template.id,
      imported: makeImported(`${template.id}.png`),
      pivot: { x: 50, y: 50 },
      registration: { x: 20, y: 20 },
    });
  }

  return pack;
}

function withoutHashes(pack: IllustrationPack): IllustrationPack {
  return {
    ...pack,
    parts: pack.parts.map((part) => {
      const copy = { ...part };
      delete copy.hashes;
      return copy;
    }),
  };
}

describe("character preparation", () => {
  it("defines the required storybook-bird hierarchy and draw order", () => {
    expect(CHARACTER_RIG_TEMPLATE.map((part) => part.id)).toEqual([
      "body",
      "head",
      "eye",
      "beak",
      "wing-far",
      "wing-near",
      "tail",
      "leg-left",
      "leg-right",
    ]);
    expect(templatePartFor("wingFar")?.id).toBe("wing-far");
    expect(templatePartFor("leg_right")?.id).toBe("leg-right");
    expect(templatePartFor("unknown")).toBeUndefined();
  });

  it("assigns imported images with pivots, hashes, and template hierarchy", () => {
    const imported = makeImported("body.png", 120);
    let pack = createEmptyCharacterPack({
      id: "storybook-bird",
      name: "Storybook Bird",
    });
    pack = assignCharacterPart(pack, {
      templateId: "body",
      imported,
      pivot: { x: 60, y: 70 },
      registration: { x: 10, y: 20 },
    });

    const body = findTemplatePart(pack, CHARACTER_RIG_TEMPLATE[0]!);
    expect(body?.pivot).toEqual({ space: "source", x: 60, y: 70 });
    expect(body?.registration).toEqual({ x: 10, y: 20 });
    expect(body?.parentId).toBeNull();
    expect(body?.hashes?.source).toBe("a".repeat(64));
    expect(body?.trim.contentBounds).toEqual({ x: 0, y: 0, width: 120, height: 120 });
  });

  it("reports missing parts and refuses to mark an incomplete character ready", () => {
    const pack = makeCompletePack();
    const report = validateCharacterPreparation(pack);
    expect(report.ready).toBe(true);
    expect(report.missingPartIds).toEqual([]);

    const incomplete = removePartAndDescendants(pack, "head");
    const incompleteReport = validateCharacterPreparation(incomplete);
    expect(incompleteReport.ready).toBe(false);
    expect(incompleteReport.missingPartIds).toEqual(["head", "eye", "beak"]);
    expect(incompleteReport.issues.some((issue) => issue.code === "missing-part")).toBe(true);
  });

  it("rejects parent mismatches, opaque parts, and unresolved occlusion", () => {
    const pack = makeCompletePack();

    const badParent: IllustrationPack = {
      ...pack,
      parts: pack.parts.map((part) => (part.id === "head" ? { ...part, parentId: null } : part)),
    };
    const parentReport = validateCharacterPreparation(badParent);
    expect(parentReport.ready).toBe(false);
    expect(parentReport.issues.some((issue) => issue.code === "parent-mismatch")).toBe(true);

    const opaque: IllustrationPack = {
      ...pack,
      parts: pack.parts.map((part) =>
        part.id === "body" ? { ...part, alpha: "opaque" as const } : part,
      ),
    };
    const opaqueReport = validateCharacterPreparation(opaque);
    expect(opaqueReport.ready).toBe(false);
    expect(opaqueReport.issues.some((issue) => issue.code === "opaque-character-part")).toBe(true);

    const occluded = updatePartOcclusion(pack, "wing-far", {
      requiresReconstruction: true,
      note: "Rear wing hidden by the near wing in the source painting.",
    });
    const occlusionReport = validateCharacterPreparation(occluded);
    expect(occlusionReport.ready).toBe(false);
    expect(occlusionReport.issues.some((issue) => issue.code === "unresolved-occlusion")).toBe(
      true,
    );
  });

  it("treats missing hashes and extra parts as warnings, not false readiness", () => {
    const report = validateCharacterPreparation(withoutHashes(makeCompletePack()));
    expect(report.ready).toBe(true);
    expect(report.issues.some((issue) => issue.code === "missing-hash")).toBe(true);

    const pack = makeCompletePack();
    const extra = {
      ...pack.parts[0]!,
      id: "crest",
      name: "Crest",
      role: "crest",
      zIndex: 99,
    };
    const withExtra = { ...pack, parts: [...pack.parts, extra] };
    const extraReport = validateCharacterPreparation(withExtra);
    expect(extraReport.ready).toBe(true);
    expect(extraReport.extraPartIds).toEqual(["crest"]);
  });

  it("edits pivots and registration immutably", () => {
    const pack = makeCompletePack();
    const updated = updatePartPivot(pack, "body", { x: 40, y: 45 });
    const registered = updatePartRegistration(updated, "body", { x: 100, y: 120 });

    expect(pack.parts.find((part) => part.id === "body")?.pivot).toEqual({
      space: "source",
      x: 50,
      y: 50,
    });
    expect(registered.parts.find((part) => part.id === "body")?.pivot).toEqual({
      space: "source",
      x: 40,
      y: 45,
    });
    expect(registered.parts.find((part) => part.id === "body")?.registration).toEqual({
      x: 100,
      y: 120,
    });
  });

  it("removes a parent and all descendants without leaving broken references", () => {
    const pack = makeCompletePack();
    const pruned = removePartAndDescendants(pack, "head");
    expect(pruned.parts.map((part) => part.id)).not.toContain("head");
    expect(pruned.parts.map((part) => part.id)).not.toContain("eye");
    expect(pruned.parts.map((part) => part.id)).not.toContain("beak");
    expect(pruned.parts.map((part) => part.id)).toContain("body");
  });

  it("summarizes readiness for the preparation interface", () => {
    expect(characterPreparationSummary(validateCharacterPreparation(makeCompletePack()))).toContain(
      "ready",
    );
    const missing = removePartAndDescendants(makeCompletePack(), "body");
    expect(characterPreparationSummary(validateCharacterPreparation(missing))).toContain("Missing");
  });
});
