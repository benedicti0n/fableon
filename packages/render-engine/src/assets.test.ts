import { describe, expect, it, vi } from "vitest";

import type { Asset } from "@fableon/scene-schema";

import {
  AssetResolutionError,
  createBrowserImageAssetResolver,
  type FetchLike,
  type ImageDecoder,
} from "./index";
import type { RasterImage } from "./index";

const assets: Asset[] = [
  {
    id: "bird",
    type: "image",
    name: "Bird",
    path: "assets/bird.png",
  },
  {
    id: "forest",
    type: "image",
    name: "Forest",
    path: "assets/forest.webp",
  },
  {
    id: "ambience",
    type: "audio",
    name: "Ambience",
    path: "audio/ambience.mp3",
  },
];

const decodedImage: RasterImage = {
  source: {} as unknown as CanvasImageSource,
  width: 640,
  height: 360,
};

function response({
  ok = true,
  status = 200,
  type = "image/png",
}: {
  ok?: boolean;
  status?: number;
  type?: string;
} = {}): Response {
  return {
    ok,
    status,
    blob: async () => ({ type }) as Blob,
  } as Response;
}

function createHarness(
  fetchImpl: FetchLike,
  decodeImage: ImageDecoder = async () => decodedImage,
  basePath = "/",
) {
  return createBrowserImageAssetResolver(assets, { fetchImpl, decodeImage, basePath });
}

describe("browser image asset resolver", () => {
  it("loads and decodes a manifest image by ID", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => response());
    const decodeImage = vi.fn<ImageDecoder>(async () => decodedImage);
    const resolver = createHarness(fetchImpl, decodeImage);

    const result = await resolver.resolve("bird");

    expect(fetchImpl).toHaveBeenCalledWith("/assets/bird.png");
    expect(decodeImage).toHaveBeenCalledTimes(1);
    expect(result).toBe(decodedImage);
    expect(resolver.cacheSize).toBe(1);
  });

  it("reuses successful cache entries without another request", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => response());
    const decodeImage = vi.fn<ImageDecoder>(async () => decodedImage);
    const resolver = createHarness(fetchImpl, decodeImage);

    const first = await resolver.resolve("bird");
    const second = await resolver.resolve("bird");

    expect(first).toBe(second);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(decodeImage).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent requests for the same asset", async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchImpl = vi.fn<FetchLike>(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const resolver = createHarness(fetchImpl);

    const first = resolver.resolve("bird");
    const second = resolver.resolve("bird");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    resolveFetch?.(response());

    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
  });

  it("maps asset IDs to their manifest paths and normalizes the base path", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => response());
    const resolver = createHarness(fetchImpl, async () => decodedImage, "/static/");

    await resolver.resolve("forest");

    expect(fetchImpl).toHaveBeenCalledWith("/static/assets/forest.webp");
  });

  it("rejects unknown asset IDs with missing_asset", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => response());
    const resolver = createHarness(fetchImpl);

    await expect(resolver.resolve("missing")).rejects.toMatchObject({
      name: "AssetResolutionError",
      code: "missing_asset",
      assetId: "missing",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects audio assets as unsupported visual content", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => response());
    const resolver = createHarness(fetchImpl);

    await expect(resolver.resolve("ambience")).rejects.toMatchObject({
      name: "AssetResolutionError",
      code: "unsupported_asset_type",
      assetId: "ambience",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects unsafe manifest paths without fetching", async () => {
    const unsafe: Asset = {
      id: "unsafe",
      type: "image",
      name: "Unsafe",
      path: "../secret.png",
    };
    const fetchImpl = vi.fn<FetchLike>(async () => response());
    const resolver = createBrowserImageAssetResolver([unsafe], { fetchImpl });

    await expect(resolver.resolve("unsafe")).rejects.toMatchObject({
      code: "unsafe_asset_path",
      assetId: "unsafe",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports missing files as missing_asset with HTTP status", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => response({ ok: false, status: 404 }));
    const resolver = createHarness(fetchImpl);

    let error: unknown;
    try {
      await resolver.resolve("bird");
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(AssetResolutionError);
    expect(error).toMatchObject({
      code: "missing_asset",
      assetId: "bird",
      path: "assets/bird.png",
      status: 404,
    });
  });

  it("reports network and non-image failures explicitly", async () => {
    const networkResolver = createHarness(async () => {
      throw new Error("offline");
    });
    await expect(networkResolver.resolve("bird")).rejects.toMatchObject({
      code: "fetch_failed",
      assetId: "bird",
    });

    const typeResolver = createHarness(async () => response({ type: "text/html" }));
    await expect(typeResolver.resolve("bird")).rejects.toMatchObject({
      code: "unsupported_asset_type",
      assetId: "bird",
    });
  });

  it("evicts failed decodes so a retry can succeed", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => response());
    const decodeImage = vi
      .fn<ImageDecoder>()
      .mockRejectedValueOnce(new Error("decode failure"))
      .mockResolvedValueOnce(decodedImage);
    const resolver = createHarness(fetchImpl, decodeImage);

    await expect(resolver.resolve("bird")).rejects.toMatchObject({
      code: "decode_failed",
      assetId: "bird",
    });
    expect(resolver.cacheSize).toBe(0);

    await expect(resolver.resolve("bird")).resolves.toBe(decodedImage);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("preloads all image assets but skips audio", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => response());
    const resolver = createHarness(fetchImpl);

    await resolver.preload();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(resolver.cacheSize).toBe(2);
  });

  it("clears cache entries on request", async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => response());
    const resolver = createHarness(fetchImpl);

    await resolver.resolve("bird");
    resolver.clear();

    expect(resolver.cacheSize).toBe(0);
    await resolver.resolve("bird");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("refuses an external base path", () => {
    expect(() =>
      createBrowserImageAssetResolver(assets, {
        basePath: "https://example.com/",
      }),
    ).toThrow(/application-relative path/);
    expect(() =>
      createBrowserImageAssetResolver(assets, {
        basePath: "//example.com/",
      }),
    ).toThrow(/application-relative path/);
  });

  it("preserves the decoded source object, including transparency-capable images", async () => {
    const transparentImage: RasterImage = {
      source: {} as unknown as CanvasImageSource,
      width: 720,
      height: 540,
    };
    const resolver = createHarness(
      async () => response(),
      async () => transparentImage,
    );

    expect(await resolver.resolve("bird")).toBe(transparentImage);
  });
});
