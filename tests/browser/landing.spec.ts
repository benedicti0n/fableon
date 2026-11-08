import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { collectPageErrors, readCanvasStats } from "./helpers";

async function waitForLanding(page: Page, frame?: number): Promise<void> {
  const surface = page.getByTestId("landing-preview-surface");
  await expect(surface).toHaveAttribute("data-ready", "true");
  if (frame !== undefined) {
    await expect(surface).toHaveAttribute("data-frame", String(frame));
    await expect(surface).toHaveAttribute("data-rendered-frame", String(frame));
  }
}

async function setFrame(page: Page, frame: number): Promise<void> {
  const slider = page.getByRole("slider", { name: "Animation frame" });
  await slider.evaluate((element, value) => {
    const input = element;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Unable to set frame.");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}

async function readRenderTime(page: Page): Promise<number> {
  const text = await page.getByLabel("Render time").textContent();
  const match = /Last render ([\d.]+) ms/.exec(text ?? "");
  if (!match) throw new Error(`Could not parse render time from "${text}".`);
  return Number.parseFloat(match[1] ?? "");
}

test.describe("Phase 2.5 landing animation preview", () => {
  test("loads the first frame as real rendered pixels", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/benchmarks/phase-02-5");
    await waitForLanding(page, 0);

    await expect(page.getByLabel("Current frame", { exact: true })).toHaveText("Frame 0");
    await expect(page.getByLabel("Current timestamp")).toHaveText("0:00.000");
    await expect(page.getByLabel("Current phase")).toHaveText("flight");

    const stats = await readCanvasStats(page);
    expect(stats.width).toBe(1920);
    expect(stats.height).toBe(1080);
    expect(stats.opaqueRatio).toBeGreaterThan(0.95);
    expect(stats.uniqueColors).toBeGreaterThan(20);
    expect(stats.hash).not.toBe(0);

    await setFrame(page, 24);
    await waitForLanding(page, 24);
    await setFrame(page, 0);
    await waitForLanding(page, 0);
    expect((await readCanvasStats(page)).hash).toBe(stats.hash);
    expect(errors).toEqual([]);
  });

  test("scrubbing and wing poses change actual pixels", async ({ page }) => {
    await page.goto("/benchmarks/phase-02-5");
    await waitForLanding(page, 0);
    const frameZero = await readCanvasStats(page);

    await setFrame(page, 4);
    await waitForLanding(page, 4);
    await expect(page.getByLabel("Current phase")).toHaveText("flight");
    const lowered = await readCanvasStats(page);
    expect(lowered.hash).not.toBe(frameZero.hash);

    await setFrame(page, 24);
    await waitForLanding(page, 24);
    await expect(page.getByLabel("Current phase")).toHaveText("approach");
    expect((await readCanvasStats(page)).hash).not.toBe(lowered.hash);

    await setFrame(page, 47);
    await waitForLanding(page, 47);
    await expect(page.getByLabel("Current phase")).toHaveText("settle");
    await expect(page.getByRole("button", { name: "Next frame" })).toBeDisabled();
  });

  test("supports frame stepping and phase boundaries", async ({ page }) => {
    await page.goto("/benchmarks/phase-02-5");
    await waitForLanding(page, 0);

    const previous = page.getByRole("button", { name: "Previous frame" });
    const next = page.getByRole("button", { name: "Next frame" });
    await expect(previous).toBeDisabled();
    await next.click();
    await waitForLanding(page, 1);
    await expect(page.getByLabel("Current frame", { exact: true })).toHaveText("Frame 1");

    await setFrame(page, 47);
    await waitForLanding(page, 47);
    await expect(next).toBeDisabled();
    await previous.click();
    await waitForLanding(page, 46);
  });

  test("plays elapsed-time animation, stops at 47, and replays from 0", async ({ page }) => {
    await page.goto("/benchmarks/phase-02-5");
    await waitForLanding(page, 0);

    await setFrame(page, 44);
    await waitForLanding(page, 44);
    await page.getByRole("button", { name: "Play animation" }).click();
    await expect(page.getByRole("button", { name: "Pause animation" })).toBeVisible();
    await waitForLanding(page, 47);
    await expect(page.getByRole("button", { name: "Play animation" })).toBeVisible();

    await page.getByRole("button", { name: "Play animation" }).click();
    await expect(page.getByRole("button", { name: "Pause animation" })).toBeVisible();
    await page.waitForFunction(() => {
      const surface = document.querySelector('[data-testid="landing-preview-surface"]');
      return Number(surface?.getAttribute("data-frame") ?? 47) < 47;
    });
    await page.getByRole("button", { name: "Pause animation" }).click();
  });

  test("exports a native 1920×1080 PNG", async ({ page }) => {
    await page.goto("/benchmarks/phase-02-5");
    await waitForLanding(page, 0);
    await setFrame(page, 24);
    await waitForLanding(page, 24);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export current frame PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("little-bird-frame-024.png");
    const path = await download.path();
    expect(path).not.toBeNull();
    if (!path) return;

    const png = readFileSync(path);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1920);
    expect(png.readUInt32BE(20)).toBe(1080);
  });

  test("toggles character part visibility without losing the composition", async ({ page }) => {
    await page.goto("/benchmarks/phase-02-5");
    await waitForLanding(page, 0);
    await setFrame(page, 47);
    await waitForLanding(page, 47);
    const initial = await readCanvasStats(page);

    const headToggle = page.getByRole("button", { name: "Toggle Head visibility" });
    await expect(headToggle).toHaveAttribute("aria-pressed", "true");
    await headToggle.click();
    await expect(headToggle).toHaveAttribute("aria-pressed", "false");
    await expect.poll(async () => (await readCanvasStats(page)).hash).not.toBe(initial.hash);

    await headToggle.click();
    await expect(headToggle).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await readCanvasStats(page)).hash).toBe(initial.hash);
  });

  test("keeps the controls usable on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/benchmarks/phase-02-5");
    await waitForLanding(page, 0);

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Animation frame" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export current frame PNG" })).toBeVisible();
  });

  test("records real frame and playback performance", async ({ page, browser }) => {
    await page.goto("/benchmarks/phase-02-5");
    await waitForLanding(page, 0);

    const frameTimes: number[] = [];
    for (const frame of [0, 4, 8, 16, 24, 30, 38, 47]) {
      await setFrame(page, frame);
      await waitForLanding(page, frame);
      frameTimes.push(await readRenderTime(page));
    }

    await setFrame(page, 0);
    await waitForLanding(page, 0);
    const started = Date.now();
    await page.getByRole("button", { name: "Play animation" }).click();
    await page.waitForTimeout(1000);
    const currentFrameText =
      (await page.getByLabel("Current frame", { exact: true }).textContent()) ?? "";
    const currentFrame = Number.parseInt(currentFrameText.replace(/\D+/g, ""), 10);
    const elapsedMs = Date.now() - started;
    const pause = page.getByRole("button", { name: "Pause animation" });
    if (await pause.isVisible()) await pause.click();

    const sorted = [...frameTimes].sort((a, b) => a - b);
    const metrics = {
      browser: browser.version(),
      frameSamplesMs: frameTimes,
      medianFrameMs: sorted[Math.floor(sorted.length / 2)] ?? 0,
      maxFrameMs: sorted.at(-1) ?? 0,
      playbackElapsedMs: elapsedMs,
      playbackFrame: currentFrame,
      observedPlaybackFps: currentFrame / (elapsedMs / 1000),
    };
    await test.info().attach("landing-performance.json", {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    console.log(`PHASE_02_5_PERFORMANCE ${JSON.stringify(metrics)}`);

    expect(sorted.at(-1) ?? 0).toBeLessThan(1_000);
    expect(currentFrame).toBeGreaterThan(5);
  });
});
