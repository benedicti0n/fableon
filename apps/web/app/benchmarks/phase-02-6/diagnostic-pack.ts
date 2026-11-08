import {
  createLandingRig,
  createLandingSceneArt,
  createStorybookBirdArt,
  LANDING_FRAME_COUNT,
} from "@fableon/paint-engine";
import {
  assignEnvironmentLayer,
  createCharacterPartFromImport,
  createEmptyEnvironmentPack,
  createImportedCharacterRig,
  prepareImageBlob,
  validateCharacterPreparation,
  validateEnvironmentPreparation,
  validateRigCompatibility,
  type IllustrationPack,
  type PreparedImageImport,
} from "@fableon/illustration-pipeline";
import {
  evaluateSpriteRig,
  transformPoint,
  type SpriteRigDefinition,
} from "@fableon/sprite-motion";

export const DIAGNOSTIC_SEED = 20261109;
export const DIAGNOSTIC_FRAME_COUNT = LANDING_FRAME_COUNT;

const TEMPLATE_TO_NODE = {
  body: "body",
  head: "head",
  eye: "eye",
  beak: "beak",
  "wing-far": "wingFar",
  "wing-near": "wingNear",
  tail: "tail",
  "leg-left": "legLeft",
  "leg-right": "legRight",
} as const;

const TEMPLATE_IDS = Object.keys(TEMPLATE_TO_NODE) as Array<keyof typeof TEMPLATE_TO_NODE>;

export interface PixelDifferenceMetrics {
  readonly width: number;
  readonly height: number;
  readonly meanAbsoluteError: number;
  readonly maxChannelDifference: number;
  readonly changedPixelRatio: number;
  readonly alphaMeanAbsoluteError: number;
}

export interface DiagnosticPartRecord {
  readonly id: string;
  readonly sourceFileName: string;
  readonly originalSize: { readonly width: number; readonly height: number };
  readonly preparedSize: { readonly width: number; readonly height: number };
  readonly pivot: { readonly x: number; readonly y: number };
  readonly registration: { readonly x: number; readonly y: number };
  readonly trim: {
    readonly applied: boolean;
    readonly alphaThreshold: number;
    readonly contentBounds: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    };
  };
  readonly preparedOffset: { readonly x: number; readonly y: number };
  readonly warnings: readonly { readonly code: string; readonly severity: string }[];
  readonly sourceHash: string;
  readonly preparedHash: string;
  readonly pixelDifference: PixelDifferenceMetrics;
}

export interface DiagnosticBenchmark {
  readonly seed: number;
  readonly characterPack: IllustrationPack;
  readonly packOrigin: { readonly x: number; readonly y: number };
  readonly environmentPack: IllustrationPack;
  readonly characterImages: ReadonlyMap<string, CanvasImageSource>;
  readonly environmentImages: ReadonlyMap<string, CanvasImageSource>;
  readonly importedRig: ReturnType<typeof createImportedCharacterRig>;
  readonly baseRig: ReturnType<typeof createLandingRig>;
  readonly neutralRig: SpriteRigDefinition;
  readonly bird: ReturnType<typeof createStorybookBirdArt>;
  readonly scene: ReturnType<typeof createLandingSceneArt>;
  readonly parts: readonly DiagnosticPartRecord[];
  readonly characterPreparation: ReturnType<typeof validateCharacterPreparation>;
  readonly environmentPreparation: ReturnType<typeof validateEnvironmentPreparation>;
  readonly rigCompatibility: ReturnType<typeof validateRigCompatibility>;
  readonly environmentDifference: PixelDifferenceMetrics;
  readonly timing: {
    readonly importMs: number;
    readonly decodeMs: number;
    readonly packBuildMs: number;
  };
  readonly objectUrls: readonly string[];
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not encode diagnostic canvas as PNG."));
    }, "image/png");
  });
}

async function decodePreparedImage(blob: Blob): Promise<{
  readonly image: CanvasImageSource;
  readonly objectUrl: string;
}> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return { image: bitmap, objectUrl: "" };
  }
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.src = objectUrl;
  await image.decode();
  return { image, objectUrl };
}

function imageDataForCanvas(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Canvas 2D is required for diagnostic image comparison.");
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export function comparePixels(left: ImageData, right: ImageData): PixelDifferenceMetrics {
  if (left.width !== right.width || left.height !== right.height) {
    throw new Error(
      `Cannot compare images with different dimensions: ${left.width}x${left.height} vs ${right.width}x${right.height}.`,
    );
  }

  let total = 0;
  let totalAlpha = 0;
  let max = 0;
  let changed = 0;
  const pixels = left.width * left.height;

  for (let index = 0; index < left.data.length; index += 4) {
    const red = Math.abs((left.data[index] ?? 0) - (right.data[index] ?? 0));
    const green = Math.abs((left.data[index + 1] ?? 0) - (right.data[index + 1] ?? 0));
    const blue = Math.abs((left.data[index + 2] ?? 0) - (right.data[index + 2] ?? 0));
    const alpha = Math.abs((left.data[index + 3] ?? 0) - (right.data[index + 3] ?? 0));
    const pixelMax = Math.max(red, green, blue, alpha);
    total += red + green + blue;
    totalAlpha += alpha;
    max = Math.max(max, pixelMax);
    if (pixelMax > 2) changed += 1;
  }

  return {
    width: left.width,
    height: left.height,
    meanAbsoluteError: total / (pixels * 3),
    maxChannelDifference: max,
    changedPixelRatio: changed / pixels,
    alphaMeanAbsoluteError: totalAlpha / pixels,
  };
}

function comparePreparedPart(
  original: HTMLCanvasElement,
  prepared: PreparedImageImport,
  image: CanvasImageSource,
): PixelDifferenceMetrics {
  const bounds = prepared.trim.contentBounds;
  const sourceContext = original.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error("Canvas 2D is required for part comparison.");
  }
  const sourceData = sourceContext.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);

  const preparedCanvas = document.createElement("canvas");
  preparedCanvas.width = prepared.preparedWidth;
  preparedCanvas.height = prepared.preparedHeight;
  const preparedContext = preparedCanvas.getContext("2d", { willReadFrequently: true });
  if (!preparedContext) {
    throw new Error("Canvas 2D is required for prepared-part comparison.");
  }
  preparedContext.drawImage(image, 0, 0);
  const preparedData = preparedContext.getImageData(
    0,
    0,
    preparedCanvas.width,
    preparedCanvas.height,
  );

  return comparePixels(sourceData, preparedData);
}

function importWarnings(prepared: PreparedImageImport): readonly {
  readonly code: string;
  readonly severity: string;
}[] {
  return prepared.inspection.warnings.map((warning) => ({
    code: warning.code,
    severity: warning.severity,
  }));
}

export async function createDiagnosticBenchmark(
  seed = DIAGNOSTIC_SEED,
): Promise<DiagnosticBenchmark> {
  const importStarted = performance.now();
  const baseRig = createLandingRig();
  const neutralRig: SpriteRigDefinition = {
    nodes: baseRig.nodes.map((node) => ({
      id: node.id,
      parentId: node.parentId,
      pivot: node.pivot,
      drawOrder: node.drawOrder,
      transform: {
        ...node.transform,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      ...(node.visible !== undefined ? { visible: node.visible } : {}),
    })),
  };
  const bird = createStorybookBirdArt(seed);
  const scene = createLandingSceneArt(seed);
  const neutral = evaluateSpriteRig(neutralRig, 0);
  const nodesById = new Map(neutral.map((node) => [node.id, node]));

  const entries = TEMPLATE_IDS.map((templateId) => {
    const nodeId = TEMPLATE_TO_NODE[templateId];
    const node = nodesById.get(nodeId);
    if (!node) {
      throw new Error(`Phase 2.5 diagnostic part "${nodeId}" is missing.`);
    }
    const part = bird.parts[nodeId];
    if (!part) {
      throw new Error(`Phase 2.5 artwork for "${nodeId}" is missing.`);
    }
    const topLeft = transformPoint(node.world, { x: 0, y: 0 });
    return { templateId, nodeId, part, topLeft };
  });

  const minX = Math.min(...entries.map((entry) => entry.topLeft.x));
  const minY = Math.min(...entries.map((entry) => entry.topLeft.y));
  const maxX = Math.max(...entries.map((entry) => entry.topLeft.x + entry.part.width));
  const maxY = Math.max(...entries.map((entry) => entry.topLeft.y + entry.part.height));
  const margin = 32;
  const packWidth = Math.ceil(maxX - minX + margin * 2);
  const packHeight = Math.ceil(maxY - minY + margin * 2);

  const characterImages = new Map<string, CanvasImageSource>();
  const objectUrls: string[] = [];
  const records: DiagnosticPartRecord[] = [];
  const parts: IllustrationPack["parts"] = [];
  let decodeMs = 0;

  for (const entry of entries) {
    const blob = await canvasToPngBlob(entry.part.canvas);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const prepared = await prepareImageBlob(
      {
        fileName: `${entry.templateId}.png`,
        mimeType: "image/png",
        bytes,
      },
      {
        trim: true,
        alphaThreshold: 0,
      },
    );
    const decodeStarted = performance.now();
    const decoded = await decodePreparedImage(prepared.preparedBlob);
    decodeMs += performance.now() - decodeStarted;
    if (decoded.objectUrl) objectUrls.push(decoded.objectUrl);

    const registration = {
      x: entry.topLeft.x - minX + margin,
      y: entry.topLeft.y - minY + margin,
    };
    const part = createCharacterPartFromImport({
      templateId: entry.templateId,
      imported: prepared,
      registration,
      pivot: { x: entry.part.pivot.x, y: entry.part.pivot.y },
      characterId: "diagnostic-bird",
      provenance: {
        kind: "diagnostic",
        notes:
          "Phase 2.5 procedural storybook bird rasterized and re-imported as a diagnostic fixture. Not premium artwork and not artistic validation.",
      },
    });

    parts.push(part);
    characterImages.set(part.id, decoded.image);
    records.push({
      id: part.id,
      sourceFileName: `${entry.templateId}.png`,
      originalSize: part.originalSize,
      preparedSize: part.preparedSize,
      pivot: { x: part.pivot.x, y: part.pivot.y },
      registration,
      trim: {
        applied: prepared.trim.applied,
        alphaThreshold: 0,
        contentBounds: prepared.trim.contentBounds,
      },
      preparedOffset: {
        x: prepared.preparedOffsetX,
        y: prepared.preparedOffsetY,
      },
      warnings: importWarnings(prepared),
      sourceHash: prepared.inspection.sourceHash,
      preparedHash: prepared.preparedHash,
      pixelDifference: comparePreparedPart(entry.part.canvas, prepared, decoded.image),
    });
  }

  const characterPack: IllustrationPack = {
    format: "fableon.illustration-pack",
    version: 1,
    id: "diagnostic-bird",
    name: "Diagnostic Bird — Phase 2.5 Import",
    kind: "character",
    canvas: { width: packWidth, height: packHeight },
    parts,
  };

  const characterPreparation = validateCharacterPreparation(characterPack);
  if (!characterPreparation.ready) {
    throw new Error(
      `Diagnostic character pack is not ready: ${characterPreparation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message)
        .join(" ")}`,
    );
  }

  const sceneBlob = await canvasToPngBlob(scene.background);
  const sceneBytes = new Uint8Array(await sceneBlob.arrayBuffer());
  const environmentPrepared = await prepareImageBlob(
    {
      fileName: "diagnostic-forest.png",
      mimeType: "image/png",
      bytes: sceneBytes,
    },
    { trim: false },
  );
  const environmentDecodeStarted = performance.now();
  const environmentDecoded = await decodePreparedImage(environmentPrepared.preparedBlob);
  decodeMs += performance.now() - environmentDecodeStarted;
  if (environmentDecoded.objectUrl) objectUrls.push(environmentDecoded.objectUrl);

  let environmentPack = createEmptyEnvironmentPack({
    id: "diagnostic-forest",
    name: "Diagnostic Forest — Phase 2.5 Import",
    canvas: { width: scene.width, height: scene.height },
  });
  environmentPack = assignEnvironmentLayer(environmentPack, {
    role: "sky",
    imported: environmentPrepared,
    registration: { x: 0, y: 0 },
    provenance: {
      kind: "diagnostic",
      notes:
        "Phase 2.5 procedural forest rasterized and re-imported as a diagnostic single background plate.",
    },
  });
  const environmentPreparation = validateEnvironmentPreparation(environmentPack);
  if (!environmentPreparation.ready) {
    throw new Error(
      `Diagnostic environment pack is not ready: ${environmentPreparation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message)
        .join(" ")}`,
    );
  }

  const environmentImages = new Map<string, CanvasImageSource>([["sky", environmentDecoded.image]]);
  const importedRig = createImportedCharacterRig(baseRig, characterPack, characterImages);
  const rigCompatibility = validateRigCompatibility(baseRig, characterPack);

  const environmentCanvas = document.createElement("canvas");
  environmentCanvas.width = scene.width;
  environmentCanvas.height = scene.height;
  const environmentContext = environmentCanvas.getContext("2d", { willReadFrequently: true });
  if (!environmentContext) {
    throw new Error("Canvas 2D is required for environment fidelity comparison.");
  }
  environmentContext.drawImage(environmentDecoded.image, 0, 0);
  const environmentDifference = comparePixels(
    imageDataForCanvas(scene.background),
    environmentContext.getImageData(0, 0, scene.width, scene.height),
  );

  const importMs = performance.now() - importStarted;

  return {
    seed,
    characterPack,
    packOrigin: { x: minX - margin, y: minY - margin },
    environmentPack,
    characterImages,
    environmentImages,
    importedRig,
    baseRig,
    neutralRig,
    bird,
    scene,
    parts: records,
    characterPreparation,
    environmentPreparation,
    rigCompatibility,
    environmentDifference,
    timing: {
      importMs,
      decodeMs,
      packBuildMs: Math.max(0, importMs - decodeMs),
    },
    objectUrls,
  };
}
