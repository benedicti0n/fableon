import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEMO_PROJECT_ID, importDemoProject } from "./demo";
import { getProjectMediaDir, readProject } from "./repository";

let tempRoot: string;
let previousDataRoot: string | undefined;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "fableon-studio-demo-"));
  previousDataRoot = process.env["FABLEON_DATA_DIR"];
  process.env["FABLEON_DATA_DIR"] = tempRoot;
});

afterEach(async () => {
  if (previousDataRoot === undefined) {
    delete process.env["FABLEON_DATA_DIR"];
  } else {
    process.env["FABLEON_DATA_DIR"] = previousDataRoot;
  }
  await rm(tempRoot, { recursive: true, force: true });
});

describe("Fableon demonstration project", () => {
  it("imports the real AI and deterministic benchmarks into one hybrid project", async () => {
    const first = await importDemoProject();
    expect(first.created).toBe(true);
    expect(first.project.id).toBe(DEMO_PROJECT_ID);
    expect(first.project.demoKey).toBe("where-the-light-lands");
    expect(first.project.title).toBe("Where the Light Lands");
    expect(first.project.shots).toHaveLength(2);
    expect(first.project.shots.map((shot) => shot.renderingMethod)).toEqual([
      "ai-video",
      "deterministic",
    ]);
    expect(first.project.shots[0]?.takes[0]?.sourceType).toBe("ai-video");
    expect(first.project.shots[1]?.takes[0]?.sourceType).toBe("deterministic-export");
    expect(first.project.shots[0]?.takes[0]?.provider).toBe("Google");
    expect(first.project.shots[0]?.takes[0]?.model).toBe("gemini-omni-1.2-flash");
    expect(first.project.shots[0]?.takes[0]?.sha256).toBe(
      "76fc11f30d36732b0149fe00624a4dfcdc88e5a6f22388ddde2971faf7e738bf",
    );
    expect(first.project.shots[0]?.takes[0]?.issues).toHaveLength(3);
    expect(first.project.shots[0]?.takes[0]?.issues[0]?.severity).toBe("critical");
    expect(first.project.shots[1]?.takes[0]?.issues).toHaveLength(1);
    expect(first.project.regenerationRequests).toHaveLength(1);
    expect(first.project.regenerationRequests[0]?.status).toBe("ready_for_authorization");
    expect(first.project.regenerationRequests[0]?.defectIssueIds).toHaveLength(3);
    expect(first.project.media).toHaveLength(4);

    const mediaFiles = await readdir(getProjectMediaDir(DEMO_PROJECT_ID));
    expect(mediaFiles).toHaveLength(4);

    const reloaded = await readProject(DEMO_PROJECT_ID);
    expect(reloaded.shots).toHaveLength(2);
    expect(reloaded.shots[0]?.takes[0]?.reviewStatus).toBe("needs_changes");
    expect(reloaded.shots[1]?.takes[0]?.reviewStatus).toBe("needs_changes");
  });

  it("is idempotent and never duplicates media or shots on repeated import", async () => {
    const first = await importDemoProject();
    const second = await importDemoProject();
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.project.id).toBe(first.project.id);
    expect(second.project.media).toHaveLength(4);
    expect(second.project.shots).toHaveLength(2);
    expect(await readdir(getProjectMediaDir(DEMO_PROJECT_ID))).toHaveLength(4);
  });
});
