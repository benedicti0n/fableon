import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const artifactDir = path.join(process.cwd(), "docs", "benchmarks", "phase-05.1", "screenshots");
fs.mkdirSync(artifactDir, { recursive: true });

test.describe("Phase 5.1 provider safety and Studio", () => {
  test("shows the provider gate, estimates without spending, and blocks unauthorized generation", async ({
    page,
    request,
  }) => {
    await page.goto("/studio/providers");
    await expect(page.getByTestId("provider-workspace")).toBeVisible();
    await expect(page.getByText(/No paid request has been made/i)).toBeVisible();
    await expect(page.getByText("gpt-image-2.6-sunburst").first()).toBeVisible();
    await expect(page.getByText("gemini-nano-banana-2.1").first()).toBeVisible();

    await page.getByRole("button", { name: /Estimate cost/i }).click();
    await expect(page.getByTestId("provider-estimate")).toBeVisible();
    await expect(page.getByTestId("provider-estimate")).toContainText(/Authorization/i);

    const unauthorized = await request.post("/api/studio/providers/generate", {
      data: {
        experimentId: "phase-05.1-browser-test",
        provider: "openai",
        model: "gpt-image-2.6-sunburst",
        operation: "generate-master",
        prompt: "A test master",
        width: 1536,
        height: 1024,
        quality: "medium",
        aspectRatio: "3:2",
        outputCount: 1,
        transparentBackground: true,
        requestKey: "browser-unauthorized-1",
      },
    });
    expect(unauthorized.status()).toBe(403);
    const body = (await unauthorized.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("authorization_missing");

    await page.screenshot({ path: path.join(artifactDir, "provider-gate.png") });
  });

  test("creates a pending authorization but requires explicit approval", async ({
    page,
    request,
  }) => {
    await page.goto("/studio/providers");
    await expect(page.getByTestId("provider-workspace")).toBeVisible();
    const created = await request.post("/api/studio/providers/authorizations", {
      data: {
        experimentId: "phase-05.1-browser-test",
        provider: "openai",
        model: "gpt-image-2.6-sunburst",
        requestedBy: "playwright",
        maxCostUsd: 1,
        maxRequests: 2,
        maxOutputsPerRequest: 1,
        maxWidth: 2048,
        maxHeight: 2048,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
    });
    expect(created.status()).toBe(201);
    const createdBody = (await created.json()) as {
      authorization: { id: string; status: string };
    };
    expect(createdBody.authorization.status).toBe("pending");

    const wrong = await request.post(
      `/api/studio/providers/authorizations/${createdBody.authorization.id}/approve`,
      {
        data: { approvedBy: "playwright", confirmation: "yes" },
      },
    );
    expect(wrong.status()).toBe(400);
    await page.reload();
    await expect(page.getByText("pending", { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({ path: path.join(artifactDir, "provider-pending-authorization.png") });
  });

  test("renders the cost comparison, rig-slot contract, and provider production gate", async ({
    page,
  }) => {
    await page.goto("/studio/providers/costs");
    await expect(page.getByRole("heading", { name: "OpenAI vs Gemini" })).toBeVisible();
    await expect(page.getByText(/Spend status/)).toContainText(/\$\d+\.\d{4}/);
    await expect(page.getByText(/Stage 2B records/)).toBeVisible();
    await expect(
      page.getByText(/No complete 31-part Stage 2B rig, eight-second provider animation/i),
    ).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, "provider-costs.png") });

    await page.goto("/studio/providers/assets");
    await expect(page.getByRole("heading", { name: "Semantic rig slots" })).toBeVisible();
    await expect(page.getByText("Required slots")).toBeVisible();
    await expect(page.getByText("artisan_torso")).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, "provider-rig-slots.png") });

    await page.goto("/studio/providers/production");
    await expect(page.getByRole("heading", { name: "No complete provider pack" })).toBeVisible();
    await expect(page.getByText(/Stage 1 stops at the paid-generation gate/i)).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, "provider-production-gate.png") });
  });

  test("loads the persistent connector calibration editor", async ({ page }) => {
    await page.goto("/studio/folk/rigs/connectors");
    await expect(page.getByRole("heading", { name: "Connector calibration" })).toBeVisible();
    await expect(page.getByText("nearForearm", { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/socket/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Save connectors" })).toBeVisible();
    await expect(page.getByText("Debug overlay")).toBeVisible();
  });
});
