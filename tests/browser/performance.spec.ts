import { cpus, platform, release } from "node:os";

import { expect, test } from "@playwright/test";

import { percentile, readRenderMs, setFrame, waitForPreview } from "./helpers";

test("measures loading, cached render, and playback performance", async ({ page, browser }) => {
  const navigationStart = Date.now();
  await page.goto("/studio");
  await waitForPreview(page, 0);
  const firstFrameReadyMs = Date.now() - navigationStart;
  const firstFrameRenderMs = await readRenderMs(page);

  const assetTimings = await page.evaluate(() => {
    const entries = performance
      .getEntriesByType("resource")
      .filter((entry): entry is PerformanceResourceTiming => entry.name.includes("/assets/"));
    if (entries.length === 0) {
      return null;
    }
    const start = Math.min(...entries.map((entry) => entry.startTime));
    const end = Math.max(...entries.map((entry) => entry.responseEnd));
    return {
      requests: entries.length,
      wallMs: Math.round(end - start),
      totalTransferBytes: entries.reduce((sum, entry) => sum + entry.transferSize, 0),
      entries: entries.map((entry) => ({
        name: entry.name.split("/").at(-1),
        durationMs: Math.round(entry.duration),
        transferSize: entry.transferSize,
      })),
    };
  });

  const frameTimes: number[] = [];
  for (const frame of [0, 24, 48, 72, 96, 120, 144, 168, 192, 216]) {
    await setFrame(page, frame);
    await waitForPreview(page, frame);
    frameTimes.push(await readRenderMs(page));
  }

  const memoryBefore = await page.evaluate(() => {
    const memory = (
      performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    return memory
      ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        }
      : null;
  });

  await setFrame(page, 0);
  await waitForPreview(page, 0);
  const playbackStart = Date.now();
  await page.getByRole("button", { name: "Play animation" }).click();
  await page.waitForTimeout(1_000);
  const currentFrameText = (await page.getByLabel("Current frame").textContent()) ?? "";
  const playbackElapsedMs = Date.now() - playbackStart;
  const currentFrame = Number.parseInt(currentFrameText.replace(/\D+/g, ""), 10);
  const pauseButton = page.getByRole("button", { name: "Pause playback" });
  if (await pauseButton.isVisible()) {
    await pauseButton.click();
  }

  const memoryAfter = await page.evaluate(() => {
    const memory = (
      performance as Performance & {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    return memory
      ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        }
      : null;
  });

  const metrics = {
    browser: browser.version(),
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model ?? "unknown",
    viewport: "1440×1000 UI, 1920×1080 canvas",
    firstFrameReadyMs,
    firstFrameRenderMs,
    assetTimings,
    cachedFrameSamplesMs: frameTimes,
    cachedFrameMedianMs: percentile(frameTimes, 0.5),
    cachedFrameP95Ms: percentile(frameTimes, 0.95),
    playbackElapsedMs,
    playbackCurrentFrame: currentFrame,
    playbackEffectiveFps: currentFrame / (playbackElapsedMs / 1000),
    memoryBefore,
    memoryAfter,
  };

  await test.info().attach("performance.json", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  console.log(`PHASE_02_PERFORMANCE ${JSON.stringify(metrics)}`);

  expect(firstFrameReadyMs).toBeLessThan(20_000);
  expect(firstFrameRenderMs).toBeLessThan(2_000);
  expect(assetTimings?.wallMs ?? 0).toBeLessThan(10_000);
  expect(percentile(frameTimes, 0.95)).toBeLessThan(1_000);
  expect(currentFrame).toBeGreaterThan(6);
});
