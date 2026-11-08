import { expect, type Page } from "@playwright/test";

export interface CanvasStats {
  readonly width: number;
  readonly height: number;
  readonly hash: number;
  readonly uniqueColors: number;
  readonly opaqueRatio: number;
}

export async function waitForPreview(page: Page, frame?: number): Promise<void> {
  const surface = page.getByTestId("preview-surface");
  await expect(surface).toHaveAttribute("data-preview-state", "ready");
  if (frame !== undefined) {
    await expect(surface).toHaveAttribute("data-frame", String(frame));
  }
  await expect(surface).toHaveAttribute("data-rendering", "false");
}

export async function setFrame(page: Page, frame: number): Promise<void> {
  const slider = page.getByRole("slider", { name: "Global frame" });
  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) {
      throw new Error("Unable to set the timeline slider value.");
    }
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, frame);
}

export async function readCanvasStats(page: Page): Promise<CanvasStats> {
  const canvas = page.locator("canvas");
  return canvas.evaluate((element) => {
    const source = element as HTMLCanvasElement;
    const sample = document.createElement("canvas");
    sample.width = 480;
    sample.height = 270;
    const context = sample.getContext("2d");
    if (!context) {
      throw new Error("Sample canvas context unavailable.");
    }
    context.drawImage(source, 0, 0, sample.width, sample.height);
    const { data } = context.getImageData(0, 0, sample.width, sample.height);
    const colors = new Set<string>();
    let opaque = 0;
    let hash = 2_166_136_261;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const alpha = data[index + 3] ?? 0;
      if (alpha > 0) opaque += 1;
      if (index % (4 * 7) === 0) {
        colors.add(`${red >> 4},${green >> 4},${blue >> 4},${alpha >> 4}`);
        hash ^= red + green * 3 + blue * 7 + alpha * 11;
        hash = Math.imul(hash, 16_777_619);
      }
    }

    return {
      width: source.width,
      height: source.height,
      hash: hash >>> 0,
      uniqueColors: colors.size,
      opaqueRatio: opaque / (sample.width * sample.height),
    };
  });
}

export async function readRenderMs(page: Page): Promise<number> {
  const text = await page.getByLabel("Last render time").textContent();
  const value = Number.parseFloat(text ?? "");
  if (!Number.isFinite(value)) {
    throw new Error(`Unable to parse render time from "${text}".`);
  }
  return value;
}

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  return errors;
}

export function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[index] ?? 0;
}
