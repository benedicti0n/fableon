import { describe, expect, it } from "vitest";

import {
  analyzePixels,
  assertPixelBuffer,
  assertSupportedImageFile,
  detectImageFormat,
  ImageImportError,
  inspectImageBlob,
  padPixels,
  prepareImageBlob,
  preparePixels,
  sha256Hex,
  trimPixels,
  type PixelBuffer,
} from "./index";

function makeBuffer(
  width: number,
  height: number,
  paint: (x: number, y: number) => readonly [number, number, number, number],
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue, alpha] = paint(x, y);
      const index = (y * width + x) * 4;
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = alpha;
    }
  }
  return { width, height, data };
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function cornerBuffer(): PixelBuffer {
  return makeBuffer(4, 4, (x, y) =>
    x >= 1 && x <= 2 && y >= 1 && y <= 2 ? [220, 80, 40, 255] : [0, 0, 0, 0],
  );
}

describe("image format validation", () => {
  it("detects PNG, JPEG, and WebP magic bytes", () => {
    expect(detectImageFormat(PNG_BYTES)).toBe("png");
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(detectImageFormat(webp)).toBe("webp");
  });

  it("rejects SVG, GIF, and malformed files with actionable errors", () => {
    expect(() =>
      assertSupportedImageFile({
        fileName: "bird.svg",
        mimeType: "image/svg+xml",
        bytes: new TextEncoder().encode("<svg></svg>"),
      }),
    ).toThrow(/SVG/);

    expect(() =>
      assertSupportedImageFile({
        fileName: "bird.gif",
        mimeType: "image/gif",
        bytes: new TextEncoder().encode("GIF89a"),
      }),
    ).toThrow(/not a supported raster image/);

    const error = (() => {
      try {
        assertSupportedImageFile({ fileName: "broken.png", bytes: new Uint8Array([1, 2, 3]) });
      } catch (caught) {
        return caught;
      }
      return null;
    })();
    expect(error).toBeInstanceOf(ImageImportError);
    if (error instanceof ImageImportError) {
      expect(error.code).toBe("unsupported_format");
    }
  });
});

describe("alpha analysis and trim", () => {
  it("finds content, opaque, and transparent bounds", () => {
    const analysis = analyzePixels(cornerBuffer());
    expect(analysis.contentBounds).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(analysis.opaqueBounds).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(analysis.transparentBounds).toEqual({ x: 0, y: 0, width: 4, height: 4 });
    expect(analysis.hasAlpha).toBe(true);
    expect(analysis.opaqueRatio).toBeCloseTo(4 / 16, 10);
    expect(analysis.transparentRatio).toBeCloseTo(12 / 16, 10);
  });

  it("trims only transparent padding and preserves visible pixels exactly", () => {
    const source = cornerBuffer();
    const trimmed = trimPixels(source);
    expect(trimmed.applied).toBe(true);
    expect(trimmed.offsetX).toBe(1);
    expect(trimmed.offsetY).toBe(1);
    expect(trimmed.width).toBe(2);
    expect(trimmed.height).toBe(2);

    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 2; x += 1) {
        for (let channel = 0; channel < 4; channel += 1) {
          const targetIndex = (y * 2 + x) * 4 + channel;
          const sourceIndex = ((y + 1) * 4 + (x + 1)) * 4 + channel;
          expect(trimmed.data[targetIndex]).toBe(source.data[sourceIndex]);
        }
      }
    }
  });

  it("keeps the prepared offset through trim and optional padding", () => {
    const trimmed = preparePixels(cornerBuffer());
    expect(trimmed.preparedOffsetX).toBe(1);
    expect(trimmed.preparedOffsetY).toBe(1);
    expect(trimmed.width).toBe(2);
    expect(trimmed.height).toBe(2);

    const padded = preparePixels(cornerBuffer(), { padding: 1 });
    expect(padded.width).toBe(4);
    expect(padded.height).toBe(4);
    expect(padded.preparedOffsetX).toBe(0);
    expect(padded.preparedOffsetY).toBe(0);
    expect(padded.data[3]).toBe(0);
    expect(padded.data[(1 * 4 + 1) * 4 + 3]).toBe(255);

    const normalized = preparePixels(cornerBuffer(), {
      targetSize: { width: 8, height: 8 },
    });
    expect(normalized.width).toBe(8);
    expect(normalized.height).toBe(8);
    expect(normalized.preparedOffsetX).toBe(-2);
    expect(normalized.preparedOffsetY).toBe(-2);
  });

  it("supports an explicit trim opt-out and a conservative threshold", () => {
    const untrimmed = preparePixels(cornerBuffer(), { trim: false });
    expect(untrimmed.width).toBe(4);
    expect(untrimmed.height).toBe(4);
    expect(untrimmed.preparedOffsetX).toBe(0);
    expect(untrimmed.trim.applied).toBe(false);

    const lowAlphaEdge = makeBuffer(4, 4, (x, y) =>
      x === 1 && y === 1
        ? [200, 100, 20, 1]
        : x === 2 && y === 2
          ? [200, 100, 20, 255]
          : [0, 0, 0, 0],
    );
    expect(trimPixels(lowAlphaEdge).width).toBe(2);
    expect(trimPixels(lowAlphaEdge, { alphaThreshold: 1 }).width).toBe(1);
  });

  it("preserves pixel data through padding and normalization", () => {
    const source = cornerBuffer();
    const padded = padPixels(source, 2);
    expect(padded.width).toBe(8);
    expect(padded.height).toBe(8);
    expect(padded.data[(3 * padded.width + 3) * 4 + 3]).toBe(255);
    expect(padded.data[(3 * padded.width + 3) * 4]).toBe(220);
    expect(padded.data[3]).toBe(0);
  });

  it("reports white halos, opaque backgrounds, and empty images", () => {
    const halo = makeBuffer(5, 5, (x, y) => {
      if (x >= 1 && x <= 3 && y >= 1 && y <= 3) {
        return x === 1 || x === 3 || y === 1 || y === 3 ? [255, 255, 255, 128] : [200, 80, 40, 255];
      }
      return [0, 0, 0, 0];
    });
    expect(analyzePixels(halo).warnings.map((warning) => warning.code)).toContain("white-halo");

    const opaque = makeBuffer(2, 2, () => [10, 20, 30, 255]);
    const opaqueWarnings = analyzePixels(opaque).warnings.map((warning) => warning.code);
    expect(opaqueWarnings).toContain("alpha-missing");
    expect(opaqueWarnings).toContain("opaque-background");

    const empty = makeBuffer(2, 2, () => [0, 0, 0, 0]);
    expect(analyzePixels(empty).warnings.map((warning) => warning.code)).toContain("empty-content");
    expect(() => trimPixels(empty)).toThrow(ImageImportError);
  });

  it("rejects malformed pixel buffers", () => {
    expect(() =>
      assertPixelBuffer({ width: 2, height: 2, data: new Uint8ClampedArray(3) }),
    ).toThrow(/expected 16/);
    expect(() =>
      assertPixelBuffer({ width: 0, height: 2, data: new Uint8ClampedArray(0) }),
    ).toThrow(/positive integers/);
  });
});

describe("image import metadata and hashing", () => {
  it("hashes source bytes with SHA-256 and returns stable metadata", async () => {
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    const decoded = cornerBuffer();
    const options = {
      fileName: "body.png",
      mimeType: "image/png",
      bytes: PNG_BYTES,
      decoder: async () => decoded,
    };
    const first = await inspectImageBlob(options);
    const second = await inspectImageBlob(options);

    expect(first.format).toBe("png");
    expect(first.width).toBe(4);
    expect(first.height).toBe(4);
    expect(first.fileSize).toBe(PNG_BYTES.byteLength);
    expect(first.sourceHash).toBe(second.sourceHash);
    expect(first.analysis.contentBounds).toEqual({ x: 1, y: 1, width: 2, height: 2 });
  });

  it("prepares a derivative with explicit offsets and a prepared hash", async () => {
    const decoded = cornerBuffer();
    const prepared = await prepareImageBlob(
      {
        fileName: "body.png",
        bytes: PNG_BYTES,
        decoder: async () => decoded,
      },
      {
        padding: 1,
        decoder: async () => decoded,
        encodePng: async (image) => {
          const buffer = new ArrayBuffer(image.data.byteLength);
          new Uint8Array(buffer).set(image.data);
          return new Blob([buffer]);
        },
      },
    );

    expect(prepared.preparedWidth).toBe(4);
    expect(prepared.preparedHeight).toBe(4);
    expect(prepared.preparedOffsetX).toBe(0);
    expect(prepared.preparedOffsetY).toBe(0);
    expect(prepared.trim.offsetX).toBe(1);
    expect(prepared.preparedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(prepared.preparedBytes.byteLength).toBe(64);
  });
});
