#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { prepareProviderPack } from "../apps/web/lib/providers/assets.ts";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");

type Box = { x: number; y: number; width: number; height: number };

async function raw(file: string): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function alphaBounds(pixels: { data: Buffer; width: number; height: number }): Box {
  let minX = pixels.width;
  let minY = pixels.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      if ((pixels.data[(y * pixels.width + x) * 4 + 3] ?? 0) > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < minX || maxY < minY) throw new Error("Part has no visible pixels.");
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function trimTransparent(
  source: string,
  target: string,
): Promise<{ box: Box; width: number; height: number; offsetX: number; offsetY: number }> {
  const pixels = await raw(source);
  const box = alphaBounds(pixels);
  await sharp(source)
    .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
    .png()
    .toFile(target);
  return { box, width: box.width, height: box.height, offsetX: box.x, offsetY: box.y };
}

async function keyGreen(source: string, target: string): Promise<void> {
  const pixels = await raw(source);
  const data = Buffer.from(pixels.data);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    if (g > 150 && g > r * 1.45 && g > b * 1.45) {
      data[i + 3] = 0;
    } else if (g > Math.max(r, b)) {
      // Despill green into the neutral channel to reduce chroma fringes.
      data[i + 1] = Math.max(r, b);
    }
  }
  await sharp(data, { raw: { width: pixels.width, height: pixels.height, channels: 4 } })
    .png()
    .toFile(target);
}

async function cropRegion(source: string, target: string, box: Box): Promise<void> {
  await sharp(source)
    .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
    .png()
    .toFile(target);
}

async function main() {
  const root = process.cwd();
  const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2a");
  await mkdir(stage, { recursive: true });

  const openaiSource = {
    head: path.join(
      root,
      "outputs/folk-provider-benchmark/openai/attempts/stage2a-openai-head/output-00.png",
    ),
    torso: path.join(
      root,
      "outputs/folk-provider-benchmark/openai/attempts/stage2a-openai-torso/output-00.png",
    ),
    upperArm: path.join(
      root,
      "outputs/folk-provider-benchmark/openai/attempts/stage2a-openai-upper-arm/output-00.png",
    ),
    forearm: path.join(
      root,
      "outputs/folk-provider-benchmark/openai/attempts/stage2a-openai-forearm/output-00.png",
    ),
  };
  const openaiPivots = {
    head: { x: 520, y: 940 },
    torso: { x: 512, y: 512 },
    upperArm: { x: 650, y: 90 },
    forearm: { x: 429, y: 280 },
  };
  const openaiScales = { head: 0.45, torso: 0.55, upperArm: 0.22, forearm: 0.22 };
  const openaiTargets = {
    head: { x: 470, y: 430 },
    torso: { x: 440, y: 560 },
    upperArm: { x: 530, y: 490 },
    forearm: { x: 510, y: 680 },
  } as const;

  const openaiTrim = path.join(stage, "openai-trimmed");
  await mkdir(openaiTrim, { recursive: true });
  const slotFor = {
    head: "artisan_head",
    torso: "artisan_torso",
    upperArm: "artisan_nearUpperArm",
    forearm: "artisan_nearForearm",
  } as const;
  const openaiParts = [];
  for (const key of ["head", "torso", "upperArm", "forearm"] as const) {
    const file = path.join(openaiTrim, `${key}.png`);
    const trim = await trimTransparent(openaiSource[key], file);
    openaiParts.push({
      slot: slotFor[key],
      sourcePath: file,
      sourcePivot: {
        x: openaiPivots[key].x - trim.offsetX,
        y: openaiPivots[key].y - trim.offsetY,
      },
      scale: openaiScales[key],
      targetPivot: openaiTargets[key],
      notes:
        "OpenAI reference-guided part; transparent output trimmed and registered to the Stage 2A diagnostic rig.",
    });
  }

  const openaiPack = await prepareProviderPack({
    provider: "openai",
    model: "gpt-image-2.6-sunburst",
    experimentId: "phase-05.1-folk-pilot",
    title: "Stage 2A OpenAI artisan parts",
    outputDir: path.join(stage, "openai-pack"),
    generationMode: "provider-generated",
    parts: openaiParts,
    backgrounds: [],
  });

  // Gemini: key green, crop the four quadrants, then register.
  const geminiSheet = path.join(
    root,
    "outputs/folk-provider-benchmark/gemini/attempts/stage2a-gemini-parts-sheet/output-00.png",
  );
  const geminiKeyed = path.join(stage, "gemini-keyed-sheet.png");
  await keyGreen(geminiSheet, geminiKeyed);
  const geminiCrops: Record<string, { box: Box; pivot: { x: number; y: number }; scale: number }> =
    {
      head: {
        box: { x: 100, y: 80, width: 820, height: 820 },
        pivot: { x: 540, y: 830 },
        scale: 0.35,
      },
      torso: {
        box: { x: 1080, y: 100, width: 820, height: 1000 },
        pivot: { x: 1480, y: 560 },
        scale: 0.45,
      },
      upperArm: {
        box: { x: 280, y: 1180, width: 420, height: 720 },
        pivot: { x: 470, y: 1260 },
        scale: 0.2,
      },
      forearm: {
        box: { x: 920, y: 1200, width: 1060, height: 620 },
        pivot: { x: 1000, y: 1330 },
        scale: 0.18,
      },
    };
  const geminiTrim = path.join(stage, "gemini-trimmed");
  await mkdir(geminiTrim, { recursive: true });
  const geminiParts = [];
  for (const key of ["head", "torso", "upperArm", "forearm"] as const) {
    const cropFile = path.join(geminiTrim, `${key}-crop.png`);
    const trimFile = path.join(geminiTrim, `${key}.png`);
    const crop = geminiCrops[key];
    await cropRegion(geminiKeyed, cropFile, crop.box);
    const trim = await trimTransparent(cropFile, trimFile);
    const pivot =
      key === "head"
        ? { x: trim.width * 0.5, y: trim.height * 0.93 }
        : key === "torso"
          ? { x: trim.width * 0.5, y: trim.height * 0.5 }
          : key === "upperArm"
            ? { x: trim.width * 0.5, y: 30 }
            : { x: 140, y: 40 };
    geminiParts.push({
      slot: slotFor[key],
      sourcePath: trimFile,
      sourcePivot: pivot,
      scale: key === "head" ? 0.5 : key === "torso" ? 0.6 : key === "upperArm" ? 0.35 : 0.32,
      targetPivot:
        key === "head"
          ? { x: 470, y: 430 }
          : key === "torso"
            ? { x: 440, y: 560 }
            : key === "upperArm"
              ? { x: 530, y: 490 }
              : { x: 560, y: 690 },
      notes:
        "Gemini sheet part; chroma-keyed #00FF00, despilled, cropped and registered to the Stage 2A diagnostic rig.",
    });
  }

  const geminiPack = await prepareProviderPack({
    provider: "gemini",
    model: "gemini-nano-banana-2.1",
    experimentId: "phase-05.1-folk-pilot",
    title: "Stage 2A Gemini artisan parts",
    outputDir: path.join(stage, "gemini-pack"),
    generationMode: "provider-generated",
    parts: geminiParts,
    backgrounds: [],
  });

  const report = {
    preparedAt: new Date().toISOString(),
    openai: {
      manifestPath: path.relative(root, openaiPack.manifestPath),
      parts: openaiPack.parts.map((part) => ({
        id: part.id,
        status: part.status,
        alpha: part.alpha,
        offsetX: part.offsetX,
        offsetY: part.offsetY,
        width: part.width,
        height: part.height,
        scale: part.scale,
        sourcePivot: part.sourcePivot,
        targetPivot: part.targetPivot,
      })),
      missingSlots: openaiPack.missingSlots.length,
    },
    gemini: {
      manifestPath: path.relative(root, geminiPack.manifestPath),
      parts: geminiPack.parts.map((part) => ({
        id: part.id,
        status: part.status,
        alpha: part.alpha,
        offsetX: part.offsetX,
        offsetY: part.offsetY,
        width: part.width,
        height: part.height,
        scale: part.scale,
        sourcePivot: part.sourcePivot,
        targetPivot: part.targetPivot,
      })),
      missingSlots: geminiPack.missingSlots.length,
    },
  };
  await writeFile(path.join(stage, "pack-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
