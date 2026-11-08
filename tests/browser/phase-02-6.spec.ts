import { expect, test, type Page } from "@playwright/test";

import { collectPageErrors } from "./helpers";

interface Phase26FrameCapture {
  readonly importedDataUrl: string;
  readonly baselineDataUrl: string;
}

interface Phase26Validation {
  readonly diagnostic: boolean;
  readonly premiumArtworkBlocked: boolean;
  readonly characterPack: { readonly parts: readonly unknown[] };
  readonly characterPreparation: { readonly ready: boolean };
  readonly environmentPreparation: { readonly ready: boolean };
  readonly rigCompatibility: { readonly ready: boolean };
  readonly parts: readonly {
    readonly pixelDifference: { readonly meanAbsoluteError: number };
  }[];
  readonly environmentDifference: { readonly meanAbsoluteError: number };
}

interface Phase26RigValidation {
  readonly footContact: { readonly locked: boolean; readonly maxDrift: number };
  readonly determinism: { readonly allRepeatedEvaluationsEqual: boolean };
  readonly adaptedDrawOrder: readonly string[];
}

interface Phase26Fidelity {
  readonly dataUrl: string;
  readonly frameMetrics: Readonly<Record<string, { readonly meanAbsoluteError: number }>>;
}

interface Phase26CaptureApi {
  captureFrame(frame: number): Phase26FrameCapture;
  captureValidation(): Phase26Validation;
  captureRigValidation(): Phase26RigValidation;
  captureFidelityComparison(): Phase26Fidelity;
  captureContactSheet(): string;
}

declare global {
  interface Window {
    __FABLEON_PHASE_02_6__: Phase26CaptureApi;
  }
}

async function waitForBenchmark(page: Page): Promise<void> {
  await page.goto("/benchmarks/phase-02-6");
  await page.waitForFunction(() => Boolean(window.__FABLEON_PHASE_02_6__), null, {
    timeout: 120_000,
  });
  await expect(page.getByTestId("phase26-benchmark")).toHaveAttribute("data-ready", "true");
}

async function importedCanvasHash(page: Page): Promise<number> {
  return page
    .getByRole("img", { name: /Phase 2.6 imported diagnostic frame/i })
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
      return hash >>> 0;
    });
}

test.describe("Phase 2.6 imported illustration benchmark", () => {
  test("labels the diagnostic artwork gate and renders both pipelines", async ({ page }) => {
    const errors = collectPageErrors(page);
    await waitForBenchmark(page);

    await expect(page.getByText("DIAGNOSTIC ARTWORK — NOT ARTISTIC VALIDATION")).toBeVisible();
    await expect(page.getByText(/No premium source artwork was present/i)).toBeVisible();
    await expect(page.getByTestId("phase26-benchmark")).toHaveAttribute(
      "data-character-parts",
      "9",
    );
    await expect(page.getByTestId("phase26-benchmark")).toHaveAttribute(
      "data-source",
      "diagnostic",
    );
    await expect(
      page.getByRole("img", { name: /Phase 2.5 procedural baseline frame 0/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Phase 2.6 imported diagnostic frame 0/i }),
    ).toBeVisible();
    await expect(page.getByText(/Character pack/)).toBeVisible();
    await expect(page.getByText(/Premium artwork gate/i)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("scrubs the same frame through both pipelines and changes imported pixels", async ({
    page,
  }) => {
    await waitForBenchmark(page);
    const initial = await importedCanvasHash(page);

    const slider = page.getByRole("slider", { name: "Benchmark frame" });
    await slider.evaluate((element) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      if (!setter) throw new Error("Unable to set frame.");
      setter.call(input, "24");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.getByTestId("phase26-benchmark")).toHaveAttribute("data-frame", "24");
    await expect(page.getByRole("slider", { name: "Benchmark frame" })).toHaveValue("24");
    await expect.poll(async () => importedCanvasHash(page)).not.toBe(initial);
  });

  test("plays the imported animation, stops at frame 47, and replays", async ({ page }) => {
    await waitForBenchmark(page);
    const slider = page.getByRole("slider", { name: "Benchmark frame" });
    await slider.evaluate((element) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "44");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.getByTestId("phase26-benchmark")).toHaveAttribute("data-frame", "44");

    await page.getByRole("button", { name: "Play benchmark" }).click();
    await expect(page.getByTestId("phase26-benchmark")).toHaveAttribute("data-frame", "47");
    await expect(page.getByRole("button", { name: "Play benchmark" })).toBeVisible();

    await page.getByRole("button", { name: "Play benchmark" }).click();
    await page.waitForFunction(() => {
      const surface = document.querySelector('[data-testid="phase26-benchmark"]');
      return Number(surface?.getAttribute("data-frame") ?? 47) < 47;
    });
    await page.getByRole("button", { name: "Pause benchmark" }).click();
  });

  test("captures real frames and validates import, fidelity, and rig mapping", async ({ page }) => {
    await waitForBenchmark(page);

    const frame = await page.evaluate(() => window.__FABLEON_PHASE_02_6__.captureFrame(24));
    expect(frame.importedDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(frame.baselineDataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(frame.importedDataUrl).not.toBe(frame.baselineDataUrl);

    const importedBytes = Buffer.from(frame.importedDataUrl.split(",")[1] ?? "", "base64");
    expect(importedBytes.readUInt32BE(16)).toBe(1920);
    expect(importedBytes.readUInt32BE(20)).toBe(1080);

    const validation = await page.evaluate(() => window.__FABLEON_PHASE_02_6__.captureValidation());
    expect(validation.diagnostic).toBe(true);
    expect(validation.premiumArtworkBlocked).toBe(true);
    expect(validation.characterPack.parts).toHaveLength(9);
    expect(validation.characterPreparation.ready).toBe(true);
    expect(validation.environmentPreparation.ready).toBe(true);
    expect(validation.rigCompatibility.ready).toBe(true);
    expect(validation.parts.every((part) => part.pixelDifference.meanAbsoluteError === 0)).toBe(
      true,
    );
    expect(validation.environmentDifference.meanAbsoluteError).toBe(0);

    const rig = await page.evaluate(() => window.__FABLEON_PHASE_02_6__.captureRigValidation());
    expect(rig.footContact.locked).toBe(true);
    expect(rig.footContact.maxDrift).toBe(0);
    expect(rig.determinism.allRepeatedEvaluationsEqual).toBe(true);
    expect(rig.adaptedDrawOrder).toHaveLength(9);

    const fidelity = await page.evaluate(() =>
      window.__FABLEON_PHASE_02_6__.captureFidelityComparison(),
    );
    expect(fidelity.frameMetrics["47"]?.meanAbsoluteError).toBeLessThan(0.1);
    expect(fidelity.frameMetrics["0"]?.meanAbsoluteError).toBeLessThan(0.1);
    expect(fidelity.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  test("captures a contact sheet from actual imported frames", async ({ page }) => {
    await waitForBenchmark(page);
    const sheet = await page.evaluate(() => window.__FABLEON_PHASE_02_6__.captureContactSheet());
    expect(sheet.startsWith("data:image/png;base64,")).toBe(true);
    const bytes = Buffer.from(sheet.split(",")[1] ?? "", "base64");
    expect(bytes.readUInt32BE(16)).toBeGreaterThan(1000);
    expect(bytes.readUInt32BE(20)).toBeGreaterThan(1000);
  });
});
