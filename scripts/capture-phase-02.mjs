import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { platform, release, cpus } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_DIR = join(ROOT, "apps/web/public/assets");
const BENCHMARK_DIR = join(ROOT, "docs/benchmarks/phase-02");
const STUDIO_URL = "http://localhost:3100/benchmarks/phase-02";
const ASSET_FILES = {
  bird: "bird.png",
  branch: "branch.png",
  "forest-dawn": "forest-dawn.png",
  "forest-deep": "forest-deep.png",
};
const FRAME_FILES = [
  ["frame-0000-dawn.png", 0],
  ["frame-0216-glide.png", 1],
  ["frame-0528-descent.png", 2],
  ["frame-0840-landing.png", 3],
  ["frame-1151-final.png", 4],
];

mkdirSync(ASSET_DIR, { recursive: true });
mkdirSync(BENCHMARK_DIR, { recursive: true });

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
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(STUDIO_URL);
    await page.waitForFunction(() => Boolean(window.__FABLEON_BENCHMARK__), null, {
      timeout: 120_000,
    });

    const summary = await page.evaluate(() => {
      const data = window.__FABLEON_BENCHMARK__;
      if (!data) return null;
      return {
        seed: data.seed,
        assetIds: Object.keys(data.assets),
        assetSizes: Object.fromEntries(
          Object.entries(data.assets).map(([id, asset]) => [id, [asset.width, asset.height]]),
        ),
        frames: data.frames.map((frame) => ({
          frame: frame.frame,
          label: frame.label,
          sceneId: frame.sceneId,
          sceneName: frame.sceneName,
          localFrame: frame.localFrame,
          renderMs: frame.renderMs,
        })),
        metrics: data.metrics,
      };
    });

    for (const [assetId, fileName] of Object.entries(ASSET_FILES)) {
      const dataUrl = await page.evaluate(
        (id) => window.__FABLEON_BENCHMARK__?.assets[id]?.dataUrl,
        assetId,
      );
      if (!dataUrl) throw new Error(`Missing benchmark asset ${assetId}`);
      writeDataUrl(join(ASSET_DIR, fileName), dataUrl);
    }

    for (const [fileName, index] of FRAME_FILES) {
      const dataUrl = await page.evaluate(
        (frameIndex) => window.__FABLEON_BENCHMARK__?.frames[frameIndex]?.dataUrl,
        index,
      );
      if (!dataUrl) throw new Error(`Missing benchmark frame at index ${index}`);
      writeDataUrl(join(BENCHMARK_DIR, fileName), dataUrl);
    }

    const contactSheet = await page.evaluate(() => window.__FABLEON_BENCHMARK__?.contactSheet);
    if (!contactSheet) throw new Error("Missing benchmark contact sheet.");
    writeDataUrl(join(BENCHMARK_DIR, "contact-sheet.png"), contactSheet);

    writeFileSync(
      join(BENCHMARK_DIR, "render-metrics.json"),
      `${JSON.stringify(
        {
          capturedWith: `Playwright Chromium ${browser.version()} and Canvas 2D`,
          environment: {
            platform: platform(),
            release: release(),
            cpu: cpus()[0]?.model ?? "unknown",
          },
          viewport: "1920×1080 native canvas",
          ...summary,
        },
        null,
        2,
      )}\n`,
    );

    console.log(JSON.stringify({ ...summary, browser: browser.version() }, null, 2));
  } finally {
    await browser.close();
  }
} finally {
  if (server) {
    server.kill("SIGTERM");
  }
}
