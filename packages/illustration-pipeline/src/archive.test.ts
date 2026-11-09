import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";

import {
  createIllustrationArchive,
  IllustrationArchiveError,
  readIllustrationArchive,
  serializeIllustrationPack,
  type IllustrationPack,
} from "./index";

function makePack(originalSource = true): IllustrationPack {
  return {
    format: "fableon.illustration-pack",
    version: 1,
    id: "archive-test",
    name: "Archive Test",
    kind: "character",
    canvas: { width: 100, height: 100 },
    parts: [
      {
        id: "body",
        name: "Body",
        category: "character-part",
        source: "assets/body.png",
        ...(originalSource ? { originalSource: "source/body-original.png" } : {}),
        originalSize: { width: 50, height: 50 },
        preparedSize: { width: 50, height: 50 },
        registration: { x: 0, y: 0 },
        pivot: { space: "source", x: 25, y: 25 },
        preparedOffset: { x: 0, y: 0 },
        trim: {
          applied: false,
          alphaThreshold: 0,
          contentBounds: { x: 0, y: 0, width: 50, height: 50 },
        },
        alpha: "required",
        parentId: null,
        zIndex: 50,
        provenance: { kind: "diagnostic" },
      },
    ],
  };
}

const PREPARED = new Map([["assets/body.png", new Uint8Array([1, 2, 3])]]);
const ORIGINAL = new Map([["source/body-original.png", new Uint8Array([9, 8, 7])]]);

describe("illustration pack archive", () => {
  it("exports and re-imports a pack with assets and provenance", () => {
    const bytes = createIllustrationArchive({
      pack: makePack(),
      preparedAssets: PREPARED,
      originalAssets: ORIGINAL,
    });
    expect(bytes.byteLength).toBeGreaterThan(0);

    const roundTrip = readIllustrationArchive(bytes);
    expect(roundTrip.pack).toEqual(makePack());
    expect(roundTrip.files.get("assets/body.png")).toEqual(new Uint8Array([1, 2, 3]));
    expect(roundTrip.files.get("source/body-original.png")).toEqual(new Uint8Array([9, 8, 7]));
    expect(roundTrip.files.has("provenance.json")).toBe(true);
  });

  it("is deterministic for identical input", () => {
    const first = createIllustrationArchive({
      pack: makePack(),
      preparedAssets: PREPARED,
      originalAssets: ORIGINAL,
    });
    const second = createIllustrationArchive({
      pack: makePack(),
      preparedAssets: PREPARED,
      originalAssets: ORIGINAL,
    });
    expect(second).toEqual(first);
  });

  it("rejects missing prepared and original assets", () => {
    expect(() =>
      createIllustrationArchive({
        pack: makePack(),
        preparedAssets: new Map(),
        originalAssets: ORIGINAL,
      }),
    ).toThrow(/missing from the archive/);

    expect(() =>
      createIllustrationArchive({
        pack: makePack(),
        preparedAssets: PREPARED,
        originalAssets: new Map(),
      }),
    ).toThrow(/Original asset/);
  });

  it("supports packs without embedded original sources", () => {
    const bytes = createIllustrationArchive({
      pack: makePack(false),
      preparedAssets: PREPARED,
    });
    expect(readIllustrationArchive(bytes).pack.parts[0]?.originalSource).toBeUndefined();
  });

  it("rejects unreadable archives, unsafe paths, and invalid manifests", () => {
    expect(() => readIllustrationArchive(new Uint8Array([1, 2, 3]))).toThrow(
      IllustrationArchiveError,
    );

    const unsafe = zipSync({
      "../evil.png": new Uint8Array([1]),
      "manifest.json": strToU8(serializeIllustrationPack(makePack(false))),
    });
    expect(() => readIllustrationArchive(unsafe)).toThrow(/unsafe path/);

    const invalid = zipSync({
      "manifest.json": strToU8("not json"),
    });
    try {
      readIllustrationArchive(invalid);
      throw new Error("Expected invalid manifest to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(IllustrationArchiveError);
      if (error instanceof IllustrationArchiveError) {
        expect(error.code).toBe("invalid_manifest");
      }
    }
  });

  it("ignores safe directory entries produced by common ZIP tools", () => {
    const bytes = zipSync({
      "manifest.json": strToU8(serializeIllustrationPack(makePack(false))),
      "assets/": new Uint8Array(0),
      "assets/body.png": new Uint8Array([1, 2, 3]),
    });
    const result = readIllustrationArchive(bytes);
    expect(result.pack.id).toBe("archive-test");
    expect(result.files.get("assets/body.png")).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("rejects archives missing referenced assets", () => {
    const bytes = zipSync({
      "manifest.json": strToU8(serializeIllustrationPack(makePack(false))),
    });
    expect(() => readIllustrationArchive(bytes)).toThrow(/missing prepared asset/);
  });
});
