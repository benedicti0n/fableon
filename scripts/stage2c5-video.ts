import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

const FPS = 24;
const FRAMES = 48;
const WIDTH = 1280;
const HEIGHT = 720;
const ARM_CAMERA = { x: 950, y: 830, zoom: 2.6 };
const LEG_CAMERA = { x: 920, y: 1020, zoom: 2.4 };

async function renderPose(
  page: Awaited<ReturnType<typeof openProductionRenderer>>,
  frame: number,
  patch: Record<string, { rotation: number }>,
) {
  const data = await page.evaluate(
    `window.__stage2c4.renderPose(${frame}, ${JSON.stringify({ nodes: patch })}, false, ${WIDTH}, ${HEIGHT})`,
  );
  return Buffer.from(data.split(",", 2)[1]!, "base64");
}

function ffmpeg(args: string[], label: string) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8", timeout: 120000 });
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label}: ${result.stderr || result.stdout}`);
  return result;
}

async function main() {
  log("video-start");
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
      const armPack = await buildStage2C5Pack(root, provider, ARM_CAMERA);
      const armPage = await openProductionRenderer(browser, root, armPack.payload, bundle, log);
      const armDir = path.join(outputs, provider, "video-arm-frames");
      await mkdir(armDir, { recursive: true });
      const armHashes: string[] = [];
      for (let index = 0; index < FRAMES; index += 1) {
        const t = index / (FRAMES - 1);
        const patch = {
          nearUpperArm: { rotation: -2 - 18 * Math.sin(t * Math.PI * 2) },
          nearForearm: { rotation: -18 - 38 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2)) },
          handOpen: { rotation: 28 * Math.sin(t * Math.PI * 4) },
        };
        const buffer = await renderPose(armPage, index, patch);
        const file = path.join(armDir, `frame-${String(index).padStart(4, "0")}.png`);
        await savePng(file, buffer);
        armHashes.push(createHash("sha256").update(buffer).digest("hex"));
        if (index === 0 || (index + 1) % 12 === 0) log(`arm-frame ${provider} ${index}`);
      }
      await armPage.close();
      const armVideo = path.join(outputs, provider, "arm-articulation-2s.mp4");
      ffmpeg(
        [
          "-y",
          "-v",
          "error",
          "-framerate",
          String(FPS),
          "-i",
          path.join(armDir, "frame-%04d.png"),
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-crf",
          "18",
          "-movflags",
          "+faststart",
          armVideo,
        ],
        `${provider} arm encode`,
      );
      const armProbe = probe(armVideo, `${provider} arm`);
      const armContact = await contactSheet([
        path.join(armDir, "frame-0000.png"),
        path.join(armDir, "frame-0012.png"),
        path.join(armDir, "frame-0024.png"),
        path.join(armDir, "frame-0047.png"),
      ]);
      await savePng(path.join(docs, `articulation-${provider}-arm.png`), armContact);
      log(`arm-video ${provider}`);

      const legPack = await buildStage2C5Pack(root, provider, LEG_CAMERA);
      const legPage = await openProductionRenderer(browser, root, legPack.payload, bundle, log);
      const legDir = path.join(outputs, provider, "video-leg-frames");
      await mkdir(legDir, { recursive: true });
      const legHashes: string[] = [];
      for (let index = 0; index < FRAMES; index += 1) {
        const t = index / (FRAMES - 1);
        const patch = {
          nearThigh: { rotation: 20 * Math.sin(t * Math.PI * 2) },
          nearShin: { rotation: 12 + 32 * (0.5 - 0.5 * Math.cos(t * Math.PI * 2)) },
          nearFoot: { rotation: -22 * Math.sin(t * Math.PI * 2 + Math.PI / 2) },
        };
        const buffer = await renderPose(legPage, index, patch);
        const file = path.join(legDir, `frame-${String(index).padStart(4, "0")}.png`);
        await savePng(file, buffer);
        legHashes.push(createHash("sha256").update(buffer).digest("hex"));
        if (index === 0 || (index + 1) % 12 === 0) log(`leg-frame ${provider} ${index}`);
      }
      await legPage.close();
      const legVideo = path.join(outputs, provider, "leg-articulation-2s.mp4");
      ffmpeg(
        [
          "-y",
          "-v",
          "error",
          "-framerate",
          String(FPS),
          "-i",
          path.join(legDir, "frame-%04d.png"),
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-crf",
          "18",
          "-movflags",
          "+faststart",
          legVideo,
        ],
        `${provider} leg encode`,
      );
      const legProbe = probe(legVideo, `${provider} leg`);
      const legContact = await contactSheet([
        path.join(legDir, "frame-0000.png"),
        path.join(legDir, "frame-0012.png"),
        path.join(legDir, "frame-0024.png"),
        path.join(legDir, "frame-0047.png"),
      ]);
      await savePng(path.join(docs, `articulation-${provider}-leg.png`), legContact);
      report[provider] = {
        arm: {
          video: path.relative(root, armVideo),
          bytes: (await readFile(armVideo)).length,
          sha256: createHash("sha256")
            .update(await readFile(armVideo))
            .digest("hex"),
          probe: armProbe,
          decoded: true,
          frameHashes: armHashes,
          contactSheet: path.relative(root, path.join(docs, `articulation-${provider}-arm.png`)),
        },
        leg: {
          video: path.relative(root, legVideo),
          bytes: (await readFile(legVideo)).length,
          sha256: createHash("sha256")
            .update(await readFile(legVideo))
            .digest("hex"),
          probe: legProbe,
          decoded: true,
          frameHashes: legHashes,
          contactSheet: path.relative(root, path.join(docs, `articulation-${provider}-leg.png`)),
        },
      };
      log(`provider-done ${provider}`);
    }
  } finally {
    await browser.close();
    log("browser-closed");
  }
  await writeJson(path.join(docs, "video-report.json"), report);
  await writeJson(path.join(outputs, "video-report.json"), report);
  console.log(JSON.stringify({ marker: "stage2c5-video-ok", report }, null, 2));
  log("video-finished");
}

function probe(video: string, label: string) {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,nb_read_frames,avg_frame_rate,duration",
      "-of",
      "json",
      video,
    ],
    { encoding: "utf8", timeout: 30000 },
  );
  if (result.status !== 0) throw new Error(result.stderr || `${label}: ffprobe failed`);
  const streams = (
    JSON.parse(result.stdout) as {
      streams?: {
        width: number;
        height: number;
        nb_read_frames: string;
        avg_frame_rate: string;
        duration: string;
      }[];
    }
  ).streams;
  const stream = streams?.[0];
  if (!stream) throw new Error(`${label}: no stream`);
  if (stream.width !== WIDTH || stream.height !== HEIGHT)
    throw new Error(`${label}: wrong dimensions`);
  if (stream.avg_frame_rate !== "24/1") throw new Error(`${label}: wrong fps`);
  if (Number(stream.nb_read_frames) !== FRAMES) throw new Error(`${label}: wrong frame count`);
  if (Math.abs(Number(stream.duration) - 2) > 0.05) throw new Error(`${label}: wrong duration`);
  const decode = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "-"], {
    encoding: "utf8",
    timeout: 120000,
  });
  if (decode.status !== 0) throw new Error(decode.stderr || `${label}: full decode failed`);
  return stream;
}

async function contactSheet(files: string[]) {
  const labels = ["0.00 s", "0.50 s", "1.00 s", "1.96 s"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">${labels
    .map((label, index) => {
      const x = (index % 2) * 640 + 12;
      const y = Math.floor(index / 2) * 360 + 28;
      return `<rect x="${x - 6}" y="${y - 20}" width="86" height="26" fill="rgba(26,13,8,.82)"/><text x="${x}" y="${y}" fill="#fff2cf" font-family="Menlo,monospace" font-size="14">${label}</text>`;
    })
    .join("")}</svg>`;
  return sharp({
    create: { width: 1280, height: 720, channels: 4, background: { r: 26, g: 13, b: 8, alpha: 1 } },
  })
    .composite(
      await Promise.all([
        ...files.map(async (file, index) => ({
          input: await sharp(file).resize(640, 360, { fit: "cover" }).png().toBuffer(),
          left: (index % 2) * 640,
          top: Math.floor(index / 2) * 360,
        })),
        { input: Buffer.from(svg), left: 0, top: 0 },
      ]),
    )
    .png()
    .toBuffer();
}

main().catch((error) => {
  log(`ERROR ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  console.error(error);
  process.exit(1);
});
