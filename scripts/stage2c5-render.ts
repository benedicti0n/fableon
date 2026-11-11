import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

import {
  ensureRendererBundle,
  openProductionRenderer,
  savePng,
  writeJson,
} from "./stage2c4/lib/production-renderer.ts";
import { buildStage2C5Pack } from "./stage2c5/lib/pack.ts";

const trace = process.env.STAGE2C5_TRACE;
if (!trace) throw new Error("STAGE2C5_TRACE is required");
mkdirSync(path.dirname(trace), { recursive: true });
writeFileSync(trace, "");
const log = (message: string) => appendFileSync(trace, `${new Date().toISOString()} ${message}\n`);
const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const sharp = require("sharp");

const ARM_CAMERA = { x: 950, y: 830, zoom: 2.6 };
const LEG_CAMERA = { x: 920, y: 1020, zoom: 2.4 };
const FULL_CAMERA = { x: 820, y: 760, zoom: 1.8 };

const ARM_POSES = [
  {
    name: "neutral",
    patch: {
      nearUpperArm: { rotation: -2 },
      nearForearm: { rotation: -6 },
      handOpen: { rotation: 0 },
    },
  },
  {
    name: "shoulder-lift",
    patch: {
      nearUpperArm: { rotation: -38 },
      nearForearm: { rotation: -12 },
      handOpen: { rotation: 0 },
    },
  },
  {
    name: "elbow-30",
    patch: {
      nearUpperArm: { rotation: -2 },
      nearForearm: { rotation: -30 },
      handOpen: { rotation: 0 },
    },
  },
  {
    name: "elbow-60",
    patch: {
      nearUpperArm: { rotation: -2 },
      nearForearm: { rotation: -60 },
      handOpen: { rotation: 0 },
    },
  },
  {
    name: "elbow-90",
    patch: {
      nearUpperArm: { rotation: -2 },
      nearForearm: { rotation: -90 },
      handOpen: { rotation: 0 },
    },
  },
  {
    name: "wrist-out",
    patch: {
      nearUpperArm: { rotation: -2 },
      nearForearm: { rotation: -35 },
      handOpen: { rotation: 30 },
    },
  },
  {
    name: "wrist-in",
    patch: {
      nearUpperArm: { rotation: -2 },
      nearForearm: { rotation: -35 },
      handOpen: { rotation: -35 },
    },
  },
  {
    name: "open-hand",
    patch: {
      nearUpperArm: { rotation: -2 },
      nearForearm: { rotation: -20 },
      handOpen: { rotation: 0 },
    },
  },
] as const;

const LEG_POSES = [
  {
    name: "neutral",
    patch: { nearThigh: { rotation: 0 }, nearShin: { rotation: 0 }, nearFoot: { rotation: 0 } },
  },
  {
    name: "hip-flex",
    patch: { nearThigh: { rotation: 30 }, nearShin: { rotation: 0 }, nearFoot: { rotation: 0 } },
  },
  {
    name: "knee-flex",
    patch: { nearThigh: { rotation: 0 }, nearShin: { rotation: 45 }, nearFoot: { rotation: 0 } },
  },
  {
    name: "knee-extend",
    patch: { nearThigh: { rotation: 0 }, nearShin: { rotation: -4 }, nearFoot: { rotation: 0 } },
  },
  {
    name: "ankle-up",
    patch: { nearThigh: { rotation: 0 }, nearShin: { rotation: 0 }, nearFoot: { rotation: -20 } },
  },
  {
    name: "ankle-down",
    patch: { nearThigh: { rotation: 0 }, nearShin: { rotation: 0 }, nearFoot: { rotation: 20 } },
  },
  {
    name: "heel",
    patch: { nearThigh: { rotation: 8 }, nearShin: { rotation: 18 }, nearFoot: { rotation: -18 } },
  },
  {
    name: "toe-off",
    patch: { nearThigh: { rotation: -10 }, nearShin: { rotation: 30 }, nearFoot: { rotation: 26 } },
  },
] as const;

async function renderPose(
  page: Awaited<ReturnType<typeof openProductionRenderer>>,
  frame: number,
  patch: Record<string, { rotation: number }>,
  width = 640,
  height = 360,
  debug = false,
): Promise<Buffer> {
  const data = await page.evaluate(
    `window.__stage2c4.renderPose(${frame}, ${JSON.stringify({ nodes: patch })}, ${debug}, ${width}, ${height})`,
  );
  return Buffer.from(data.split(",", 2)[1]!, "base64");
}

async function contactSheet(
  files: string[],
  labels: string[],
  output: string,
  width = 1280,
  height = 720,
) {
  const tiles = await Promise.all(
    files.map(async (file) => ({
      input: await readFile(file),
      left: 0,
      top: 0,
    })),
  );
  void tiles;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels
    .map((label, index) => {
      const x = (index % 2) * 640 + 12;
      const y = Math.floor(index / 2) * 360 + 28;
      return `<rect x="${x - 6}" y="${y - 20}" width="${Math.min(610, label.length * 10 + 18)}" height="28" fill="rgba(26,13,8,.82)"/><text x="${x}" y="${y}" fill="#fff2cf" font-family="Menlo,monospace" font-size="15">${label}</text>`;
    })
    .join("")}</svg>`;
  await sharp({
    create: { width, height, channels: 4, background: { r: 26, g: 13, b: 8, alpha: 1 } },
  })
    .composite(
      await Promise.all([
        ...files.map(async (file, index) => ({
          input: await readFile(file),
          left: (index % 2) * 640,
          top: Math.floor(index / 2) * 360,
        })),
        { input: Buffer.from(svg), left: 0, top: 0 },
      ]),
    )
    .png()
    .toFile(output);
}

async function main() {
  log("render-start");
  const root = process.cwd();
  const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c5");
  const outputs = path.join(root, "outputs", "folk-provider-benchmark", "stage-2c5");
  await mkdir(docs, { recursive: true });
  await mkdir(outputs, { recursive: true });
  const bundle = await ensureRendererBundle(root, log);
  const browser = await chromium.launch({ headless: true });
  log("browser-launched");
  const report: Record<string, unknown> = {};
  try {
    for (const provider of ["openai", "gemini"] as const) {
      log(`provider-start ${provider}`);
      const armPack = await buildStage2C5Pack(root, provider, ARM_CAMERA);
      const armPage = await openProductionRenderer(browser, root, armPack.payload, bundle, log);
      const armDir = path.join(outputs, provider, "arm-poses");
      await mkdir(armDir, { recursive: true });
      const armFiles: string[] = [];
      const armLabels: string[] = [];
      for (const pose of ARM_POSES) {
        const buffer = await renderPose(
          armPage,
          0,
          pose.patch as unknown as Record<string, { rotation: number }>,
        );
        const file = path.join(armDir, `${pose.name}.png`);
        await savePng(file, buffer);
        const meta = await sharp(buffer).metadata();
        armFiles.push(file);
        armLabels.push(
          `${provider.toUpperCase()} · arm · ${pose.name} · ${meta.width}×${meta.height}`,
        );
        log(`arm-pose ${provider} ${pose.name}`);
      }
      await armPage.close();
      await contactSheet(
        armFiles,
        armLabels,
        path.join(docs, `${provider}-arm-poses.png`),
        1280,
        1440,
      );

      const legPack = await buildStage2C5Pack(root, provider, LEG_CAMERA);
      const legPage = await openProductionRenderer(browser, root, legPack.payload, bundle, log);
      const legDir = path.join(outputs, provider, "leg-poses");
      await mkdir(legDir, { recursive: true });
      const legFiles: string[] = [];
      const legLabels: string[] = [];
      for (const pose of LEG_POSES) {
        const buffer = await renderPose(
          legPage,
          0,
          pose.patch as unknown as Record<string, { rotation: number }>,
        );
        const file = path.join(legDir, `${pose.name}.png`);
        await savePng(file, buffer);
        const meta = await sharp(buffer).metadata();
        legFiles.push(file);
        legLabels.push(
          `${provider.toUpperCase()} · leg · ${pose.name} · ${meta.width}×${meta.height}`,
        );
        log(`leg-pose ${provider} ${pose.name}`);
      }
      await legPage.close();
      await contactSheet(
        legFiles,
        legLabels,
        path.join(docs, `${provider}-leg-poses.png`),
        1280,
        1440,
      );
      const fullPack = await buildStage2C5Pack(root, provider, FULL_CAMERA, "reach");
      const fullPage = await openProductionRenderer(browser, root, fullPack.payload, bundle, log);
      const neutral = await renderPose(fullPage, 0, {}, 640, 360);
      await fullPage.close();
      await savePng(path.join(outputs, provider, "neutral-full.png"), neutral);
      await savePng(path.join(docs, `neutral-${provider}.png`), neutral);
      const fullRegistration = fullPack.registration;
      report[provider] = {
        arm: {
          camera: ARM_CAMERA,
          poses: armFiles.map((file, index) => ({
            name: ARM_POSES[index]!.name,
            file: path.relative(root, file),
          })),
        },
        leg: {
          camera: LEG_CAMERA,
          poses: legFiles.map((file, index) => ({
            name: LEG_POSES[index]!.name,
            file: path.relative(root, file),
          })),
        },
        armRegistration: armPack.registration,
        legRegistration: legPack.registration,
        fullRegistration,
      };
      log(`provider-done ${provider}`);
    }
  } finally {
    await browser.close();
    log("browser-closed");
  }
  await writeJson(path.join(docs, "pose-report.json"), report);
  await writeJson(path.join(outputs, "pose-report.json"), report);
  console.log(JSON.stringify({ marker: "stage2c5-render-ok", report }, null, 2));
  log("render-finished");
}

main().catch((error) => {
  log(`ERROR ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  console.error(error);
  process.exit(1);
});
