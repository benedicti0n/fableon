import { readFileSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { collectPageErrors } from "./helpers";

async function makePng(
  page: Page,
  name: string,
  color: string,
  width = 160,
  height = 160,
): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const dataUrl = await page.evaluate(
    ({ color: fill, width: w, height: h }) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable.");
      context.clearRect(0, 0, w, h);
      context.fillStyle = fill;
      context.beginPath();
      context.ellipse(w / 2, h / 2, w * 0.35, h * 0.28, 0.2, 0, Math.PI * 2);
      context.fill();
      return canvas.toDataURL("image/png");
    },
    { color, width, height },
  );
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(dataUrl.split(",")[1] ?? "", "base64"),
  };
}

async function makeCharacterFiles(page: Page) {
  const colors: Record<string, string> = {
    body: "#b06f3f",
    head: "#c98a52",
    eye: "#2a211a",
    beak: "#d5a257",
    "wing-far": "#344b50",
    "wing-near": "#39555d",
    tail: "#536b68",
    "leg-left": "#9a6a3f",
    "leg-right": "#9a6a3f",
  };
  return Promise.all(
    Object.entries(colors).map(([name, color]) =>
      makePng(
        page,
        `${name}.png`,
        color,
        name.startsWith("leg") ? 40 : 160,
        name.startsWith("leg") ? 90 : 160,
      ),
    ),
  );
}

async function compositionStats(page: Page) {
  return page
    .getByTestId("asset-composition")
    .locator("canvas")
    .evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable.");
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let hash = 2_166_136_261;
      for (let index = 0; index < data.length; index += 97) {
        hash ^= data[index] ?? 0;
        hash = Math.imul(hash, 16_777_619);
      }
      return { width: canvas.width, height: canvas.height, hash: hash >>> 0 };
    });
}

test.describe("Illustration asset preparation workspace", () => {
  test("loads the preparation workspace with explicit local-only scope", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto("/studio/assets");

    await expect(
      page.getByRole("heading", { level: 1, name: "Illustration Asset Preparation" }),
    ).toBeAttached();
    await expect(page.getByLabel("Import artwork files")).toBeAttached();
    await expect(page.getByLabel("Import illustration pack")).toBeAttached();
    await expect(page.getByRole("tab", { name: "Character" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText(/no AI generation/i).first()).toBeVisible();
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-part-count", "0");
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-ready", "false");
    expect(errors).toEqual([]);
  });

  test("imports transparent parts, inspects metadata, and becomes ready to export", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto("/studio/assets");
    const files = await makeCharacterFiles(page);
    await page.getByLabel("Import artwork files").setInputFiles(files);

    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-part-count", "9");
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-pack-state", "ready");
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-ready", "true");
    await expect(page.getByText("body.png").first()).toBeVisible();
    await expect(page.getByText(/160×160/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Export pack ZIP" })).toBeEnabled();
    await expect(page.getByText(/All structural checks passed/i)).toBeVisible();

    const stats = await compositionStats(page);
    expect(stats.width).toBe(1024);
    expect(stats.height).toBe(1024);
    expect(stats.hash).not.toBe(0);
    expect(errors).toEqual([]);
  });

  test("surfaces invalid local files without corrupting the workspace", async ({ page }) => {
    await page.goto("/studio/assets");
    await page.getByLabel("Import artwork files").setInputFiles({
      name: "broken.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg></svg>"),
    });

    await expect(page.locator('p[role="alert"]')).toContainText("SVG");
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-part-count", "0");
  });

  test("pivot editing changes the composed preview immediately", async ({ page }) => {
    await page.goto("/studio/assets");
    await page.getByLabel("Import artwork files").setInputFiles(await makeCharacterFiles(page));
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-pack-state", "ready");

    const before = await compositionStats(page);
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-pivot", "80,80");
    await page.getByLabel("Pivot x").fill("52");
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-pivot", "52,80");
    await expect.poll(async () => (await compositionStats(page)).hash).not.toBe(before.hash);
  });

  test("exports and re-imports a complete illustration pack", async ({ page }) => {
    await page.goto("/studio/assets");
    await page.getByLabel("Import artwork files").setInputFiles(await makeCharacterFiles(page));
    await expect(page.getByRole("button", { name: "Export pack ZIP" })).toBeEnabled();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export pack ZIP" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("storybook-bird-import.fableon-pack.zip");
    const path = await download.path();
    expect(path).not.toBeNull();
    if (!path) return;
    const bytes = readFileSync(path);
    expect(bytes.subarray(0, 2).toString("ascii")).toBe("PK");

    await page.getByLabel("Import illustration pack").setInputFiles({
      name: "round-trip.zip",
      mimeType: "application/zip",
      buffer: bytes,
    });
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-source", "archive");
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-part-count", "9");
    await expect(page.getByText(/Imported 9-part character pack/i)).toBeVisible();
    await expect(page.getByLabel("Assign asset to Body")).toHaveValue("__archive__");
    await expect(page.getByRole("button", { name: "Export pack ZIP" })).toBeEnabled();
  });

  test("blocks export while hidden anatomy requires reconstruction", async ({ page }) => {
    await page.goto("/studio/assets");
    await page.getByLabel("Import artwork files").setInputFiles(await makeCharacterFiles(page));
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-pack-state", "ready");

    await page.getByLabel("Hidden anatomy requires reconstruction").check();
    await expect(page.getByTestId("asset-composition")).toHaveAttribute(
      "data-pack-state",
      "incomplete",
    );
    await expect(page.getByRole("button", { name: "Export pack ZIP" })).toBeDisabled();
    await expect(page.getByText(/hidden-anatomy reconstruction/i).first()).toBeVisible();

    await page.getByLabel("Hidden anatomy requires reconstruction").uncheck();
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-pack-state", "ready");
    await expect(page.getByRole("button", { name: "Export pack ZIP" })).toBeEnabled();
  });

  test("rejects a corrupted PNG with a decode error", async ({ page }) => {
    await page.goto("/studio/assets");
    const corrupted = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from("not-a-valid-png-payload"),
    ]);
    await page.getByLabel("Import artwork files").setInputFiles({
      name: "corrupted.png",
      mimeType: "image/png",
      buffer: corrupted,
    });
    await expect(page.locator('p[role="alert"]')).toContainText(/decode|PNG|corrupt/i);
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-part-count", "0");
  });

  test("prepares a layered environment with an independent branch layer", async ({ page }) => {
    await page.goto("/studio/assets");
    await page.getByRole("tab", { name: "Environment" }).click();
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-mode", "environment");

    const sky = await makePng(page, "sky.png", "#3b4a3a", 1920, 1080);
    const branch = await makePng(page, "branch.png", "#6b4a2c", 900, 120);
    await page.getByLabel("Import artwork files").setInputFiles([sky, branch]);

    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-part-count", "2");
    await expect(page.getByTestId("asset-composition")).toHaveAttribute("data-pack-state", "ready");
    await expect(page.getByLabel("Assign asset to Landing branch")).toHaveValue(/asset-/);
    const stats = await compositionStats(page);
    expect(stats.width).toBe(1920);
    expect(stats.height).toBe(1080);
    await expect(page.getByTestId("asset-composition")).toHaveAttribute(
      "data-layer-order",
      "sky,landing-branch",
    );
    await page.getByRole("button", { name: "Move Landing branch backward" }).click();
    await expect(page.getByTestId("asset-composition")).toHaveAttribute(
      "data-layer-order",
      "landing-branch,sky",
    );
    await expect(page.getByRole("button", { name: "Export pack ZIP" })).toBeEnabled();
  });
});
