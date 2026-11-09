import { expect, test } from "@playwright/test";

const ROUTES = [
  { path: "/", content: /Fableon/ },
  { path: "/studio", content: /Fableon Studio/ },
  { path: "/studio/assets", content: /Illustration Asset Preparation/ },
  { path: "/studio/composition", content: /Phase 4/ },
  { path: "/benchmarks/phase-02", content: /Where the Light Lands/ },
  { path: "/benchmarks/phase-02-5", content: /The Little Bird Comes Home/ },
  { path: "/benchmarks/phase-02-6", content: /Imported Artwork, Same Motion/ },
  {
    path: "/benchmarks/phase-02-7-gate2",
    content: /Production Renderer Proof/,
  },
] as const;

test.describe("Preserved application routes", () => {
  for (const route of ROUTES) {
    test(`serves ${route.path}`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("body")).toContainText(route.content);
    });
  }
});
