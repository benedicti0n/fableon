import {
  assertPixelBuffer,
  ImageImportError,
  type PixelBuffer,
  type PixelRectangle,
} from "./image";

export interface MaskExtractionOptions {
  readonly region?: PixelRectangle;
  readonly maskAlphaThreshold?: number;
}

export interface MaskWarning {
  readonly code: "empty-mask" | "empty-content" | "near-full-mask" | "hidden-anatomy";
  readonly severity: "info" | "warning";
  readonly message: string;
}

export interface MaskExtractionResult {
  /** Masked pixels in region-local coordinates. */
  readonly pixels: PixelBuffer;
  /** The source-coordinate region that was extracted. */
  readonly region: PixelRectangle;
  /** Visible bounds inside the extracted region, or null for an empty mask. */
  readonly contentBounds: PixelRectangle | null;
  /** Visible bounds in original source coordinates. */
  readonly sourceContentBounds: PixelRectangle | null;
  /** Pixels selected by the mask, including transparent source pixels. */
  readonly selectedPixels: number;
  /** Selected pixels whose source alpha is above zero. */
  readonly visiblePixels: number;
  readonly coverage: number;
  readonly warnings: readonly MaskWarning[];
}

function clippedRegion(
  width: number,
  height: number,
  region: PixelRectangle | undefined,
): PixelRectangle {
  const source = region ?? { x: 0, y: 0, width, height };
  const x = Math.max(0, Math.min(width, Math.floor(source.x)));
  const y = Math.max(0, Math.min(height, Math.floor(source.y)));
  const right = Math.max(x, Math.min(width, Math.floor(source.x + source.width)));
  const bottom = Math.max(y, Math.min(height, Math.floor(source.y + source.height)));

  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Extracts only pixels selected by a supplied mask. The operation is explicit
 * and constrained: it never infers hidden geometry, inpaints occluded areas, or
 * invents art. Pixels outside the mask become fully transparent.
 */
export function extractMaskedRegion(
  source: PixelBuffer,
  mask: PixelBuffer,
  options: MaskExtractionOptions = {},
): MaskExtractionResult {
  assertPixelBuffer(source);
  assertPixelBuffer(mask);

  if (source.width !== mask.width || source.height !== mask.height) {
    throw new ImageImportError(
      "invalid_pixels",
      `Mask dimensions ${mask.width}x${mask.height} must match source dimensions ${source.width}x${source.height}.`,
    );
  }

  const region = clippedRegion(source.width, source.height, options.region);
  if (region.width <= 0 || region.height <= 0) {
    throw new ImageImportError(
      "invalid_pixels",
      "Mask extraction region is empty after clipping to the source image.",
    );
  }

  const threshold = Math.min(Math.max(Math.round(options.maskAlphaThreshold ?? 0), 0), 255);
  const data = new Uint8ClampedArray(region.width * region.height * 4);
  let selectedPixels = 0;
  let visiblePixels = 0;
  let minX = region.width;
  let minY = region.height;
  let maxX = -1;
  let maxY = -1;

  for (let row = 0; row < region.height; row += 1) {
    for (let column = 0; column < region.width; column += 1) {
      const sourceX = region.x + column;
      const sourceY = region.y + row;
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const maskIndex = (sourceY * mask.width + sourceX) * 4;
      const maskAlpha = mask.data[maskIndex + 3] ?? 0;

      if (maskAlpha <= threshold) {
        continue;
      }

      const targetIndex = (row * region.width + column) * 4;
      data[targetIndex] = source.data[sourceIndex] ?? 0;
      data[targetIndex + 1] = source.data[sourceIndex + 1] ?? 0;
      data[targetIndex + 2] = source.data[sourceIndex + 2] ?? 0;
      const sourceAlpha = source.data[sourceIndex + 3] ?? 0;
      data[targetIndex + 3] = sourceAlpha;
      selectedPixels += 1;
      if (sourceAlpha > 0) {
        visiblePixels += 1;
        minX = Math.min(minX, column);
        minY = Math.min(minY, row);
        maxX = Math.max(maxX, column);
        maxY = Math.max(maxY, row);
      }
    }
  }

  const contentBounds =
    maxX >= minX && maxY >= minY
      ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : null;

  const sourceContentBounds = contentBounds
    ? {
        x: contentBounds.x + region.x,
        y: contentBounds.y + region.y,
        width: contentBounds.width,
        height: contentBounds.height,
      }
    : null;

  const coverage = selectedPixels / (region.width * region.height);
  const warnings: MaskWarning[] = [];

  if (selectedPixels === 0) {
    warnings.push({
      code: "empty-mask",
      severity: "warning",
      message: "The mask selected no pixels. The extracted part is empty and cannot be rigged.",
    });
  } else if (visiblePixels === 0) {
    warnings.push({
      code: "empty-content",
      severity: "warning",
      message:
        "The mask selected only fully transparent source pixels. The extracted part has no visible artwork.",
    });
  }
  if (coverage > 0.98) {
    warnings.push({
      code: "near-full-mask",
      severity: "warning",
      message:
        "The mask covers nearly the entire source. This is a crop, not a layer separation; hidden wing/body geometry remains unavailable.",
    });
  }
  warnings.push({
    code: "hidden-anatomy",
    severity: "info",
    message:
      "Mask extraction only preserves visible selected pixels. Any occluded body, rear wing, or missing limb surface must be supplied as authored replacement artwork and marked for reconstruction.",
  });

  return {
    pixels: { width: region.width, height: region.height, data },
    region,
    contentBounds,
    sourceContentBounds,
    selectedPixels,
    visiblePixels,
    coverage,
    warnings,
  };
}
