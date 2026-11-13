import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT = join(ROOT, "outputs", "rigby2d-r3", "r3-1", "shot-main.mp4");

function parseArgs(argv) {
  const args = {
    baseUrl: null,
    dataRoot: null,
    importPath: null,
    characterId: "artisan-arm-r22",
    characterName: "Artisan arm R2.2",
    attribution:
      "R2.2 corrected continuous-arm pilot; OpenAI-generated artwork; Rigby2D native AutoRig; arm motion only",
    reviewStatus: "approved_arm_motion_only",
    versionId: null,
    animation: "showcase_ikfix",
    fps: 24,
    scale: 1,
    width: 1920,
    height: 1080,
    anchorX: 960,
    anchorY: 1040,
    actorScale: 0.9,
    output: DEFAULT_OUTPUT,
    artifactsDir: null,
    crf: 18,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const key = argv[index];
    const next = argv[index + 1];
    if (!key.startsWith("--")) throw new Error(`Unknown argument "${key}".`);
    if (next === undefined || next.startsWith("--")) throw new Error(`Missing value for ${key}.`);
    index += 1;
    switch (key) {
      case "--base-url":
        args.baseUrl = next.replace(/\/+$/, "");
        break;
      case "--data-root":
        args.dataRoot = resolve(next);
        break;
      case "--import":
        args.importPath = resolve(next);
        break;
      case "--character-id":
        args.characterId = next;
        break;
      case "--character-name":
        args.characterName = next;
        break;
      case "--attribution":
        args.attribution = next;
        break;
      case "--review-status":
        args.reviewStatus = next;
        break;
      case "--version-id":
        args.versionId = next;
        break;
      case "--animation":
        args.animation = next;
        break;
      case "--fps":
        args.fps = Number(next);
        break;
      case "--scale":
        args.scale = Number(next);
        break;
      case "--width":
        args.width = Number(next);
        break;
      case "--height":
        args.height = Number(next);
        break;
      case "--anchor-x":
        args.anchorX = Number(next);
        break;
      case "--anchor-y":
        args.anchorY = Number(next);
        break;
      case "--actor-scale":
        args.actorScale = Number(next);
        break;
      case "--output":
        args.output = resolve(next);
        break;
      case "--artifacts-dir":
        args.artifactsDir = resolve(next);
        break;
      case "--crf":
        args.crf = Number(next);
        break;
      default:
        throw new Error(`Unknown argument "${key}".`);
    }
  }
  if (!Number.isFinite(args.fps) || args.fps <= 0 || args.fps > 60) {
    throw new Error("FPS must be between 1 and 60.");
  }
  if (!Number.isFinite(args.actorScale) || args.actorScale <= 0) {
    throw new Error("Actor scale must be positive.");
  }
  if (
    !Number.isInteger(args.width) ||
    !Number.isInteger(args.height) ||
    args.width <= 0 ||
    args.height <= 0
  ) {
    throw new Error("Output dimensions must be positive integers.");
  }
  return args;
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  writeFileSync(file, readFileSync(temp));
  rmSync(temp, { force: true });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (exit ${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function probeVideo(file) {
  const parsed = JSON.parse(
    run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]),
  );
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  const audio = parsed.streams?.some((stream) => stream.codec_type === "audio");
  if (!video) throw new Error("No video stream found in the rendered output.");
  const frameCount = Number(
    run("ffprobe", [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=nb_read_frames",
      "-of",
      "default=nk=1:nw=1",
      file,
    ]).trim(),
  );
  const decode = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (decode.status !== 0) {
    throw new Error(`Full decode failed: ${decode.stderr || decode.stdout}`);
  }
  return {
    codec: video.codec_name,
    width: video.width,
    height: video.height,
    frameRate: video.avg_frame_rate,
    durationSeconds: Number(parsed.format?.duration),
    frameCount,
    hasAudio: Boolean(audio),
    decodeOk: true,
  };
}

async function serverIsReady(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/studio/folk/rigby2d`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(baseUrl, timeoutMs = 180_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await serverIsReady(baseUrl)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Fableon server did not become ready at ${baseUrl}.`);
}

async function writeFrame(stream, buffer) {
  if (stream.destroyed) throw new Error("FFmpeg input closed before all frames were written.");
  await new Promise((resolveWrite, rejectWrite) => {
    stream.write(buffer, (error) => {
      if (error) rejectWrite(error);
      else resolveWrite();
    });
  });
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && body.error?.message
        ? `${body.error.code}: ${body.error.message}`
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

async function ensureCharacter(baseUrl, args) {
  if (args.importPath) {
    const bytes = readFileSync(args.importPath);
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: "application/zip" }), basename(args.importPath));
    form.append("name", args.characterName);
    form.append("sourceAttribution", args.attribution);
    form.append("artisticReviewStatus", args.reviewStatus);
    form.append("characterId", args.characterId);
    await apiJson(`${baseUrl}/api/studio/folk/rigby2d/characters`, {
      method: "POST",
      body: form,
    });
  }
  const detail = await apiJson(`${baseUrl}/api/studio/folk/rigby2d/characters/${args.characterId}`);
  const versionId = args.versionId ?? detail.character.currentVersionId;
  const version = await apiJson(
    `${baseUrl}/api/studio/folk/rigby2d/characters/${args.characterId}?versionId=${versionId}`,
  );
  return { character: detail.character, version: version.version, versionId };
}

async function ensureRender(baseUrl, args, versionId) {
  const response = await apiJson(`${baseUrl}/api/studio/folk/rigby2d/renders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      characterId: args.characterId,
      versionId,
      animation: args.animation,
      fps: args.fps,
      scale: args.scale,
    }),
  });
  let job = response.job;
  const started = Date.now();
  while (job.status === "queued" || job.status === "rendering") {
    if (Date.now() - started > 180_000) {
      throw new Error(`Rigby2D render ${job.id} timed out.`);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    const latest = await apiJson(`${baseUrl}/api/studio/folk/rigby2d/renders/${job.id}`);
    job = latest.job;
  }
  if (job.status !== "completed" || !job.frameRender) {
    throw new Error(
      `Rigby2D render ${job.id} ended ${job.status}: ${job.error ?? "unknown error"}`,
    );
  }
  return job;
}

async function main() {
  const args = parseArgs(process.argv);
  const artifactsDir = args.artifactsDir ?? join(ROOT, "outputs", "rigby2d-r3", "r3-1");
  mkdirSync(artifactsDir, { recursive: true });
  mkdirSync(dirname(args.output), { recursive: true });
  if (existsSync(args.output)) {
    throw new Error(`Refusing to overwrite existing output ${args.output}.`);
  }
  if (run("ffmpeg", ["-version"]).length === 0) throw new Error("FFmpeg is unavailable.");

  let server = null;
  let serverLog = null;
  let baseUrl = args.baseUrl;
  if (!baseUrl) {
    for (const candidate of ["http://localhost:3100", "http://localhost:3140"]) {
      if (await serverIsReady(candidate)) {
        baseUrl = candidate;
        break;
      }
    }
    if (!baseUrl) {
      baseUrl = "http://localhost:3140";
      serverLog = join(artifactsDir, "fableon-server.log");
      server = spawn(
        "sh",
        ["-c", `pnpm --filter @fableon/web dev > ${JSON.stringify(serverLog)} 2>&1`],
        {
          cwd: ROOT,
          env: {
            ...process.env,
            PORT: "3140",
            ...(args.dataRoot ? { FABLEON_DATA_DIR: args.dataRoot } : {}),
          },
          detached: true,
          stdio: "ignore",
        },
      );
      server.unref();
      if (server.pid === undefined) throw new Error("Could not start the Fableon dev server.");
      writeFileSync(join(artifactsDir, "server.pid"), `${JSON.stringify({ pid: server.pid })}\n`);
      await waitForServer(baseUrl);
    }
  }

  const characterInfo = await ensureCharacter(baseUrl, args);
  const renderJob = await ensureRender(baseUrl, args, characterInfo.versionId);
  const render = renderJob.frameRender;
  const renderId = renderJob.id;

  let browser = null;
  let ffmpeg = null;
  let ffmpegStderr = "";
  try {
    if (run("ffmpeg", ["-version"]).length === 0) throw new Error("FFmpeg is unavailable.");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: args.width, height: args.height } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const query = new URLSearchParams({
      renderId,
      anchorX: String(args.anchorX),
      anchorY: String(args.anchorY),
      scale: String(args.actorScale),
    });
    await page.goto(`${baseUrl}/studio/folk/rigby2d/render?${query.toString()}`, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });
    await page.waitForFunction(() => window.__FABLEON_RIGBY2D_SHOT__?.ready === true, null, {
      timeout: 180_000,
    });
    const shot = await page.evaluate(() => {
      const api = window.__FABLEON_RIGBY2D_SHOT__;
      if (!api) throw new Error("Rigby2D shot API is unavailable.");
      return {
        frameCount: api.frameCount,
        fps: api.fps,
        frameWidth: api.frameWidth,
        frameHeight: api.frameHeight,
        pivot: api.pivot,
        anchor: api.anchor,
      };
    });
    if (shot.frameCount !== render.frameCount) {
      throw new Error(`Shot frame count ${shot.frameCount}; API render ${render.frameCount}.`);
    }
    if (pageErrors.length > 0) throw new Error(`Shot page errors: ${pageErrors.join(" | ")}`);

    const totalFrames = shot.frameCount;
    ffmpeg = spawn(
      "ffmpeg",
      [
        "-y",
        "-f",
        "image2pipe",
        "-vcodec",
        "png",
        "-framerate",
        String(args.fps),
        "-i",
        "-",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        String(args.crf),
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        args.output,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    ffmpeg.stderr.on("data", (chunk) => {
      ffmpegStderr += chunk.toString();
    });
    const ffmpegClosed = new Promise((resolveClose, rejectClose) => {
      ffmpeg.on("error", rejectClose);
      ffmpeg.on("close", (code) => {
        if (code === 0) resolveClose();
        else rejectClose(new Error(`FFmpeg exited ${code}: ${ffmpegStderr}`));
      });
    });

    const renderStart = Date.now();
    const frameTimes = [];
    for (let frame = 0; frame < totalFrames; frame += 1) {
      const frameStart = performance.now();
      const dataUrl = await page.evaluate(
        ({ frameNumber, width, height }) => {
          const api = window.__FABLEON_RIGBY2D_SHOT__;
          if (!api) throw new Error("Rigby2D shot API is unavailable.");
          return api.renderFrame(frameNumber, width, height);
        },
        { frameNumber: frame, width: args.width, height: args.height },
      );
      const base64 = dataUrl.split(",", 2)[1];
      if (!base64) throw new Error(`Invalid PNG data URL for frame ${frame}.`);
      await writeFrame(ffmpeg.stdin, Buffer.from(base64, "base64"));
      frameTimes.push(performance.now() - frameStart);
      if ((frame + 1) % 12 === 0 || frame === totalFrames - 1) {
        console.log(`Rendered ${frame + 1}/${totalFrames} composed frames.`);
      }
    }
    const renderDurationMs = Date.now() - renderStart;
    ffmpeg.stdin.end();
    await ffmpegClosed;

    const probe = probeVideo(args.output);
    if (probe.frameCount !== totalFrames) {
      throw new Error(`Decoded frame count ${probe.frameCount}; expected ${totalFrames}.`);
    }
    if (probe.width !== args.width || probe.height !== args.height) {
      throw new Error(
        `Decoded resolution ${probe.width}x${probe.height}; expected ${args.width}x${args.height}.`,
      );
    }
    if (probe.codec !== "h264") throw new Error(`Decoded codec ${probe.codec}; expected h264.`);
    if (Math.abs(probe.durationSeconds - totalFrames / args.fps) > 0.1) {
      throw new Error(
        `Decoded duration ${probe.durationSeconds}s; expected ${(totalFrames / args.fps).toFixed(4)}s.`,
      );
    }

    const stem = basename(args.output, extname(args.output));
    const suffix = stem === "shot-main" ? "" : `-${stem.replace(/^shot-/, "")}`;
    const selected = [
      ...new Set([
        0,
        Math.floor(totalFrames / 4),
        Math.floor(totalFrames / 2),
        Math.floor((totalFrames * 3) / 4),
        totalFrames - 1,
      ]),
    ];
    const contactSheet = await page.evaluate((frames) => {
      const api = window.__FABLEON_RIGBY2D_SHOT__;
      if (!api) throw new Error("Rigby2D shot API is unavailable.");
      return api.renderContactSheet(frames);
    }, selected);
    const contactBase64 = contactSheet.split(",", 2)[1];
    if (!contactBase64) throw new Error("Invalid contact-sheet data URL.");
    writeFileSync(
      join(artifactsDir, `contact-sheet${suffix}.png`),
      Buffer.from(contactBase64, "base64"),
    );
    mkdirSync(join(artifactsDir, `shot-frames${suffix}`), { recursive: true });
    for (const frame of [0, Math.floor(totalFrames / 2), totalFrames - 1]) {
      const dataUrl = await page.evaluate(
        ({ frameNumber, width, height }) => {
          const api = window.__FABLEON_RIGBY2D_SHOT__;
          if (!api) throw new Error("Rigby2D shot API is unavailable.");
          return api.renderFrame(frameNumber, width, height);
        },
        { frameNumber: frame, width: args.width, height: args.height },
      );
      const base64 = dataUrl.split(",", 2)[1];
      if (!base64) throw new Error(`Invalid PNG data URL for selected frame ${frame}.`);
      writeFileSync(
        join(artifactsDir, `shot-frames${suffix}`, `frame-${String(frame).padStart(3, "0")}.png`),
        Buffer.from(base64, "base64"),
      );
    }

    const outputBytes = statSync(args.output).size;
    const outputHash = createHash("sha256").update(readFileSync(args.output)).digest("hex");
    const shotConfig = {
      id: `r3-1-${args.characterId}-${args.animation}`,
      title: "R3.1 · Rigby2D character in a Fableon-controlled shot",
      width: args.width,
      height: args.height,
      fps: args.fps,
      frameCount: totalFrames,
      camera: { centerX: 960, centerY: 540, zoom: 1, rotation: 0 },
      actor: {
        characterId: args.characterId,
        versionId: characterInfo.versionId,
        animation: args.animation,
        x: args.anchorX,
        y: args.anchorY,
        scale: args.actorScale,
      },
      background: { kind: "neutral-stage", top: "#f7f5f2", bottom: "#e4dfd8", floor: "#cfc7bc" },
      renderId,
      cacheKey: render.cacheKey,
    };
    writeJson(join(artifactsDir, `shot-config${suffix}.json`), shotConfig);
    writeJson(join(artifactsDir, `shot-manifest${suffix}.json`), {
      shot: shotConfig,
      renderJob,
      frameMetadata: render,
      ffprobe: probe,
      output: relative(ROOT, args.output),
      outputBytes,
      outputSha256: outputHash,
      generationMode: "actual-rigby2d-frames + fableon-canvas + ffmpeg",
      paidApiCalls: 0,
      pageErrors,
    });
    writeJson(join(artifactsDir, `shot-report${suffix}.json`), {
      status: "completed",
      shotId: shotConfig.id,
      frameCount: totalFrames,
      fps: args.fps,
      width: args.width,
      height: args.height,
      renderDurationMs,
      firstFrameMs: frameTimes[0] ?? 0,
      medianFrameMs: [...frameTimes].sort((a, b) => a - b)[Math.floor(frameTimes.length / 2)] ?? 0,
      totalWallMs: renderDurationMs,
      output: relative(ROOT, args.output),
      outputBytes,
      outputSha256: outputHash,
      ffprobe: probe,
    });
    console.log(
      JSON.stringify(
        {
          output: relative(ROOT, args.output),
          bytes: outputBytes,
          sha256: outputHash,
          frames: probe.frameCount,
          codec: probe.codec,
          resolution: `${probe.width}x${probe.height}`,
          duration: probe.durationSeconds,
          contactSheet: relative(ROOT, join(artifactsDir, `contact-sheet${suffix}.png`)),
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (ffmpeg && ffmpeg.exitCode === null) ffmpeg.kill("SIGKILL");
    if (server && serverLog) {
      // The server was started detached by this script; stop its process group.
      try {
        const pid = JSON.parse(readFileSync(join(artifactsDir, "server.pid"), "utf8")).pid;
        process.kill(-pid, "SIGTERM");
      } catch {
        // best effort
      }
    }
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
