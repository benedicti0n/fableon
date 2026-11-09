export interface FolkPartAsset {
  readonly id: string;
  readonly image: CanvasImageSource;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
}

export interface FolkBackgroundLayerAsset {
  readonly id: string;
  readonly image: CanvasImageSource;
  readonly depth: number;
  readonly opacity: number;
}

export interface FolkAssets {
  readonly manifest: FolkAssetManifest;
  readonly parts: ReadonlyMap<string, FolkPartAsset>;
  readonly backgrounds: ReadonlyMap<string, readonly FolkBackgroundLayerAsset[]>;
}

export interface FolkAssetPartEntry {
  readonly id: string;
  readonly file: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
  readonly bytes: number;
  readonly origin: string;
  readonly provider: string;
  readonly model?: string;
  readonly reviewStatus: string;
}

export interface FolkAssetManifest {
  readonly format: string;
  readonly version: number;
  readonly id: string;
  readonly title: string;
  readonly generationMode: string;
  readonly aiGeneration: {
    readonly status: string;
    readonly reason: string;
    readonly paidApiCalls: number;
  };
  readonly characters: Readonly<
    Record<
      string,
      {
        readonly masterPng: string;
        readonly masterPngSha256: string;
        readonly masterSvg: string;
        readonly width: number;
        readonly height: number;
        readonly parts: readonly FolkAssetPartEntry[];
      }
    >
  >;
  readonly backgrounds: Readonly<
    Record<
      string,
      {
        readonly masterPng: string;
        readonly masterPngSha256: string;
        readonly masterSvg: string;
        readonly width: number;
        readonly height: number;
        readonly layers: readonly {
          readonly id: string;
          readonly file: string;
          readonly depth: number;
          readonly opacity: number;
          readonly sha256: string;
        }[];
      }
    >
  >;
  readonly parts: readonly FolkAssetPartEntry[];
}

async function decodeImage(url: string): Promise<CanvasImageSource> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load folk asset "${url}" (HTTP ${response.status}).`);
  }
  const blob = await response.blob();
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function assertManifest(value: unknown): asserts value is FolkAssetManifest {
  if (typeof value !== "object" || value === null) {
    throw new Error("The folk asset manifest is not an object.");
  }
  const manifest = value as Record<string, unknown>;
  if (manifest["format"] !== "fableon.folk-asset-pack") {
    throw new Error("The folk asset manifest format is invalid.");
  }
  if (!Array.isArray(manifest["parts"])) {
    throw new Error("The folk asset manifest has no parts.");
  }
}

let cached: Promise<FolkAssets> | null = null;

export function loadFolkAssets(): Promise<FolkAssets> {
  if (!cached) {
    cached = (async () => {
      const response = await fetch("/assets/folk-pilot/manifest.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Could not load the folk manifest (HTTP ${response.status}).`);
      }
      const manifest = (await response.json()) as unknown;
      assertManifest(manifest);
      const partEntries = manifest.parts;
      const parts = new Map<string, FolkPartAsset>();
      await Promise.all(
        partEntries.map(async (entry) => {
          const image = await decodeImage(`/assets/folk-pilot/${entry.file}`);
          parts.set(entry.id, {
            id: entry.id,
            image,
            offsetX: entry.offsetX,
            offsetY: entry.offsetY,
            width: entry.width,
            height: entry.height,
            sha256: entry.sha256,
          });
        }),
      );
      const backgrounds = new Map<string, readonly FolkBackgroundLayerAsset[]>();
      await Promise.all(
        Object.entries(manifest.backgrounds).map(async ([id, background]) => {
          const layers = await Promise.all(
            background.layers.map(async (layer) => ({
              id: layer.id,
              image: await decodeImage(`/assets/folk-pilot/${layer.file}`),
              depth: layer.depth,
              opacity: layer.opacity,
            })),
          );
          backgrounds.set(id, layers);
        }),
      );
      return { manifest, parts, backgrounds };
    })().catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}
