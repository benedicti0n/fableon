import { hexLuminance, mixHexColors } from "./color";
import { normalAt, sampleCurve, type Vec2 } from "./geometry";
import { createSeededRandom } from "./random";

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function assertPositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number; received ${value}.`);
  }
}

function assertUnitInterval(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be between 0 and 1; received ${value}.`);
  }
}

function assertHexColor(color: string): void {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error(`Expected a six-digit hex color; received "${color}".`);
  }
}

function pigmentVariant(color: string, rng: () => number, variation: number): string {
  assertUnitInterval(variation, "colorVariation");
  if (variation === 0) {
    return color;
  }

  const towardLight = hexLuminance(color) < 0.5;
  const target = towardLight ? "#fff6df" : "#201815";
  return mixHexColors(color, target, rng() * variation * 0.45);
}

export interface OrganicStrokeOptions {
  readonly seed: number;
  readonly points: readonly Vec2[];
  readonly width: number;
  readonly opacity: number;
  readonly color: string;
  readonly widthVariation?: number;
  readonly edgeIrregularity?: number;
  readonly colorVariation?: number;
  readonly samplesPerSegment?: number;
}

export interface OrganicStrokeData {
  readonly kind: "organic";
  readonly centerline: readonly Vec2[];
  readonly outline: readonly Vec2[];
  readonly color: string;
  readonly opacity: number;
  readonly width: number;
}

/**
 * Builds a tapered, irregular ribbon around a curved path. Variation is
 * derived entirely from the supplied seed and stable options.
 */
export function createOrganicStroke(options: OrganicStrokeOptions): OrganicStrokeData {
  assertPositiveFinite(options.width, "width");
  assertUnitInterval(options.opacity, "opacity");
  assertHexColor(options.color);
  const widthVariation = options.widthVariation ?? 0.24;
  const edgeIrregularity = options.edgeIrregularity ?? 0.28;
  const colorVariation = options.colorVariation ?? 0.12;
  assertUnitInterval(widthVariation, "widthVariation");
  assertUnitInterval(edgeIrregularity, "edgeIrregularity");
  assertUnitInterval(colorVariation, "colorVariation");
  if (options.points.length < 2) {
    throw new Error("An organic stroke requires at least two control points.");
  }

  const rng = createSeededRandom(options.seed);
  const centerline = sampleCurve(options.points, options.samplesPerSegment ?? 16);
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  const lastIndex = centerline.length - 1;

  centerline.forEach((point, index) => {
    const previous = centerline[Math.max(index - 1, 0)] as Vec2;
    const next = centerline[Math.min(index + 1, lastIndex)] as Vec2;
    const normal = normalAt(previous, next);
    const progress = lastIndex === 0 ? 0 : index / lastIndex;
    const taper = 0.38 + 0.62 * Math.sin(Math.PI * progress);
    const pressure = taper * (1 + (rng() * 2 - 1) * widthVariation);
    const halfWidth = Math.max((options.width * pressure) / 2, 0.2);
    const leftEdge = (rng() * 2 - 1) * edgeIrregularity * options.width * 0.18;
    const rightEdge = (rng() * 2 - 1) * edgeIrregularity * options.width * 0.18;

    left.push({
      x: point.x + normal.x * (halfWidth + leftEdge),
      y: point.y + normal.y * (halfWidth + leftEdge),
    });
    right.push({
      x: point.x - normal.x * (halfWidth + rightEdge),
      y: point.y - normal.y * (halfWidth + rightEdge),
    });
  });

  return Object.freeze({
    kind: "organic",
    centerline,
    outline: [...left, ...right.reverse()],
    color: pigmentVariant(options.color, rng, colorVariation),
    opacity: options.opacity,
    width: options.width,
  });
}

/** Draws a generated organic stroke into a real Canvas 2D context. */
export function renderOrganicStroke(
  context: CanvasRenderingContext2D,
  data: OrganicStrokeData,
): void {
  const first = data.outline[0];
  if (!first) {
    return;
  }

  context.save();
  try {
    context.globalAlpha = data.opacity;
    context.fillStyle = data.color;
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (const point of data.outline.slice(1)) {
      context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.fill();
  } finally {
    context.restore();
  }
}

export interface DryBrushOptions {
  readonly seed: number;
  readonly points: readonly Vec2[];
  readonly width: number;
  readonly opacity: number;
  readonly color: string;
  readonly bristles?: number;
  readonly gapRatio?: number;
  readonly jitter?: number;
  readonly samplesPerSegment?: number;
}

export interface DryBrushBristle {
  readonly width: number;
  readonly alpha: number;
  readonly segments: readonly (readonly Vec2[])[];
}

export interface DryBrushData {
  readonly kind: "dryBrush";
  readonly color: string;
  readonly opacity: number;
  readonly bristles: readonly DryBrushBristle[];
}

/**
 * Builds bristle-structured, broken pigment lines along a curved path. Gaps
 * belong to individual bristles rather than being independent random dots.
 */
export function createDryBrush(options: DryBrushOptions): DryBrushData {
  assertPositiveFinite(options.width, "width");
  assertUnitInterval(options.opacity, "opacity");
  assertHexColor(options.color);
  if (options.points.length < 2) {
    throw new Error("A dry brush stroke requires at least two control points.");
  }

  const bristleCount = options.bristles ?? 11;
  if (!Number.isInteger(bristleCount) || bristleCount < 1 || bristleCount > 64) {
    throw new Error("bristles must be an integer between 1 and 64.");
  }
  const gapRatio = options.gapRatio ?? 0.32;
  const jitter = options.jitter ?? 0.25;
  assertUnitInterval(gapRatio, "gapRatio");
  assertUnitInterval(jitter, "jitter");

  const rng = createSeededRandom(options.seed);
  const centerline = sampleCurve(options.points, options.samplesPerSegment ?? 14);
  const lastIndex = centerline.length - 1;
  const bristles: DryBrushBristle[] = [];

  for (let bristleIndex = 0; bristleIndex < bristleCount; bristleIndex += 1) {
    const offset = (rng() * 2 - 1) * options.width * 0.5;
    const bristleWidth = Math.max((options.width / bristleCount) * (0.5 + rng()), 0.25);
    const alpha = 0.25 + rng() * 0.75;
    const segments: Vec2[][] = [];
    let current: Vec2[] = [];

    centerline.forEach((point, index) => {
      const previous = centerline[Math.max(index - 1, 0)] as Vec2;
      const next = centerline[Math.min(index + 1, lastIndex)] as Vec2;
      const normal = normalAt(previous, next);
      const localOffset = offset + (rng() * 2 - 1) * jitter * options.width * 0.12;

      if (rng() < gapRatio) {
        if (current.length >= 2) {
          segments.push(current);
        }
        current = [];
        return;
      }

      current.push({
        x: point.x + normal.x * localOffset,
        y: point.y + normal.y * localOffset,
      });
    });

    if (current.length >= 2) {
      segments.push(current);
    }

    bristles.push({
      width: bristleWidth,
      alpha,
      segments,
    });
  }

  return Object.freeze({
    kind: "dryBrush",
    color: pigmentVariant(options.color, rng, 0.08),
    opacity: options.opacity,
    bristles,
  });
}

/** Draws dry-brush bristles into a real Canvas 2D context. */
export function renderDryBrush(context: CanvasRenderingContext2D, data: DryBrushData): void {
  context.save();
  try {
    context.strokeStyle = data.color;
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const bristle of data.bristles) {
      context.lineWidth = bristle.width;
      context.globalAlpha = clamp01(data.opacity * bristle.alpha);

      for (const segment of bristle.segments) {
        const first = segment[0];
        if (!first) {
          continue;
        }
        context.beginPath();
        context.moveTo(first.x, first.y);
        for (const point of segment.slice(1)) {
          context.lineTo(point.x, point.y);
        }
        context.stroke();
      }
    }
  } finally {
    context.restore();
  }
}

export interface WashOptions {
  readonly seed: number;
  readonly center: Vec2;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly color: string;
  readonly opacity: number;
  readonly lobes?: number;
  readonly irregularity?: number;
  readonly granulation?: number;
}

export interface WashLobe {
  readonly outline: readonly Vec2[];
  readonly color: string;
  readonly alpha: number;
}

export interface WashGranule {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly alpha: number;
  readonly light: boolean;
}

export interface WashData {
  readonly kind: "wash";
  readonly opacity: number;
  readonly lobes: readonly WashLobe[];
  readonly granules: readonly WashGranule[];
}

function createBlobOutline(
  center: Vec2,
  radiusX: number,
  radiusY: number,
  irregularity: number,
  rng: () => number,
): Vec2[] {
  const points: Vec2[] = [];
  const pointCount = 30;

  for (let index = 0; index < pointCount; index += 1) {
    const angle = (index / pointCount) * Math.PI * 2;
    const radius = 1 + (rng() * 2 - 1) * irregularity * 0.45;
    points.push({
      x: center.x + Math.cos(angle) * radiusX * radius,
      y: center.y + Math.sin(angle) * radiusY * radius,
    });
  }

  return points;
}

/**
 * Builds layered translucent pigment lobes with irregular edges and seeded
 * granulation. This is an approximation, not a fluid simulation.
 */
export function createWash(options: WashOptions): WashData {
  assertPositiveFinite(options.radiusX, "radiusX");
  assertPositiveFinite(options.radiusY, "radiusY");
  assertUnitInterval(options.opacity, "opacity");
  assertHexColor(options.color);
  const lobeCount = options.lobes ?? 3;
  if (!Number.isInteger(lobeCount) || lobeCount < 1 || lobeCount > 12) {
    throw new Error("lobes must be an integer between 1 and 12.");
  }
  const irregularity = options.irregularity ?? 0.25;
  const granulation = options.granulation ?? 0.12;
  assertUnitInterval(irregularity, "irregularity");
  assertUnitInterval(granulation, "granulation");

  const rng = createSeededRandom(options.seed);
  const lobes: WashLobe[] = [];

  for (let index = 0; index < lobeCount; index += 1) {
    const center = {
      x: options.center.x + (rng() * 2 - 1) * options.radiusX * 0.12,
      y: options.center.y + (rng() * 2 - 1) * options.radiusY * 0.12,
    };
    const radiusX = options.radiusX * (0.78 + rng() * 0.32);
    const radiusY = options.radiusY * (0.78 + rng() * 0.32);

    lobes.push({
      outline: createBlobOutline(center, radiusX, radiusY, irregularity, rng),
      color: pigmentVariant(options.color, rng, 0.16),
      alpha: 0.28 + rng() * 0.42,
    });
  }

  const granuleCount = Math.min(
    280,
    Math.floor((Math.PI * options.radiusX * options.radiusY * granulation) / 180),
  );
  const granules: WashGranule[] = [];

  for (let index = 0; index < granuleCount; index += 1) {
    const angle = rng() * Math.PI * 2;
    const radial = Math.sqrt(rng()) * 0.85;
    granules.push({
      x: options.center.x + Math.cos(angle) * options.radiusX * radial,
      y: options.center.y + Math.sin(angle) * options.radiusY * radial,
      size: 0.6 + rng() * 2.2,
      alpha: 0.04 + rng() * 0.16,
      light: rng() > 0.45,
    });
  }

  return Object.freeze({
    kind: "wash",
    opacity: options.opacity,
    lobes,
    granules,
  });
}

/** Draws layered wash lobes and granulation into a real Canvas 2D context. */
export function renderWash(context: CanvasRenderingContext2D, data: WashData): void {
  context.save();
  try {
    for (const lobe of data.lobes) {
      const first = lobe.outline[0];
      if (!first) {
        continue;
      }

      context.globalAlpha = clamp01(data.opacity * lobe.alpha);
      context.fillStyle = lobe.color;
      context.beginPath();
      context.moveTo(first.x, first.y);
      for (const point of lobe.outline.slice(1)) {
        context.lineTo(point.x, point.y);
      }
      context.closePath();
      context.fill();
    }

    for (const granule of data.granules) {
      context.globalAlpha = clamp01(data.opacity * granule.alpha);
      context.fillStyle = granule.light ? "#f6e7c8" : "#241b17";
      context.fillRect(granule.x, granule.y, granule.size, granule.size);
    }
  } finally {
    context.restore();
  }
}
