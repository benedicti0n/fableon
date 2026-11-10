import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { ARTISAN_RIG, artisanPose, resolveFolkPose } from "../../packages/folk-motion/src/index.ts";
import { transformPoint } from "../../packages/sprite-motion/src/index.ts";
import {
  buildProductionPayload,
  ensureRendererBundle,
  openProductionRenderer,
  renderProductionFrame,
  renderProductionJoint,
  savePng,
  writeJson,
  type ProductionPayload,
} from "./lib/production-renderer.ts";

const trace = process.env.STAGE2C4_TRACE;
if (!trace) throw new Error("STAGE2C4_TRACE is required");
mkdirSync(path.dirname(trace), { recursive: true });
writeFileSync(trace, "");
const log = (message: string) => appendFileSync(trace, `${new Date().toISOString()} ${message}\n`);
const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const sharp = require("sharp");

function finiteTransforms(payload: ProductionPayload) {
  const config = payload.config as {
    motion: { artisan: Record<string, number> };
    groundY: number;
  };
  const placement = { x: 680, y: config.groundY - 1020 * 0.52, scale: 0.52 };
  const pose = artisanPose({
    action: "reach",
    frame: 60,
    globalFrame: 60,
    scale: 0.52,
    config: { ...(config.motion.artisan as never), walkSpeed: 0 },
    reach: {
      target: {
        x: (1039 - placement.x) / placement.scale,
        y: (864 - placement.y) / placement.scale,
      },
      startFrame: 26,
      endFrame: 78,
      gripFrame: 60,
      releaseFrame: 96,
    },
  });
  const nodes = resolveFolkPose(ARTISAN_RIG, pose);
  const partIds = new Set(payload.parts.map((part) => part.id));
  const missing = nodes.filter((node) => !partIds.has(node.partId)).map((node) => node.partId);
  const finite = nodes.every((node) =>
    [node.world.a, node.world.b, node.world.c, node.world.d, node.world.e, node.world.f].every(
      (value) => Number.isFinite(value),
    ),
  );
  const nearUpper = nodes.find((node) => node.id === "nearUpperArm")!;
  const nearFore = nodes.find((node) => node.id === "nearForearm")!;
  const shoulder = transformPoint(nearUpper.world, nearUpper.pivot);
  const elbow = transformPoint(nearFore.world, nearFore.pivot);
  return {
    finite,
    missing,
    nodes: nodes.length,
    shoulder,
    elbow,
    shoulderElbowDistance: Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y),
  };
}

async function main() {
  log("assembly-start");
  const root = process.cwd();
  const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c4");
  const outputs = path.join(root, "outputs", "folk-provider-benchmark", "stage-2c4");
  await mkdir(docs, { recursive: true });
  await mkdir(outputs, { recursive: true });
  const bundle = await ensureRendererBundle(root, log);
  log(`bundle ${bundle}`);
  const browser = await chromium.launch({ headless: true });
  log("browser-launched");
  const report: Record<string, unknown> = {};
  try {
    for (const provider of ["openai", "gemini"] as const) {
      log(`provider-start ${provider}`);
      const payload = await buildProductionPayload(root, provider, log);
      const validation = finiteTransforms(payload);
      log(
        `transforms ${provider} finite=${validation.finite} missing=${validation.missing.length}`,
      );
      if (!validation.finite || validation.missing.length > 0) {
        throw new Error(`Invalid rig transforms for ${provider}.`);
      }
      const page = await openProductionRenderer(browser, root, payload, bundle, log);
      const frames = [
        { name: "neutral", frame: 0, joint: null, extra: 0 },
        { name: "reach", frame: 60, joint: null, extra: 0 },
        { name: "elbow-45", frame: 0, joint: "nearForearm", extra: -45 },
        { name: "elbow-90", frame: 0, joint: "nearForearm", extra: -90 },
      ] as const;
      const rendered = [];
      for (const entry of frames) {
        const buffer = entry.joint
          ? await renderProductionJoint(page, entry.frame, entry.joint, entry.extra)
          : await renderProductionFrame(page, entry.frame);
        const file = path.join(outputs, provider, `production-${entry.name}.png`);
        await savePng(file, buffer);
        const metadata = await sharp(buffer).metadata();
        rendered.push({
          name: entry.name,
          frame: entry.frame,
          joint: entry.joint,
          extra: entry.extra,
          file: path.relative(root, file),
          width: metadata.width,
          height: metadata.height,
        });
        log(`frame-saved ${provider} ${entry.name}`);
      }
      await savePng(path.join(docs, `neutral-${provider}.png`), await readFile(rendered[0]!.file!));
      await savePng(
        path.join(docs, `joint-stress-${provider}.png`),
        await sharp({
          create: {
            width: 1280,
            height: 720,
            channels: 4,
            background: { r: 26, g: 13, b: 8, alpha: 1 },
          },
        })
          .composite(
            await Promise.all(
              rendered.map(async (entry, index) => ({
                input: await readFile(path.join(root, entry.file)),
                left: (index % 2) * 640,
                top: Math.floor(index / 2) * 360,
              })),
            ),
          )
          .png()
          .toBuffer(),
      );
      report[provider] = { payloadParts: payload.parts.length, validation, frames: rendered };
      await page.close();
      log(`provider-done ${provider}`);
    }
  } finally {
    await browser.close();
    log("browser-closed");
  }
  await writeJson(path.join(docs, "smoke", "06-assembly.json"), report);
  console.log(JSON.stringify({ marker: "assembly-ok", report }, null, 2));
  log("assembly-finished");
}
main().catch((error) => {
  log(`ERROR ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  console.error(error);
  process.exit(1);
});
