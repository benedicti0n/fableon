import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  analyzePixels,
  extractMaskedRegion,
  type PixelBuffer,
} from "@fableon/illustration-pipeline";
import sharp from "sharp";

import type { HostedProviderId } from "./catalog";
import { RIG_SLOTS, type RigSlot } from "./rig-slots";

export interface ProcessedPart {
  readonly id: string;
  readonly slot: RigSlot;
  readonly file: string;
  readonly sourceFile: string;
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly sourcePivot: { readonly x: number; readonly y: number };
  readonly targetPivot: { readonly x: number; readonly y: number };
  readonly scale: number;
  readonly sha256: string;
  readonly alpha: {
    readonly hasAlpha: boolean;
    readonly opaqueRatio: number;
    readonly transparentRatio: number;
    readonly warnings: readonly string[];
  };
  readonly status: "ready" | "needs_repair" | "rejected";
  readonly notes: readonly string[];
}

export interface PartInput {
  readonly slot: string;
  readonly sourcePath: string;
  readonly sourcePivot: { readonly x: number; readonly y: number };
  readonly scale?: number;
  readonly targetPivot?: { readonly x: number; readonly y: number };
  readonly maskPath?: string;
  readonly notes?: string;
}

export interface BackgroundInput {
  readonly id: string;
  readonly sourcePath: string;
  readonly layers?: readonly {
    readonly id: string;
    readonly sourcePath: string;
    readonly depth: number;
    readonly opacity: number;
  }[];
}

export interface PreparePackInput {
  readonly provider: HostedProviderId;
  readonly model: string;
  readonly experimentId: string;
  readonly title: string;
  readonly outputDir: string;
  readonly parts: readonly PartInput[];
  readonly backgrounds: readonly BackgroundInput[];
  readonly generationMode: "provider-generated" | "engineering-test-fixture";
}

export interface PreparedProviderPack {
  readonly manifestPath: string;
  readonly parts: readonly ProcessedPart[];
  readonly missingSlots: readonly string[];
  readonly backgrounds: readonly {
    readonly id: string;
    readonly file: string;
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
    readonly layers: readonly {
      readonly id: string;
      readonly file: string;
      readonly depth: number;
      readonly opacity: number;
      readonly sha256: string;
    }[];
  }[];
  readonly manifest: Record<string, unknown>;
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fileHash(file: string): Promise<string> {
  return sha256(await readFile(file));
}

export async function readRgbaPixels(file: string): Promise<PixelBuffer> {
  const result = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return {
    width: result.info.width,
    height: result.info.height,
    data: new Uint8ClampedArray(result.data),
  };
}

export async function writeRgbaPng(file: string, pixels: PixelBuffer): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(pixels.data), {
    raw: { width: pixels.width, height: pixels.height, channels: 4 },
  })
    .png()
    .toFile(file);
}

export function registrationFor(input: {
  readonly width: number;
  readonly height: number;
  readonly sourcePivot: { readonly x: number; readonly y: number };
  readonly targetPivot: { readonly x: number; readonly y: number };
  readonly scale?: number;
}): { offsetX: number; offsetY: number; width: number; height: number; scale: number } {
  const scale = input.scale ?? 1;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error("Part scale must be positive.");
  return {
    offsetX: input.targetPivot.x - input.sourcePivot.x * scale,
    offsetY: input.targetPivot.y - input.sourcePivot.y * scale,
    width: Math.max(1, Math.round(input.width * scale)),
    height: Math.max(1, Math.round(input.height * scale)),
    scale,
  };
}

async function processPart(input: PartInput, outputDir: string): Promise<ProcessedPart> {
  const slot = RIG_SLOTS.find((entry) => entry.partId === input.slot);
  if (!slot) throw new Error(`Unknown rig slot "${input.slot}".`);
  const file = path.join(outputDir, "parts", `${slot.partId}.png`);
  await mkdir(path.dirname(file), { recursive: true });
  if (input.maskPath) {
    const source = await readRgbaPixels(input.sourcePath);
    const mask = await readRgbaPixels(input.maskPath);
    const extracted = extractMaskedRegion(source, mask, { maskAlphaThreshold: 8 });
    await writeRgbaPng(file, extracted.pixels);
  } else {
    await copyFile(input.sourcePath, file);
  }
  const pixels = await readRgbaPixels(file);
  const analysis = analyzePixels(pixels);
  const targetPivot = input.targetPivot ?? slot.pivot;
  const registration = registrationFor({
    width: pixels.width,
    height: pixels.height,
    sourcePivot: input.sourcePivot,
    targetPivot,
    ...(input.scale !== undefined ? { scale: input.scale } : {}),
  });
  const warnings = analysis.warnings.map((warning) => `${warning.code}: ${warning.message}`);
  const rejected =
    !analysis.hasAlpha ||
    analysis.opaqueRatio > 0.995 ||
    analysis.contentBounds === null ||
    analysis.warnings.some((warning) => warning.code === "alpha-missing");
  const needsRepair = analysis.warnings.some(
    (warning) => warning.code === "white-halo" || warning.code === "black-halo",
  );
  return {
    id: slot.partId,
    slot,
    file,
    sourceFile: input.sourcePath,
    width: registration.width,
    height: registration.height,
    offsetX: registration.offsetX,
    offsetY: registration.offsetY,
    sourcePivot: input.sourcePivot,
    targetPivot,
    scale: registration.scale,
    sha256: await fileHash(file),
    alpha: {
      hasAlpha: analysis.hasAlpha,
      opaqueRatio: analysis.opaqueRatio,
      transparentRatio: analysis.transparentRatio,
      warnings,
    },
    status: rejected ? "rejected" : needsRepair ? "needs_repair" : "ready",
    notes: input.notes ? [input.notes] : [],
  };
}

async function processBackground(
  input: BackgroundInput,
  outputDir: string,
): Promise<PreparedProviderPack["backgrounds"][number]> {
  const sources =
    input.layers && input.layers.length > 0
      ? input.layers.map((layer) => ({
          id: layer.id,
          sourcePath: layer.sourcePath,
          depth: layer.depth,
          opacity: layer.opacity,
        }))
      : [{ id: "flat", sourcePath: input.sourcePath, depth: 1, opacity: 1 }];
  const layers: Array<{
    id: string;
    file: string;
    depth: number;
    opacity: number;
    sha256: string;
  }> = [];
  for (const layer of sources) {
    const file = path.join(outputDir, "backgrounds", `${input.id}-${layer.id}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await sharp(layer.sourcePath)
      .resize(2600, 1500, { fit: "cover", position: "centre" })
      .png()
      .toFile(file);
    layers.push({
      id: layer.id,
      file,
      depth: layer.depth,
      opacity: layer.opacity,
      sha256: await fileHash(file),
    });
  }
  const metadata = await sharp(layers[0]!.file).metadata();
  return {
    id: input.id,
    file: layers[0]!.file,
    sha256: layers[0]!.sha256,
    width: metadata.width ?? 2600,
    height: metadata.height ?? 1500,
    layers,
  };
}

export async function prepareProviderPack(input: PreparePackInput): Promise<PreparedProviderPack> {
  await mkdir(input.outputDir, { recursive: true });
  const parts: ProcessedPart[] = [];
  for (const partInput of input.parts) {
    parts.push(await processPart(partInput, input.outputDir));
  }
  const backgrounds: Array<PreparedProviderPack["backgrounds"][number]> = [];
  for (const background of input.backgrounds) {
    backgrounds.push(await processBackground(background, input.outputDir));
  }
  const provided = new Set(parts.map((part) => part.id));
  const missingSlots = RIG_SLOTS.map((slot) => slot.partId).filter((id) => !provided.has(id));
  const relative = (file: string) => path.relative(input.outputDir, file).split(path.sep).join("/");
  const manifestParts = await Promise.all(
    parts.map(async (part) => ({
      id: part.id,
      file: relative(part.file),
      offsetX: part.offsetX,
      offsetY: part.offsetY,
      width: part.width,
      height: part.height,
      sha256: part.sha256,
      bytes: (await stat(part.file)).size,
      origin: input.generationMode,
      provider: input.provider,
      model: input.model,
      reviewStatus: part.status === "rejected" ? "rejected" : "pending_artistic_approval",
      sourcePivot: part.sourcePivot,
      targetPivot: part.targetPivot,
      scale: part.scale,
      alpha: part.alpha,
      repairHistory: part.notes,
    })),
  );
  const manifest = {
    format: "fableon.generated-folk-pack",
    version: 1,
    id: `${input.provider}-folk-pilot`,
    title: input.title,
    provider: input.provider,
    model: input.model,
    experimentId: input.experimentId,
    generationMode: input.generationMode,
    aiGeneration: {
      status: input.generationMode === "provider-generated" ? "generated" : "test-fixture",
      reason: "",
      paidApiCalls: input.generationMode === "provider-generated" ? undefined : 0,
    },
    characters: {},
    backgrounds: Object.fromEntries(
      backgrounds.map((background) => [
        background.id,
        {
          masterPng: relative(background.file),
          masterPngSha256: background.sha256,
          masterSvg: "",
          width: background.width,
          height: background.height,
          layers: background.layers.map((layer) => ({
            id: layer.id,
            file: relative(layer.file),
            depth: layer.depth,
            opacity: layer.opacity,
            sha256: layer.sha256,
          })),
        },
      ]),
    ),
    parts: manifestParts,
    missingSlots,
    rigManifest: Object.fromEntries(
      RIG_SLOTS.map((slot) => [
        slot.partId,
        {
          actor: slot.actor,
          nodeId: slot.nodeId,
          parentNodeId: slot.parentNodeId,
          pivot: slot.pivot,
          drawOrder: slot.drawOrder,
        },
      ]),
    ),
  };
  const manifestPath = path.join(input.outputDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const rigManifestPath = path.join(input.outputDir, "rig-manifest.json");
  await writeFile(rigManifestPath, `${JSON.stringify(manifest.rigManifest, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(input.outputDir, "asset-report.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        provider: input.provider,
        model: input.model,
        experimentId: input.experimentId,
        generationMode: input.generationMode,
        parts,
        missingSlots,
        backgroundCount: backgrounds.length,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return { manifestPath, parts, missingSlots, backgrounds, manifest };
}
