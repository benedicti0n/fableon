import {
  analyzePixels,
  assertSupportedImageFile,
  ImageImportError,
  preparePixels,
  sha256Hex,
  type ImageAnalysis,
  type ImageFormat,
  type ImageWarning,
  type PixelBuffer,
  type PreparePixelsOptions,
  type TrimResult,
} from "./image";

export interface DecodedImage extends PixelBuffer {
  readonly colorSpace?: string;
}

export type ImageDecoder = (blob: Blob) => Promise<DecodedImage>;
export type PngEncoder = (image: PixelBuffer) => Promise<Blob>;

export interface ImportImageBlobInput {
  readonly fileName: string;
  readonly mimeType?: string;
  readonly bytes: Uint8Array;
  readonly decoder?: ImageDecoder;
}

export interface ImageInspection {
  readonly fileName: string;
  readonly mimeType: string;
  readonly format: ImageFormat;
  readonly width: number;
  readonly height: number;
  readonly fileSize: number;
  readonly sourceHash: string;
  readonly analysis: ImageAnalysis;
  readonly warnings: readonly ImageWarning[];
  readonly colorSpace?: string;
}

export interface PreparedImageImport {
  readonly inspection: ImageInspection;
  readonly preparedBlob: Blob;
  readonly preparedBytes: Uint8Array;
  readonly preparedHash: string;
  readonly preparedWidth: number;
  readonly preparedHeight: number;
  readonly preparedOffsetX: number;
  readonly preparedOffsetY: number;
  readonly trim: TrimResult;
}

export interface PrepareImageBlobOptions extends PreparePixelsOptions {
  readonly decoder?: ImageDecoder;
  readonly encodePng?: PngEncoder;
}

function blobForBytes(bytes: Uint8Array, mimeType: string): Blob {
  const copy = new Uint8Array(bytes);
  return new Blob([copy], { type: mimeType });
}

async function decodeWithBrowser(blob: Blob): Promise<DecodedImage> {
  if (typeof document === "undefined") {
    throw new ImageImportError(
      "decode_failed",
      "Browser image decoding requires a document. Pass an explicit decoder in non-browser environments.",
    );
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new ImageImportError(
      "decode_failed",
      "A Canvas 2D context is required to inspect images.",
    );
  }

  let width = 0;
  let height = 0;
  let drawable: CanvasImageSource | null = null;
  let bitmap: ImageBitmap | null = null;

  if (typeof createImageBitmap === "function") {
    bitmap = await createImageBitmap(blob);
    width = bitmap.width;
    height = bitmap.height;
    drawable = bitmap;
  } else if (typeof Image === "function") {
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      width = image.naturalWidth;
      height = image.naturalHeight;
      drawable = image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (!drawable || width <= 0 || height <= 0) {
    throw new ImageImportError("decode_failed", "The image could not be decoded to pixels.");
  }

  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(drawable, 0, 0);
  const imageData = context.getImageData(0, 0, width, height);
  bitmap?.close();

  return {
    width,
    height,
    data: imageData.data,
    ...(imageData.colorSpace ? { colorSpace: imageData.colorSpace } : {}),
  };
}

export async function decodeImageBlob(
  blob: Blob,
  decoder: ImageDecoder = decodeWithBrowser,
): Promise<DecodedImage> {
  try {
    return await decoder(blob);
  } catch (error) {
    if (error instanceof ImageImportError) {
      throw error;
    }
    throw new ImageImportError(
      "decode_failed",
      error instanceof Error ? error.message : "The image could not be decoded.",
      error,
    );
  }
}

export async function encodePixelsToPng(image: PixelBuffer): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new ImageImportError(
      "encode_failed",
      "PNG encoding requires a document. Pass an explicit encoder in non-browser environments.",
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new ImageImportError(
      "encode_failed",
      "A Canvas 2D context is required to encode images.",
    );
  }

  const imageData = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  context.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) {
    throw new ImageImportError(
      "encode_failed",
      "The browser could not encode the prepared image as PNG.",
    );
  }
  return blob;
}

export async function inspectImageBlob(input: ImportImageBlobInput): Promise<ImageInspection> {
  const format = assertSupportedImageFile(input);
  const mimeType = input.mimeType ?? `image/${format === "jpeg" ? "jpeg" : format}`;
  const blob = blobForBytes(input.bytes, mimeType);
  const decoded = await decodeImageBlob(blob, input.decoder);
  const analysis = analyzePixels(decoded);
  const sourceHash = await sha256Hex(input.bytes);

  return {
    fileName: input.fileName,
    mimeType,
    format,
    width: decoded.width,
    height: decoded.height,
    fileSize: input.bytes.byteLength,
    sourceHash,
    analysis,
    warnings: analysis.warnings,
    ...(decoded.colorSpace ? { colorSpace: decoded.colorSpace } : {}),
  };
}

export async function prepareImageBlob(
  input: ImportImageBlobInput,
  options: PrepareImageBlobOptions = {},
): Promise<PreparedImageImport> {
  const format = assertSupportedImageFile(input);
  const mimeType = input.mimeType ?? `image/${format === "jpeg" ? "jpeg" : format}`;
  const blob = blobForBytes(input.bytes, mimeType);
  const decoded = await decodeImageBlob(blob, options.decoder);
  const prepared = preparePixels(decoded, options);
  const preparedBlob = await (options.encodePng ?? encodePixelsToPng)(prepared);
  const preparedBytes = new Uint8Array(await preparedBlob.arrayBuffer());
  const preparedHash = await sha256Hex(preparedBytes);
  const sourceHash = await sha256Hex(input.bytes);
  const analysis = prepared.analysis;

  return {
    inspection: {
      fileName: input.fileName,
      mimeType,
      format,
      width: decoded.width,
      height: decoded.height,
      fileSize: input.bytes.byteLength,
      sourceHash,
      analysis,
      warnings: analysis.warnings,
      ...(decoded.colorSpace ? { colorSpace: decoded.colorSpace } : {}),
    },
    preparedBlob,
    preparedBytes,
    preparedHash,
    preparedWidth: prepared.width,
    preparedHeight: prepared.height,
    preparedOffsetX: prepared.preparedOffsetX,
    preparedOffsetY: prepared.preparedOffsetY,
    trim: prepared.trim,
  };
}
