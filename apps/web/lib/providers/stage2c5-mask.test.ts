import { describe, expect, it } from "vitest";

import {
  canvasToSource,
  createMask,
  cropRgba,
  extractWithMask,
  fillMaskRegion,
  maskBounds,
  maskViewport,
  paintMaskPoint,
  paintMaskSegment,
  restoreMask,
  snapshotMask,
  validateImportedMaskDimensions,
} from "./stage2c5-mask";

describe("Stage 2C.5 mask geometry", () => {
  it("maps display coordinates through zoom, pan and letterboxing into source pixels", () => {
    const viewport = {
      width: 800,
      height: 600,
      sourceWidth: 1536,
      sourceHeight: 1024,
      zoom: 2,
      panX: 40,
      panY: -20,
    };
    const rect = maskViewport(800, 600, 1536, 1024, 2, 40, -20);
    expect(rect.width).toBeGreaterThan(0);
    const source = canvasToSource(viewport, rect.x + rect.width / 2, rect.y + rect.height / 2);
    expect(source?.x).toBeCloseTo(768, 3);
    expect(source?.y).toBeCloseTo(512, 3);
    expect(canvasToSource(viewport, 5000, 5000)).toBeNull();
  });

  it("paints a soft brush and erases the same area", () => {
    const mask = createMask(64, 64);
    const rect = paintMaskPoint(
      mask,
      { x: 32, y: 32 },
      { radius: 12, hardness: 0.5, erase: false },
    );
    expect(rect.width).toBeGreaterThan(0);
    expect(mask.data[32 * 64 + 32]).toBeGreaterThan(200);
    expect(mask.data[0]).toBe(0);
    paintMaskPoint(mask, { x: 32, y: 32 }, { radius: 12, hardness: 1, erase: true });
    expect(mask.data[32 * 64 + 32]).toBe(0);
  });

  it("keeps continuous coverage across a dragged segment", () => {
    const mask = createMask(80, 80);
    paintMaskSegment(
      mask,
      { x: 10, y: 10 },
      { x: 70, y: 10 },
      {
        radius: 4,
        hardness: 0.8,
        erase: false,
      },
    );
    for (const x of [10, 20, 30, 40, 50, 60, 70]) {
      expect(mask.data[10 * 80 + x]).toBeGreaterThan(200);
    }
  });

  it("supports undo snapshots and rectangular fills", () => {
    const mask = createMask(32, 32);
    const before = snapshotMask(mask);
    fillMaskRegion(mask, { x: 4, y: 4, width: 8, height: 8 });
    expect(mask.data[8 * 32 + 8]).toBe(255);
    restoreMask(mask, before);
    expect(mask.data[8 * 32 + 8]).toBe(0);
  });
});

describe("Stage 2C.5 source-pixel extraction", () => {
  it("preserves source RGB and applies mask alpha", () => {
    const source = new Uint8ClampedArray(4 * 4);
    for (let index = 0; index < 4; index += 1) {
      source[index * 4] = 10 + index;
      source[index * 4 + 1] = 20 + index;
      source[index * 4 + 2] = 30 + index;
      source[index * 4 + 3] = 200;
    }
    const mask = createMask(2, 2);
    mask.data[0] = 255;
    mask.data[1] = 128;
    const extracted = extractWithMask(source, mask);
    expect([extracted[0], extracted[1], extracted[2], extracted[3]]).toEqual([10, 20, 30, 200]);
    expect(extracted[7]).toBe(100);
    expect([extracted[8], extracted[9], extracted[10], extracted[11]]).toEqual([0, 0, 0, 0]);
    const cropped = cropRgba(extracted, 2, 2, { x: 0, y: 0, width: 1, height: 1 });
    expect(cropped.length).toBe(4);
    expect(maskBounds(mask)?.width).toBe(2);
  });

  it("rejects imported masks with display-resolution dimensions", () => {
    expect(() => validateImportedMaskDimensions(640, 360, 1536, 1024)).toThrow(/1536×1024/);
    expect(() => validateImportedMaskDimensions(1536, 1024, 1536, 1024)).not.toThrow();
  });
});
