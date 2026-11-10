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

type Provider = "openai" | "gemini";
type Rgba = { data: Buffer; width: number; height: number };

interface SourceSpec {
  provider: Provider;
  part: string;
  cell: 0 | 1;
  source: string;
}

function maskFromAlpha(source: Rgba, half: number, cellLeft: number): Buffer {
  const mask = Buffer.alloc(source.width * source.height);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < half; x += 1) {
      const sourceOffset = (y * source.width + cellLeft + x) * 4;
      mask[y * source.width + x] = source.data[sourceOffset + 3] ?? 0;
    }
  }
  return mask;
}

function maskFromGreen(source: Rgba, half: number, cellLeft: number): Buffer {
  const mask = Buffer.alloc(source.width * source.height);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < half; x += 1) {
      const offset = (y * source.width + cellLeft + x) * 4;
      const r = source.data[offset] ?? 0;
      const g = source.data[offset + 1] ?? 0;
      const b = source.data[offset + 2] ?? 0;
      const maxRb = Math.max(r, b);
      const dominance = g - maxRb;
      let alpha = 255;
      if (dominance > 32 && g > 45) alpha = 0;
      else if (dominance > 2)
        alpha = Math.max(0, Math.min(255, Math.round(255 - (dominance - 2) * 18)));
      if (alpha > 0 && dominance > 0) {
        const reduced = Math.min(g, maxRb + 2);
        source.data[offset + 1] = reduced;
      }
      mask[y * source.width + x] = alpha;
    }
  }
  return mask;
}

function bounds(mask: Buffer, width: number, height: number, half: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < half; x += 1) {
      if ((mask[y * width + x] ?? 0) > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("Extraction mask is empty.");
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function extract(spec: SourceSpec, root: string) {
  log(`extract-start ${spec.provider} ${spec.part}`);
  const sourceFile = path.join(root, spec.source);
  const sourceBytes = await readFile(sourceFile);
  const { data, info } = await sharp(sourceBytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba: Rgba = { data: Buffer.from(data), width: info.width, height: info.height };
  const half =
    spec.cell === 0 ? Math.floor(info.width / 2) : info.width - Math.floor(info.width / 2);
  const cellLeft = spec.cell === 0 ? 0 : Math.floor(info.width / 2);
  const mask =
    spec.provider === "openai"
      ? maskFromAlpha(rgba, half, cellLeft)
      : maskFromGreen(rgba, half, cellLeft);
  const box = bounds(mask, info.width, info.height, half);
  const maskDir = path.join(
    root,
    "outputs",
    "folk-provider-benchmark",
    "stage-2c4",
    spec.provider,
    "masks",
  );
  const partDir = path.join(
    root,
    "outputs",
    "folk-provider-benchmark",
    "stage-2c4",
    spec.provider,
    "parts",
  );
  await mkdir(maskDir, { recursive: true });
  await mkdir(partDir, { recursive: true });
  const maskFile = path.join(maskDir, `${spec.part}.mask.png`);
  await sharp(mask, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png()
    .toFile(maskFile);
  // Reload the saved mask before applying it. This proves persistence and exact dimensions.
  const loadedMask = await sharp(maskFile).extractChannel(0).raw().toBuffer();
  if (loadedMask.length !== info.width * info.height) {
    throw new Error(
      `Saved mask dimensions changed: ${loadedMask.length} vs ${info.width * info.height}.`,
    );
  }
  const output = Buffer.alloc(box.width * box.height * 4);
  for (let y = 0; y < box.height; y += 1) {
    for (let x = 0; x < box.width; x += 1) {
      const sourceX = cellLeft + box.left + x;
      const sourceY = box.top + y;
      const sourceOffset = (sourceY * info.width + sourceX) * 4;
      const targetOffset = (y * box.width + x) * 4;
      const maskOffset = sourceY * info.width + box.left + x;
      const alpha = Math.round(
        ((rgba.data[sourceOffset + 3] ?? 0) * (loadedMask[maskOffset] ?? 0)) / 255,
      );
      output[targetOffset] = alpha === 0 ? 0 : (rgba.data[sourceOffset] ?? 0);
      output[targetOffset + 1] = alpha === 0 ? 0 : (rgba.data[sourceOffset + 1] ?? 0);
      output[targetOffset + 2] = alpha === 0 ? 0 : (rgba.data[sourceOffset + 2] ?? 0);
      output[targetOffset + 3] = alpha;
    }
  }
  const outputFile = path.join(partDir, `${spec.part}.png`);
  await sharp(output, { raw: { width: box.width, height: box.height, channels: 4 } })
    .png()
    .toFile(outputFile);
  const outputBytes = await readFile(outputFile);
  const outputRaw = await sharp(outputFile)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let translucent = 0;
  let opaque = 0;
  let green = 0;
  for (let index = 0; index < outputRaw.data.length; index += 4) {
    const alpha = outputRaw.data[index + 3] ?? 0;
    if (alpha === 0) transparent += 1;
    else if (alpha === 255) opaque += 1;
    else translucent += 1;
    const r = outputRaw.data[index] ?? 0;
    const g = outputRaw.data[index + 1] ?? 0;
    const b = outputRaw.data[index + 2] ?? 0;
    if (alpha > 0 && g > Math.max(r, b) + 40) green += 1;
  }
  const revision = {
    format: "fableon.stage2c4.extraction-mask",
    version: 1,
    provider: spec.provider,
    part: spec.part,
    source: spec.source,
    sourceSha256: createHash("sha256").update(sourceBytes).digest("hex"),
    mask: path.relative(root, maskFile),
    maskSha256: createHash("sha256")
      .update(await readFile(maskFile))
      .digest("hex"),
    maskDimensions: { width: info.width, height: info.height },
    sourceDimensions: { width: info.width, height: info.height },
    extractionBox: { x: cellLeft + box.left, y: box.top, width: box.width, height: box.height },
    candidate: path.relative(root, outputFile),
    candidateSha256: createHash("sha256").update(outputBytes).digest("hex"),
    candidateDimensions: { width: box.width, height: box.height },
    alphaCounts: { transparent, translucent, opaque, greenDominantOpaque: green },
    editOrigin: spec.provider === "openai" ? "source-alpha-mask" : "green-chroma-mask-with-despill",
    reviewStatus: "technical-test-only",
    createdAt: new Date().toISOString(),
  };
  const revisionFile = path.join(maskDir, `${spec.part}.mask-revision.json`);
  await writeFile(revisionFile, `${JSON.stringify(revision, null, 2)}\n`);
  const pixels = await sharp(outputFile).ensureAlpha().raw().toBuffer();
  log(`extract-done ${spec.provider} ${spec.part} ${box.width}x${box.height} green=${green}`);
  return { ...revision, rawSha256: createHash("sha256").update(pixels).digest("hex") };
}

async function main() {
  log("extract-start");
  const root = process.cwd();
  const specs: SourceSpec[] = [
    {
      provider: "openai",
      part: "nearUpperArm",
      cell: 0,
      source: "docs/benchmarks/phase-05.1/stage-2c2/openai/arm-sheet.png",
    },
    {
      provider: "openai",
      part: "nearForearm",
      cell: 1,
      source: "docs/benchmarks/phase-05.1/stage-2c2/openai/arm-sheet.png",
    },
    {
      provider: "gemini",
      part: "nearUpperArm",
      cell: 0,
      source: "docs/benchmarks/phase-05.1/stage-2c2/gemini/arm-sheet.png",
    },
    {
      provider: "gemini",
      part: "nearForearm",
      cell: 1,
      source: "docs/benchmarks/phase-05.1/stage-2c2/gemini/arm-sheet.png",
    },
    {
      provider: "openai",
      part: "nearThigh",
      cell: 0,
      source: "docs/benchmarks/phase-05.1/stage-2c2/openai/leg-sheet.png",
    },
    {
      provider: "openai",
      part: "nearShin",
      cell: 1,
      source: "docs/benchmarks/phase-05.1/stage-2c2/openai/leg-sheet.png",
    },
    {
      provider: "gemini",
      part: "nearThigh",
      cell: 0,
      source: "docs/benchmarks/phase-05.1/stage-2c2/gemini/leg-sheet.png",
    },
    {
      provider: "gemini",
      part: "nearShin",
      cell: 1,
      source: "docs/benchmarks/phase-05.1/stage-2c2/gemini/leg-sheet.png",
    },
  ];
  const results = [];
  for (const spec of specs) results.push(await extract(spec, root));
  const outputDir = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c4", "smoke");
  await mkdir(outputDir, { recursive: true });
  const report = path.join(outputDir, "04-extract.json");
  await writeFile(report, `${JSON.stringify(results, null, 2)}\n`);
  log(`extract-report ${path.relative(root, report)}`);
  console.log(
    JSON.stringify({ marker: "extract-ok", output: path.relative(root, report), results }, null, 2),
  );
  log("extract-finished");
}
main().catch((error) => {
  log(`ERROR ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  console.error(error);
  process.exit(1);
});
