import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { cpus, platform, release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "docs/benchmarks/phase-02-6");
const FRAMES_DIR = join(OUTPUT_DIR, "frames");
const SELECTED_DIR = join(OUTPUT_DIR, "selected-frames");
const PAGE_URL = "http://localhost:3100/benchmarks/phase-02-6";
const FRAME_COUNT = 48;
const SELECTED_FRAMES = [0, 8, 16, 24, 30, 38, 47];

for (const directory of [OUTPUT_DIR, FRAMES_DIR, SELECTED_DIR]) {
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
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function writeDataUrl(path, dataUrl) {
  const base64 = dataUrl.split(",", 2)[1];
  if (!base64) throw new Error(`Invalid PNG data URL for ${path}`);
  writeFileSync(path, Buffer.from(base64, "base64"));
}

async function setSlider(page, value) {
  const slider = page.getByRole("slider", { name: "Benchmark frame" });
  await slider.evaluate((element, next) => {
    const input = element;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Unable to set benchmark frame.");
    setter.call(input, String(next));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
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
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });

    const navigationStart = Date.now();
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => Boolean(window.__FABLEON_PHASE_02_6__), null, {
      timeout: 180_000,
    });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="phase26-benchmark"]')?.getAttribute("data-ready") ===
        "true",
      null,
      { timeout: 180_000 },
    );
    const readyMs = Date.now() - navigationStart;

    const validation = await page.evaluate(() => window.__FABLEON_PHASE_02_6__.captureValidation());
    writeFileSync(
      join(OUTPUT_DIR, "import-validation.json"),
      `${JSON.stringify(validation, null, 2)}\n`,
    );

    const rigValidation = await page.evaluate(() =>
      window.__FABLEON_PHASE_02_6__.captureRigValidation(),
    );
    writeFileSync(
      join(OUTPUT_DIR, "rig-validation.json"),
      `${JSON.stringify(rigValidation, null, 2)}\n`,
    );

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

    const breakdownSamples = [];
    for (let sample = 0; sample < 15; sample += 1) {
      breakdownSamples.push(
        await page.evaluate(() => window.__FABLEON_PHASE_02_6__.captureRenderBreakdown()),
      );
    }
    const warmRenderMs = {
      environmentMs: percentile(
        breakdownSamples.map((sample) => sample.environmentMs),
        0.5,
      ),
      shadowMs: percentile(
        breakdownSamples.map((sample) => sample.shadowMs),
        0.5,
      ),
      characterMs: percentile(
        breakdownSamples.map((sample) => sample.characterMs),
        0.5,
      ),
      baselineMs: percentile(
        breakdownSamples.map((sample) => sample.baselineMs),
        0.5,
      ),
      samples: breakdownSamples.length,
    };

    const renderTimes = [];
    for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
      const captured = await page.evaluate(
        (targetFrame) => window.__FABLEON_PHASE_02_6__.captureFrame(targetFrame),
        frame,
      );
      renderTimes.push(captured.importedRenderMs);
      writeDataUrl(
        join(FRAMES_DIR, `frame-${String(frame).padStart(3, "0")}.png`),
        captured.importedDataUrl,
      );
    }

    for (const frame of SELECTED_FRAMES) {
      copyFileSync(
        join(FRAMES_DIR, `frame-${String(frame).padStart(3, "0")}.png`),
        join(SELECTED_DIR, `frame-${String(frame).padStart(3, "0")}.png`),
      );
    }

    writeDataUrl(
      join(OUTPUT_DIR, "contact-sheet.png"),
      await page.evaluate(() => window.__FABLEON_PHASE_02_6__.captureContactSheet()),
    );
    writeDataUrl(
      join(OUTPUT_DIR, "source-artwork.png"),
      await page.evaluate(() => window.__FABLEON_PHASE_02_6__.sourceArtwork()),
    );
    writeDataUrl(
      join(OUTPUT_DIR, "prepared-character.png"),
      await page.evaluate(() => window.__FABLEON_PHASE_02_6__.preparedCharacter()),
    );

    const fidelity = await page.evaluate(() =>
      window.__FABLEON_PHASE_02_6__.captureFidelityComparison(),
    );
    writeDataUrl(join(OUTPUT_DIR, "fidelity-comparison.png"), fidelity.dataUrl);

    await setSlider(page, 0);
    const playbackStart = Date.now();
    await page.getByRole("button", { name: "Play benchmark" }).click();
    await page.waitForTimeout(1000);
    const playbackFrame = Number(
      (await page.locator('[data-testid="phase26-benchmark"]').getAttribute("data-frame")) ?? "0",
    );
    const playbackElapsedMs = Date.now() - playbackStart;
    const pauseButton = page.getByRole("button", { name: "Pause benchmark" });
    if (await pauseButton.isVisible()) await pauseButton.click();

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

    const videoPath = join(OUTPUT_DIR, "animation-preview.mp4");
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

    const probe = spawnSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-count_frames",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,avg_frame_rate,r_frame_rate,nb_read_frames",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        videoPath,
      ],
      { encoding: "utf8" },
    );

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
      artworkStatus: "diagnostic-not-artistic-validation",
      premiumArtworkBlocked: true,
      readyMs,
      importMs: validation.timing.importMs,
      decodeMs: validation.timing.decodeMs,
      packBuildMs: validation.timing.packBuildMs,
      firstFrameRenderMs: renderTimes[0] ?? 0,
      medianFrameRenderMs: percentile(renderTimes, 0.5),
      p95FrameRenderMs: percentile(renderTimes, 0.95),
      totalRenderMs: renderTimes.reduce((sum, value) => sum + value, 0),
      warmRenderMs,
      captureRenderNote:
        "Capture render timing includes per-frame canvas readback synchronization in headless Chromium before PNG encoding. warmRenderMs measures the actual compositor work on reused surfaces.",
      playbackElapsedMs,
      playbackFrame,
      observedPlaybackFps: playbackFrame / (playbackElapsedMs / 1000),
      fidelity: {
        frameMetrics: fidelity.frameMetrics,
        frame47MeanAbsoluteError: fidelity.frame47MeanAbsoluteError,
        environmentMeanAbsoluteError: validation.environmentDifference.meanAbsoluteError,
        maxPartPixelError: Math.max(
          0,
          ...validation.parts.map((part) => part.pixelDifference.meanAbsoluteError),
        ),
      },
      validation: {
        characterParts: validation.characterPack.parts.length,
        environmentLayers: validation.environmentPack.parts.length,
        characterReady: validation.characterPreparation.ready,
        environmentReady: validation.environmentPreparation.ready,
        rigReady: validation.rigCompatibility.ready,
        footLocked: rigValidation.footContact.locked,
        footMaxDrift: rigValidation.footContact.maxDrift,
        deterministic: rigValidation.determinism.allRepeatedEvaluationsEqual,
      },
      memoryBefore,
      memoryAfter,
      video:
        video.status === 0
          ? {
              path: "docs/benchmarks/phase-02-6/animation-preview.mp4",
              width: 1920,
              height: 1080,
              fps: 24,
              frames: FRAME_COUNT,
              probe: probe.status === 0 ? JSON.parse(probe.stdout) : null,
            }
          : null,
      videoError: video.status === 0 ? null : (video.stderr ?? "unknown ffmpeg error"),
      pageErrors,
      note: "Diagnostic artwork only. Phase 2.5 procedural layers were rasterized, imported through the real PNG pipeline, validated, and animated by the same landing rig. No premium artwork is claimed.",
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
          importMs: validation.timing.importMs,
          medianFrameRenderMs: performance.medianFrameRenderMs,
          p95FrameRenderMs: performance.p95FrameRenderMs,
          observedPlaybackFps: performance.observedPlaybackFps,
          frame47MeanAbsoluteError: fidelity.frame47MeanAbsoluteError,
          environmentMeanAbsoluteError: validation.environmentDifference.meanAbsoluteError,
          footLocked: rigValidation.footContact.locked,
          deterministic: rigValidation.determinism.allRepeatedEvaluationsEqual,
          video: video.status === 0,
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
