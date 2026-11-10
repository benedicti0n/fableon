import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";

import { prepareProviderPack, readRgbaPixels, registrationFor } from "./assets";
import { RIG_SLOTS } from "./rig-slots";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "fableon-provider-assets-"));

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function makePartImage(file: string, opaque = false): Promise<void> {
  const size = 40;
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const inside = opaque || (x >= 5 && x < 35 && y >= 5 && y < 35);
      data[index] = 190;
      data[index + 1] = 80;
      data[index + 2] = 40;
      data[index + 3] = inside ? 255 : 0;
    }
  }
  await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toFile(file);
}

async function makeBackground(file: string): Promise<void> {
  await sharp({
    create: {
      width: 800,
      height: 450,
      channels: 4,
      background: { r: 220, g: 180, b: 120, alpha: 1 },
    },
  })
    .png()
    .toFile(file);
}

describe("provider asset registration", () => {
  it("aligns a generated part pivot to the master rig pivot", () => {
    const registration = registrationFor({
      width: 40,
      height: 40,
      sourcePivot: { x: 20, y: 20 },
      targetPivot: { x: 440, y: 540 },
      scale: 2,
    });
    expect(registration).toEqual({
      offsetX: 400,
      offsetY: 500,
      width: 80,
      height: 80,
      scale: 2,
    });
  });

  it("validates a transparent part and registers all rig slots", async () => {
    const partFile = path.join(tempDir, "part.png");
    const backgroundFile = path.join(tempDir, "background.png");
    await makePartImage(partFile);
    await makeBackground(backgroundFile);
    const outputDir = path.join(tempDir, "pack");
    const result = await prepareProviderPack({
      provider: "openai",
      model: "gpt-image-2.6-sunburst",
      experimentId: "test",
      title: "Test pack",
      outputDir,
      generationMode: "engineering-test-fixture",
      parts: [
        {
          slot: "artisan_torso",
          sourcePath: partFile,
          sourcePivot: { x: 20, y: 20 },
          scale: 1,
        },
      ],
      backgrounds: [{ id: "courtyard", sourcePath: backgroundFile }],
    });
    expect(result.parts).toHaveLength(1);
    expect(result.parts[0]?.status).toBe("ready");
    expect(result.missingSlots).toHaveLength(RIG_SLOTS.length - 1);
    expect(result.backgrounds[0]?.width).toBe(2600);
    expect(result.backgrounds[0]?.height).toBe(1500);
    expect(result.parts[0]?.alpha.hasAlpha).toBe(true);
    const manifest = JSON.parse(await readFile(result.manifestPath, "utf8")) as {
      parts: { id: string; bytes: number }[];
      backgrounds: Record<string, unknown>;
      missingSlots: string[];
    };
    expect(manifest.parts[0]?.id).toBe("artisan_torso");
    expect(manifest.parts[0]?.bytes).toBeGreaterThan(0);
    expect(manifest.backgrounds["courtyard"]).toBeDefined();
    expect(manifest.missingSlots).toHaveLength(RIG_SLOTS.length - 1);
  });

  it("rejects a fully opaque generated part", async () => {
    const partFile = path.join(tempDir, "opaque.png");
    await makePartImage(partFile, true);
    const result = await prepareProviderPack({
      provider: "gemini",
      model: "gemini-nano-banana-2.1",
      experimentId: "test",
      title: "Opaque test",
      outputDir: path.join(tempDir, "opaque-pack"),
      generationMode: "engineering-test-fixture",
      parts: [
        {
          slot: "artisan_torso",
          sourcePath: partFile,
          sourcePivot: { x: 20, y: 20 },
        },
      ],
      backgrounds: [],
    });
    expect(result.parts[0]?.status).toBe("rejected");
    expect(result.parts[0]?.notes).toEqual([]);
  });

  it("extracts a masked part and preserves alpha", async () => {
    const sourceFile = path.join(tempDir, "masked-source.png");
    const maskFile = path.join(tempDir, "mask.png");
    await makePartImage(sourceFile, true);
    await makePartImage(maskFile);
    const result = await prepareProviderPack({
      provider: "gemini",
      model: "gemini-nano-banana-2.1",
      experimentId: "test",
      title: "Masked test",
      outputDir: path.join(tempDir, "masked-pack"),
      generationMode: "engineering-test-fixture",
      parts: [
        {
          slot: "artisan_head",
          sourcePath: sourceFile,
          maskPath: maskFile,
          sourcePivot: { x: 20, y: 20 },
        },
      ],
      backgrounds: [],
    });
    expect(result.parts[0]?.status).toBe("ready");
    const pixels = await readRgbaPixels(result.parts[0]!.file);
    expect(pixels.data[3]).toBe(0);
    expect(pixels.data[(20 * pixels.width + 20) * 4 + 3]).toBe(255);
  });
});
