import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { collectPageErrors } from "./helpers";

const screenshotDir = path.join(process.cwd(), "docs/reports/phase-04/screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });

async function waitForComposition(page: Page): Promise<string[]> {
  const errors = collectPageErrors(page);
  await page.goto("/studio/composition");
  await expect(page.getByTestId("composition-page")).toBeVisible();
  await expect
    .poll(async () =>
      page.getByTestId("composition-canvas").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        return `${canvas.width}x${canvas.height}`;
      }),
    )
    .toBe("1280x720");
  return errors;
}

async function seek(page: Page, frame: number): Promise<void> {
  const slider = page.getByRole("slider", { name: "Film frame" });
  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Unable to set the film frame.");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}

async function canvasStats(page: Page) {
  return page.getByTestId("composition-canvas").evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable.");
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let luminance = 0;
    let hash = 2_166_136_261;
    let samples = 0;
    for (let index = 0; index < data.length; index += 397) {
      const value = data[index] ?? 0;
      luminance += value;
      hash ^= value;
      hash = Math.imul(hash, 16_777_619);
      samples += 1;
    }
    return {
      width: canvas.width,
      height: canvas.height,
      meanLuminance: luminance / Math.max(samples, 1),
      hash: hash >>> 0,
    };
  });
}

test.describe("Phase 4 composition preview", () => {
  test("loads the four-shot film and renders the opening title", async ({ page }) => {
    const errors = await waitForComposition(page);
    await expect(page.getByTestId("composition-page")).toContainText("30.000-second film");
    await expect(page.getByRole("button", { name: /Awakening Forest/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Little Bird in Flight/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /The Landing/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /A Place to Rest/ })).toBeVisible();

    const start = page.getByTestId("composition-frame-state");
    await expect(start).toHaveAttribute("data-frame", "0");
    await expect(start).toHaveAttribute("data-shot", "shot-1");
    await expect(start).toHaveAttribute("data-black-opacity", "1.0000");

    await seek(page, 72);
    await expect(start).toHaveAttribute("data-frame", "72");
    await expect(start).toHaveAttribute("data-title", "Where the Light Lands");
    await expect
      .poll(async () => Number(await start.getAttribute("data-title-opacity")))
      .toBeGreaterThan(0);
    const stats = await canvasStats(page);
    expect(stats.width).toBe(1280);
    expect(stats.height).toBe(720);
    expect(stats.meanLuminance).toBeGreaterThan(20);
    await page.screenshot({ path: path.join(screenshotDir, "composition-preview.png") });
    expect(errors).toEqual([]);
  });

  test("scrubs every required boundary and exposes camera, wings, contact, and titles", async ({
    page,
  }) => {
    const errors = await waitForComposition(page);
    const state = page.getByTestId("composition-frame-state");
    const boundaries = [
      [0, "shot-1", 0],
      [143, "shot-1", 143],
      [144, "shot-2", 0],
      [359, "shot-2", 215],
      [360, "shot-3", 0],
      [527, "shot-3", 167],
      [528, "shot-4", 0],
      [719, "shot-4", 191],
    ] as const;
    for (const [frame, shot, localFrame] of boundaries) {
      await seek(page, frame);
      await expect(state).toHaveAttribute("data-frame", String(frame));
      await expect(state).toHaveAttribute("data-shot", shot);
      await expect(state).toHaveAttribute("data-local-frame", String(localFrame));
    }

    await seek(page, 144);
    await expect(state).toHaveAttribute("data-previous-opacity", "1.0000");
    await expect(state).toHaveAttribute("data-incoming-opacity", "0.0000");

    await seek(page, 150);
    const cameraStart = Number(await state.getAttribute("data-camera-x"));
    const wingStart = Number(await state.getAttribute("data-wing-near"));
    const hashStart = (await canvasStats(page)).hash;
    await seek(page, 190);
    const cameraLater = Number(await state.getAttribute("data-camera-x"));
    const wingLater = Number(await state.getAttribute("data-wing-near"));
    const hashLater = (await canvasStats(page)).hash;
    expect(cameraLater).not.toBe(cameraStart);
    expect(wingLater).not.toBe(wingStart);
    expect(hashLater).not.toBe(hashStart);
    await expect(state).toHaveAttribute("data-character-visible", "true");

    await seek(page, 470);
    await expect(state).toHaveAttribute("data-foot-contact", "true");

    await seek(page, 620);
    await expect(state).toHaveAttribute(
      "data-title",
      "Sometimes, the smallest journeys lead us home.",
    );
    await seek(page, 719);
    await expect(state).toHaveAttribute("data-black-opacity", "1.0000");
    expect(errors).toEqual([]);
  });

  test("runs a real local MP4 export job with progress and a playable result", async ({ page }) => {
    const errors = await waitForComposition(page);
    await page.locator("#export-start").fill("0");
    await page.locator("#export-end").fill("23");
    await page.locator("#export-resolution").selectOption("1280x720");
    await page.getByTestId("start-export").click();
    await expect(page.getByTestId("export-panel")).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(async () => {
        const progress = page.getByTestId("export-progress");
        return Number(await progress.getAttribute("aria-valuenow"));
      })
      .toBeGreaterThanOrEqual(0);
    await expect(page.getByTestId("export-panel")).toContainText("completed", {
      timeout: 120_000,
    });
    await expect(page.getByTestId("export-progress")).toHaveAttribute("aria-valuenow", "100");
    const video = page.getByTestId("export-video");
    await expect(video).toBeVisible();
    await expect
      .poll(
        async () =>
          video.evaluate((element) => {
            const media = element as HTMLVideoElement;
            return media.readyState >= 1 ? media.duration : 0;
          }),
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0.5);
    await page.getByTestId("export-panel").screenshot({
      path: path.join(screenshotDir, "composition-export.png"),
    });
    expect(errors).toEqual([]);
  });
});
