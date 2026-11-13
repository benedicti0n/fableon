// @vitest-environment node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { importCharacter, readCharacter } from "./assets";
import { Rigby2DError } from "./errors";
import { placeFrame } from "./placement";
import { Rigby2DCharacterRuntime } from "./runtime";

let dataRoot: string;
let runtime: Rigby2DCharacterRuntime;
let r22Bytes: Uint8Array;

beforeAll(async () => {
  dataRoot = await mkdtemp(path.join(tmpdir(), "fableon-r3-1-runtime-"));
  runtime = new Rigby2DCharacterRuntime({ dataRoot });
  const r21 = new Uint8Array(
    await readFile(path.join(process.cwd(), "tests/fixtures/rigby2d/artisan-arm-r21.rigby")),
  );
  r22Bytes = new Uint8Array(
    await readFile(path.join(process.cwd(), "tests/fixtures/rigby2d/artisan-arm-r22.rigby")),
  );
  await importCharacter({
    bytes: r21,
    fileName: "artisan-arm-r21.rigby",
    name: "Artisan arm R2.1",
    sourceAttribution: "R2.1 fixture",
    artisticReviewStatus: "experimental_unreviewed",
    characterId: "artisan-arm-r21",
    dataRoot,
  });
  await importCharacter({
    bytes: r22Bytes,
    fileName: "artisan-arm-r22.rigby",
    name: "Artisan arm R2.2",
    sourceAttribution: "R2.2 fixture",
    artisticReviewStatus: "approved_arm_motion_only",
    characterId: "artisan-arm-r22",
    dataRoot,
  });
}, 120_000);

afterAll(async () => {
  await rm(dataRoot, { recursive: true, force: true });
});

describe("Rigby2D character runtime", () => {
  test("imports the R2.2 project immutably and is idempotent by hash", async () => {
    const before = await readCharacter("artisan-arm-r22", dataRoot);
    expect(before.versions).toHaveLength(1);
    const duplicate = await importCharacter({
      bytes: r22Bytes,
      fileName: "artisan-arm-r22.rigby",
      name: "Different name",
      sourceAttribution: "Duplicate import",
      artisticReviewStatus: "experimental_unreviewed",
      characterId: "artisan-arm-r22",
      dataRoot,
    });
    expect(duplicate.created).toBe(false);
    expect(duplicate.version.versionId).toBe(before.currentVersionId);
    expect(duplicate.version.sha256).toBe(before.versions[0]?.sha256);
    const after = await readCharacter("artisan-arm-r22", dataRoot);
    expect(after.versions).toHaveLength(1);
    expect(after.name).toBe("Artisan arm R2.2");
  });

  test("rejects a corrupt .rigby input", async () => {
    await expect(
      importCharacter({
        bytes: new TextEncoder().encode("not a zip"),
        fileName: "broken.rigby",
        name: "Broken",
        sourceAttribution: "test",
        artisticReviewStatus: "experimental_unreviewed",
        characterId: "broken-character",
        dataRoot,
      }),
    ).rejects.toBeInstanceOf(Rigby2DError);
  });

  test("validates the R2.2 project through the real MCP server", async () => {
    const validation = await runtime.validate("artisan-arm-r22");
    expect(validation.valid).toBe(true);
    expect(validation.checks["binaryExport"]).toBe("ok");
  }, 60_000);

  test("catches the R2.1 149/119-degree over-folds and passes its 90-degree pose", async () => {
    const expected = [
      { time: 0.25, requested: 30, measured: 149.25, passed: false },
      { time: 0.5, requested: 60, measured: 119.19, passed: false },
      { time: 0.75, requested: 90, measured: 90.67, passed: true },
    ] as const;
    for (const fixture of expected) {
      const check = await runtime.measureFlexion("artisan-arm-r21", {
        animation: "arm_angles",
        timeSeconds: fixture.time,
        requestedFlexion: fixture.requested,
        chain: { a: "upperarm_r", b: "forearm_r", c: "hand_r" },
      });
      expect(check.flexion).toBeCloseTo(fixture.measured, 1);
      expect(check.passed).toBe(fixture.passed);
      expect(check.bendSide).toBe(-1);
    }
  }, 120_000);

  test("passes the R2.2 32/61/91-degree poses within 3 degrees", async () => {
    const expected = [
      { time: 0.25, requested: 30, measured: 32.03 },
      { time: 0.5, requested: 60, measured: 61.24 },
      { time: 0.75, requested: 90, measured: 90.73 },
    ] as const;
    for (const fixture of expected) {
      const check = await runtime.measureFlexion("artisan-arm-r22", {
        animation: "arm_angles_ikfix",
        timeSeconds: fixture.time,
        requestedFlexion: fixture.requested,
        chain: { a: "upperarm_r", b: "forearm_r", c: "hand_r" },
      });
      expect(check.flexion).toBeCloseTo(fixture.measured, 1);
      expect(check.passed).toBe(true);
      expect(check.delta).toBeLessThanOrEqual(3);
    }
  }, 120_000);

  test("exports a real frame sequence, keeps a stable pivot and reuses the cache", async () => {
    const render = await runtime.renderAnimation("artisan-arm-r22", "showcase_ikfix", 8, {
      timeoutMs: 180_000,
    });
    expect(render.metadata.frameCount).toBe(25);
    expect(render.metadata.frameWidth).toBeGreaterThan(0);
    expect(render.metadata.frameHeight).toBeGreaterThan(0);
    expect(render.metadata.pivot.x).toBeGreaterThan(0);
    expect(render.metadata.pivot.y).toBeGreaterThan(0);
    expect(render.metadata.frameFiles).toHaveLength(25);
    const first = placeFrame({
      frameWidth: render.metadata.frameWidth,
      frameHeight: render.metadata.frameHeight,
      pivot: render.metadata.pivot,
      actor: { x: 960, y: 1040, scale: 0.9 },
      camera: { centerX: 960, centerY: 540, zoom: 1 },
      viewport: { width: 1920, height: 1080 },
    });
    const last = placeFrame({
      frameWidth: render.metadata.frameWidth,
      frameHeight: render.metadata.frameHeight,
      pivot: render.metadata.pivot,
      actor: { x: 960, y: 1040, scale: 0.9 },
      camera: { centerX: 960, centerY: 540, zoom: 1 },
      viewport: { width: 1920, height: 1080 },
    });
    expect(first.anchorX).toBe(last.anchorX);
    expect(first.drawX).toBe(last.drawX);
    expect(first.drawY).toBe(last.drawY);
    const frame = await runtime.getFrame(render.job.id, 0);
    expect(frame.path).toContain("0000.png");
    expect(frame.frameWidth).toBe(render.metadata.frameWidth);
    const exportRecord = JSON.parse(
      await readFile(
        path.join(
          dataRoot,
          "rigby2d",
          "characters",
          "artisan-arm-r22",
          "frame-exports",
          `${render.metadata.cacheKey}.json`,
        ),
        "utf8",
      ),
    ) as { frameCount: number; animation: string };
    expect(exportRecord.frameCount).toBe(render.metadata.frameCount);
    expect(exportRecord.animation).toBe("showcase_ikfix");
    const cached = await runtime.startRender("artisan-arm-r22", "showcase_ikfix", 8);
    expect(cached.status).toBe("completed");
    expect(cached.cached).toBe(true);
    expect(cached.cacheKey).toBe(render.metadata.cacheKey);
  }, 180_000);
});
