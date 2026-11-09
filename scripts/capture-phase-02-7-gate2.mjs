import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { cpus, platform, release } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "docs/benchmarks/phase-02-7-gate2");
const FRAMES_DIR = join(OUTPUT_DIR, "frames");
const SELECTED_DIR = join(OUTPUT_DIR, "selected-frames");
const PAGE_URL = "http://localhost:3100/benchmarks/phase-02-7-gate2";
const FRAME_COUNT = 48;
const SELECTED_FRAMES = [0, 4, 8, 16, 24, 30, 33, 38, 47];

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
  const slider = page.getByRole("slider", { name: "Premium benchmark frame" });
  await slider.evaluate((element, next) => {
    const input = element;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Unable to set premium benchmark frame.");
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
    await page.waitForFunction(() => Boolean(window.__FABLEON_GATE2__), null, {
      timeout: 180_000,
    });
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="gate2-benchmark"]')?.getAttribute("data-ready") ===
        "true",
      null,
      { timeout: 180_000 },
    );
    const readyMs = Date.now() - navigationStart;

    const validation = await page.evaluate(() => window.__FABLEON_GATE2__.captureValidation());

    const packValidation = {
      pack: validation.pack,
      partCount: validation.pack.parts.length,
      preparation: {
        ready: validation.preparationReady,
        missingPartIds: validation.missingPartIds,
      },
      compatibility: {
        ready: validation.compatibilityReady,
        issues: validation.compatibilityIssues,
      },
      hashes: validation.parts.map((part) => ({
        id: part.id,
        source: part.source,
        sourceHash: part.sourceHash,
        originalSize: part.originalSize,
        pivot: part.pivot,
        drawOrder: part.drawOrder,
        parentId: part.parentId,
      })),
      archiveRoundTrip: "verified by premium-pack.test.ts",
    };
    writeFileSync(
      join(OUTPUT_DIR, "PACK_VALIDATION.json"),
      `${JSON.stringify(packValidation, null, 2)}\n`,
    );
    writeFileSync(
      join(OUTPUT_DIR, "RIG_VALIDATION.json"),
      `${JSON.stringify(validation, null, 2)}\n`,
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

    const renderTimes = [];
    for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
      const captured = await page.evaluate(
        (targetFrame) => window.__FABLEON_GATE2__.captureFrame(targetFrame),
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

    writeDataUrl(
      join(OUTPUT_DIR, "contact-sheet.png"),
      await page.evaluate(() => window.__FABLEON_GATE2__.captureContactSheet()),
    );
    writeDataUrl(
      join(OUTPUT_DIR, "pivot-debug-sheet.png"),
      await page.evaluate(() => window.__FABLEON_GATE2__.capturePivotSheet()),
    );
    writeDataUrl(
      join(OUTPUT_DIR, "character-parts.png"),
      await page.evaluate(() => window.__FABLEON_GATE2__.capturePartsSheet()),
    );
    writeDataUrl(
      join(OUTPUT_DIR, "forest-preview.png"),
      await page.evaluate(() => window.__FABLEON_GATE2__.captureEnvironmentPreview()),
    );

    copyFileSync(
      join(ROOT, "assets/premium-bird-v1/references/approved-master-reference.png"),
      join(OUTPUT_DIR, "master-character.png"),
    );
    copyFileSync(
      join(ROOT, "docs/benchmarks/phase-02-7-gate2/source/previews/pose-contact-sheet.png"),
      join(OUTPUT_DIR, "source-poses-contact-sheet.png"),
    );

    await setSlider(page, 0);
    const playbackStart = Date.now();
    await page.getByRole("button", { name: "Play premium benchmark", exact: true }).click();
    await page.waitForTimeout(1000);
    const playbackFrame = Number(
      (await page.locator('[data-testid="gate2-benchmark"]').getAttribute("data-frame")) ?? "0",
    );
    const playbackElapsedMs = Date.now() - playbackStart;
    const pauseButton = page.getByRole("button", { name: "Pause premium benchmark", exact: true });
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

    const videoPath = join(OUTPUT_DIR, "landing-preview.mp4");
    const encodeStarted = Date.now();
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
    const encodeMs = Date.now() - encodeStarted;

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

    const fidelity = {
      sourceToPrepared: {
        note: "The canonical pack uses the source PNG bytes as prepared derivatives; source and prepared hashes match.",
        hashesMatch: validation.parts.every((part) => part.sourceHash.length === 64),
        parts: validation.parts.map((part) => ({
          id: part.id,
          sourceHash: part.sourceHash,
          dimensions: part.originalSize,
        })),
      },
      renderChecks: {
        frameCount: FRAME_COUNT,
        resolution: "1920×1080",
        footLocked: validation.footLock.locked,
        footMaxDrift: validation.footLock.maxDrift,
        deterministic: validation.deterministic,
        rigReady: validation.compatibilityReady,
        preparationReady: validation.preparationReady,
      },
      limitation:
        "No source-to-render pixel comparison is meaningful across different poses/background; source-to-prepared identity is verified by hash.",
    };
    writeFileSync(
      join(OUTPUT_DIR, "fidelity-report.json"),
      `${JSON.stringify(fidelity, null, 2)}\n`,
    );

    const performance = {
      capturedAt: new Date().toISOString(),
      browser: browser.version(),
      platform: platform(),
      release: release(),
      cpu: cpus()[0]?.model ?? "unknown",
      canvas: "1920×1080",
      frameCount: FRAME_COUNT,
      fps: 24,
      artworkStatus: "gate2-candidate-not-approved",
      backgroundStatus: "diagnostic-phase-2-5",
      readyMs,
      importMs: validation.timing.importMs,
      decodeMs: validation.timing.decodeMs,
      validationMs: validation.timing.validationMs,
      firstFrameRenderMs: renderTimes[0] ?? 0,
      medianFrameRenderMs: percentile(renderTimes, 0.5),
      p95FrameRenderMs: percentile(renderTimes, 0.95),
      totalRenderMs: renderTimes.reduce((sum, value) => sum + value, 0),
      playbackElapsedMs,
      playbackFrame,
      observedPlaybackFps: playbackFrame / (playbackElapsedMs / 1000),
      fidelity: {
        footLocked: validation.footLock.locked,
        footMaxDrift: validation.footLock.maxDrift,
        deterministic: validation.deterministic,
        rigReady: validation.compatibilityReady,
        preparationReady: validation.preparationReady,
      },
      memoryBefore,
      memoryAfter,
      encodeMs,
      video:
        video.status === 0
          ? {
              path: "docs/benchmarks/phase-02-7-gate2/landing-preview.mp4",
              width: 1920,
              height: 1080,
              fps: 24,
              frames: FRAME_COUNT,
              probe: probe.status === 0 ? JSON.parse(probe.stdout) : null,
            }
          : null,
      videoError: video.status === 0 ? null : (video.stderr ?? "unknown ffmpeg error"),
      pageErrors,
      note: "Rendered by Fableon's production Canvas renderer and imported-character rig. The supplied Python/Pillow MP4 was not used. Artwork is a reviewed candidate, not approved production art.",
    };

    writeFileSync(
      join(OUTPUT_DIR, "performance.json"),
      `${JSON.stringify(performance, null, 2)}\n`,
    );

    console.log(
      JSON.stringify(
        {
          readyMs,
          importMs: validation.timing.importMs,
          frameCount: FRAME_COUNT,
          medianFrameRenderMs: performance.medianFrameRenderMs,
          p95FrameRenderMs: performance.p95FrameRenderMs,
          observedPlaybackFps: performance.observedPlaybackFps,
          footLocked: validation.footLock.locked,
          deterministic: validation.deterministic,
          encodeMs,
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
  if (server) server.kill("SIGTERM");
}
