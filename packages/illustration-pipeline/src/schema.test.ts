import { describe, expect, it } from "vitest";

import {
  deserializeIllustrationPack,
  IllustrationPackError,
  parseIllustrationPack,
  partDrawOffset,
  serializeIllustrationPack,
  validateIllustrationPack,
} from "./index";

function makePart(overrides: Record<string, unknown> = {}) {
  return {
    id: "body",
    name: "Body",
    category: "character-part",
    source: "parts/body.png",
    originalSize: { width: 760, height: 520 },
    preparedSize: { width: 760, height: 520 },
    registration: { x: 0, y: 0 },
    pivot: { space: "source", x: 380, y: 300 },
    preparedOffset: { x: 0, y: 0 },
    trim: {
      applied: false,
      alphaThreshold: 0,
      contentBounds: { x: 0, y: 0, width: 760, height: 520 },
    },
    alpha: "required",
    parentId: null,
    zIndex: 50,
    provenance: { kind: "artist-created", creator: "Test artist", license: "private" },
    ...overrides,
  };
}

function makePack(overrides: Record<string, unknown> = {}) {
  return {
    format: "fableon.illustration-pack",
    version: 1,
    id: "storybook-bird",
    name: "Storybook Bird",
    kind: "character",
    canvas: { width: 1024, height: 1024 },
    parts: [makePart()],
    ...overrides,
  };
}

describe("illustration pack schema", () => {
  it("accepts a valid pack and preserves all registration metadata", () => {
    const result = validateIllustrationPack(makePack());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.pack.parts[0]?.pivot).toEqual({ space: "source", x: 380, y: 300 });
    expect(result.pack.parts[0]?.registration).toEqual({ x: 0, y: 0 });
    expect(partDrawOffset(result.pack.parts[0]!)).toEqual({ x: 0, y: 0 });
  });

  it("round-trips serialized packs without changing metadata", () => {
    const pack = parseIllustrationPack(makePack());
    const roundTripped = deserializeIllustrationPack(serializeIllustrationPack(pack));
    expect(roundTripped).toEqual(pack);
  });

  it("uses the prepared offset when computing the draw position", () => {
    const result = validateIllustrationPack(
      makePack({
        parts: [
          makePart({
            registration: { x: 100, y: 50 },
            preparedOffset: { x: 10, y: 20 },
            preparedSize: { width: 100, height: 90 },
            trim: {
              applied: true,
              alphaThreshold: 0,
              contentBounds: { x: 10, y: 20, width: 100, height: 90 },
            },
          }),
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(partDrawOffset(result.pack.parts[0]!)).toEqual({ x: 110, y: 70 });
  });

  it("rejects duplicate IDs, draw orders, missing parents, and cycles", () => {
    const duplicateId = validateIllustrationPack(
      makePack({
        parts: [makePart(), makePart({ zIndex: 51, source: "parts/body-2.png" })],
      }),
    );
    expect(duplicateId.ok).toBe(false);
    if (!duplicateId.ok) {
      expect(duplicateId.issues.some((issue) => issue.code === "custom")).toBe(true);
    }

    const duplicateOrder = validateIllustrationPack(
      makePack({
        parts: [
          makePart(),
          makePart({ id: "head", parentId: "body", zIndex: 50, source: "parts/head.png" }),
        ],
      }),
    );
    expect(duplicateOrder.ok).toBe(false);

    const missingParent = validateIllustrationPack(
      makePack({ parts: [makePart({ id: "head", parentId: "missing", zIndex: 20 })] }),
    );
    expect(missingParent.ok).toBe(false);

    const cycle = validateIllustrationPack(
      makePack({
        parts: [
          makePart({ id: "a", parentId: "b" }),
          makePart({ id: "b", parentId: "a", zIndex: 60, source: "parts/b.png" }),
        ],
      }),
    );
    expect(cycle.ok).toBe(false);
  });

  it("rejects invalid pivots, unsafe paths, and inconsistent trim metadata", () => {
    const badPivot = validateIllustrationPack(
      makePack({ parts: [makePart({ pivot: { space: "source", x: 900, y: 300 } })] }),
    );
    expect(badPivot.ok).toBe(false);

    const unsafePath = validateIllustrationPack(
      makePack({ parts: [makePart({ source: "../body.png" })] }),
    );
    expect(unsafePath.ok).toBe(false);

    const unsupportedExtension = validateIllustrationPack(
      makePack({ parts: [makePart({ source: "parts/body.svg" })] }),
    );
    expect(unsupportedExtension.ok).toBe(false);

    const badTrim = validateIllustrationPack(
      makePack({
        parts: [
          makePart({
            trim: {
              applied: true,
              alphaThreshold: 0,
              contentBounds: { x: 700, y: 0, width: 200, height: 100 },
            },
          }),
        ],
      }),
    );
    expect(badTrim.ok).toBe(false);
  });

  it("rejects unknown versions and malformed top-level metadata", () => {
    const badVersion = validateIllustrationPack(makePack({ version: 2 }));
    expect(badVersion.ok).toBe(false);

    const badCanvas = validateIllustrationPack(makePack({ canvas: { width: 0, height: 1024 } }));
    expect(badCanvas.ok).toBe(false);

    expect(() => parseIllustrationPack(makePack({ version: 2 }))).toThrow(IllustrationPackError);
  });

  it("reports actionable issue paths", () => {
    const result = validateIllustrationPack(
      makePack({ parts: [makePart({ source: "parts/body.svg" })] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]?.path).toBe("parts.0.source");
    expect(result.issues[0]?.message).toContain("Asset paths");
  });

  it("accepts an incomplete character pack for inspection", () => {
    const result = validateIllustrationPack(makePack({ parts: [] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pack.parts).toEqual([]);
  });
});
