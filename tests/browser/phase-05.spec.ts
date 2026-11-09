import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { collectPageErrors } from "./helpers";

const artifactDir = path.join(process.cwd(), "docs", "benchmarks", "phase-05", "screenshots");
fs.mkdirSync(artifactDir, { recursive: true });

async function waitForStudio(page: Page): Promise<string[]> {
  const errors = collectPageErrors(page);
  await page.goto("/studio/folk");
  await expect(page.getByTestId("folk-studio-page")).toBeVisible();
  await expect
    .poll(async () =>
      page.getByTestId("folk-canvas").evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        return `${canvas.width}x${canvas.height}`;
      }),
    )
    .toBe("1280x720");
  return errors;
}

async function seek(page: Page, frame: number): Promise<void> {
  const slider = page.getByRole("slider", { name: "Folk film frame" });
  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Unable to set the folk frame.");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}

test.describe("Phase 5 folk-art production", () => {
  test("loads the five-shot film and exposes data-driven state", async ({ page }) => {
    const errors = await waitForStudio(page);
    await expect(page.getByTestId("folk-studio-page")).toContainText("61 reusable body parts");
    for (const title of [
      "Morning in the Village",
      "The Artisan",
      "The Horse and Cart",
      "The Brass Bell",
      "The Journey Continues",
    ]) {
      await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();
    }
    const state = page.getByTestId("folk-frame-state");
    await seek(page, 60);
    await expect(state).toHaveAttribute("data-shot", "shot-1");
    await expect(state).toHaveAttribute("data-title", "The Little Brass Bell");
    await seek(page, 200);
    await expect(state).toHaveAttribute("data-shot", "shot-2");
    await expect(state).toHaveAttribute("data-artisan", "walk");
    await seek(page, 340);
    await expect(state).toHaveAttribute("data-shot", "shot-3");
    await expect(state).toHaveAttribute("data-horse", "walk");
    await expect(state).toHaveAttribute("data-bell", "hand");
    await seek(page, 500);
    await expect(state).toHaveAttribute("data-shot", "shot-4");
    await expect(state).toHaveAttribute("data-artisan", "reach");
    await seek(page, 520);
    await expect(state).toHaveAttribute("data-bell", "harness");
    await seek(page, 600);
    await expect(state).toHaveAttribute("data-shot", "shot-5");
    await expect(state).toHaveAttribute("data-previous-opacity", "1.0000");
    await expect(state).toHaveAttribute("data-incoming-opacity", "0.0000");
    await expect(state).toHaveAttribute("data-horse", "walk");
    await page.screenshot({ path: path.join(artifactDir, "folk-production.png") });
    expect(errors).toEqual([]);
  });

  test("plays, pauses, and switches preview resolution", async ({ page }) => {
    const errors = await waitForStudio(page);
    const state = page.getByTestId("folk-frame-state");
    await seek(page, 500);
    await page.getByRole("button", { name: "Play folk film" }).click();
    await page.waitForTimeout(700);
    const playing = Number(await state.getAttribute("data-frame"));
    await page.getByRole("button", { name: "Pause folk film" }).click();
    const paused = Number(await state.getAttribute("data-frame"));
    await page.waitForTimeout(300);
    expect(playing).toBeGreaterThan(500);
    expect(Number(await state.getAttribute("data-frame"))).toBe(paused);
    await page.getByLabel("Folk preview resolution").selectOption("1920x1080");
    await expect
      .poll(async () =>
        page.getByTestId("folk-canvas").evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          return `${canvas.width}x${canvas.height}`;
        }),
      )
      .toBe("1920x1080");
    expect(errors).toEqual([]);
  });

  test("runs a real local folk export and plays the completed result", async ({ page }) => {
    const errors = await waitForStudio(page);
    await page.locator("#folk-export-start").fill("0");
    await page.locator("#folk-export-end").fill("23");
    await page.locator("#folk-export-resolution").selectOption("1280x720");
    await page.getByTestId("folk-start-export").click();
    await expect(page.getByTestId("folk-export-panel")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("folk-export-progress")).toHaveAttribute("aria-valuenow", "100", {
      timeout: 120_000,
    });
    const video = page.getByTestId("folk-export-video");
    await expect(video).toBeVisible();
    await expect
      .poll(async () =>
        video.evaluate((element) => {
          const media = element as HTMLVideoElement;
          return media.readyState >= 1 ? media.duration : 0;
        }),
      )
      .toBeGreaterThan(0.5);
    await page.getByTestId("folk-export-panel").screenshot({
      path: path.join(artifactDir, "folk-export.png"),
    });
    expect(errors).toEqual([]);
  });

  test("asset workshop, rig editor, shot board, and cost dashboard are real routes", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto("/studio/folk/assets");
    await expect(page.getByRole("heading", { name: "Folk asset provenance" })).toBeVisible();
    await expect(page.getByText("original-local-vector-art")).toBeVisible();
    await expect(page.getByText(/61 transparent\s+parts/)).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, "folk-assets.png") });

    await page.goto("/studio/folk/rigs");
    const rig = page.getByTestId("folk-rig-canvas");
    await expect(rig).toBeVisible();
    const before = await rig.getAttribute("src");
    const slider = page.getByRole("slider", { name: "Extra joint rotation" });
    await slider.evaluate((element) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (!setter) throw new Error("Unable to set joint rotation.");
      setter.call(input, "35");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect.poll(async () => rig.getAttribute("src")).not.toBe(before);
    await page.screenshot({ path: path.join(artifactDir, "folk-rig-editor.png") });

    await page.goto("/studio/folk/production");
    await expect(page.getByText("SHOT 001")).toBeVisible();
    await expect(page.getByText("SHOT 005")).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, "folk-shot-board.png") });

    await page.goto("/studio/folk/costs");
    await expect(page.getByText("Actual API spend", { exact: true })).toBeVisible();
    await expect(page.getByText("$0.0000").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
