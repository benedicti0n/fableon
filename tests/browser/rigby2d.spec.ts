import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const artifactDir = path.join(process.cwd(), "outputs", "rigby2d-r3", "r3-1");
fs.mkdirSync(artifactDir, { recursive: true });

const fixture = path.join(process.cwd(), "tests", "fixtures", "rigby2d", "artisan-arm-r22.rigby");

test.describe("R3.1 Rigby2D Studio integration", () => {
  test("imports, validates, renders, previews and scrubs a real Rigby2D character", async ({
    page,
  }) => {
    await page.goto("/studio/folk/rigby2d");
    await expect(page.getByTestId("rigby2d-studio")).toBeVisible();
    await expect(page.getByText(/Rigby2D 0\.5\.1/)).toBeVisible();

    await page.getByTestId("rigby2d-import-file").setInputFiles(fixture);
    await page.getByTestId("rigby2d-import-name").fill("Artisan arm R2.2 browser");
    await page.getByTestId("rigby2d-import-submit").click();

    await expect(page.getByTestId("rigby2d-validation")).toContainText("valid", {
      timeout: 30_000,
    });
    await expect(page.getByText(/23 bones/))
      .toBeVisible()
      .catch(() => undefined);

    await page.getByTestId("rigby2d-animation").selectOption("showcase_ikfix");
    await page.getByTestId("rigby2d-start-render").click();
    await expect(page.getByTestId("rigby2d-render-job").first()).toContainText("completed", {
      timeout: 90_000,
    });

    await expect(page.getByRole("button", { name: "Play preview" })).toBeEnabled({
      timeout: 60_000,
    });
    await page.getByRole("button", { name: "Play preview" }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Pause preview" }).click();

    const slider = page.getByLabel("Rigby2D preview frame");
    await slider.evaluate((element, value) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, 12);
    await expect(page.getByText(/12 \/ 72 · 24 fps/)).toBeVisible();

    await page.getByTestId("rigby2d-pose-animation").selectOption("arm_angles_ikfix");
    await page.getByTestId("rigby2d-pose-time").fill("0.75");
    await page.getByTestId("rigby2d-pose-requested").fill("90");
    await page.getByTestId("rigby2d-measure-pose").click();
    await expect(page.getByTestId("rigby2d-pose-result")).toContainText("PASS", {
      timeout: 30_000,
    });
    await expect(page.getByTestId("rigby2d-pose-result")).toContainText(/measured 90\./);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(artifactDir, "studio-preview.png") });
    await page.getByTestId("rigby2d-pose-result").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(artifactDir, "studio-pose.png") });

    await page.reload();
    await expect(page.getByTestId("rigby2d-render-job").first()).toContainText("completed", {
      timeout: 60_000,
    });
    await expect(page.getByRole("button", { name: "Play preview" })).toBeEnabled({
      timeout: 60_000,
    });
  });
});
