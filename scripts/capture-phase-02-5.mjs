import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { cpus, platform, release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "docs/benchmarks/phase-02-5");
const FRAMES_DIR = join(OUTPUT_DIR, "frames");
const SELECTED_DIR = join(OUTPUT_DIR, "selected-frames");
const POSES_DIR = join(OUTPUT_DIR, "character-poses");
const PAGE_URL = "http://localhost:3100/benchmarks/phase-02-5";
const FRAME_COUNT = 48;
const SELECTED_FRAMES = [0, 8, 16, 24, 30, 38, 47];
const POSES = [
  ["pose-01-wings-raised.png", 0],
  ["pose-02-wings-lowered.png", 4],
  ["pose-03-braking-approach.png", 24],
  ["pose-04-settling.png", 38],
  ["pose-05-perched.png", 47],
];

for (const directory of [OUTPUT_DIR, FRAMES_DIR, SELECTED_DIR, POSES_DIR]) {
  mkdirSync(directory, { recursive: true });
}

async function serverIsReady() {
  try {
    const response = await fetch("http://localhost:3100/studio");
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await serverIsReady()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error("Fableon dev server did not become ready.");
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function writeDataUrl(path, dataUrl) {
  const base64 = dataUrl.split(",", 2)[1];
  if (!base64) throw new Error(`Invalid PNG data URL for ${path}`);
  writeFileSync(path, Buffer.from(base64, "base64"));
}

let server = null;

try {
  if (!(await serverIsReady())) {
    server = spawn("pnpm", ["--filter", "@fableon/web", "dev"], {
      cwd: ROOT,
      env: { ...process.env, PORT: "3100" },
      stdio: "ignore",
    });
    await waitForServer();
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });

    const navigationStart = Date.now();
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => Boolean(window.__FABLEON_PHASE_02_5__), null, {
      timeout: 120_000,
    });
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="landing-preview-surface"]')
          ?.getAttribute("data-ready") === "true",
      null,
      { timeout: 120_000 },
    );
    const readyMs = Date.now() - navigationStart;

    const memoryBefore = await page.evaluate(() => {
      const memory = performance.memory;
      return memory
        ? {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          }
        : null;
    });

    const renderTimes = [];

    for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
      const captured = await page.evaluate(
        (targetFrame) => window.__FABLEON_PHASE_02_5__.captureFrame(targetFrame),
        frame,
      );
      renderTimes.push(captured.renderMs);
      writeDataUrl(
        join(FRAMES_DIR, `frame-${String(frame).padStart(3, "0")}.png`),
        captured.dataUrl,
      );
    }

    for (const frame of SELECTED_FRAMES) {
      copyFileSync(
        join(FRAMES_DIR, `frame-${String(frame).padStart(3, "0")}.png`),
        join(SELECTED_DIR, `frame-${String(frame).padStart(3, "0")}.png`),
      );
    }

    const contactSheet = await page.evaluate(() =>
      window.__FABLEON_PHASE_02_5__.captureContactSheet(),
    );
    writeDataUrl(join(OUTPUT_DIR, "contact-sheet.png"), contactSheet);

    const posePreviews = await page.evaluate(() =>
      window.__FABLEON_PHASE_02_5__.capturePosePreviews(),
    );
    writeDataUrl(join(OUTPUT_DIR, "character-poses.png"), posePreviews.sheet);
    POSES.forEach(([fileName, frame], index) => {
      const pose = posePreviews.poses[index];
      if (!pose || pose.frame !== frame) {
        throw new Error(`Pose preview mismatch at index ${index}.`);
      }
      writeDataUrl(join(POSES_DIR, fileName), pose.dataUrl);
    });

    // Measure real elapsed-time playback through the preview controls.
    const slider = page.getByRole("slider", { name: "Animation frame" });
    await slider.evaluate((element) => {
      const input = element;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "0");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const playbackStart = Date.now();
    await page.getByRole("button", { name: "Play animation" }).click();
    await page.waitForTimeout(1000);
    const frameText = (await page.getByLabel("Current frame", { exact: true }).textContent()) ?? "";
    const playbackFrame = Number.parseInt(frameText.replace(/\D+/g, ""), 10);
    const playbackElapsedMs = Date.now() - playbackStart;
    const pauseButton = page.getByRole("button", { name: "Pause animation" });
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
    }

    const memoryAfter = await page.evaluate(() => {
      const memory = performance.memory;
      return memory
        ? {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          }
        : null;
    });

    const gifPath = join(OUTPUT_DIR, "landing-preview.gif");
    const ffmpeg = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-framerate",
        "24",
        "-i",
        join(FRAMES_DIR, "frame-%03d.png"),
        "-vf",
        "fps=24,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
        "-loop",
        "0",
        gifPath,
      ],
      { encoding: "utf8" },
    );

    if (ffmpeg.status !== 0) {
      throw new Error(`ffmpeg GIF encoding failed: ${ffmpeg.stderr ?? "unknown error"}`);
    }

    const videoPath = join(OUTPUT_DIR, "landing-preview.mp4");
    const video = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-framerate",
        "24",
        "-i",
        join(FRAMES_DIR, "frame-%03d.png"),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-crf",
        "18",
        "-movflags",
        "+faststart",
        videoPath,
      ],
      { encoding: "utf8" },
    );
    const videoCreated = video.status === 0;

    const frameFiles = readdirSync(FRAMES_DIR).filter((file) => file.endsWith(".png"));
    if (frameFiles.length !== FRAME_COUNT) {
      throw new Error(`Expected ${FRAME_COUNT} frames; found ${frameFiles.length}.`);
    }

    const performance = {
      capturedAt: new Date().toISOString(),
      browser: browser.version(),
      platform: platform(),
      release: release(),
      cpu: cpus()[0]?.model ?? "unknown",
      canvas: "1920×1080",
      frameCount: FRAME_COUNT,
      fps: 24,
      readyMs,
      firstFrameRenderMs: renderTimes[0] ?? 0,
      medianFrameRenderMs: percentile(renderTimes, 0.5),
      p95FrameRenderMs: percentile(renderTimes, 0.95),
      totalRenderMs: renderTimes.reduce((sum, value) => sum + value, 0),
      playbackElapsedMs,
      playbackFrame,
      observedPlaybackFps: playbackFrame / (playbackElapsedMs / 1000),
      memoryBefore,
      memoryAfter,
      gif: {
        path: "docs/benchmarks/phase-02-5/landing-preview.gif",
        width: 960,
        height: 540,
        fps: 24,
        frames: FRAME_COUNT,
      },
      video: videoCreated
        ? {
            path: "docs/benchmarks/phase-02-5/landing-preview.mp4",
            width: 1920,
            height: 1080,
            fps: 24,
            frames: FRAME_COUNT,
          }
        : null,
      videoError: videoCreated ? null : (video.stderr ?? "unknown ffmpeg error"),
      pageErrors,
      note: "No network image decoding is involved: character and scene artwork are generated locally as canvases before animation capture.",
    };

    writeFileSync(
      join(OUTPUT_DIR, "performance.json"),
      `${JSON.stringify(performance, null, 2)}\n`,
    );

    console.log(
      JSON.stringify(
        {
          frameCount: FRAME_COUNT,
          selectedFrames: SELECTED_FRAMES,
          readyMs,
          medianFrameRenderMs: performance.medianFrameRenderMs,
          p95FrameRenderMs: performance.p95FrameRenderMs,
          observedPlaybackFps: performance.observedPlaybackFps,
          gif: ffmpeg.status === 0,
          pageErrors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
} finally {
  if (server) {
    server.kill("SIGTERM");
  }
}
