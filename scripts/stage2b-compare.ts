#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function run(command: string, args: readonly string[]): { stdout: string; stderr: string } {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return { stdout: result.stdout, stderr: result.stderr };
}

async function probe(file: string): Promise<unknown> {
  const result = run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,nb_frames,avg_frame_rate,duration",
    "-of",
    "json",
    file,
  ]);
  return JSON.parse(result.stdout || "{}");
}

async function main(): Promise<void> {
  const root = process.cwd();
  const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2b");
  const comparison = path.join(stage, "comparison");
  await mkdir(comparison, { recursive: true });
  const files = {
    openai: path.join(stage, "openai", "character-test.mp4"),
    gemini: path.join(stage, "gemini", "character-test.mp4"),
    openaiVariation: path.join(stage, "openai", "variation.mp4"),
    geminiVariation: path.join(stage, "gemini", "variation.mp4"),
  };
  for (const file of Object.values(files)) {
    await readFile(file).catch(() => {
      throw new Error(`Missing render: ${path.relative(root, file)}`);
    });
  }

  const sideBySide = path.join(comparison, "side-by-side.mp4");
  run("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    files.openai,
    "-i",
    files.gemini,
    "-filter_complex",
    "[0:v]scale=640:360[a];[1:v]scale=640:360[b];[a][b]hstack=inputs=2[v]",
    "-map",
    "[v]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    "-movflags",
    "+faststart",
    sideBySide,
  ]);
  const variationSideBySide = path.join(comparison, "variation-side-by-side.mp4");
  run("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    files.openaiVariation,
    "-i",
    files.geminiVariation,
    "-filter_complex",
    "[0:v]scale=640:360[a];[1:v]scale=640:360[b];[a][b]hstack=inputs=2[v]",
    "-map",
    "[v]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "18",
    "-movflags",
    "+faststart",
    variationSideBySide,
  ]);

  const contact = path.join(comparison, "comparison-contact-sheet.png");
  run("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    path.join(stage, "openai", "contact-base.png"),
    "-i",
    path.join(stage, "gemini", "contact-base.png"),
    "-filter_complex",
    "[0:v]scale=960:360[a];[1:v]scale=960:360[b];[a][b]vstack=inputs=2[v]",
    "-map",
    "[v]",
    "-frames:v",
    "1",
    contact,
  ]);

  for (const [name, file] of Object.entries(files)) {
    run("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"]);
    void name;
  }
  const report = {
    generatedAt: new Date().toISOString(),
    files: Object.fromEntries(
      Object.entries(files).map(([name, file]) => [name, path.relative(root, file)]),
    ),
    probes: {
      openai: await probe(files.openai),
      gemini: await probe(files.gemini),
      openaiVariation: await probe(files.openaiVariation),
      geminiVariation: await probe(files.geminiVariation),
    },
    hashes: {
      openai: sha256(await readFile(files.openai)),
      gemini: sha256(await readFile(files.gemini)),
      openaiVariation: sha256(await readFile(files.openaiVariation)),
      geminiVariation: sha256(await readFile(files.geminiVariation)),
      sideBySide: sha256(await readFile(sideBySide)),
      variationSideBySide: sha256(await readFile(variationSideBySide)),
    },
    outputs: {
      sideBySide: path.relative(root, sideBySide),
      variationSideBySide: path.relative(root, variationSideBySide),
      contact: path.relative(root, contact),
    },
  };
  await writeFile(path.join(comparison, "comparison.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
