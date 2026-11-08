import { createSeededRandom } from "./random";

export interface PaperGrainOptions {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  /** Specks per pixel. Typical illustrations use 0.0004–0.0015. */
  readonly density?: number;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly opacity?: number;
}

export interface GrainSpeck {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly alpha: number;
  readonly light: boolean;
}

export interface PaperGrainData {
  readonly kind: "paperGrain";
  readonly width: number;
  readonly height: number;
  readonly specks: readonly GrainSpeck[];
}

/**
 * Generates a stable, seeded paper-grain field. The same seed and dimensions
 * always produce the same specks, so baked artwork and future per-frame effects
 * do not flicker.
 */
export function createPaperGrain(options: PaperGrainOptions): PaperGrainData {
  if (
    !Number.isInteger(options.width) ||
    !Number.isInteger(options.height) ||
    options.width <= 0 ||
    options.height <= 0
  ) {
    throw new Error("Paper grain dimensions must be positive integers.");
  }

  const density = options.density ?? 0.0008;
  const minSize = options.minSize ?? 0.6;
  const maxSize = options.maxSize ?? 2.2;
  const opacity = options.opacity ?? 1;

  if (!Number.isFinite(density) || density < 0) {
    throw new Error("density must be a non-negative finite number.");
  }
  if (!Number.isFinite(minSize) || !Number.isFinite(maxSize) || minSize <= 0 || maxSize < minSize) {
    throw new Error("Grain sizes must be positive and maxSize must be >= minSize.");
  }
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error("opacity must be between 0 and 1.");
  }

  const count = Math.min(50_000, Math.floor(options.width * options.height * density));
  const rng = createSeededRandom(options.seed);
  const specks: GrainSpeck[] = [];

  for (let index = 0; index < count; index += 1) {
    specks.push({
      x: rng() * options.width,
      y: rng() * options.height,
      size: minSize + rng() * (maxSize - minSize),
      alpha: opacity * (0.025 + rng() * 0.11),
      light: rng() > 0.36,
    });
  }

  return Object.freeze({
    kind: "paperGrain",
    width: options.width,
    height: options.height,
    specks,
  });
}

/** Draws the generated grain into a real Canvas 2D context. */
export function renderPaperGrain(
  context: CanvasRenderingContext2D,
  data: PaperGrainData,
  opacityMultiplier = 1,
): void {
  context.save();
  try {
    for (const speck of data.specks) {
      context.globalAlpha = Math.min(Math.max(speck.alpha * opacityMultiplier, 0), 1);
      context.fillStyle = speck.light ? "#f5e8cf" : "#191411";
      context.fillRect(speck.x, speck.y, speck.size, speck.size);
    }
  } finally {
    context.restore();
  }
}
