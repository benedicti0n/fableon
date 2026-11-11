export interface MaskPlane {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface MaskPoint {
  readonly x: number;
  readonly y: number;
}

export interface MaskViewport {
  readonly width: number;
  readonly height: number;
  readonly sourceWidth: number;
  readonly sourceHeight: number;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export interface CanvasRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BrushOptions {
  readonly radius: number;
  readonly hardness: number;
  readonly erase: boolean;
  readonly flow?: number;
}

export function createMask(width: number, height: number, fill = 0): MaskPlane {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Mask dimensions must be positive integers.");
  }
  const data = new Uint8ClampedArray(width * height);
  if (fill !== 0) data.fill(fill);
  return { width, height, data };
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function maskViewport(
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  zoom: number,
  panX: number,
  panY: number,
  padding = 20,
): CanvasRect & { readonly scale: number } {
  const availableWidth = Math.max(1, width - padding * 2);
  const availableHeight = Math.max(1, height - padding * 2);
  const fit = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
  const scale = fit * Math.max(0.05, zoom);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  return {
    x: (width - drawWidth) / 2 + panX,
    y: (height - drawHeight) / 2 + panY,
    width: drawWidth,
    height: drawHeight,
    scale,
  };
}

export function canvasToSource(
  viewport: MaskViewport,
  x: number,
  y: number,
  padding = 20,
): MaskPoint | null {
  const rect = maskViewport(
    viewport.width,
    viewport.height,
    viewport.sourceWidth,
    viewport.sourceHeight,
    viewport.zoom,
    viewport.panX,
    viewport.panY,
    padding,
  );
  const sourceX = (x - rect.x) / rect.scale;
  const sourceY = (y - rect.y) / rect.scale;
  if (
    sourceX < 0 ||
    sourceY < 0 ||
    sourceX >= viewport.sourceWidth ||
    sourceY >= viewport.sourceHeight
  ) {
    return null;
  }
  return { x: sourceX, y: sourceY };
}

function brushCoverage(distance: number, radius: number, hardness: number): number {
  if (distance > radius) return 0;
  const safeHardness = clamp(hardness, 0, 1);
  if (safeHardness >= 0.999) return 1;
  const solid = radius * safeHardness;
  if (distance <= solid) return 1;
  return clamp((radius - distance) / Math.max(0.0001, radius - solid), 0, 1);
}

export function paintMaskPoint(
  mask: MaskPlane,
  point: MaskPoint,
  options: BrushOptions,
): CanvasRect {
  const radius = Math.max(0.5, options.radius);
  const flow = clamp(options.flow ?? 1, 0, 1);
  const minX = Math.max(0, Math.floor(point.x - radius));
  const maxX = Math.min(mask.width - 1, Math.ceil(point.x + radius));
  const minY = Math.max(0, Math.floor(point.y - radius));
  const maxY = Math.min(mask.height - 1, Math.ceil(point.y + radius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = Math.hypot(x + 0.5 - point.x, y + 0.5 - point.y);
      const coverage = brushCoverage(distance, radius, options.hardness) * flow;
      if (coverage <= 0) continue;
      const index = y * mask.width + x;
      const amount = Math.round(coverage * 255);
      if (options.erase) {
        mask.data[index] = Math.max(0, (mask.data[index] ?? 0) - amount);
      } else {
        mask.data[index] = Math.max(mask.data[index] ?? 0, amount);
      }
    }
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX + 1),
    height: Math.max(0, maxY - minY + 1),
  };
}

export function paintMaskSegment(
  mask: MaskPlane,
  from: MaskPoint,
  to: MaskPoint,
  options: BrushOptions,
): CanvasRect {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const step = Math.max(0.6, options.radius * 0.25);
  const steps = Math.max(1, Math.ceil(distance / step));
  let minX = mask.width;
  let minY = mask.height;
  let maxX = -1;
  let maxY = -1;
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const rect = paintMaskPoint(
      mask,
      { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
      options,
    );
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: Math.max(0, maxX - Math.max(0, minX)),
    height: Math.max(0, maxY - Math.max(0, minY)),
  };
}

export function maskBounds(mask: MaskPlane, threshold = 8): CanvasRect | null {
  let minX = mask.width;
  let minY = mask.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if ((mask.data[y * mask.width + x] ?? 0) <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function extractWithMask(source: Uint8ClampedArray, mask: MaskPlane): Uint8ClampedArray {
  if (source.length !== mask.width * mask.height * 4) {
    throw new Error("Source RGBA and mask dimensions do not match.");
  }
  const output = new Uint8ClampedArray(source.length);
  for (let index = 0; index < mask.data.length; index += 1) {
    const sourceOffset = index * 4;
    const alpha = Math.round(((source[sourceOffset + 3] ?? 0) * (mask.data[index] ?? 0)) / 255);
    if (alpha === 0) continue;
    output[sourceOffset] = source[sourceOffset] ?? 0;
    output[sourceOffset + 1] = source[sourceOffset + 1] ?? 0;
    output[sourceOffset + 2] = source[sourceOffset + 2] ?? 0;
    output[sourceOffset + 3] = alpha;
  }
  return output;
}

export function cropRgba(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  box: CanvasRect,
): Uint8ClampedArray {
  if (box.width <= 0 || box.height <= 0) throw new Error("Crop box is empty.");
  if (box.x < 0 || box.y < 0 || box.x + box.width > width || box.y + box.height > height) {
    throw new Error("Crop box is outside the source image.");
  }
  const output = new Uint8ClampedArray(box.width * box.height * 4);
  for (let y = 0; y < box.height; y += 1) {
    const sourceStart = ((box.y + y) * width + box.x) * 4;
    output.set(source.subarray(sourceStart, sourceStart + box.width * 4), y * box.width * 4);
  }
  return output;
}

export function validateImportedMaskDimensions(
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
): void {
  if (width !== sourceWidth || height !== sourceHeight) {
    throw new Error(
      `Imported mask is ${width}×${height}; source requires ${sourceWidth}×${sourceHeight}.`,
    );
  }
}

export function snapshotMask(mask: MaskPlane): Uint8ClampedArray {
  return new Uint8ClampedArray(mask.data);
}

export function restoreMask(mask: MaskPlane, snapshot: Uint8ClampedArray): void {
  if (snapshot.length !== mask.data.length) throw new Error("Mask snapshots have different sizes.");
  mask.data.set(snapshot);
}

export function fillMaskRegion(mask: MaskPlane, box: CanvasRect, value = 255): void {
  for (let y = Math.max(0, box.y); y < Math.min(mask.height, box.y + box.height); y += 1) {
    for (let x = Math.max(0, box.x); x < Math.min(mask.width, box.x + box.width); x += 1) {
      mask.data[y * mask.width + x] = value;
    }
  }
}
