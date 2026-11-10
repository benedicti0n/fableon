#!/usr/bin/env node
import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { prepareProviderPack, type PartInput } from "../apps/web/lib/providers/assets.ts";
import { validateProviderPack } from "../apps/web/lib/providers/rig-validation.ts";
import { ARTISAN_V2_SLOTS } from "../apps/web/lib/providers/rig-slots.ts";
import { STAGE2B_SHEETS, STAGE2B_SHEET_ORDER } from "../apps/web/lib/providers/stage2b-plan.ts";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");

type Provider = "openai" | "gemini";

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Pixels {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
}

/** Target sizes in master pixels, taken from the existing Phase 5 artisan rig. */
const TARGET_HEIGHT: Readonly<Record<string, number>> = {
  artisan_head: 230,
  artisan_turban: 173,
  artisan_turbanTail: 303,
  artisan_mustache: 79,
  artisan_earring: 101,
  artisan_eye: 68,
  artisan_eyelid: 68,
  artisan_brow: 59,
  artisan_neck: 124,
  artisan_torso: 320,
  artisan_sash: 217,
  artisan_necklace: 86,
  artisan_shoulderSash: 172,
  artisan_pelvis: 193,
  artisan_nearUpperArm: 221,
  artisan_nearForearm: 209,
  artisan_nearElbowCover: 90,
  artisan_handOpen: 113,
  artisan_handGrip: 107,
  artisan_farUpperArm: 215,
  artisan_farForearm: 208,
  artisan_farElbowCover: 90,
  artisan_farHand: 115,
  artisan_nearThigh: 235,
  artisan_nearShin: 232,
  artisan_nearFoot: 119,
  artisan_nearDhoti: 285,
  artisan_farThigh: 234,
  artisan_farShin: 231,
  artisan_farFoot: 117,
  artisan_farDhoti: 273,
};

/** Pivot as a fraction of the trimmed sprite bounds. */
const PIVOT: Readonly<Record<string, { readonly x: number; readonly y: number }>> = {
  artisan_head: { x: 0.5, y: 0.94 },
  artisan_turban: { x: 0.5, y: 0.9 },
  artisan_turbanTail: { x: 0.5, y: 0.05 },
  artisan_mustache: { x: 0.5, y: 0.5 },
  artisan_earring: { x: 0.5, y: 0.1 },
  artisan_eye: { x: 0.5, y: 0.5 },
  artisan_eyelid: { x: 0.5, y: 0.5 },
  artisan_brow: { x: 0.5, y: 0.5 },
  artisan_neck: { x: 0.5, y: 0.9 },
  artisan_torso: { x: 0.5, y: 0.5 },
  artisan_sash: { x: 0.5, y: 0.5 },
  artisan_necklace: { x: 0.5, y: 0.12 },
  artisan_shoulderSash: { x: 0.5, y: 0.5 },
  artisan_pelvis: { x: 0.5, y: 0.1 },
  artisan_nearUpperArm: { x: 0.5, y: 0.05 },
  artisan_nearForearm: { x: 0.5, y: 0.05 },
  artisan_nearElbowCover: { x: 0.5, y: 0.5 },
  artisan_handOpen: { x: 0.06, y: 0.35 },
  artisan_handGrip: { x: 0.06, y: 0.35 },
  artisan_farUpperArm: { x: 0.5, y: 0.05 },
  artisan_farForearm: { x: 0.5, y: 0.05 },
  artisan_farElbowCover: { x: 0.5, y: 0.5 },
  artisan_farHand: { x: 0.06, y: 0.35 },
  artisan_nearThigh: { x: 0.5, y: 0.05 },
  artisan_nearShin: { x: 0.5, y: 0.05 },
  artisan_nearFoot: { x: 0.1, y: 0.3 },
  artisan_nearDhoti: { x: 0.5, y: 0.05 },
  artisan_farThigh: { x: 0.5, y: 0.05 },
  artisan_farShin: { x: 0.5, y: 0.05 },
  artisan_farFoot: { x: 0.1, y: 0.3 },
  artisan_farDhoti: { x: 0.5, y: 0.05 },
};

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || process.argv[index + 1] === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing --${name}`);
  }
  return process.argv[index + 1]!;
}

async function raw(file: string): Promise<Pixels> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function keyGreen(source: string, target: string): Promise<void> {
  const pixels = await raw(source);
  const data = Buffer.from(pixels.data);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    if (g > 145 && g > r * 1.4 && g > b * 1.4) data[i + 3] = 0;
    else if (g > Math.max(r, b) + 8) data[i + 1] = Math.max(r, b);
  }
  await sharp(data, { raw: { width: pixels.width, height: pixels.height, channels: 4 } })
    .png()
    .toFile(target);
}

function alphaBounds(pixels: Pixels): Box {
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
  if (maxX < minX || maxY < minY) throw new Error("Sheet cell has no visible pixels.");
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function trim(
  source: string,
  target: string,
): Promise<{ box: Box; width: number; height: number }> {
  const pixels = await raw(source);
  const box = alphaBounds(pixels);
  await sharp(source)
    .extract({ left: box.x, top: box.y, width: box.width, height: box.height })
    .png()
    .toFile(target);
  return { box, width: box.width, height: box.height };
}

async function main() {
  const provider = arg("provider") as Provider;
  if (provider !== "openai" && provider !== "gemini")
    throw new Error("provider must be openai or gemini");
  const root = process.cwd();
  const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2b");
  const providerDir = path.join(stage, provider);
  const packDir = path.join(providerDir, "pack");
  const generatedDir = path.join(providerDir, "generated");
  const derivedDir = path.join(providerDir, "derived-parts");
  const interimDir = path.join(providerDir, "interim");
  await mkdir(generatedDir, { recursive: true });
  await mkdir(derivedDir, { recursive: true });
  await mkdir(interimDir, { recursive: true });

  const parts: PartInput[] = [];
  const sheetReport: Record<string, unknown> = {};
  for (const sheetId of STAGE2B_SHEET_ORDER) {
    const sheet = STAGE2B_SHEETS[sheetId];
    const requestKey = `stage2b-${provider}-${sheetId}`;
    const responsePath = path.join(providerDir, "requests", `${requestKey}.response.json`);
    const response = JSON.parse(await readFile(responsePath, "utf8")) as {
      files?: Array<{ path: string; sha256?: string }>;
    };
    const rawFile = response.files?.[0]?.path;
    if (!rawFile) throw new Error(`No generated file for ${requestKey}.`);
    const source = path.resolve(root, rawFile);
    const generated = path.join(generatedDir, `${sheetId}${path.extname(source) || ".png"}`);
    await copyFile(source, generated);
    const keyed = provider === "gemini" ? path.join(interimDir, `${sheetId}-keyed.png`) : generated;
    if (provider === "gemini") await keyGreen(generated, keyed);
    const meta = await sharp(keyed).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) throw new Error(`Cannot read sheet dimensions for ${sheetId}.`);
    const cellWidth = width / sheet.columns;
    const cellHeight = height / sheet.rows;
    const sheetParts: string[] = [];
    for (let row = 0; row < sheet.rows; row += 1) {
      for (let column = 0; column < sheet.columns; column += 1) {
        const slot = sheet.slots[row * sheet.columns + column];
        const cellIndex = row * sheet.columns + column;
        if (!slot) continue;
        const cellFile = path.join(interimDir, `${sheetId}-${cellIndex}.png`);
        await sharp(keyed)
          .extract({
            left: Math.round(column * cellWidth),
            top: Math.round(row * cellHeight),
            width: Math.floor(cellWidth),
            height: Math.floor(cellHeight),
          })
          .png()
          .toFile(cellFile);
        const trimmed = path.join(interimDir, `${sheetId}-${cellIndex}-trim.png`);
        const trimResult = await trim(cellFile, trimmed);
        const targetHeight = TARGET_HEIGHT[slot];
        const pivot = PIVOT[slot];
        if (!targetHeight || !pivot) throw new Error(`No target/pivot contract for ${slot}.`);
        const scale = targetHeight / trimResult.height;
        parts.push({
          slot,
          sourcePath: trimmed,
          sourcePivot: {
            x: trimResult.width * pivot.x,
            y: trimResult.height * pivot.y,
          },
          scale,
          notes: `Derived from ${provider} ${sheetId} sheet cell ${cellIndex}; trimmed ${trimResult.width}x${trimResult.height}, scaled ${scale.toFixed(4)} to target height ${targetHeight}.`,
        });
        sheetParts.push(slot);
      }
    }
    sheetReport[sheetId] = {
      requestKey,
      source: path.relative(root, generated),
      width,
      height,
      cells: sheet.columns * sheet.rows,
      parts: sheetParts,
    };
  }

  const pack = await prepareProviderPack({
    provider,
    model: provider === "openai" ? "gpt-image-2.6-sunburst" : "gemini-nano-banana-2.1",
    experimentId: "phase-05.1-stage-2b",
    title: `Stage 2B ${provider} complete artisan rig`,
    outputDir: packDir,
    generationMode: "provider-generated",
    parts,
    backgrounds: [],
    slots: ARTISAN_V2_SLOTS,
  });
  for (const part of pack.parts) {
    await copyFile(part.file, path.join(derivedDir, path.basename(part.file)));
  }
  const validation = await validateProviderPack({
    manifest: pack.manifest as never,
    packDir,
    slots: ARTISAN_V2_SLOTS,
  });
  await writeFile(
    path.join(providerDir, "rig-manifest.json"),
    `${JSON.stringify(pack.manifest, null, 2)}\n`,
  );
  await writeFile(
    path.join(providerDir, "validation.json"),
    `${JSON.stringify(validation, null, 2)}\n`,
  );
  await writeFile(
    path.join(providerDir, "prepare-report.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        provider,
        packDir: path.relative(root, packDir),
        sheets: sheetReport,
        partCount: pack.parts.length,
        missingSlots: pack.missingSlots,
        validation,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    JSON.stringify(
      {
        provider,
        partCount: pack.parts.length,
        missingSlots: pack.missingSlots.length,
        validationOk: validation.ok,
        errors: validation.errors,
      },
      null,
      2,
    ),
  );
  if (!validation.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
