import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readRepoFile(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), "utf8");
}

describe("Stage 2C.4 runtime regression guards", () => {
  it("takes the PNG data URL from the canvas, not the 2D context", () => {
    const script = readRepoFile("scripts/stage2c2-render.ts");
    expect(script).toContain("document.getElementById('c').toDataURL");
    expect(script).not.toMatch(/\bc\.toDataURL\s*\(/);
  });

  it("closes Chromium and forces a failing exit when the render throws", () => {
    const script = readRepoFile("scripts/stage2c2-render.ts");
    expect(script).toContain("activeBrowser");
    expect(script).toContain("await activeBrowser.close()");
    expect(script).toContain("process.exit(1)");
  });

  it("runs diagnostics in a detached process group with a SIGKILL fallback", () => {
    const supervisor = readRepoFile("scripts/stage2c4/supervise.mjs");
    expect(supervisor).toContain("detached: true");
    expect(supervisor).toContain("process.kill(-child.pid");
    expect(supervisor).toContain('killGroup("SIGKILL")');
    expect(supervisor).toContain("timedOut");
  });
});
