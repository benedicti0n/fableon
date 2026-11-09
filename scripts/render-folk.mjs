import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import {
  appendCostEvent,
  createCostEvent,
  readCostEvents,
  writeCostArtifacts,
} from "./lib/cost-ledger.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT = join(ROOT, "outputs", "folk-pilot", "final.mp4");
const SELECTED_FRAMES = [
  0, 60, 119, 120, 180, 263, 264, 340, 431, 432, 470, 500, 599, 600, 660, 719,
];

function parseArgs(argv) {
  const args = {
    baseUrl: null,
    start: 0,
    end: 719,
    resolution: "1920x1080",
    output: DEFAULT_OUTPUT,
    artifactsDir: null,
    config: "/assets/folk-pilot/film.json",
    jobId: null,
    production: "folk-pilot",
    statusFile: null,
    force: false,
    crf: 18,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const next = argv[index + 1];
    if (key === "--force") {
      args.force = true;
      continue;
    }
    if (!key.startsWith("--")) throw new Error(`Unknown argument "${key}".`);
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`Missing value for ${key}.`);
    }
    index += 1;
    switch (key) {
      case "--base-url":
        args.baseUrl = next.replace(/\/+$/, "");
        break;
      case "--start":
        args.start = Number(next);
        break;
      case "--end":
        args.end = Number(next);
        break;
      case "--resolution":
        args.resolution = next;
        break;
      case "--output":
        args.output = resolve(next);
        break;
      case "--artifacts-dir":
        args.artifactsDir = resolve(next);
        break;
      case "--config":
        args.config = next;
        break;
      case "--production":
        args.production = next;
        break;
      case "--job-id":
        args.jobId = next;
        break;
      case "--status-file":
        args.statusFile = resolve(next);
        break;
      case "--crf":
        args.crf = Number(next);
        break;
      default:
        throw new Error(`Unknown argument "${key}".`);
    }
  }
  const match = /^(\d+)x(\d+)$/.exec(args.resolution);
  if (!match) throw new Error("Resolution must look like 1920x1080.");
  args.width = Number(match[1]);
  args.height = Number(match[2]);
  if (!Number.isInteger(args.start) || !Number.isInteger(args.end)) {
    throw new Error("Frame range must use integers.");
  }
  if (args.start < 0 || args.end > 719 || args.end < args.start) {
    throw new Error("Frame range must stay inside 0..719.");
  }
  if (
    !Number.isInteger(args.width) ||
    !Number.isInteger(args.height) ||
    args.width <= 0 ||
    args.height <= 0 ||
    args.width % 2 !== 0 ||
    args.height % 2 !== 0
  ) {
    throw new Error("Resolution must use positive even integers.");
  }
  if (Math.abs(args.width / args.height - 16 / 9) > 0.001) {
    throw new Error("Phase 4 rendering requires a 16:9 resolution.");
  }
  if (!Number.isFinite(args.crf) || args.crf < 0 || args.crf > 51) {
    throw new Error("CRF must be between 0 and 51.");
  }
  return args;
}

function writeJson(path, value) {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temp, path);
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function writeDataUrl(path, dataUrl) {
  const base64 = dataUrl.split(",", 2)[1];
  if (!base64) throw new Error(`Invalid PNG data URL for ${path}.`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, Buffer.from(base64, "base64"));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (exit ${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function probeVideo(path) {
  const parsed = JSON.parse(
    run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", path]),
  );
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  const audio = parsed.streams?.some((stream) => stream.codec_type === "audio");
  if (!video) throw new Error("No video stream found in the rendered output.");
  const frameCount = Number(
    run("ffprobe", [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=nb_read_frames",
      "-of",
      "default=nk=1:nw=1",
      path,
    ]).trim(),
  );
  const decode = spawnSync("ffmpeg", ["-v", "error", "-i", path, "-f", "null", "-"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (decode.status !== 0) {
    throw new Error(`Full decode failed: ${decode.stderr || decode.stdout}`);
  }
  return {
    codec: video.codec_name,
    width: video.width,
    height: video.height,
    frameRate: video.avg_frame_rate,
    durationSeconds: Number(parsed.format?.duration),
    frameCount,
    hasAudio: Boolean(audio),
    decodeOk: true,
    decodeStderr: decode.stderr.trim(),
  };
}

async function serverIsReady(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/studio/folk/render`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(baseUrl, timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await serverIsReady(baseUrl)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Fableon server did not become ready at ${baseUrl}.`);
}

async function writeFrame(stream, buffer) {
  if (stream.destroyed) throw new Error("FFmpeg input closed before all frames were written.");
  await new Promise((resolveWrite, rejectWrite) => {
    stream.write(buffer, (error) => {
      if (error) rejectWrite(error);
      else resolveWrite();
    });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const status = {
    id: args.jobId ?? "cli",
    status: "queued",
    progress: 0,
    startFrame: args.start,
    endFrame: args.end,
    totalFrames: args.end - args.start + 1,
    renderedFrames: 0,
    currentFrame: args.start - 1,
    width: args.width,
    height: args.height,
    fps: 24,
    outputPath: null,
    startedAt: null,
    updatedAt: new Date().toISOString(),
    finishedAt: null,
    pid: null,
    renderDurationMs: null,
    encodingDurationMs: null,
    error: null,
    cancelRequested: false,
    production: "folk-pilot",
  };

  const persistStatus = (patch) => {
    Object.assign(status, patch);
    status.updatedAt = new Date().toISOString();
    if (args.statusFile) {
      try {
        const existing = JSON.parse(readFileSync(args.statusFile, "utf8"));
        if (existing.cancelRequested === true) status.cancelRequested = true;
      } catch {
        // The status file may not exist on the first write.
      }
      mkdirSync(dirname(args.statusFile), { recursive: true });
      writeJson(args.statusFile, status);
    }
  };
  const cancelRequested = () => {
    if (!args.statusFile || !existsSync(args.statusFile)) return false;
    try {
      return JSON.parse(readFileSync(args.statusFile, "utf8")).cancelRequested === true;
    } catch {
      return false;
    }
  };

  if (!args.force && existsSync(args.output)) {
    throw new Error(
      `Refusing to overwrite existing output ${args.output}. Pass --force only when intentional.`,
    );
  }
  if (run("ffmpeg", ["-version"]).length === 0) throw new Error("FFmpeg is unavailable.");
  mkdirSync(dirname(args.output), { recursive: true });
  mkdirSync(join(ROOT, "outputs"), { recursive: true });

  let server = null;
  let baseUrl = args.baseUrl;
  if (!baseUrl) {
    for (const candidate of [
      "http://localhost:3100",
      "http://localhost:3130",
      "http://localhost:3140",
    ]) {
      if (await serverIsReady(candidate)) {
        baseUrl = candidate;
        break;
      }
    }
    if (!baseUrl) {
      baseUrl = "http://localhost:3140";
      server = spawn("pnpm", ["--filter", "@fableon/web", "dev"], {
        cwd: ROOT,
        env: { ...process.env, PORT: "3140" },
        stdio: "ignore",
      });
      await waitForServer(baseUrl);
    }
  }

  let browser;
  let ffmpeg;
  try {
    persistStatus({
      status: "rendering",
      startedAt: new Date().toISOString(),
      pid: process.pid,
      outputPath: relative(ROOT, args.output),
      error: null,
    });

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`${baseUrl}/studio/folk/render?config=${encodeURIComponent(args.config)}`, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });
    await page.waitForFunction(() => window.__FABLEON_FOLK__?.ready === true, null, {
      timeout: 180_000,
    });
    const film = await page.evaluate(() => ({
      frameCount: window.__FABLEON_FOLK__.frameCount,
      fps: window.__FABLEON_FOLK__.fps,
      specVersion: window.__FABLEON_FOLK__.specVersion,
      specHash: window.__FABLEON_FOLK__.specHash,
      title: window.__FABLEON_FOLK__.title,
      configUrl: window.__FABLEON_FOLK__.configUrl,
    }));
    if (film.frameCount !== 720 || film.fps !== 24) {
      throw new Error(`Unexpected film contract: ${JSON.stringify(film)}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`Film render page errors: ${pageErrors.join(" | ")}`);
    }

    const totalFrames = args.end - args.start + 1;
    ffmpeg = spawn(
      "ffmpeg",
      [
        "-y",
        "-f",
        "image2pipe",
        "-vcodec",
        "png",
        "-framerate",
        "24",
        "-i",
        "-",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        String(args.crf),
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        args.output,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let ffmpegStderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      ffmpegStderr += chunk.toString();
    });
    const ffmpegClosed = new Promise((resolveClose, rejectClose) => {
      ffmpeg.on("error", rejectClose);
      ffmpeg.on("close", (code) => {
        if (code === 0) resolveClose();
        else rejectClose(new Error(`FFmpeg exited ${code}: ${ffmpegStderr}`));
      });
    });

    const renderStart = Date.now();
    const renderTimes = [];
    for (let frame = args.start; frame <= args.end; frame += 1) {
      if (cancelRequested()) {
        throw new Error("Render cancelled by request.");
      }
      const frameStart = performance.now();
      const dataUrl = await page.evaluate(
        ({ frameNumber, width, height }) =>
          window.__FABLEON_FOLK__.renderFrame(frameNumber, width, height),
        { frameNumber: frame, width: args.width, height: args.height },
      );
      const buffer = Buffer.from(dataUrl.split(",", 2)[1], "base64");
      await writeFrame(ffmpeg.stdin, buffer);
      renderTimes.push(performance.now() - frameStart);
      if ((frame - args.start + 1) % 6 === 0 || frame === args.end) {
        persistStatus({
          status: "rendering",
          progress: (frame - args.start + 1) / totalFrames,
          renderedFrames: frame - args.start + 1,
          currentFrame: frame,
        });
      }
      if ((frame - args.start + 1) % 24 === 0) {
        console.log(
          `Rendered ${frame - args.start + 1}/${totalFrames} frames (${Math.round(
            ((frame - args.start + 1) / totalFrames) * 100,
          )}%).`,
        );
      }
    }
    const renderDurationMs = Date.now() - renderStart;

    persistStatus({
      status: "encoding",
      progress: 0.98,
      renderedFrames: totalFrames,
      currentFrame: args.end,
      renderDurationMs,
    });
    ffmpeg.stdin.end();
    const encodingStart = Date.now();
    await ffmpegClosed;
    const encodingDurationMs = Date.now() - encodingStart;

    const probe = probeVideo(args.output);
    const expectedFrames = args.end - args.start + 1;
    if (probe.frameCount !== expectedFrames) {
      throw new Error(`Decoded frame count ${probe.frameCount}; expected ${expectedFrames}.`);
    }
    if (probe.width !== args.width || probe.height !== args.height) {
      throw new Error(
        `Decoded resolution ${probe.width}x${probe.height}; expected ${args.width}x${args.height}.`,
      );
    }
    if (probe.codec !== "h264") {
      throw new Error(`Decoded codec ${probe.codec}; expected h264.`);
    }
    const expectedDuration = expectedFrames / 24;
    if (Math.abs(probe.durationSeconds - expectedDuration) > 0.1) {
      throw new Error(`Decoded duration ${probe.durationSeconds}s; expected ${expectedDuration}s.`);
    }

    const performanceSummary = {
      firstFrameRenderMs: renderTimes[0] ?? 0,
      medianFrameRenderMs: percentile(renderTimes, 0.5),
      p95FrameRenderMs: percentile(renderTimes, 0.95),
      totalFrameRenderMs: renderDurationMs,
      encodingMs: encodingDurationMs,
      totalWallMs: renderDurationMs + encodingDurationMs,
      renderedFrames: totalFrames,
      outputBytes: statSync(args.output).size,
    };

    const manifest = {
      projectId: "the-little-brass-bell",
      filmTitle: film.title,
      filmSpecVersion: film.specVersion,
      filmSpecHash: film.specHash,
      renderConfig: {
        startFrame: args.start,
        endFrame: args.end,
        totalFrames,
        fps: 24,
        width: args.width,
        height: args.height,
        crf: args.crf,
      },
      renderStartedAt: status.startedAt,
      renderFinishedAt: new Date().toISOString(),
      renderDurationMs,
      encodingDurationMs,
      outputPath: args.output,
      outputRelativePath: relative(ROOT, args.output),
      outputBytes: statSync(args.output).size,
      durationSeconds: expectedDuration,
      audioPresent: false,
      ffprobe: probe,
      configUrl: args.config,
      production: args.production,
      generationMode: "original-local-vector-art",
      paidApiCalls: 0,
      errorStatus: null,
    };

    const report = {
      status: "completed",
      jobId: status.id,
      title: film.title,
      specVersion: film.specVersion,
      specHash: film.specHash,
      config: manifest.renderConfig,
      performance: performanceSummary,
      ffprobe: probe,
      outputPath: args.output,
      outputRelativePath: relative(ROOT, args.output),
      errors: pageErrors,
    };

    const stem = args.output.slice(0, -extname(args.output).length);
    const isDefault = args.output === DEFAULT_OUTPUT;
    const manifestPath = join(
      dirname(args.output),
      isDefault ? "film-manifest.json" : `${basename(stem)}.manifest.json`,
    );
    const reportPath = join(
      dirname(args.output),
      isDefault ? "render-report.json" : `${basename(stem)}.report.json`,
    );
    writeJson(manifestPath, manifest);
    writeJson(reportPath, report);

    if (args.artifactsDir) {
      mkdirSync(join(args.artifactsDir, "selected-frames"), { recursive: true });
      for (const frame of SELECTED_FRAMES) {
        const dataUrl = await page.evaluate(
          ({ frameNumber, width, height }) =>
            window.__FABLEON_FOLK__.renderFrame(frameNumber, width, height),
          { frameNumber: frame, width: 960, height: 540 },
        );
        writeDataUrl(
          join(args.artifactsDir, "selected-frames", `frame-${String(frame).padStart(3, "0")}.png`),
          dataUrl,
        );
      }
      const contactSheet = await page.evaluate(
        (frames) => window.__FABLEON_FOLK__.renderContactSheet(frames),
        SELECTED_FRAMES,
      );
      writeDataUrl(join(args.artifactsDir, "contact-sheet.png"), contactSheet);
      writeJson(join(args.artifactsDir, "performance.json"), performanceSummary);
      const assetManifest = JSON.parse(
        readFileSync(
          join(ROOT, "apps", "web", "public", "assets", "folk-pilot", "manifest.json"),
          "utf8",
        ),
      );
      writeJson(join(args.artifactsDir, "asset-inventory.json"), {
        ...assetManifest,
        inventoryNote:
          "Original local vector artwork. AI image generation blocked; no paid provider was contacted.",
      });
    }

    const outputBuffer = readFileSync(args.output);
    const outputDigest = createHash("sha256").update(outputBuffer).digest("hex");
    appendCostEvent(
      ROOT,
      createCostEvent({
        operation: args.output === DEFAULT_OUTPUT ? "render-final" : "render-clip",
        assetId: "the-little-brass-bell",
        provider: "fableon-local",
        model: "canvas2d+ffmpeg",
        startedAt: status.startedAt,
        finishedAt: new Date().toISOString(),
        status: "completed",
        attempt: 1,
        inputReferences: [args.config],
        outputHash: outputDigest,
        outputCount: totalFrames,
        runtimeMs: renderDurationMs + encodingDurationMs,
        pricingSource: "local-no-charge",
        estimatedChargeUsd: 0,
        actualChargeUsd: null,
        billingReconciliation: "not_applicable_local",
        note: `${args.width}x${args.height} local render; no API call.`,
      }),
    );
    if (args.artifactsDir) {
      writeCostArtifacts(ROOT, readCostEvents(ROOT), {
        notes: ["Local electricity cost is unknown; no calibrated meter was available."],
      });
    }

    persistStatus({
      status: "completed",
      progress: 1,
      renderedFrames: totalFrames,
      currentFrame: args.end,
      finishedAt: new Date().toISOString(),
      outputPath: relative(ROOT, args.output),
      renderDurationMs,
      encodingDurationMs,
      error: null,
    });

    console.log(
      `Completed ${relative(ROOT, args.output)} · ${expectedFrames} frames · ${probe.durationSeconds.toFixed(3)} s · ${args.width}x${args.height}`,
    );
  } catch (error) {
    if (ffmpeg && !ffmpeg.killed) {
      ffmpeg.kill("SIGKILL");
      await new Promise((resolveWait) => setTimeout(resolveWait, 200));
    }
    if (existsSync(args.output)) {
      rmSync(args.output, { force: true });
    }
    const message = error instanceof Error ? error.message : String(error);
    persistStatus({
      status: message.includes("cancelled") ? "cancelled" : "failed",
      finishedAt: new Date().toISOString(),
      error: message,
      progress: status.progress,
    });
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (server) {
      server.kill("SIGTERM");
      await new Promise((resolveWait) => setTimeout(resolveWait, 300));
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
