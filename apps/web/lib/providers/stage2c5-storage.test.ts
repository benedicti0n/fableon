import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createSeedMask,
  getSourcePath,
  getStage2C5State,
  listMaskRevisions,
  readLatestMaskRevision,
  saveMaskRevision,
  sniffImageFormat,
  Stage2C5StorageError,
} from "./stage2c5-storage";

let tempRoot: string;
const originalDataDir = process.env["FABLEON_DATA_DIR"];

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "fableon-stage2c5-"));
  process.env["FABLEON_DATA_DIR"] = tempRoot;
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env["FABLEON_DATA_DIR"];
  else process.env["FABLEON_DATA_DIR"] = originalDataDir;
});

async function sourceHash(provider: "openai" | "gemini", sheet: "arm" | "leg") {
  const bytes = await readFile(getSourcePath(provider, sheet));
  return createHash("sha256").update(bytes).digest("hex");
}

describe("Stage 2C.5 source validation", () => {
  it("sniffs PNG and JPEG from content, not extension", async () => {
    expect(sniffImageFormat(await readFile(getSourcePath("openai", "arm")))).toBe("png");
    expect(sniffImageFormat(await readFile(getSourcePath("gemini", "arm")))).toBe("jpeg");
  });

  it("describes the real source sheets and parts", async () => {
    const state = await getStage2C5State();
    expect(state.sources).toHaveLength(4);
    const gemini = state.sources.find(
      (entry) => entry.provider === "gemini" && entry.sheet === "arm",
    );
    expect(gemini?.format).toBe("jpeg");
    expect(gemini?.width).toBe(2528);
    expect(state.parts).toHaveLength(12);
    expect(state.parts.some((entry) => entry.id === "handOpen")).toBe(true);
    expect(state.parts.some((entry) => entry.id === "nearFoot")).toBe(true);
  });
});

describe("Stage 2C.5 seeded mask separation", () => {
  it("places wrist masks on opposite sides of the split line", async () => {
    const forearm = await createSeedMask("openai", "nearForearm");
    const hand = await createSeedMask("openai", "handOpen");
    const { default: sharp } = await import("sharp");
    const fore = await sharp(forearm.bytes).extractChannel(3).raw().toBuffer();
    const palm = await sharp(hand.bytes).extractChannel(3).raw().toBuffer();
    const width = forearm.metadata.width;
    const height = forearm.metadata.height;
    let foreBottom = -1;
    let handTop = height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if ((fore[y * width + x] ?? 0) > 8) foreBottom = Math.max(foreBottom, y);
        if ((palm[y * width + x] ?? 0) > 8) handTop = Math.min(handTop, y);
      }
    }
    expect(foreBottom).toBeLessThan(612);
    expect(handTop).toBeGreaterThanOrEqual(612);
  });

  it("places ankle masks on opposite sides of the split line", async () => {
    const shin = await createSeedMask("openai", "nearShin");
    const foot = await createSeedMask("openai", "nearFoot");
    const { default: sharp } = await import("sharp");
    const shinAlpha = await sharp(shin.bytes).extractChannel(3).raw().toBuffer();
    const footAlpha = await sharp(foot.bytes).extractChannel(3).raw().toBuffer();
    const width = shin.metadata.width;
    const height = shin.metadata.height;
    let shinBottom = -1;
    let footTop = height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if ((shinAlpha[y * width + x] ?? 0) > 8) shinBottom = Math.max(shinBottom, y);
        if ((footAlpha[y * width + x] ?? 0) > 8) footTop = Math.min(footTop, y);
      }
    }
    expect(shinBottom).toBeLessThan(825);
    expect(footTop).toBeGreaterThanOrEqual(825);
  });
});

describe("Stage 2C.5 revision persistence", () => {
  it("saves, reloads, rejects stale writes and preserves source hashes", async () => {
    const source = await sourceHash("openai", "arm");
    const seed = await createSeedMask("openai", "nearUpperArm");
    const beforeSource = await readFile(getSourcePath("openai", "arm"));
    const first = await saveMaskRevision("openai", "nearUpperArm", {
      maskPngBase64: seed.bytes.toString("base64"),
      sourceSha256: source,
      width: seed.metadata.width,
      height: seed.metadata.height,
      expectedRevision: 0,
      editOrigin: "test",
    });
    expect(first.revision).toBe(1);
    expect(first.reviewStatus).toBe("pending");
    expect(first.technicalValidity).toBe("pass");
    expect(await readLatestMaskRevision("openai", "nearUpperArm")).toEqual(first);
    expect(await listMaskRevisions("openai", "nearUpperArm")).toHaveLength(1);

    await expect(
      saveMaskRevision("openai", "nearUpperArm", {
        maskPngBase64: seed.bytes.toString("base64"),
        sourceSha256: source,
        width: seed.metadata.width,
        height: seed.metadata.height,
        expectedRevision: 0,
        editOrigin: "test",
      }),
    ).rejects.toMatchObject({ code: "conflict" });

    const second = await saveMaskRevision("openai", "nearUpperArm", {
      maskPngBase64: seed.bytes.toString("base64"),
      sourceSha256: source,
      width: seed.metadata.width,
      height: seed.metadata.height,
      expectedRevision: 1,
      editOrigin: "test",
    });
    expect(second.revision).toBe(2);
    expect(await listMaskRevisions("openai", "nearUpperArm")).toHaveLength(2);
    expect(
      createHash("sha256")
        .update(await readFile(getSourcePath("openai", "arm")))
        .digest("hex"),
    ).toBe(createHash("sha256").update(beforeSource).digest("hex"));
  });

  it("rejects wrong source hashes and mask dimensions", async () => {
    const seed = await createSeedMask("openai", "nearUpperArm");
    await expect(
      saveMaskRevision("openai", "nearUpperArm", {
        maskPngBase64: seed.bytes.toString("base64"),
        sourceSha256: "0".repeat(64),
        width: seed.metadata.width,
        height: seed.metadata.height,
        expectedRevision: 0,
        editOrigin: "test",
      }),
    ).rejects.toBeInstanceOf(Stage2C5StorageError);
    await expect(
      saveMaskRevision("openai", "nearUpperArm", {
        maskPngBase64: seed.bytes.toString("base64"),
        sourceSha256: await sourceHash("openai", "arm"),
        width: 640,
        height: 360,
        expectedRevision: 0,
        editOrigin: "test",
      }),
    ).rejects.toMatchObject({ code: "invalid" });
  });
});
