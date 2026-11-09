import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "@playwright/test";

const testDataDir = path.join(process.cwd(), ".fableon-data", "playwright");
fs.rmSync(testDataDir, { recursive: true, force: true });

const serverEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => {
    return typeof entry[1] === "string";
  }),
);
serverEnv["FABLEON_DATA_DIR"] = testDataDir;
serverEnv["PORT"] = "3100";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 20_000,
  },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 1440, height: 1000 },
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3100/studio",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: serverEnv,
  },
});
