import { describe, expect, test } from "vitest";

import { placeFrame } from "./placement";

describe("Rigby2D frame placement", () => {
  const base = {
    frameWidth: 421,
    frameHeight: 972,
    pivot: { x: 0.5012, y: 1.0473 },
    actor: { x: 960, y: 1040, scale: 0.9 },
    camera: { centerX: 960, centerY: 540, zoom: 1 },
    viewport: { width: 1920, height: 1080 },
  } as const;

  test("places the skeleton origin at the Fableon actor anchor", () => {
    const placement = placeFrame(base);
    expect(placement.anchorX).toBe(960);
    expect(placement.anchorY).toBe(1040);
    expect(placement.originX).toBeCloseTo(0.5012 * 421, 5);
    expect(placement.originY).toBeCloseTo(1.0473 * 972, 5);
    expect(placement.drawX).toBeCloseTo(960 - placement.originX * 0.9, 5);
    expect(placement.drawY).toBeCloseTo(1040 - placement.originY * 0.9, 5);
    expect(placement.drawWidth).toBeCloseTo(421 * 0.9, 5);
    expect(placement.drawHeight).toBeCloseTo(972 * 0.9, 5);
  });

  test("does not center the cropped PNG independently", () => {
    const placement = placeFrame(base);
    const naiveCenterX = 960 - (421 * 0.9) / 2;
    expect(placement.drawX).not.toBeCloseTo(naiveCenterX, 2);
  });

  test("camera zoom scales the actor and its placement around the same origin", () => {
    const zoomed = placeFrame({ ...base, camera: { ...base.camera, zoom: 2 } });
    expect(zoomed.anchorX).toBe(960);
    expect(zoomed.drawWidth).toBeCloseTo(421 * 1.8, 5);
    expect(zoomed.drawHeight).toBeCloseTo(972 * 1.8, 5);
    expect(zoomed.drawX).toBeCloseTo(960 - zoomed.originX * 1.8, 5);
  });

  test("a frame pivot below the image still keeps the anchor fixed", () => {
    const placement = placeFrame(base);
    expect(base.pivot.y).toBeGreaterThan(1);
    expect(placement.drawY).toBeLessThan(1040);
  });
});
