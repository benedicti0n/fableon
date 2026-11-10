import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import {
  collectPageErrors,
  readCanvasStats,
  readRenderMs,
  setFrame,
  waitForPreview,
} from "./helpers";

/**
 * Visual checks use within-environment canvas hashes and visible-difference
 * assertions rather than committed cross-platform screenshots. Canvas text
 * shaping, font fallback, and GPU rasterization vary across operating systems
 * and browsers; the human-review PNGs under docs/benchmarks provide the stable
 * artistic baseline.
 */
test.describe("Studio paint preview", () => {
  test("renders a populated 1920×1080 canvas and keeps repeated frames stable", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto("/studio");
    await waitForPreview(page, 0);

    const initial = await readCanvasStats(page);
    expect(initial.width).toBe(1920);
    expect(initial.height).toBe(1080);
    expect(initial.opaqueRatio).toBeGreaterThan(0.95);
    expect(initial.uniqueColors).toBeGreaterThan(40);
    expect(initial.hash).not.toBe(0);
    expect(await readRenderMs(page)).toBeLessThan(1_000);

    await setFrame(page, 216);
    await waitForPreview(page, 216);
    expect(page.getByLabel("Active scene")).toHaveText("A path between the trunks");
    const glide = await readCanvasStats(page);
    expect(glide.hash).not.toBe(initial.hash);

    await setFrame(page, 0);
    await waitForPreview(page, 0);
    const repeated = await readCanvasStats(page);
    expect(repeated.hash).toBe(initial.hash);

    expect(errors).toEqual([]);
  });

  test("maintains exact scene boundaries through next, previous, and scene selection", async ({
    page,
  }) => {
    await page.goto("/studio");
    await waitForPreview(page, 0);

    await page.getByRole("button", { name: "Next scene →" }).click();
    await waitForPreview(page, 216);
    await expect(page.getByLabel("Current frame")).toHaveText("Frame 216");
    await expect(page.getByLabel("Current timestamp")).toHaveText("0:09.000");

    await page.getByRole("button", { name: "Next scene →" }).click();
    await waitForPreview(page, 528);
    await expect(page.getByLabel("Active scene")).toHaveText("The ribbon of sunlight");

    await page.getByRole("button", { name: "← Previous scene" }).click();
    await waitForPreview(page, 216);

    await page.getByRole("button", { name: "Select scene 4: The forest exhales" }).click();
    await waitForPreview(page, 840);
    await expect(page.getByLabel("Current timestamp")).toHaveText("0:35.000");
  });

  test("plays from the selected frame using elapsed time and stops at the final frame", async ({
    page,
  }) => {
    await page.goto("/studio");
    await waitForPreview(page, 0);

    await setFrame(page, 1140);
    await waitForPreview(page, 1140);

    await page.getByRole("button", { name: "Play animation" }).click();
    // From frame 1140 the short playback can finish before a Pause-label
    // assertion is observed. The contract under test is advance-to-1151 and
    // stop, which is asserted below without racing the transient label.
    await expect(page.getByTestId("preview-surface")).toHaveAttribute("data-frame", "1151", {
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "Play animation" })).toBeVisible();
    await expect(page.getByLabel("Current frame")).toHaveText("Frame 1151");
  });

  test("exports the current canvas as a 1920×1080 PNG", async ({ page }) => {
    await page.goto("/studio");
    await waitForPreview(page, 0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export frame PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("fableon-frame-0000.png");

    const path = await download.path();
    expect(path).not.toBeNull();
    if (!path) {
      return;
    }

    const png = readFileSync(path);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1920);
    expect(png.readUInt32BE(20)).toBe(1080);
    await expect(page.getByText("Exported frame 0 as PNG.")).toBeVisible();
  });

  test("uses a transparency-preserving bird asset", async ({ page }) => {
    await page.goto("/studio");
    await waitForPreview(page, 0);

    const alpha = await page.evaluate(async () => {
      const response = await fetch("/assets/bird.png");
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context unavailable.");
      }
      context.drawImage(bitmap, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparentPixels = 0;
      let opaquePixels = 0;
      for (let index = 3; index < data.length; index += 4) {
        if ((data[index] ?? 0) === 0) transparentPixels += 1;
        else opaquePixels += 1;
      }
      return { transparentPixels, opaquePixels };
    });

    expect(alpha.transparentPixels).toBeGreaterThan(100_000);
    expect(alpha.opaquePixels).toBeGreaterThan(10_000);
  });

  test("shows a loading state while image assets are delayed", async ({ page }) => {
    await page.route("**/assets/forest-dawn.png", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.continue();
    });

    await page.goto("/studio");
    await expect(page.getByText(/loading painted frame/i)).toBeVisible();
    await waitForPreview(page, 0);
  });

  test("surfaces missing asset failures instead of hiding them", async ({ page }) => {
    await page.route("**/assets/bird.png", (route) =>
      route.fulfill({
        status: 404,
        contentType: "text/plain",
        body: "missing",
      }),
    );

    await page.goto("/studio");
    const alert = page.getByTestId("preview-surface").getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/asset "bird"/i);
    await expect(page.getByTestId("preview-surface")).toHaveAttribute(
      "data-preview-state",
      "error",
    );
    await expect(page.getByRole("button", { name: "Export frame PNG" })).toBeDisabled();
  });

  test("stacks a usable layout on a mobile viewport without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/studio");
    await waitForPreview(page, 0);

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth);
    await expect(page.locator("canvas")).toBeVisible();
    await expect(page.getByRole("slider", { name: "Global frame" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export frame PNG" })).toBeVisible();
  });
});
