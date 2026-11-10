import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import {
  buildProductionPayload,
  ensureRendererBundle,
  openProductionRenderer,
  renderProductionFrame,
  savePng,
  writeJson,
} from "./lib/production-renderer.ts";

const trace = process.env.STAGE2C4_TRACE;
if (!trace) throw new Error("STAGE2C4_TRACE is required");
mkdirSync(path.dirname(trace), { recursive: true });
writeFileSync(trace, "");
const log = (message: string) => appendFileSync(trace, `${new Date().toISOString()} ${message}\n`);
const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const sharp = require("sharp");

function ffmpeg(args: string[], label: string) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8", timeout: 45000 });
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label}: ${result.stderr || result.stdout}`);
  return result;
}

async function main() {
  log("video-start");
  const root = process.cwd();
  const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c4");
  const outputs = path.join(root, "outputs", "folk-provider-benchmark", "stage-2c4");
  await mkdir(docs, { recursive: true });
  await mkdir(outputs, { recursive: true });
  const bundle = await ensureRendererBundle(root, log);
  const browser = await chromium.launch({ headless: true });
  log("browser-launched");
  const report: Record<string, unknown> = {};
  try {
    for (const provider of ["openai", "gemini"] as const) {
      log(`video-provider-start ${provider}`);
      const payload = await buildProductionPayload(root, provider, log);
      const page = await openProductionRenderer(browser, root, payload, bundle, log);
      const frameDir = path.join(outputs, provider, "video-frames");
      await mkdir(frameDir, { recursive: true });
      const hashes: string[] = [];
      for (let index = 0; index < 24; index += 1) {
        const frame = 26 + index;
        const buffer = await renderProductionFrame(page, frame, 640, 360);
        await savePng(path.join(frameDir, `frame-${String(index).padStart(4, "0")}.png`), buffer);
        hashes.push(createHash("sha256").update(buffer).digest("hex"));
        if (index === 0 || (index + 1) % 8 === 0) log(`frame ${provider} ${index} source=${frame}`);
      }
      await page.close();
      const video = path.join(outputs, provider, "articulation-1s.mp4");
      ffmpeg(
        [
          "-y",
          "-v",
          "error",
          "-framerate",
          "24",
          "-i",
          path.join(frameDir, "frame-%04d.png"),
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-crf",
          "18",
          "-movflags",
          "+faststart",
          video,
        ],
        `${provider} encode`,
      );
      log(`encoded ${provider}`);
      const probeText = spawnSync(
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
      if (probeText.status !== 0) throw new Error(probeText.stderr || "ffprobe failed");
      const probe = JSON.parse(probeText.stdout) as {
        streams: {
          width: number;
          height: number;
          nb_read_frames: string;
          avg_frame_rate: string;
          duration: string;
        }[];
      };
      const stream = probe.streams[0];
      if (!stream) throw new Error(`${provider}: no video stream`);
      const decoded = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "-"], {
        encoding: "utf8",
        timeout: 45000,
      });
      if (decoded.status !== 0) throw new Error(decoded.stderr || `${provider}: decode failed`);
      const frames = Number(stream.nb_read_frames);
      if (frames !== 24) throw new Error(`${provider}: expected 24 frames, got ${frames}`);
      if (stream.width !== 640 || stream.height !== 360)
        throw new Error(`${provider}: wrong dimensions`);
      if (stream.avg_frame_rate !== "24/1")
        throw new Error(`${provider}: wrong frame rate ${stream.avg_frame_rate}`);
      const contactFiles = [0, 8, 16, 23].map((index) =>
        path.join(frameDir, `frame-${String(index).padStart(4, "0")}.png`),
      );
      const contact = await sharp({
        create: {
          width: 1280,
          height: 720,
          channels: 4,
          background: { r: 26, g: 13, b: 8, alpha: 1 },
        },
      })
        .composite(
          await Promise.all(
            contactFiles.map(async (file, index) => ({
              input: await readFile(file),
              left: (index % 2) * 640,
              top: Math.floor(index / 2) * 360,
            })),
          ),
        )
        .png()
        .toBuffer();
      await savePng(path.join(docs, `articulation-${provider}.png`), contact);
      report[provider] = {
        video: path.relative(root, video),
        bytes: (await readFile(video)).length,
        sha256: createHash("sha256")
          .update(await readFile(video))
          .digest("hex"),
        probe: stream,
        decoded: true,
        frameCount: frames,
        frameHashes: hashes,
        sourceFrames: { start: 26, end: 49 },
        contactSheet: path.relative(root, path.join(docs, `articulation-${provider}.png`)),
      };
      log(`video-done ${provider} frames=${frames}`);
    }
  } finally {
    await browser.close();
    log("browser-closed");
  }
  await writeJson(path.join(docs, "smoke", "07-video.json"), report);
  console.log(JSON.stringify({ marker: "video-ok", report }, null, 2));
  log("video-finished");
}
main().catch((error) => {
  log(`ERROR ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  console.error(error);
  process.exit(1);
});
