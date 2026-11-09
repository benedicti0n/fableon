import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { collectPageErrors } from "./helpers";

interface Gate2Frame {
  readonly dataUrl: string;
  readonly debugDataUrl: string;
  readonly renderMs: number;
}

interface Gate2Validation {
  readonly pack: { readonly parts: readonly unknown[] };
  readonly compatibilityReady: boolean;
  readonly preparationReady: boolean;
  readonly deterministic: boolean;
  readonly footLock: {
    readonly locked: boolean;
    readonly maxDrift: number;
    readonly contact: {
      readonly left: { readonly x: number; readonly y: number };
      readonly right: { readonly x: number; readonly y: number };
    };
  };
}

interface Gate2Api {
  captureFrame(frame: number, hiddenPartIds?: readonly string[]): Gate2Frame;
  captureContactSheet(): string;
  capturePivotSheet(): string;
  capturePartsSheet(): string;
  captureEnvironmentPreview(): string;
  captureValidation(): Gate2Validation;
}

declare global {
  interface Window {
    __FABLEON_GATE2__: Gate2Api;
  }
}

async function waitForBenchmark(page: Page): Promise<void> {
  await page.goto("/benchmarks/phase-02-7-gate2");
  await page.waitForFunction(() => Boolean(window.__FABLEON_GATE2__), null, {
    timeout: 120_000,
  });
  await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute("data-ready", "true");
}

async function canvasStats(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable.");
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2_166_136_261;
    let nonTransparent = 0;
    for (let index = 0; index < data.length; index += 97) {
      const value = data[index] ?? 0;
      hash ^= value;
      hash = Math.imul(hash, 16_777_619);
      if ((data[index + 3] ?? 0) > 0) nonTransparent += 1;
    }
    return {
      width: canvas.width,
      height: canvas.height,
      hash: hash >>> 0,
      nonTransparent,
    };
  });
}

async function seek(page: Page, frame: number): Promise<void> {
  const slider = page.getByRole("slider", { name: "Premium benchmark frame" });
  await slider.evaluate((element, next) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Unable to set frame.");
    setter.call(input, String(next));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}

test.describe("Phase 2.7 Gate 2 production renderer", () => {
  test("loads the candidate pack and labels the artwork and background status", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await waitForBenchmark(page);

    await expect(page.getByText("NOT APPROVED PRODUCTION ARTWORK")).toBeVisible();
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute("data-parts", "9");
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute(
      "data-source",
      "premium-bird-v1",
    );
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute(
      "data-background",
      "diagnostic-phase-2-5",
    );
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute("data-foot-locked", "true");
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute("data-rig-ready", "true");
    expect(errors).toEqual([]);
  });

  test("renders nonempty 1920×1080 production pixels at frame 0", async ({ page }) => {
    await waitForBenchmark(page);
    const stats = await canvasStats(page, 'canvas[aria-label^="Premium bird landing frame"]');
    expect(stats.width).toBe(1920);
    expect(stats.height).toBe(1080);
    expect(stats.nonTransparent).toBeGreaterThan(10_000);
    expect(stats.hash).not.toBe(0);
  });

  test("scrubbing changes real pixels and wing poses", async ({ page }) => {
    await waitForBenchmark(page);
    const canvasSelector = 'canvas[aria-label^="Premium bird landing frame"]';
    const frame0 = await canvasStats(page, canvasSelector);
    await seek(page, 4);
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute("data-frame", "4");
    const frame4 = await canvasStats(page, canvasSelector);
    expect(frame4.hash).not.toBe(frame0.hash);

    await seek(page, 24);
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute("data-frame", "24");
    const frame24 = await canvasStats(page, canvasSelector);
    expect(frame24.hash).not.toBe(frame4.hash);

    await seek(page, 30);
    const frame30 = await canvasStats(page, canvasSelector);
    expect(frame30.hash).not.toBe(frame24.hash);
  });

  test("toggles debug pivots and part visibility", async ({ page }) => {
    await waitForBenchmark(page);
    const debugToggle = page.getByLabel("Pivot debug");
    await debugToggle.check();
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute("data-debug", "on");
    await expect(page.getByTestId("gate2-debug-overlay")).toBeVisible();
    const debugStats = await canvasStats(page, '[data-testid="gate2-debug-overlay"]');
    expect(debugStats.nonTransparent).toBeGreaterThan(100);

    const bodyToggle = page.getByRole("button", { name: "Toggle Body visibility" });
    const before = await canvasStats(page, 'canvas[aria-label^="Premium bird landing frame"]');
    await bodyToggle.click();
    await expect(bodyToggle).toHaveAttribute("aria-pressed", "false");
    await expect
      .poll(
        async () =>
          (await canvasStats(page, 'canvas[aria-label^="Premium bird landing frame"]')).hash,
      )
      .not.toBe(before.hash);
    await bodyToggle.click();
    await expect(bodyToggle).toHaveAttribute("aria-pressed", "true");
  });

  test("plays to frame 47 and replays from 0", async ({ page }) => {
    await waitForBenchmark(page);
    await seek(page, 44);
    await page.getByRole("button", { name: "Play premium benchmark", exact: true }).click();
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute("data-frame", "47");
    await expect(
      page.getByRole("button", { name: "Play premium benchmark", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Replay premium benchmark" }).click();
    await expect(page.getByTestId("gate2-benchmark")).toHaveAttribute("data-frame", "0");
  });

  test("exports a valid 1920×1080 PNG", async ({ page }) => {
    await waitForBenchmark(page);
    await seek(page, 24);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("premium-bird-frame-024.png");
    const path = await download.path();
    expect(path).not.toBeNull();
    if (!path) return;
    const png = readFileSync(path);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1920);
    expect(png.readUInt32BE(20)).toBe(1080);
  });

  test("captures actual frames, parts, contact, pivot, and validation evidence", async ({
    page,
  }) => {
    await waitForBenchmark(page);
    const frame = await page.evaluate(() => window.__FABLEON_GATE2__.captureFrame(24));
    expect(frame.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(frame.debugDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const png = Buffer.from(frame.dataUrl.split(",")[1] ?? "", "base64");
    expect(png.readUInt32BE(16)).toBe(1920);
    expect(png.readUInt32BE(20)).toBe(1080);

    for (const sheet of [
      await page.evaluate(() => window.__FABLEON_GATE2__.captureContactSheet()),
      await page.evaluate(() => window.__FABLEON_GATE2__.capturePivotSheet()),
      await page.evaluate(() => window.__FABLEON_GATE2__.capturePartsSheet()),
      await page.evaluate(() => window.__FABLEON_GATE2__.captureEnvironmentPreview()),
    ]) {
      expect(sheet.startsWith("data:image/png;base64,")).toBe(true);
    }

    const validation = await page.evaluate(() => window.__FABLEON_GATE2__.captureValidation());
    expect(validation.pack.parts).toHaveLength(9);
    expect(validation.preparationReady).toBe(true);
    expect(validation.compatibilityReady).toBe(true);
    expect(validation.footLock.locked).toBe(true);
    expect(validation.footLock.maxDrift).toBeLessThan(1e-5);
    expect(validation.deterministic).toBe(true);
  });

  test("supports mobile layout without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForBenchmark(page);
    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);
    await expect(page.getByRole("img", { name: /Premium bird landing frame 0/i })).toBeVisible();
  });
});
