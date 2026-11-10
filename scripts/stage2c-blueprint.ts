#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

import { ARTISAN_V2_RIG, distance } from "../packages/folk-motion/src/index.ts";
import {
  landmarkToMasterPixels,
  type Stage2CAssetContract,
  type Stage2CPartSpec,
} from "../apps/web/lib/providers/stage2c-contract.ts";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");

const root = process.cwd();
const out = path.join(root, "outputs", "folk-provider-benchmark", "stage-2c");
const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c");

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
  const enqueue = (index: number) => {
    if (seen[index] || !similar(index * 4)) return;
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
  while (queue.length) {
    const index = queue.pop()!;
    pixels[index * 4 + 3] = 0;
    const x = index % width,
      y = (index - x) / width;
    if (x > 0) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y < height - 1) enqueue(index + width);
  }
  return sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

function svgMask(
  width: number,
  height: number,
  lines: Array<{ points: Array<{ x: number; y: number }>; stroke: number; color: string }>,
): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${lines.map((line) => `<polyline points="${line.points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${line.color}" stroke-width="${line.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`,
  );
}

async function main() {
  await mkdir(out, { recursive: true });
  await mkdir(docs, { recursive: true });
  const contracts: Record<string, Stage2CAssetContract> = {};
  for (const provider of ["openai", "gemini"] as const) {
    const masterSource = path.join(
      root,
      "docs",
      "benchmarks",
      "phase-05.1",
      "stage-2a",
      `${provider}-master.png`,
    );
    const landmarksPayload = JSON.parse(
      await readFile(
        path.join(
          root,
          "outputs",
          "folk-provider-benchmark",
          "stage-2c",
          `${provider}-landmarks.json`,
        ),
        "utf8",
      ),
    );
    const masterWidth = landmarksPayload.masterWidth as number;
    const masterHeight = landmarksPayload.masterHeight as number;
    const silhouette = landmarksPayload.silhouette;
    const masterBytes = await readFile(masterSource);
    const master =
      provider === "gemini"
        ? await removeCream(masterSource)
        : await sharp(masterSource).png().toBuffer();
    const lm = (id: string) =>
      landmarkToMasterPixels(
        silhouette,
        landmarksPayload.landmarks.find((entry: { id: string }) => entry.id === id),
      );
    const near = {
      shoulder: lm("shoulder-near"),
      elbow: lm("elbow-near"),
      wrist: lm("wrist-near"),
      hip: lm("hip-near"),
      knee: lm("knee-near"),
      ankle: lm("ankle-near"),
      sole: lm("sole-near"),
    };
    const guideLines = [
      {
        points: [near.shoulder, near.elbow, near.wrist],
        stroke: Math.round(masterHeight * 0.07),
        color: "#00d9ff",
      },
      {
        points: [near.hip, near.knee, near.ankle, near.sole],
        stroke: Math.round(masterHeight * 0.09),
        color: "#80ed99",
      },
    ];
    const fullGuide = await sharp(master)
      .composite([{ input: svgMask(masterWidth, masterHeight, guideLines) }])
      .png()
      .toBuffer();
    const labels = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${masterWidth}" height="${masterHeight}">${Object.entries(
        near,
      )
        .map(
          ([name, point]) =>
            `<circle cx="${point.x}" cy="${point.y}" r="8" fill="#fff2cf" stroke="#1a0d08" stroke-width="2"/><text x="${point.x + 10}" y="${point.y - 8}" fill="#fff2cf" font-family="Menlo,monospace" font-size="20">${name}</text>`,
        )
        .join("")}</svg>`,
    );
    const labeled = await sharp(fullGuide)
      .composite([{ input: labels }])
      .png()
      .toBuffer();
    await mkdir(path.join(out, provider), { recursive: true });
    await writeFile(path.join(out, provider, "full-guide.png"), labeled);
    await writeFile(path.join(docs, `${provider}-full-guide.png`), labeled);
    const parts: Stage2CPartSpec[] = [];
    const partDefs: Array<{
      id: string;
      role: Stage2CPartSpec["role"];
      a: { x: number; y: number };
      b: { x: number; y: number };
      width: number;
      owner: Stage2CPartSpec["decorationOwner"];
      parent: string;
      child: string;
      rigA: string;
      rigB: string;
    }> = [
      {
        id: "nearUpperArm",
        role: "upper-arm",
        a: near.shoulder,
        b: near.elbow,
        width: 0.11,
        owner: ["sleeve-pattern"],
        parent: "shoulder",
        child: "elbow",
        rigA: "nearUpperArm",
        rigB: "nearForearm",
      },
      {
        id: "nearForearm",
        role: "forearm",
        a: near.elbow,
        b: near.wrist,
        width: 0.095,
        owner: ["forearm-pattern"],
        parent: "elbow",
        child: "wrist",
        rigA: "nearForearm",
        rigB: "handOpen",
      },
      {
        id: "nearThigh",
        role: "thigh",
        a: near.hip,
        b: near.knee,
        width: 0.13,
        owner: ["dhoti-overlap"],
        parent: "hip",
        child: "knee",
        rigA: "nearThigh",
        rigB: "nearShin",
      },
      {
        id: "nearShin",
        role: "shin",
        a: near.knee,
        b: near.ankle,
        width: 0.1,
        owner: ["shin-outline"],
        parent: "knee",
        child: "ankle",
        rigA: "nearShin",
        rigB: "nearFoot",
      },
    ];
    for (const def of partDefs) {
      const stroke = Math.round(masterHeight * def.width);
      const mask = svgMask(masterWidth, masterHeight, [
        { points: [def.a, def.b], stroke, color: "#ffffff" },
      ]);
      const extracted = await sharp(master)
        .composite([{ input: mask, blend: "dest-in" }])
        .png()
        .toBuffer();
      await writeFile(path.join(out, provider, `visible-${def.id}.png`), extracted);
      await writeFile(path.join(docs, `${provider}-visible-${def.id}.png`), extracted);
      const rigA = ARTISAN_V2_RIG.nodes.find((node) => node.id === def.rigA)?.pivot ?? {
        x: 0,
        y: 0,
      };
      const rigB = ARTISAN_V2_RIG.nodes.find((node) => node.id === def.rigB)?.pivot ?? {
        x: 0,
        y: 0,
      };
      const masterLength = distance(def.a, def.b);
      const rigLength = distance(rigA, rigB);
      const ratio = masterLength / Math.max(1, rigLength);
      parts.push({
        id: def.id,
        characterId: `artisan_${provider}`,
        provider,
        role: def.role,
        masterAsset: path.relative(root, masterSource),
        sourceMaster: path.relative(root, masterSource),
        parentJoint: def.parent,
        childJoint: def.child,
        masterLandmarks: {
          parent: {
            x: (def.a.x - silhouette.minX) / (silhouette.maxX - silhouette.minX),
            y: (def.a.y - silhouette.minY) / (silhouette.maxY - silhouette.minY),
          },
          child: {
            x: (def.b.x - silhouette.minX) / (silhouette.maxX - silhouette.minX),
            y: (def.b.y - silhouette.minY) / (silhouette.maxY - silhouette.minY),
          },
        },
        expectedSegmentLengthPx: masterLength,
        expectedNeutralLocation: {
          x: (def.a.x + def.b.x) / 2 / masterWidth,
          y: (def.a.y + def.b.y) / 2 / masterHeight,
        },
        expectedVisibleRegion: {
          minX: Math.min(def.a.x, def.b.x) - stroke,
          minY: Math.min(def.a.y, def.b.y) - stroke,
          maxX: Math.max(def.a.x, def.b.x) + stroke,
          maxY: Math.max(def.a.y, def.b.y) + stroke,
        },
        expectedSpriteOrientationDeg:
          (Math.atan2(def.b.y - def.a.y, def.b.x - def.a.x) * 180) / Math.PI,
        allowedScaleAdjustment: { min: 0.85, max: 1.15 },
        hiddenOverlapZone: { parent: Math.round(stroke * 0.35), child: Math.round(stroke * 0.35) },
        occlusionOwner: def.role === "thigh" ? "cover-over" : "child-over-parent",
        decorationOwner: def.owner,
        sourcePixelProvenance: [path.relative(root, masterSource), `visible-${def.id}.png`],
        providerGenerationReference: null,
        approvalStatus: ratio < 0.75 || ratio > 1.35 ? "needs-editing" : "source-preserved",
        notes: [
          `Master/rig segment ratio ${ratio.toFixed(3)}. Visible master region extracted by a capsule mask; hidden shoulder/elbow/hip/knee geometry still must be supplied by source-preserving repair.`,
        ],
      });
    }
    const contract: Stage2CAssetContract = {
      format: "fableon.rig-first-part-contract",
      version: 1,
      experimentId: "phase-05.1-stage-2c",
      characterId: `artisan_${provider}`,
      provider,
      master: {
        source: path.relative(root, masterSource),
        width: masterWidth,
        height: masterHeight,
        silhouette,
        sha256: createHash("sha256").update(masterBytes).digest("hex"),
      },
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
    console.log(
      provider,
      "parts",
      parts.length,
      parts.map((part) => `${part.id}:${part.approvalStatus}`).join(" "),
    );
  }
  await writeFile(path.join(out, "contracts.json"), `${JSON.stringify(contracts, null, 2)}\n`);
  await writeFile(path.join(docs, "contracts.json"), `${JSON.stringify(contracts, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
