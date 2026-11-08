import { describe, expect, it, vi } from "vitest";

import {
  createDryBrush,
  createOrganicStroke,
  createPaperGrain,
  createSeededRandom,
  createWash,
  derivePaintSeed,
  hashSeed,
  mixHexColors,
  normalAt,
  renderDryBrush,
  renderOrganicStroke,
  renderPaperGrain,
  renderWash,
  sampleCurve,
} from "./index";

function noRandom<T>(action: () => T): T {
  const spy = vi.spyOn(Math, "random");
  try {
    return action();
  } finally {
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  }
}

describe("seeded randomness", () => {
  it("produces a stable sequence for the same seed", () => {
    const first = createSeededRandom(12345);
    const second = createSeededRandom(12345);

    const firstValues = [first(), first(), first(), first()];
    const secondValues = [second(), second(), second(), second()];

    expect(firstValues).toEqual(secondValues);
    expect(firstValues.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it("produces different sequences for different seeds", () => {
    const first = createSeededRandom(1);
    const second = createSeededRandom(2);

    expect([first(), first(), first()]).not.toEqual([second(), second(), second()]);
  });

  it("derives stable seeds from explicit identifiers", () => {
    expect(hashSeed(["scene", 1, "bird"])).toBe(hashSeed(["scene", 1, "bird"]));
    expect(hashSeed(["scene", 1, "bird"])).not.toBe(hashSeed(["scene", 2, "bird"]));
    expect(derivePaintSeed(100, "dawn", "bird", "wing")).toBe(
      derivePaintSeed(100, "dawn", "bird", "wing"),
    );
  });
});

describe("geometry and color", () => {
  it("samples a straight two-point path exactly", () => {
    const points = sampleCurve(
      [
        { x: 0, y: 0 },
        { x: 10, y: 20 },
      ],
      2,
    );

    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 10 },
      { x: 10, y: 20 },
    ]);
  });

  it("computes perpendicular normals", () => {
    const normal = normalAt({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(normal.x).toBeCloseTo(0, 10);
    expect(normal.y).toBe(1);
  });

  it("mixes colors predictably", () => {
    expect(mixHexColors("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHexColors("#ff0000", "#0000ff", 0)).toBe("#ff0000");
    expect(mixHexColors("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });
});

describe("organic stroke", () => {
  const options = {
    seed: 42,
    points: [
      { x: 20, y: 80 },
      { x: 110, y: 30 },
      { x: 220, y: 100 },
    ],
    width: 24,
    opacity: 0.8,
    color: "#3d5a45",
    widthVariation: 0.3,
    edgeIrregularity: 0.35,
    colorVariation: 0.2,
  } as const;

  it("produces identical stroke geometry for the same seed", () => {
    expect(noRandom(() => createOrganicStroke(options))).toEqual(createOrganicStroke(options));
  });

  it("varies deterministically with a different seed", () => {
    const first = createOrganicStroke(options);
    const second = createOrganicStroke({ ...options, seed: 43 });

    expect(second).not.toEqual(first);
    expect(second.opacity).toBe(options.opacity);
    expect(second.outline.length).toBe(first.outline.length);
  });

  it("validates width, opacity, color, and point count", () => {
    expect(() => createOrganicStroke({ ...options, width: 0 })).toThrow();
    expect(() => createOrganicStroke({ ...options, opacity: 1.2 })).toThrow();
    expect(() => createOrganicStroke({ ...options, color: "green" })).toThrow();
    expect(() => createOrganicStroke({ ...options, points: [{ x: 0, y: 0 }] })).toThrow();
  });

  it("renders into a canvas context", () => {
    const context = createMockContext();
    const data = createOrganicStroke(options);

    renderOrganicStroke(context as unknown as CanvasRenderingContext2D, data);

    expect(context.fill).toHaveBeenCalled();
    expect(context.beginPath).toHaveBeenCalled();
    expect(context.closePath).toHaveBeenCalled();
    expect(context.save).toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalled();
  });
});

describe("dry brush", () => {
  const points = [
    { x: 20, y: 120 },
    { x: 120, y: 100 },
    { x: 220, y: 112 },
  ] as const;

  it("produces stable bristle structure", () => {
    const first = noRandom(() =>
      createDryBrush({
        seed: 7,
        points,
        width: 32,
        opacity: 0.65,
        color: "#6e8062",
        bristles: 9,
        gapRatio: 0.4,
      }),
    );
    const second = createDryBrush({
      seed: 7,
      points,
      width: 32,
      opacity: 0.65,
      color: "#6e8062",
      bristles: 9,
      gapRatio: 0.4,
    });

    expect(first).toEqual(second);
    expect(first.bristles).toHaveLength(9);
    expect(first.bristles.some((bristle) => bristle.segments.length > 1)).toBe(true);
    expect(first.bristles.every((bristle) => bristle.width > 0)).toBe(true);
  });

  it("varies with seed and validates parameters", () => {
    expect(
      createDryBrush({ seed: 7, points, width: 32, opacity: 0.65, color: "#6e8062" }),
    ).not.toEqual(createDryBrush({ seed: 8, points, width: 32, opacity: 0.65, color: "#6e8062" }));
    expect(() =>
      createDryBrush({ seed: 7, points, width: 32, opacity: 0.65, color: "#6e8062", bristles: 0 }),
    ).toThrow();
    expect(() =>
      createDryBrush({ seed: 7, points, width: 32, opacity: 0.65, color: "#6e8062", gapRatio: 2 }),
    ).toThrow();
  });

  it("renders broken bristle paths", () => {
    const context = createMockContext();
    const data = createDryBrush({
      seed: 7,
      points,
      width: 32,
      opacity: 0.65,
      color: "#6e8062",
    });

    renderDryBrush(context as unknown as CanvasRenderingContext2D, data);

    expect(context.stroke.mock.calls.length).toBeGreaterThan(0);
    expect(context.lineTo.mock.calls.length).toBeGreaterThan(0);
  });
});

describe("wash", () => {
  const options = {
    seed: 99,
    center: { x: 400, y: 300 },
    radiusX: 260,
    radiusY: 150,
    color: "#9a7f53",
    opacity: 0.35,
    lobes: 4,
    irregularity: 0.35,
    granulation: 0.6,
  } as const;

  it("creates stable layered lobes and granulation", () => {
    const first = noRandom(() => createWash(options));
    const second = createWash(options);

    expect(first).toEqual(second);
    expect(first.lobes).toHaveLength(4);
    expect(first.granules.length).toBeGreaterThan(0);
    expect(first.granules.every((granule) => granule.alpha > 0 && granule.alpha < 1)).toBe(true);
  });

  it("varies with seed and validates ranges", () => {
    expect(createWash({ ...options, seed: 100 })).not.toEqual(createWash(options));
    expect(() => createWash({ ...options, radiusX: 0 })).toThrow();
    expect(() => createWash({ ...options, opacity: 2 })).toThrow();
    expect(() => createWash({ ...options, lobes: 0 })).toThrow();
  });

  it("renders lobes and granules", () => {
    const context = createMockContext();
    renderWash(context as unknown as CanvasRenderingContext2D, createWash(options));

    expect(context.fill).toHaveBeenCalled();
    expect(context.fillRect).toHaveBeenCalled();
  });
});

describe("paper grain", () => {
  it("creates a stable seeded speck field", () => {
    const options = { seed: 2026, width: 320, height: 180, density: 0.002, opacity: 0.8 } as const;
    const first = noRandom(() => createPaperGrain(options));
    const second = createPaperGrain(options);

    expect(first).toEqual(second);
    expect(first.specks).toHaveLength(115);
    expect(first.specks.every((speck) => speck.x >= 0 && speck.x < 320)).toBe(true);
    expect(first.specks.every((speck) => speck.y >= 0 && speck.y < 180)).toBe(true);
    expect(first.specks.every((speck) => speck.alpha > 0 && speck.alpha < 1)).toBe(true);
  });

  it("varies with seed and supports empty density", () => {
    expect(createPaperGrain({ seed: 1, width: 50, height: 50, density: 0.01 })).not.toEqual(
      createPaperGrain({ seed: 2, width: 50, height: 50, density: 0.01 }),
    );
    expect(createPaperGrain({ seed: 1, width: 50, height: 50, density: 0 })).toMatchObject({
      specks: [],
    });
  });

  it("validates dimensions and ranges", () => {
    expect(() => createPaperGrain({ seed: 1, width: 0, height: 50 })).toThrow();
    expect(() => createPaperGrain({ seed: 1, width: 50, height: 50, density: -1 })).toThrow();
    expect(() => createPaperGrain({ seed: 1, width: 50, height: 50, opacity: 2 })).toThrow();
  });

  it("renders grain specks", () => {
    const context = createMockContext();
    renderPaperGrain(
      context as unknown as CanvasRenderingContext2D,
      createPaperGrain({ seed: 1, width: 120, height: 80, density: 0.01 }),
    );

    expect(context.fillRect.mock.calls.length).toBeGreaterThan(0);
  });
});

interface MockCanvasContext {
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  globalAlpha: number;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
}

function createMockContext(): MockCanvasContext {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    globalAlpha: 1,
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineCap: "round",
    lineJoin: "round",
  };
}
