import fs from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { collectPageErrors } from "./helpers";

const screenshotDir = path.join(process.cwd(), "docs/reports/phase-03/screenshots");
fs.mkdirSync(screenshotDir, { recursive: true });

const AI_VIDEO = path.resolve("docs/benchmarks/phase-02-8/generated/original-video.mp4");
const RIG_VIDEO = path.resolve("docs/benchmarks/phase-02-7-gate2/landing-preview.mp4");

async function waitForVideo(page: Page, testId: string): Promise<void> {
  const video = page.getByTestId(`${testId}-video`);
  await expect(video).toBeVisible({ timeout: 30_000 });
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
}

async function seekPreview(page: Page, seconds: number): Promise<void> {
  const slider = page.getByTestId("shot-video-preview").locator('input[type="range"]');
  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) throw new Error("Unable to set the video position.");
    setter.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, seconds);
}

async function hideStudioHeaderForElementShot(page: Page): Promise<void> {
  await page.addStyleTag({
    content: '[data-testid="studio-header"] { display: none !important; }',
  });
}

async function selectTakeFromHistory(
  page: Page,
  takeNumber: number,
  expectedUrl: string,
): Promise<void> {
  const row = page
    .getByTestId("take-history")
    .locator("tr")
    .filter({ hasText: `#${takeNumber}` });
  const persisted = page.waitForResponse(
    (response) => response.request().method() === "PATCH" && response.url().includes("/shots/"),
  );
  await row.getByRole("button", { name: "View take" }).click();
  await persisted;
  await page.waitForURL(expectedUrl, { timeout: 15_000 });
}

test("complete Phase 3 create-import-review-regenerate-compare-approve workflow", async ({
  page,
}) => {
  const errors = collectPageErrors(page);
  const providerRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("generativelanguage.googleapis.com") ||
      request.url().includes("api.openai.com/v1/videos")
    ) {
      providerRequests.push(request.url());
    }
  });

  await page.goto("/studio/projects");
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await page.locator("#project-title").fill("Phase 3 E2E Project");
  await page.locator("#project-description").fill("A complete local review workflow.");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByTestId("project-page")).toBeVisible();
  await expect(page.locator("body")).toContainText("Phase 3 E2E Project");

  await page.locator("#new-shot-title").fill("Bird Landing (E2E)");
  await page.locator("#new-shot-description").fill("A bird lands in a painted forest.");
  await page.locator("#new-shot-duration").fill("3");
  await page.locator("#new-shot-prompt").fill("Painterly bird landing, static camera.");
  await page.getByRole("button", { name: "Add shot" }).click();
  await expect(page.getByTestId("shot-workspace")).toBeVisible();
  await expect(page.locator("body")).toContainText("Bird Landing (E2E)");

  await page.locator("#take-video-file").setInputFiles(AI_VIDEO);
  await page.getByRole("button", { name: "Import as new take" }).click();
  await waitForVideo(page, "shot-video-preview");
  await expect(page.getByTestId("shot-workspace")).toContainText("Take #1");
  await expect(page.getByTestId("take-history")).toContainText("#1");
  await page.waitForURL((url) => url.searchParams.has("take"), { timeout: 15_000 });
  const takeOneUrl = page.url();

  const preview = page.getByTestId("shot-video-preview");
  await preview.getByRole("button", { name: "Play video" }).click();
  await expect
    .poll(async () =>
      page
        .getByTestId("shot-video-preview-video")
        .evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0.1);
  await preview.getByRole("button", { name: "Pause video" }).click();
  await seekPreview(page, 1);
  await expect
    .poll(async () =>
      page
        .getByTestId("shot-video-preview-video")
        .evaluate((element) => (element as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0.9);

  const issueForm = page.getByTestId("add-issue-form");
  await issueForm.locator("#issue-category").selectOption("anatomy_defect");
  await issueForm.locator("#issue-severity").selectOption("critical");
  await issueForm.locator("#issue-timestamp").fill("1.1");
  await issueForm
    .locator("#issue-description")
    .fill("Detached far wing near the head at 1.1 seconds.");
  await issueForm.getByRole("button", { name: "Add issue" }).click();
  await expect(page.getByTestId("review-panel")).toContainText("Detached far wing");

  await page.getByTestId("review-panel").getByRole("button", { name: "Needs changes" }).click();
  await expect(page.getByTestId("review-panel")).toContainText(
    "Review status saved: Needs changes.",
  );

  const regeneration = page.getByTestId("regeneration-panel");
  await regeneration.getByRole("checkbox", { name: /Use issue:/ }).check();
  await regeneration
    .locator("#regen-change")
    .fill("Fix the far-wing attachment and preserve character identity.");
  await regeneration.getByRole("button", { name: "Mark ready for authorization" }).click();
  await expect(regeneration).toContainText("Ready for authorization");
  await expect(regeneration).toContainText("No provider call was made");
  expect(providerRequests).toEqual([]);

  await page.locator("#take-video-file").setInputFiles(RIG_VIDEO);
  await page.locator("#take-source-type").selectOption("imported-video");
  await page.getByRole("button", { name: "Import as new take" }).click();
  await expect(page.getByTestId("shot-workspace")).toContainText("Take #2");
  await waitForVideo(page, "shot-video-preview");
  await expect(
    page.getByTestId("take-history").locator("tr").filter({ hasText: "#1" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("take-history").locator("tr").filter({ hasText: "#2" }),
  ).toBeVisible();
  await page.waitForURL((url) => url.toString() !== takeOneUrl && url.searchParams.has("take"), {
    timeout: 15_000,
  });
  const takeTwoUrl = page.url();

  await expect(page.getByTestId("comparison-panel")).toContainText("manual comparison");
  await waitForVideo(page, "comparison-left-video");
  await waitForVideo(page, "comparison-right-video");
  await hideStudioHeaderForElementShot(page);
  await page.getByTestId("comparison-panel").screenshot({
    path: path.join(screenshotDir, "comparison-panel.png"),
  });

  await page.getByTestId("review-panel").getByRole("button", { name: "Approve take" }).click();
  await expect(page.getByTestId("review-panel")).toContainText("Review status saved: Approved.");
  await page.getByTestId("review-panel").screenshot({
    path: path.join(screenshotDir, "review-panel.png"),
  });

  await selectTakeFromHistory(page, 1, takeOneUrl);
  await expect(page.getByTestId("review-panel")).toContainText("Detached far wing");
  await page.reload();
  await expect(page.getByTestId("review-panel")).toContainText("Detached far wing");
  await expect(page.getByTestId("take-history")).toContainText("Needs changes");

  await selectTakeFromHistory(page, 2, takeTwoUrl);
  await page.reload();
  await expect(page.getByTestId("review-panel").getByText("Approved").first()).toBeVisible();
  await expect(page.getByTestId("take-history")).toContainText("Approved");

  await page.getByRole("link", { name: "Project overview" }).click();
  await expect(page.getByTestId("project-page")).toBeVisible();
  await expect(
    page.getByTestId("shot-row").filter({ hasText: "Bird Landing (E2E)" }),
  ).toContainText("Approved");
  await page.screenshot({
    path: path.join(screenshotDir, "project-overview.png"),
    fullPage: false,
  });

  expect(errors).toEqual([]);
});

test("captures the real demonstration project and workspace UI", async ({ page, request }) => {
  const errors = collectPageErrors(page);
  const response = await request.post("/api/studio/demo");
  expect([200, 201]).toContain(response.status());
  const demo = (await response.json()) as {
    project: {
      id: string;
      shots: { takes: { mediaId: string }[] }[];
    };
  };
  const aiMediaId = demo.project.shots[0]?.takes[0]?.mediaId;
  expect(aiMediaId).toBeTruthy();
  const range = await request.get(`/api/studio/media/${aiMediaId}?projectId=${demo.project.id}`, {
    headers: { Range: "bytes=0-99" },
  });
  expect(range.status()).toBe(206);
  expect(range.headers()["content-range"]).toMatch(/^bytes 0-99\/\d+$/);
  expect((await range.body()).length).toBe(100);

  await page.goto("/studio/projects");
  await expect(page.getByTestId("projects-page")).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotDir, "projects-dashboard.png"),
    fullPage: false,
  });

  await page.getByTestId("project-card").filter({ hasText: "Where the Light Lands" }).click();
  await expect(page.getByTestId("project-page")).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotDir, "demo-project.png"),
    fullPage: false,
  });

  await page.getByRole("link", { name: /Shot 001 — Bird Landing \(AI\)/ }).click();
  await expect(page.getByTestId("shot-workspace")).toBeVisible();
  await waitForVideo(page, "shot-video-preview");
  await page.screenshot({
    path: path.join(screenshotDir, "shot-workspace.png"),
    fullPage: false,
  });

  await hideStudioHeaderForElementShot(page);
  await page.getByTestId("review-panel").scrollIntoViewIfNeeded();
  await page.getByTestId("review-panel").screenshot({
    path: path.join(screenshotDir, "demo-review-panel.png"),
  });
  await page.getByTestId("regeneration-panel").scrollIntoViewIfNeeded();
  await page.getByTestId("regeneration-panel").screenshot({
    path: path.join(screenshotDir, "demo-regeneration-panel.png"),
  });

  expect(errors).toEqual([]);
});
