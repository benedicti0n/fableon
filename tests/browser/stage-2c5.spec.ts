import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const artifactDir = path.join(
  process.cwd(),
  "docs",
  "benchmarks",
  "phase-05.1",
  "stage-2c5",
  "studio-screenshots",
);
fs.mkdirSync(artifactDir, { recursive: true });

test.describe("Stage 2C.5 precision mask workshop", () => {
  test("edits, undoes, saves, reloads and previews a real source mask", async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/studio/folk/rigs/stage-2c");
    await expect(page.getByTestId("stage2c5-workshop")).toBeVisible();
    await expect(page.getByTestId("stage2c5-canvas")).toBeVisible();
    await expect(page.getByText(/1536×1024/).first()).toBeVisible();

    await page.getByTestId("stage2c5-part").selectOption("handOpen");
    await expect(page.getByTestId("stage2c5-workshop")).toContainText(
      /independent wrist candidate/i,
      {
        timeout: 15_000,
      },
    );

    const canvas = page.getByTestId("stage2c5-canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Mask canvas has no bounding box.");
    const seed = await request.get("/api/studio/providers/stage-2c5/seed/openai/handOpen");
    expect(seed.ok()).toBe(true);
    const seedHash = createHash("sha256")
      .update(await seed.body())
      .digest("hex");

    // Paint a visible stroke, erase part of it, then undo/redo the eraser.
    await page.getByTestId("stage2c5-tool-brush").click();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.42);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.48, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId("stage2c5-save")).toBeEnabled();

    await page.getByTestId("stage2c5-tool-eraser").click();
    await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.45);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId("stage2c5-undo")).toBeEnabled();
    await page.getByTestId("stage2c5-undo").click();
    await expect(page.getByTestId("stage2c5-redo")).toBeEnabled();
    await page.getByTestId("stage2c5-redo").click();

    await page.getByTestId("stage2c5-save").click();
    await expect(page.getByText(/Saved mask revision 1/)).toBeVisible({ timeout: 15_000 });
    const revisionsResponse = await request.get(
      "/api/studio/providers/stage-2c5/revisions/openai/handOpen",
    );
    expect(revisionsResponse.ok()).toBe(true);
    const revisions = (await revisionsResponse.json()) as {
      revisions: { revision: number; maskSha256: string; reviewStatus: string }[];
    };
    expect(revisions.revisions[0]?.revision).toBe(1);
    expect(revisions.revisions[0]?.reviewStatus).toBe("pending");
    const saved = await request.get("/api/studio/providers/stage-2c5/mask/openai/handOpen/latest");
    expect(saved.ok()).toBe(true);
    const savedHash = createHash("sha256")
      .update(await saved.body())
      .digest("hex");
    expect(savedHash).not.toBe(seedHash);

    await page.getByTestId("stage2c5-preview").click();
    await expect(page.getByTestId("stage2c5-preview-image")).toBeVisible();
    await page.screenshot({
      path: path.join(artifactDir, "mask-editor.png"),
      fullPage: true,
    });

    await page.reload();
    await expect(page.getByTestId("stage2c5-workshop")).toBeVisible();
    await page.getByTestId("stage2c5-part").selectOption("handOpen");
    await expect(page.getByText(/revision 1/).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/review pending/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
