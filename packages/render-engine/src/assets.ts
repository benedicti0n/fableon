import type { Asset } from "@fableon/scene-schema";

import type { ImageAssetResolver, RasterImage } from "./types";

export type AssetResolutionErrorCode =
  | "missing_asset"
  | "unsupported_asset_type"
  | "unsafe_asset_path"
  | "fetch_failed"
  | "decode_failed";

export class AssetResolutionError extends Error {
  override readonly name = "AssetResolutionError";
  readonly code: AssetResolutionErrorCode;
  readonly assetId: string;
  readonly path: string | undefined;
  readonly status: number | undefined;
  override readonly cause: unknown;

  constructor(
    message: string,
    context: {
      code: AssetResolutionErrorCode;
      assetId: string;
      path?: string;
      status?: number;
      cause?: unknown;
    },
  ) {
    super(message);
    this.code = context.code;
    this.assetId = context.assetId;
    this.path = context.path;
    this.status = context.status;
    this.cause = context.cause;
  }
}

export type FetchLike = (url: string) => Promise<Response>;
export type ImageDecoder = (blob: Blob) => Promise<RasterImage>;

export interface BrowserImageAssetResolverOptions {
  /**
   * Application-relative public root. Must start with a single "/". Asset
   * manifest paths are appended to this root; external URLs are never allowed.
   */
  readonly basePath?: string;
  readonly fetchImpl?: FetchLike;
  readonly decodeImage?: ImageDecoder;
}

export interface ImageAssetResolverCache extends ImageAssetResolver {
  readonly cacheSize: number;
  preload(assetIds?: readonly string[]): Promise<void>;
  clear(): void;
}

function isSafeRelativeAssetPath(path: string): boolean {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.includes("?") ||
    path.includes("#")
  ) {
    return false;
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path)) {
    return false;
  }

  return path
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function normalizeBasePath(basePath: string): string {
  if (
    !basePath.startsWith("/") ||
    basePath.startsWith("//") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(basePath)
  ) {
    throw new Error(
      `Asset basePath must be an application-relative path beginning with "/"; received "${basePath}".`,
    );
  }

  return basePath === "/" ? "/" : `${basePath.replace(/\/+$/, "")}/`;
}

async function decodeWithBrowser(blob: Blob): Promise<RasterImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Resolves image assets from a validated project manifest against the app's
 * public root. Successful decoded images are cached by asset ID; concurrent
 * duplicate requests share one in-flight promise. Failed entries are evicted so
 * a retry can attempt the load again.
 */
export function createBrowserImageAssetResolver(
  assets: readonly Asset[],
  options: BrowserImageAssetResolverOptions = {},
): ImageAssetResolverCache {
  const basePath = normalizeBasePath(options.basePath ?? "/");
  const fetchImpl: FetchLike = options.fetchImpl ?? ((url) => fetch(url));
  const decodeImage = options.decodeImage ?? decodeWithBrowser;
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const cache = new Map<string, Promise<RasterImage>>();

  async function loadAsset(asset: Asset): Promise<RasterImage> {
    if (asset.type !== "image") {
      throw new AssetResolutionError(
        `Asset "${asset.id}" has type "${asset.type}" and cannot be rendered as an image.`,
        { code: "unsupported_asset_type", assetId: asset.id, path: asset.path },
      );
    }

    if (!isSafeRelativeAssetPath(asset.path)) {
      throw new AssetResolutionError(
        `Asset "${asset.id}" has an unsafe relative path: "${asset.path}".`,
        { code: "unsafe_asset_path", assetId: asset.id, path: asset.path },
      );
    }

    const url = `${basePath}${asset.path}`;
    let response: Response;

    try {
      response = await fetchImpl(url);
    } catch (error) {
      throw new AssetResolutionError(`Could not fetch asset "${asset.id}" from "${url}".`, {
        code: "fetch_failed",
        assetId: asset.id,
        path: asset.path,
        cause: error,
      });
    }

    if (!response.ok) {
      throw new AssetResolutionError(
        `Asset "${asset.id}" could not be loaded from "${url}" (HTTP ${response.status}).`,
        {
          code: response.status === 404 ? "missing_asset" : "fetch_failed",
          assetId: asset.id,
          path: asset.path,
          status: response.status,
        },
      );
    }

    const blob = await response.blob();
    if (blob.type && !blob.type.startsWith("image/")) {
      throw new AssetResolutionError(
        `Asset "${asset.id}" returned unsupported content type "${blob.type}".`,
        {
          code: "unsupported_asset_type",
          assetId: asset.id,
          path: asset.path,
        },
      );
    }

    try {
      return await decodeImage(blob);
    } catch (error) {
      throw new AssetResolutionError(`Could not decode image asset "${asset.id}".`, {
        code: "decode_failed",
        assetId: asset.id,
        path: asset.path,
        cause: error,
      });
    }
  }

  const resolver: ImageAssetResolverCache = {
    get cacheSize(): number {
      return cache.size;
    },

    resolve(assetId: string): Promise<RasterImage> {
      const cached = cache.get(assetId);
      if (cached) {
        return cached;
      }

      const asset = assetsById.get(assetId);
      if (!asset) {
        return Promise.reject(
          new AssetResolutionError(`Asset "${assetId}" is not present in the project manifest.`, {
            code: "missing_asset",
            assetId,
          }),
        );
      }

      const pending = loadAsset(asset);
      cache.set(assetId, pending);

      return pending.catch((error: unknown) => {
        cache.delete(assetId);
        throw error;
      });
    },

    async preload(assetIds?: readonly string[]): Promise<void> {
      const ids =
        assetIds ?? assets.filter((asset) => asset.type === "image").map((asset) => asset.id);
      await Promise.all(ids.map((assetId) => resolver.resolve(assetId)));
    },

    clear(): void {
      cache.clear();
    },
  };

  return resolver;
}
