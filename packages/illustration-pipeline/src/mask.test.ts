import { describe, expect, it } from "vitest";

import { extractMaskedRegion, ImageImportError, type PixelBuffer } from "./index";

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

describe("constrained character mask extraction", () => {
  it("preserves selected source pixels and makes the rest transparent", () => {
    const source = makeBuffer(4, 4, (x, y) => [20 + x * 10, 40 + y * 10, 80, 200]);
    const mask = makeBuffer(4, 4, (x, y) =>
      x >= 1 && x <= 2 && y >= 1 && y <= 2 ? [255, 255, 255, 255] : [0, 0, 0, 0],
    );

    const result = extractMaskedRegion(source, mask);
    expect(result.selectedPixels).toBe(4);
    expect(result.visiblePixels).toBe(4);
    expect(result.contentBounds).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(result.sourceContentBounds).toEqual({ x: 1, y: 1, width: 2, height: 2 });
    expect(result.region).toEqual({ x: 0, y: 0, width: 4, height: 4 });

    const selectedIndex = (1 * 4 + 1) * 4;
    expect(result.pixels.data[selectedIndex]).toBe(source.data[selectedIndex]);
    expect(result.pixels.data[selectedIndex + 3]).toBe(200);

    const outsideIndex = 0;
    expect(result.pixels.data[outsideIndex + 3]).toBe(0);
    expect(result.warnings.some((warning) => warning.code === "hidden-anatomy")).toBe(true);
  });

  it("extracts a clipped region with source-coordinate bounds", () => {
    const source = makeBuffer(6, 6, (x, y) => [x * 10, y * 10, 30, 255]);
    const mask = makeBuffer(6, 6, () => [255, 255, 255, 255]);

    const result = extractMaskedRegion(source, mask, {
      region: { x: 2, y: 3, width: 2, height: 2 },
    });

    expect(result.pixels.width).toBe(2);
    expect(result.pixels.height).toBe(2);
    expect(result.region).toEqual({ x: 2, y: 3, width: 2, height: 2 });
    expect(result.contentBounds).toEqual({ x: 0, y: 0, width: 2, height: 2 });
    expect(result.sourceContentBounds).toEqual({ x: 2, y: 3, width: 2, height: 2 });
    expect(result.coverage).toBe(1);
  });

  it("reports empty masks and masks that hide no anatomy", () => {
    const source = makeBuffer(3, 3, () => [100, 100, 100, 255]);
    const emptyMask = makeBuffer(3, 3, () => [0, 0, 0, 0]);
    const empty = extractMaskedRegion(source, emptyMask);
    expect(empty.selectedPixels).toBe(0);
    expect(empty.contentBounds).toBeNull();
    expect(empty.warnings.some((warning) => warning.code === "empty-mask")).toBe(true);

    const fullMask = makeBuffer(3, 3, () => [255, 255, 255, 255]);
    const full = extractMaskedRegion(source, fullMask);
    expect(full.coverage).toBe(1);
    expect(full.warnings.some((warning) => warning.code === "near-full-mask")).toBe(true);
  });

  it("reports a selected but fully transparent source", () => {
    const source = makeBuffer(2, 2, () => [200, 100, 50, 0]);
    const mask = makeBuffer(2, 2, () => [255, 255, 255, 255]);
    const result = extractMaskedRegion(source, mask);
    expect(result.selectedPixels).toBe(4);
    expect(result.visiblePixels).toBe(0);
    expect(result.contentBounds).toBeNull();
    expect(result.warnings.some((warning) => warning.code === "empty-content")).toBe(true);
  });

  it("rejects mismatched mask dimensions", () => {
    const source = makeBuffer(2, 2, () => [0, 0, 0, 255]);
    const mask = makeBuffer(3, 3, () => [255, 255, 255, 255]);
    expect(() => extractMaskedRegion(source, mask)).toThrow(ImageImportError);
  });
});
