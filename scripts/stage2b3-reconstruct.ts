#!/usr/bin/env node
import { createRequire } from "node:module";
import { appendFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";
import { resolveConnectorPose, type ConnectorRig } from "../packages/folk-motion/src/index.ts";
import {
  STAGE2B1_BASE_CONFIG,
  stage2b1FrameState,
} from "../apps/web/lib/providers/stage2b1-motion.ts";
import { translationMatrix } from "../packages/sprite-motion/src/index.ts";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");

function log(...args: unknown[]): void {
  appendFileSync(
    "/tmp/stage2b3-log.txt",
    `${args.map((value) => (typeof value === "string" ? value : JSON.stringify(value))).join(" ")}\n`,
  );
}

async function removeCreamBackground(file: string): Promise<Buffer> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data);
  const width = info.width;
  const height = info.height;
  const corner = [pixels[0]!, pixels[1]!, pixels[2]!];
  const similar = (i: number) =>
    Math.abs(pixels[i]! - corner[0]) < 34 &&
    Math.abs(pixels[i + 1]! - corner[1]) < 34 &&
    Math.abs(pixels[i + 2]! - corner[2]) < 34;
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  const enqueue = (index: number) => {
    if (seen[index]) return;
    if (!similar(index * 4)) return;
    seen[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (queue.length > 0) {
    const index = queue.pop()!;
    const i = index * 4;
    pixels[i + 3] = 0;
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y < height - 1) enqueue(index + width);
  }
  return sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

async function alphaBounds(
  file: Buffer,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width,
    minY = info.height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < info.height; y += 1)
    for (let x = 0; x < info.width; x += 1) {
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function main() {
  const root = process.cwd();
  const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2b3");
  const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2b3");
  await mkdir(stage, { recursive: true });
  await mkdir(docs, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const provider of ["openai", "gemini"] as const) {
    const packDir = path.join(
      root,
      "outputs",
      "folk-provider-benchmark",
      "stage-2b",
      provider,
      "pack",
    );
    const manifest = JSON.parse(await readFile(path.join(packDir, "manifest.json"), "utf8")) as {
      parts: Array<{
        id: string;
        file: string;
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
      }>;
    };
    const connector = JSON.parse(
      await readFile(
        path.join(
          root,
          "outputs",
          "folk-provider-benchmark",
          "stage-2b2",
          provider,
          "connectors.json",
        ),
        "utf8",
      ),
    ) as { rig: ConnectorRig };
    const neutralState = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 0);
    const neutral = neutralState.pose;
    const initial = resolveConnectorPose(connector.rig, neutral, translationMatrix(0, 0));
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const part of initial) {
      const source = manifest.parts.find((entry) => entry.id === part.partId)!;
      for (const [x, y] of [
        [source.offsetX, source.offsetY],
        [source.offsetX + source.width, source.offsetY],
        [source.offsetX + source.width, source.offsetY + source.height],
        [source.offsetX, source.offsetY + source.height],
      ] as const) {
        const point = {
          x: part.world.a * x + part.world.c * y + part.world.e,
          y: part.world.b * x + part.world.d * y + part.world.f,
        };
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }
    const margin = 80;
    const width = Math.ceil(maxX - minX + margin * 2);
    const height = Math.ceil(maxY - minY + margin * 2);
    const rootWorld = translationMatrix(margin - minX, margin - minY);
    const resolved = resolveConnectorPose(connector.rig, neutral, rootWorld);
    const images = new Map<string, string>();
    for (const part of manifest.parts)
      images.set(part.id, (await readFile(path.join(packDir, part.file))).toString("base64"));
    const payload = {
      width,
      height,
      nodes: resolved.map((part) => {
        const source = manifest.parts.find((entry) => entry.id === part.partId)!;
        return {
          partId: part.partId,
          matrix: part.world,
          offsetX: source.offsetX,
          offsetY: source.offsetY,
          width: source.width,
          height: source.height,
        };
      }),
      images: Object.fromEntries(images),
    };
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(
      `<!doctype html><html><body style="margin:0"><canvas id="c" width="${width}" height="${height}"></canvas><script>
      const p=${JSON.stringify(payload)};const c=document.getElementById('c').getContext('2d');const imgs={};
      for(const [id,b] of Object.entries(p.images)){const i=new Image();i.src='data:image/png;base64,'+b;imgs[id]=i;}
      Promise.all(Object.values(imgs).map(i=>i.decode())).then(()=>{for(const n of p.nodes){const m=n.matrix;c.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);c.drawImage(imgs[n.partId],n.offsetX,n.offsetY,n.width,n.height);}window.ready=true;});
    </script></body></html>`,
      { waitUntil: "load" },
    );
    await page.waitForFunction(
      () => (window as unknown as { ready?: boolean }).ready === true,
      null,
      { timeout: 30_000 },
    );
    const data = await page.evaluate(() => document.getElementById("c").toDataURL("image/png"));
    await page.close();
    const reconstruction = Buffer.from(data.split(",", 2)[1]!, "base64");
    await writeFile(path.join(stage, `${provider}-reconstruction.png`), reconstruction);
    log(provider, "reconstruction ready");
    const masterRaw = await readFile(
      path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2a", `${provider}-master.png`),
    );
    log(provider, "master read");
    const master =
      provider === "gemini" ? await removeCreamBackgroundFromBuffer(masterRaw) : masterRaw;
    log(provider, "master background ready");
    const masterBounds = await alphaBounds(master);
    const reconBounds = await alphaBounds(reconstruction);
    log(provider, "recon bounds", reconBounds, "master bounds", masterBounds);
    const masterCropped = await sharp(master)
      .extract({
        left: masterBounds.x,
        top: masterBounds.y,
        width: masterBounds.width,
        height: masterBounds.height,
      })
      .png()
      .toBuffer();
    const masterMeta = await sharp(masterCropped).metadata();
    const masterScale = Math.min(
      reconBounds.width / (masterMeta.width ?? 1),
      reconBounds.height / (masterMeta.height ?? 1),
    );
    const masterW = Math.max(1, Math.round((masterMeta.width ?? 1) * masterScale));
    const masterH = Math.max(1, Math.round((masterMeta.height ?? 1) * masterScale));
    const masterAligned = await sharp(masterCropped)
      .resize(masterW, masterH, { fit: "inside" })
      .png()
      .toBuffer();
    const masterLeft = reconBounds.x + Math.round((reconBounds.width - masterW) / 2);
    const masterTop = reconBounds.y + Math.round((reconBounds.height - masterH) / 2);
    const canvas = sharp({
      create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    });
    const masterPlaced = await canvas
      .clone()
      .composite([{ input: masterAligned, left: masterLeft, top: masterTop }])
      .png()
      .toBuffer();
    const halfMaster = await withOpacity(masterPlaced, 0.5);
    const overlay = await sharp(reconstruction)
      .composite([{ input: halfMaster }])
      .png()
      .toBuffer();
    log(provider, "panel ready");
    await writeFile(path.join(docs, `${provider}-reconstruction.png`), reconstruction);
    await writeFile(
      path.join(docs, `master-reconstruction-${provider}.png`),
      await panel(
        masterPlaced,
        reconstruction,
        overlay,
        `${provider} master vs neutral reconstruction`,
      ),
    );
    await writeFile(path.join(docs, `anatomy-overlay-${provider}.png`), overlay);
    log(provider, "iou", await iou(masterPlaced, reconstruction), "size", { width, height });
  }
  await browser.close();
}

async function withOpacity(buffer: Buffer, opacity: number): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = Math.round((pixels[i] ?? 0) * opacity);
  return sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function removeCreamBackgroundFromBuffer(buffer: Buffer): Promise<Buffer> {
  const temp = path.join(
    process.cwd(),
    "outputs",
    "folk-provider-benchmark",
    "stage-2b3",
    "_master-temp.png",
  );
  await writeFile(temp, buffer);
  const result = await removeCreamBackground(temp);
  return result;
}

async function iou(a: Buffer, b: Buffer): Promise<number> {
  const aa = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bb = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let intersection = 0,
    union = 0;
  for (let i = 3; i < aa.data.length; i += 4) {
    const ap = (aa.data[i] ?? 0) > 8,
      bp = (bb.data[i] ?? 0) > 8;
    if (ap && bp) intersection += 1;
    if (ap || bp) union += 1;
  }
  return union === 0 ? 0 : intersection / union;
}

async function panel(
  master: Buffer,
  reconstruction: Buffer,
  overlay: Buffer,
  label: string,
): Promise<Buffer> {
  const meta = await sharp(reconstruction).metadata();
  const width = meta.width ?? 1,
    height = meta.height ?? 1;
  const tileW = 360,
    tileH = Math.round((height / width) * tileW);
  const header = 44;
  const result = sharp({
    create: {
      width: tileW * 3,
      height: tileH + header,
      channels: 4,
      background: { r: 26, g: 13, b: 8, alpha: 1 },
    },
  });
  const tiles = await Promise.all(
    [master, reconstruction, overlay].map((input) =>
      sharp(input).resize(tileW, tileH).png().toBuffer(),
    ),
  );
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW * 3}" height="${header}"><text x="12" y="28" fill="#fff2cf" font-family="Georgia,serif" font-size="18">${label}</text><text x="370" y="28" fill="#d2a164" font-family="Menlo,monospace" font-size="11">original</text><text x="730" y="28" fill="#d2a164" font-family="Menlo,monospace" font-size="11">reconstruction</text><text x="1090" y="28" fill="#d2a164" font-family="Menlo,monospace" font-size="11">overlay</text></svg>`,
  );
  return result
    .composite([
      { input: svg, left: 0, top: 0 },
      ...tiles.map((input, index) => ({ input, left: index * tileW, top: header })),
    ])
    .png()
    .toBuffer();
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
