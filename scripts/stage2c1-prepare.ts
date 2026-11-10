#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");
const root = process.cwd();
const out = path.join(root, "outputs", "folk-provider-benchmark", "stage-2c1");
const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c1");

const config = {
  openai: {
    master: "docs/benchmarks/phase-05.1/stage-2a/openai-master.png",
    silhouette: { minX: 465, minY: 0, maxX: 1002, maxY: 1024 },
    landmarks: {
      "head-center": [760, 150, "observed"],
      eye: [800, 150, "observed"],
      nose: [850, 190, "observed"],
      "shoulder-near": [820, 310, "manual"],
      "elbow-near": [860, 500, "manual"],
      "wrist-near": [880, 590, "manual"],
      "shoulder-far": [600, 310, "inferred"],
      "elbow-far": [560, 500, "inferred"],
      "wrist-far": [540, 590, "inferred"],
      "hip-near": [750, 690, "manual"],
      "knee-near": [760, 850, "manual"],
      "ankle-near": [800, 960, "manual"],
      "sole-near": [820, 1000, "manual"],
      "hip-far": [620, 690, "inferred"],
      "knee-far": [630, 850, "inferred"],
      "ankle-far": [600, 960, "inferred"],
    },
    polygons: {
      nearUpperArm: [
        [760, 290],
        [900, 290],
        [910, 520],
        [830, 530],
        [780, 420],
      ],
      nearForearm: [
        [820, 510],
        [910, 510],
        [910, 640],
        [830, 640],
      ],
      nearThigh: [
        [660, 670],
        [860, 670],
        [900, 930],
        [700, 930],
      ],
      nearShin: [
        [790, 890],
        [870, 890],
        [870, 960],
        [790, 960],
      ],
    },
    missing: {
      shoulder: [820, 310, 34],
      elbow: [860, 500, 30],
      hip: [750, 690, 32],
      knee: [760, 850, 30],
    },
    boxes: {
      nearUpperArm: [760, 280, 930, 540, "blue"],
      nearForearm: [820, 500, 930, 670, "skin"],
      nearThigh: [650, 680, 940, 940, "cream"],
      nearShin: [760, 880, 890, 990, "skin"],
    },
  },
  gemini: {
    master: "docs/benchmarks/phase-05.1/stage-2a/gemini-master.png",
    silhouette: { minX: 893, minY: 92, maxX: 1586, maxY: 1617 },
    landmarks: {
      "head-center": [1280, 300, "observed"],
      eye: [1350, 350, "observed"],
      nose: [1430, 400, "observed"],
      "shoulder-near": [1320, 550, "manual"],
      "elbow-near": [1480, 800, "manual"],
      "wrist-near": [1500, 1050, "manual"],
      "shoulder-far": [1150, 550, "inferred"],
      "elbow-far": [1100, 800, "inferred"],
      "wrist-far": [1100, 1050, "inferred"],
      "hip-near": [1300, 1150, "manual"],
      "knee-near": [1300, 1450, "manual"],
      "ankle-near": [1300, 1600, "manual"],
      "sole-near": [1300, 1640, "manual"],
      "hip-far": [1250, 1150, "inferred"],
      "knee-far": [1220, 1450, "inferred"],
      "ankle-far": [1220, 1600, "inferred"],
    },
    polygons: {
      nearUpperArm: [
        [1200, 520],
        [1440, 520],
        [1480, 840],
        [1230, 840],
      ],
      nearForearm: [
        [1420, 820],
        [1530, 820],
        [1530, 1080],
        [1440, 1080],
      ],
      nearThigh: [
        [1180, 1120],
        [1420, 1120],
        [1420, 1500],
        [1180, 1500],
      ],
      nearShin: [
        [1270, 1460],
        [1350, 1460],
        [1350, 1600],
        [1270, 1600],
      ],
    },
    missing: {
      shoulder: [1320, 550, 34],
      elbow: [1480, 800, 30],
      hip: [1300, 1150, 32],
      knee: [1300, 1450, 30],
    },
    boxes: {
      nearUpperArm: [1250, 500, 1520, 870, "blue"],
      nearForearm: [1400, 800, 1560, 1100, "skin"],
      nearThigh: [1150, 1100, 1450, 1520, "cream"],
      nearShin: [1250, 1430, 1370, 1620, "skin"],
    },
  },
} as const;

async function removeCream(file: string): Promise<Buffer> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data);
  const width = info.width,
    height = info.height;
  const corner = [pixels[0]!, pixels[1]!, pixels[2]!];
  const similar = (i: number) =>
    Math.abs(pixels[i]! - corner[0]) < 34 &&
    Math.abs(pixels[i + 1]! - corner[1]) < 34 &&
    Math.abs(pixels[i + 2]! - corner[2]) < 34;
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  const enqueue = (i: number) => {
    if (seen[i] || !similar(i * 4)) return;
    seen[i] = 1;
    queue.push(i);
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (queue.length) {
    const i = queue.pop()!;
    pixels[i * 4 + 3] = 0;
    const x = i % width,
      y = (i - x) / width;
    if (x > 0) enqueue(i - 1);
    if (x < width - 1) enqueue(i + 1);
    if (y > 0) enqueue(i - width);
    if (y < height - 1) enqueue(i + width);
  }
  return sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

async function colorMask(
  master: Buffer,
  box: readonly [number, number, number, number, string],
): Promise<Buffer> {
  const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const width = info.width;
  const height = info.height;
  const [minX, minY, maxX, maxY, kind] = box;
  const binary = new Uint8Array(width * height);
  for (let y = Math.max(0, minY); y < Math.min(height, maxY); y += 1) {
    for (let x = Math.max(0, minX); x < Math.min(width, maxX); x += 1) {
      const i = (y * width + x) * 4;
      if ((data[i + 3] ?? 0) <= 8) continue;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const match =
        kind === "blue"
          ? b > 45 && b > r * 1.08 && b > g * 0.72
          : kind === "skin"
            ? r > 115 && g > 45 && g < 165 && b < 135 && r > g * 1.15
            : r > 195 && g > 175 && b > 125 && Math.abs(r - g) < 55;
      if (match) binary[y * width + x] = 1;
    }
  }
  for (let pass = 0; pass < 3; pass += 1) {
    const next = binary.slice();
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        if (binary[y * width + x]) continue;
        const i = (y * width + x) * 4;
        if ((data[i + 3] ?? 0) <= 8) continue;
        if (
          binary[(y - 1) * width + x] ||
          binary[(y + 1) * width + x] ||
          binary[y * width + x - 1] ||
          binary[y * width + x + 1]
        ) {
          next[y * width + x] = 1;
        }
      }
    }
    binary.set(next);
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < binary.length; i += 1) {
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = binary[i] ? 255 : 0;
  }
  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(out, { recursive: true });
  await mkdir(docs, { recursive: true });
  const contracts: Record<string, unknown> = {};
  for (const provider of ["openai", "gemini"] as const) {
    const cfg = config[provider];
    const masterSource = path.join(root, cfg.master);
    const masterBytes = await readFile(masterSource);
    const master =
      provider === "gemini"
        ? await removeCream(masterSource)
        : await sharp(masterSource).png().toBuffer();
    const meta = await sharp(master).metadata();
    const width = meta.width!,
      height = meta.height!;
    await mkdir(path.join(out, provider), { recursive: true });
    const landmarkSvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${Object.entries(
        cfg.landmarks,
      )
        .map(
          ([id, [x, y, origin]]) =>
            `<circle cx="${x}" cy="${y}" r="9" fill="${origin === "observed" ? "#4cc9f0" : origin === "manual" ? "#ffd166" : "#ff6b6b"}" stroke="#1a0d08" stroke-width="2"/><text x="${x + 12}" y="${y - 8}" fill="#fff2cf" font-family="Menlo,monospace" font-size="22">${id} (${origin})</text>`,
        )
        .join("")}</svg>`,
    );
    const landmarksOverlay = await sharp(master)
      .composite([{ input: landmarkSvg }])
      .png()
      .toBuffer();
    await writeFile(path.join(out, provider, "landmarks.png"), landmarksOverlay);
    await writeFile(path.join(docs, `${provider}-landmarks.png`), landmarksOverlay);
    const parts = [];
    for (const [part, polygon] of Object.entries(cfg.polygons)) {
      const mask = await colorMask(master, cfg.boxes[part as keyof typeof cfg.boxes]);
      const extracted = await sharp(master)
        .composite([{ input: mask, blend: "dest-in" }])
        .png()
        .toBuffer();
      await writeFile(path.join(out, provider, `mask-${part}.png`), mask);
      await writeFile(path.join(out, provider, `extract-${part}.png`), extracted);
      await writeFile(path.join(docs, `${provider}-mask-${part}.png`), mask);
      await writeFile(path.join(docs, `${provider}-extract-${part}.png`), extracted);
      const missing = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g fill="rgba(255,90,60,0.55)" stroke="#ff5a3c" stroke-width="3">${Object.values(
          cfg.missing,
        )
          .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
          .join("")}</g></svg>`,
      );
      await writeFile(
        path.join(docs, `${provider}-missing-${part}.png`),
        await sharp(master)
          .composite([{ input: missing }])
          .png()
          .toBuffer(),
      );
      parts.push({
        id: part,
        mask: `${provider}-mask-${part}.png`,
        extract: `${provider}-extract-${part}.png`,
        polygon,
        missingZones: cfg.missing,
        status: "needs-review",
        note: "Editable polygon source mask; hidden joint geometry still missing.",
      });
    }
    const contract = {
      format: "fableon.rig-first-part-contract",
      version: 1,
      experimentId: "phase-05.1-stage-2c1",
      characterId: `artisan_${provider}`,
      provider,
      master: {
        source: cfg.master,
        width,
        height,
        sha256: createHash("sha256").update(masterBytes).digest("hex"),
        silhouette: cfg.silhouette,
      },
      landmarks: Object.fromEntries(
        Object.entries(cfg.landmarks).map(([id, [x, y, origin]]) => [
          id,
          {
            x: (x - cfg.silhouette.minX) / (cfg.silhouette.maxX - cfg.silhouette.minX),
            y: (y - cfg.silhouette.minY) / (cfg.silhouette.maxY - cfg.silhouette.minY),
            masterPixel: { x, y },
            origin,
            confidence: origin === "observed" ? 0.9 : origin === "manual" ? 0.65 : 0.4,
          },
        ]),
      ),
      parts,
    };
    contracts[provider] = contract;
    await writeFile(
      path.join(out, provider, "contract.json"),
      `${JSON.stringify(contract, null, 2)}\n`,
    );
    await writeFile(
      path.join(docs, `${provider}-contract.json`),
      `${JSON.stringify(contract, null, 2)}\n`,
    );
    console.log(provider, parts.length, "parts");
  }
  await writeFile(path.join(out, "contracts.json"), `${JSON.stringify(contracts, null, 2)}\n`);
  await writeFile(path.join(docs, "contracts.json"), `${JSON.stringify(contracts, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
