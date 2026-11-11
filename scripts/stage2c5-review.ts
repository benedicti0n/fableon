import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const sharp = require("sharp");

const TILE_W = 640;
const TILE_H = 427;

async function checker(width: number, height: number): Promise<Buffer> {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><pattern id="c" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#d8d3ca"/><rect x="10" y="10" width="10" height="10" fill="#d8d3ca"/><rect x="10" width="10" height="10" fill="#f1ece2"/><rect y="10" width="10" height="10" fill="#f1ece2"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`,
  );
  return sharp(svg).png().toBuffer();
}

async function maskOverlay(maskFile: string): Promise<Buffer> {
  const { data, info } = await sharp(maskFile)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tinted = Buffer.alloc(info.width * info.height * 4);
  for (let index = 0; index < info.width * info.height; index += 1) {
    const alpha = Math.round((data[index * 4 + 3] ?? 0) * 0.55);
    const offset = index * 4;
    tinted[offset] = 255;
    tinted[offset + 1] = 143;
    tinted[offset + 2] = 55;
    tinted[offset + 3] = alpha;
  }
  return sharp(tinted, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(TILE_W, TILE_H, { fit: "fill" })
    .png()
    .toBuffer();
}

async function maskReview(provider: string, parts: string[], root: string, output: string) {
  const candidates = JSON.parse(
    await readFile(
      path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c5", "candidate-inventory.json"),
      "utf8",
    ),
  ) as { parts: { provider: string; part: string; sourcePath: string; maskFile: string }[] };
  const records = parts.map((part) =>
    candidates.parts.find((entry) => entry.provider === provider && entry.part === part)!,
  );
  const sourcePath = records[0]!.sourcePath;
  const source = await readFile(path.join(root, sourcePath));
  const base = await sharp(source).resize(TILE_W, TILE_H, { fit: "fill" }).png().toBuffer();
  const background = await checker(TILE_W, TILE_H);
  const composite: { input: Buffer; left: number; top: number }[] = [];
  const labels: string[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!;
    const x = (index % 2) * TILE_W;
    const y = Math.floor(index / 2) * (TILE_H + 30) + 30;
    composite.push({ input: background, left: x, top: y });
    composite.push({ input: base, left: x, top: y });
    composite.push({ input: await maskOverlay(path.join(root, record.maskFile)), left: x, top: y });
    labels.push(
      `<rect x="${x + 8}" y="${y + 8}" width="330" height="28" fill="rgba(26,13,8,.82)"/><text x="${x + 16}" y="${y + 28}" fill="#fff2cf" font-family="Menlo,monospace" font-size="15">${provider.toUpperCase()} · ${record.part} mask r1</text>`,
    );
  }
  await sharp({
    create: {
      width: TILE_W * 2,
      height: (TILE_H + 30) * 3,
      channels: 4,
      background: { r: 26, g: 13, b: 8, alpha: 1 },
    },
  })
    .composite([
      ...composite,
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W * 2}" height="${(TILE_H + 30) * 3}">${labels.join("")}</svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(output);
}

async function beforeAfter(root: string, output: string) {
  const rows = [
    [
      "OpenAI",
      "docs/benchmarks/phase-05.1/stage-2c4/neutral-openai.png",
      "docs/benchmarks/phase-05.1/stage-2c5/neutral-openai.png",
    ],
    [
      "Gemini",
      "docs/benchmarks/phase-05.1/stage-2c4/neutral-gemini.png",
      "docs/benchmarks/phase-05.1/stage-2c5/neutral-gemini.png",
    ],
  ];
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  const labels: string[] = [];
  for (let row = 0; row < rows.length; row += 1) {
    const [provider, before, after] = rows[row]!;
    for (let column = 0; column < 2; column += 1) {
      const file = path.join(root, column === 0 ? before! : after!);
      tiles.push({
        input: await sharp(file).resize(640, 360, { fit: "fill" }).png().toBuffer(),
        left: column * 640,
        top: row * 360,
      });
      const label = `${provider} · ${column === 0 ? "Stage 2C.4 baked hand" : "Stage 2C.5 separated hand"}`;
      labels.push(
        `<rect x="${column * 640 + 10}" y="${row * 360 + 10}" width="${label.length * 9 + 20}" height="28" fill="rgba(26,13,8,.82)"/><text x="${column * 640 + 18}" y="${row * 360 + 30}" fill="#fff2cf" font-family="Menlo,monospace" font-size="14">${label}</text>`,
      );
    }
  }
  await sharp({
    create: { width: 1280, height: 720, channels: 4, background: { r: 26, g: 13, b: 8, alpha: 1 } },
  })
    .composite([
      ...tiles,
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">${labels.join("")}</svg>`,
        ),
        left: 0,
        top: 0,
      },
    ])
    .png()
    .toFile(output);
}

async function main() {
  const root = process.cwd();
  const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c5");
  await mkdir(docs, { recursive: true });
  await maskReview(
    "openai",
    ["nearUpperArm", "nearForearm", "handOpen", "nearThigh", "nearShin", "nearFoot"],
    root,
    path.join(docs, "openai-mask-review.png"),
  );
  await maskReview(
    "gemini",
    ["nearUpperArm", "nearForearm", "handOpen", "nearThigh", "nearShin", "nearFoot"],
    root,
    path.join(docs, "gemini-mask-review.png"),
  );
  await beforeAfter(root, path.join(docs, "before-after-comparison.png"));
  console.log("review sheets written");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
