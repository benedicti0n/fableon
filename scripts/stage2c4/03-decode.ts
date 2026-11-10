import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const trace = process.env.STAGE2C4_TRACE;
if (!trace) throw new Error("STAGE2C4_TRACE is required");
mkdirSync(path.dirname(trace), { recursive: true });
writeFileSync(trace, "");
const log = (message: string) => appendFileSync(trace, `${new Date().toISOString()} ${message}\n`);
const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const sharp = require("sharp");

interface DecodedImage {
  file: string;
  sha256: string;
  bytes: number;
  format: string | undefined;
  width: number | undefined;
  height: number | undefined;
  channels: number | undefined;
  hasAlpha: boolean;
  alpha: { transparent: number; translucent: number; opaque: number; total: number };
  centerPixel: number[] | null;
  entropy: number | null;
}

async function decode(file: string): Promise<DecodedImage> {
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let translucent = 0;
  let opaque = 0;
  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index] ?? 0;
    if (alpha === 0) transparent += 1;
    else if (alpha === 255) opaque += 1;
    else translucent += 1;
  }
  const centerX = Math.floor(info.width / 2);
  const centerY = Math.floor(info.height / 2);
  const offset = (centerY * info.width + centerX) * 4;
  const stats = await sharp(bytes).stats();
  return {
    file: path.relative(process.cwd(), file),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha,
    alpha: { transparent, translucent, opaque, total: info.width * info.height },
    centerPixel: [
      data[offset] ?? 0,
      data[offset + 1] ?? 0,
      data[offset + 2] ?? 0,
      data[offset + 3] ?? 0,
    ],
    entropy: stats.entropy,
  };
}

async function main() {
  log("decode-start");
  const root = process.cwd();
  const sources = {
    openaiArmSheet: "docs/benchmarks/phase-05.1/stage-2c2/openai/arm-sheet.png",
    openaiUpperArm: "docs/benchmarks/phase-05.1/stage-2c2/openai/upperArm.png",
    geminiArmSheet: "docs/benchmarks/phase-05.1/stage-2c2/gemini/arm-sheet.png",
    geminiUpperArm: "docs/benchmarks/phase-05.1/stage-2c2/gemini/upperArm.png",
  };
  const results: Record<string, DecodedImage> = {};
  for (const [name, relative] of Object.entries(sources)) {
    const file = path.join(root, relative);
    log(`decode-start ${name} ${relative}`);
    results[name] = await decode(file);
    log(
      `decode-done ${name} ${results[name].format} ${results[name].width}x${results[name].height} alpha=${results[name].hasAlpha}`,
    );
  }
  const outputDir = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c4", "smoke");
  await mkdir(outputDir, { recursive: true });
  const output = path.join(outputDir, "03-decode.json");
  await writeFile(output, `${JSON.stringify(results, null, 2)}\n`);
  log(`decode-report ${path.relative(root, output)}`);
  console.log(
    JSON.stringify({ marker: "decode-ok", output: path.relative(root, output), results }, null, 2),
  );
  log("decode-finished");
}
main().catch((error) => {
  log(`ERROR ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  console.error(error);
  process.exit(1);
});
