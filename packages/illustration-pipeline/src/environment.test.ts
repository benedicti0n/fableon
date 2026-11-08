import { describe, expect, it } from "vitest";

import {
  analyzePixels,
  assignEnvironmentLayer,
  createEmptyEnvironmentPack,
  createEnvironmentRenderPlan,
  EnvironmentRenderError,
  renderEnvironmentPack,
  updateEnvironmentLayerOrder,
  validateEnvironmentPreparation,
  type IllustrationPack,
  type PreparedImageImport,
} from "./index";

function makeImported(fileName: string, options: { alpha?: boolean } = {}): PreparedImageImport {
  const width = 100;
  const height = 80;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const transparent = options.alpha !== false && (x < 4 || y < 4);
      data[index] = 40 + x;
      data[index + 1] = 80 + y;
      data[index + 2] = 120;
      data[index + 3] = transparent ? 0 : 255;
    }
  }

  const pixelBuffer = { width, height, data };
  const analysis = analyzePixels(pixelBuffer);

  return {
    inspection: {
      fileName,
      mimeType: "image/png",
      format: "png",
      width,
      height,
      fileSize: 200,
      sourceHash: "c".repeat(64),
      analysis,
      warnings: analysis.warnings,
    },
    preparedBlob: new Blob(),
    preparedBytes: new Uint8Array([1, 2]),
    preparedHash: "d".repeat(64),
    preparedWidth: width,
    preparedHeight: height,
    preparedOffsetX: 0,
    preparedOffsetY: 0,
    trim: {
      width,
      height,
      data,
      offsetX: 0,
      offsetY: 0,
      applied: false,
      contentBounds: { x: 0, y: 0, width, height },
    },
  };
}

function makeEnvironmentPack(): IllustrationPack {
  let pack = createEmptyEnvironmentPack({
    id: "forest-plate",
    name: "Forest Plate",
    canvas: { width: 1920, height: 1080 },
  });
  pack = assignEnvironmentLayer(pack, {
    role: "sky",
    imported: makeImported("sky.png", { alpha: false }),
    registration: { x: 0, y: 0 },
  });
  pack = assignEnvironmentLayer(pack, {
    role: "distant-forest",
    imported: makeImported("distant.png"),
    registration: { x: 200, y: 100 },
  });
  pack = assignEnvironmentLayer(pack, {
    role: "landing-branch",
    imported: makeImported("branch.png"),
    registration: { x: 500, y: 800 },
    transform: {
      x: 10,
      y: 20,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 0.8,
    },
  });
  return pack;
}

describe("layered environment packs", () => {
  it("accepts a single polished background plate as a valid pack", () => {
    let pack = createEmptyEnvironmentPack({ id: "single", name: "Single Plate" });
    pack = assignEnvironmentLayer(pack, {
      role: "sky",
      imported: makeImported("plate.png", { alpha: false }),
    });

    const report = validateEnvironmentPreparation(pack);
    expect(report.ready).toBe(true);
    expect(report.missingRecommendedRoles).toContain("landing-branch");
    expect(report.issues.every((issue) => issue.severity !== "error")).toBe(true);

    const plan = createEnvironmentRenderPlan(pack);
    expect(plan).toHaveLength(1);
    expect(plan[0]?.part.id).toBe("sky");
  });

  it("requires a background and rejects opaque foreground/atmosphere layers", () => {
    const empty = validateEnvironmentPreparation(
      createEmptyEnvironmentPack({ id: "empty", name: "Empty" }),
    );
    expect(empty.ready).toBe(false);
    expect(empty.issues.some((issue) => issue.code === "missing-background")).toBe(true);

    let opaqueForeground = createEmptyEnvironmentPack({ id: "fg", name: "FG" });
    opaqueForeground = assignEnvironmentLayer(opaqueForeground, {
      role: "sky",
      imported: makeImported("sky.png", { alpha: false }),
    });
    opaqueForeground = assignEnvironmentLayer(opaqueForeground, {
      role: "foreground-trees",
      imported: makeImported("fg.png", { alpha: false }),
    });
    const report = validateEnvironmentPreparation(opaqueForeground);
    expect(report.ready).toBe(false);
    expect(report.issues.some((issue) => issue.code === "opaque-overlay")).toBe(true);
  });

  it("orders layers by explicit depth and preserves registration and transforms", () => {
    const pack = makeEnvironmentPack();
    const report = validateEnvironmentPreparation(pack);
    expect(report.ready).toBe(true);

    const plan = createEnvironmentRenderPlan(pack);
    expect(plan.map((command) => command.part.id)).toEqual([
      "sky",
      "distant-forest",
      "landing-branch",
    ]);

    const branch = plan.find((command) => command.part.id === "landing-branch");
    expect(branch?.x).toBe(510);
    expect(branch?.y).toBe(820);
    expect(branch?.transform.opacity).toBe(0.8);
    expect(branch?.width).toBe(100);
    expect(branch?.height).toBe(80);
  });

  it("supports explicit layer reordering", () => {
    const pack = makeEnvironmentPack();
    const reordered = updateEnvironmentLayerOrder(pack, "sky", 70);
    const plan = createEnvironmentRenderPlan(reordered);
    expect(plan.at(-1)?.part.id).toBe("sky");
  });

  it("composes layers through Canvas draw calls in the planned order", () => {
    const pack = makeEnvironmentPack();
    const images = new Map<string, CanvasImageSource>([
      ["sky", {} as CanvasImageSource],
      ["distant-forest", {} as CanvasImageSource],
      ["landing-branch", {} as CanvasImageSource],
    ]);
    const calls: string[] = [];
    const context = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      globalAlpha: 1,
      save() {},
      restore() {},
      translate(x: number, y: number) {
        calls.push(`translate:${x},${y}`);
      },
      rotate() {},
      scale() {},
      drawImage() {
        calls.push("draw");
      },
    } as unknown as CanvasRenderingContext2D;

    const plan = renderEnvironmentPack(context, pack, images);
    expect(plan).toHaveLength(3);
    expect(calls).toEqual([
      "translate:0,0",
      "draw",
      "translate:200,100",
      "draw",
      "translate:510,820",
      "draw",
    ]);
  });

  it("fails loudly when a decoded layer image is missing", () => {
    const pack = makeEnvironmentPack();
    const images = new Map<string, CanvasImageSource>([["sky", {} as CanvasImageSource]]);
    expect(() =>
      renderEnvironmentPack({} as unknown as CanvasRenderingContext2D, pack, images),
    ).toThrow(EnvironmentRenderError);
  });

  it("warns about opaque props, depth deviations, and missing hashes", () => {
    const pack = makeEnvironmentPack();
    const changed = {
      ...pack,
      parts: pack.parts.map((part) => {
        if (part.id === "landing-branch") {
          return { ...part, alpha: "opaque" as const, zIndex: 41 };
        }
        const copy = { ...part };
        delete copy.hashes;
        return copy;
      }),
    };
    const report = validateEnvironmentPreparation(changed);
    expect(report.ready).toBe(true);
    expect(report.issues.some((issue) => issue.code === "opaque-prop")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "depth-order-differs")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "missing-hash")).toBe(true);
  });
});
