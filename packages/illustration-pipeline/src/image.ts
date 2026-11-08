import { DEFAULT_TRIM_ALPHA_THRESHOLD, SUPPORTED_IMAGE_EXTENSIONS } from "./constants";

export type ImageFormat = "png" | "webp" | "jpeg";

export interface PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface PixelRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ImageWarning {
  readonly code:
    | "alpha-missing"
    | "white-halo"
    | "black-halo"
    | "transparent-color-residue"
    | "opaque-background"
    | "empty-content"
    | "premultiplied-risk";
  readonly severity: "info" | "warning";
  readonly message: string;
}

export interface ImageAnalysis {
  readonly width: number;
  readonly height: number;
  readonly hasAlpha: boolean;
  readonly opaqueRatio: number;
  readonly transparentRatio: number;
  readonly contentBounds: PixelRectangle | null;
  readonly opaqueBounds: PixelRectangle | null;
  readonly transparentBounds: PixelRectangle | null;
  readonly semiTransparentPixels: number;
  readonly warnings: readonly ImageWarning[];
}

export interface TrimResult extends PixelBuffer {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly applied: boolean;
  readonly contentBounds: PixelRectangle;
}

export interface PreparePixelsOptions {
  readonly trim?: boolean;
  readonly alphaThreshold?: number;
  readonly padding?: number;
  readonly targetSize?: { readonly width: number; readonly height: number };
}

export interface PreparedPixels extends PixelBuffer {
  /** Top-left of the prepared image in original source coordinates. */
  readonly preparedOffsetX: number;
  readonly preparedOffsetY: number;
  readonly trim: TrimResult;
  readonly analysis: ImageAnalysis;
}

export type ImageImportErrorCode =
  | "unsupported_format"
  | "invalid_file"
  | "invalid_pixels"
  | "empty_image"
  | "decode_failed"
  | "encode_failed"
  | "hash_unavailable";

export class ImageImportError extends Error {
  override readonly name = "ImageImportError";
  readonly code: ImageImportErrorCode;
  override readonly cause: unknown;

  constructor(code: ImageImportErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 8 && PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0) === "RIFF" &&
    String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export function assertSupportedImageFile(input: {
  readonly fileName: string;
  readonly mimeType?: string;
  readonly bytes: Uint8Array;
}): ImageFormat {
  const format = detectImageFormat(input.bytes);
  if (format) {
    return format;
  }

  const extension = input.fileName.split(".").at(-1)?.toLowerCase() ?? "";
  if (extension === "svg" || input.mimeType === "image/svg+xml") {
    throw new ImageImportError(
      "unsupported_format",
      `SVG "${input.fileName}" is not accepted as an active import. Rasterize it in an authoring tool and import a PNG or WebP derivative.`,
    );
  }

  throw new ImageImportError(
    "unsupported_format",
    `"${input.fileName}" is not a supported raster image. Supported formats: ${SUPPORTED_IMAGE_EXTENSIONS.join(", ")}.`,
  );
}

export function assertPixelBuffer(buffer: PixelBuffer): void {
  if (
    !Number.isInteger(buffer.width) ||
    !Number.isInteger(buffer.height) ||
    buffer.width <= 0 ||
    buffer.height <= 0
  ) {
    throw new ImageImportError(
      "invalid_pixels",
      `Pixel buffer dimensions must be positive integers; received ${buffer.width}x${buffer.height}.`,
    );
  }

  if (buffer.data.length !== buffer.width * buffer.height * 4) {
    throw new ImageImportError(
      "invalid_pixels",
      `Pixel buffer has ${buffer.data.length} bytes; expected ${buffer.width * buffer.height * 4}.`,
    );
  }
}

function boundsFromPredicate(
  buffer: PixelBuffer,
  predicate: (red: number, green: number, blue: number, alpha: number) => boolean,
): PixelRectangle | null {
  let minX = buffer.width;
  let minY = buffer.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      const index = (y * buffer.width + x) * 4;
      const red = buffer.data[index] ?? 0;
      const green = buffer.data[index + 1] ?? 0;
      const blue = buffer.data[index + 2] ?? 0;
      const alpha = buffer.data[index + 3] ?? 0;

      if (!predicate(red, green, blue, alpha)) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function computeContentBounds(
  buffer: PixelBuffer,
  alphaThreshold = DEFAULT_TRIM_ALPHA_THRESHOLD,
): PixelRectangle | null {
  assertPixelBuffer(buffer);
  const threshold = Math.min(Math.max(Math.round(alphaThreshold), 0), 255);
  return boundsFromPredicate(buffer, (_red, _green, _blue, alpha) => alpha > threshold);
}

export function analyzePixels(buffer: PixelBuffer): ImageAnalysis {
  assertPixelBuffer(buffer);

  const contentBounds = computeContentBounds(buffer);
  const opaqueBounds = boundsFromPredicate(buffer, (_red, _green, _blue, alpha) => alpha === 255);
  const transparentBounds = boundsFromPredicate(
    buffer,
    (_red, _green, _blue, alpha) => alpha === 0,
  );

  let opaquePixels = 0;
  let transparentPixels = 0;
  let semiTransparentPixels = 0;
  let whiteHaloPixels = 0;
  let blackHaloPixels = 0;
  let transparentRgbPixels = 0;
  let semiTransparentOpaqueCorners = 0;

  for (let index = 0; index < buffer.data.length; index += 4) {
    const red = buffer.data[index] ?? 0;
    const green = buffer.data[index + 1] ?? 0;
    const blue = buffer.data[index + 2] ?? 0;
    const alpha = buffer.data[index + 3] ?? 0;

    if (alpha === 255) opaquePixels += 1;
    if (alpha === 0) {
      transparentPixels += 1;
      if (red !== 0 || green !== 0 || blue !== 0) {
        transparentRgbPixels += 1;
      }
    }
    if (alpha > 0 && alpha < 255) {
      semiTransparentPixels += 1;
      if (red >= 245 && green >= 245 && blue >= 245) whiteHaloPixels += 1;
      if (red <= 10 && green <= 10 && blue <= 10) blackHaloPixels += 1;
      // An opaque-ish RGB payload on low-alpha fringes can indicate a
      // straight-alpha asset that was accidentally premultiplied elsewhere.
      if (alpha <= 32 && (red > 200 || green > 200 || blue > 200)) {
        semiTransparentOpaqueCorners += 1;
      }
    }
  }

  const totalPixels = buffer.width * buffer.height;
  const warnings: ImageWarning[] = [];
  const hasAlpha = semiTransparentPixels > 0 || transparentPixels > 0;

  if (!hasAlpha) {
    warnings.push({
      code: "alpha-missing",
      severity: "info",
      message:
        "No transparent pixels were found. This image is suitable only for opaque artwork unless a mask is extracted later.",
    });
  }

  if (whiteHaloPixels >= Math.max(8, semiTransparentPixels * 0.01)) {
    warnings.push({
      code: "white-halo",
      severity: "warning",
      message: `${whiteHaloPixels} semi-transparent near-white fringe pixels were detected. Inspect compositing against dark backgrounds before trimming or keying.`,
    });
  }

  if (blackHaloPixels >= Math.max(8, semiTransparentPixels * 0.01)) {
    warnings.push({
      code: "black-halo",
      severity: "warning",
      message: `${blackHaloPixels} semi-transparent near-black fringe pixels were detected. This may be intentional linework or an alpha fringe artifact.`,
    });
  }

  if (transparentRgbPixels >= Math.max(8, transparentPixels * 0.05)) {
    warnings.push({
      code: "transparent-color-residue",
      severity: "info",
      message: `${transparentRgbPixels} fully transparent pixels retain RGB color. Fableon preserves them rather than destructively keying; they should not affect straight-alpha compositing.`,
    });
  }

  if (transparentPixels === 0) {
    warnings.push({
      code: "opaque-background",
      severity: "warning",
      message:
        "Every pixel is opaque. Character parts and foreground layers normally need transparency; use the mask workflow for a flattened source.",
    });
  }

  if (contentBounds === null) {
    warnings.push({
      code: "empty-content",
      severity: "warning",
      message: "The image has no pixels above alpha 0 and contains no visible content.",
    });
  }

  if (semiTransparentOpaqueCorners >= Math.max(8, semiTransparentPixels * 0.02)) {
    warnings.push({
      code: "premultiplied-risk",
      severity: "warning",
      message: `${semiTransparentOpaqueCorners} low-alpha pixels retain bright RGB payload. Verify the source is straight alpha before compositing; Fableon does not auto-premultiply or key it.`,
    });
  }

  return {
    width: buffer.width,
    height: buffer.height,
    hasAlpha,
    opaqueRatio: opaquePixels / totalPixels,
    transparentRatio: transparentPixels / totalPixels,
    contentBounds,
    opaqueBounds,
    transparentBounds,
    semiTransparentPixels,
    warnings,
  };
}

export function trimPixels(
  buffer: PixelBuffer,
  options: { readonly alphaThreshold?: number } = {},
): TrimResult {
  assertPixelBuffer(buffer);
  const alphaThreshold = options.alphaThreshold ?? DEFAULT_TRIM_ALPHA_THRESHOLD;
  const contentBounds = computeContentBounds(buffer, alphaThreshold);

  if (!contentBounds) {
    throw new ImageImportError(
      "empty_image",
      "Cannot trim an image that contains no pixels above the alpha threshold.",
    );
  }

  const applied =
    contentBounds.x !== 0 ||
    contentBounds.y !== 0 ||
    contentBounds.width !== buffer.width ||
    contentBounds.height !== buffer.height;

  if (!applied) {
    return {
      width: buffer.width,
      height: buffer.height,
      data: new Uint8ClampedArray(buffer.data),
      offsetX: 0,
      offsetY: 0,
      applied: false,
      contentBounds,
    };
  }

  const data = new Uint8ClampedArray(contentBounds.width * contentBounds.height * 4);
  for (let row = 0; row < contentBounds.height; row += 1) {
    const sourceStart = ((contentBounds.y + row) * buffer.width + contentBounds.x) * 4;
    const targetStart = row * contentBounds.width * 4;
    data.set(buffer.data.subarray(sourceStart, sourceStart + contentBounds.width * 4), targetStart);
  }

  return {
    width: contentBounds.width,
    height: contentBounds.height,
    data,
    offsetX: contentBounds.x,
    offsetY: contentBounds.y,
    applied: true,
    contentBounds,
  };
}

export function padPixels(
  buffer: PixelBuffer,
  padding: number,
  targetSize?: { readonly width: number; readonly height: number },
): {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
  readonly contentOffsetX: number;
  readonly contentOffsetY: number;
} {
  assertPixelBuffer(buffer);
  const margin = Math.max(0, Math.floor(padding));
  const width = targetSize?.width ?? buffer.width + margin * 2;
  const height = targetSize?.height ?? buffer.height + margin * 2;
  const contentOffsetX = targetSize ? Math.max(0, Math.floor((width - buffer.width) / 2)) : margin;
  const contentOffsetY = targetSize
    ? Math.max(0, Math.floor((height - buffer.height) / 2))
    : margin;

  if (width < buffer.width || height < buffer.height) {
    throw new ImageImportError(
      "invalid_pixels",
      `Target size ${width}x${height} cannot contain a ${buffer.width}x${buffer.height} image.`,
    );
  }

  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < buffer.height; row += 1) {
    const sourceStart = row * buffer.width * 4;
    const targetStart = ((row + contentOffsetY) * width + contentOffsetX) * 4;
    data.set(buffer.data.subarray(sourceStart, sourceStart + buffer.width * 4), targetStart);
  }

  return { width, height, data, contentOffsetX, contentOffsetY };
}

/**
 * Prepares a pixel buffer without destructive color correction. Trimming only
 * removes fully transparent padding at the configured threshold. Optional
 * padding is lossless; existing pixels are copied byte-for-byte.
 */
export function preparePixels(
  buffer: PixelBuffer,
  options: PreparePixelsOptions = {},
): PreparedPixels {
  assertPixelBuffer(buffer);
  const analysis = analyzePixels(buffer);
  const trimmed = trimPixels(buffer, {
    alphaThreshold: options.alphaThreshold ?? DEFAULT_TRIM_ALPHA_THRESHOLD,
  });
  const shouldTrim = options.trim !== false;

  const source = shouldTrim
    ? trimmed
    : {
        width: buffer.width,
        height: buffer.height,
        data: new Uint8ClampedArray(buffer.data),
        offsetX: 0,
        offsetY: 0,
        applied: false,
        contentBounds: trimmed.contentBounds,
      };

  const padding = options.padding ?? 0;
  const padded = padPixels(source, padding, options.targetSize);
  const preparedOffsetX = (shouldTrim ? trimmed.offsetX : 0) - padded.contentOffsetX;
  const preparedOffsetY = (shouldTrim ? trimmed.offsetY : 0) - padded.contentOffsetY;

  return {
    width: padded.width,
    height: padded.height,
    data: padded.data,
    preparedOffsetX,
    preparedOffsetY,
    trim: shouldTrim ? trimmed : source,
    analysis,
  };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new ImageImportError(
      "hash_unavailable",
      "SHA-256 hashing requires Web Crypto (crypto.subtle) in this environment.",
    );
  }

  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const digest = await subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
