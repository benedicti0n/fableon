#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { chromium } from "@playwright/test";

import {
  STAGE2B_BASE_CONFIG,
  STAGE2B_FPS,
  STAGE2B_FRAMES,
  STAGE2B_HEIGHT,
  STAGE2B_VARIATION_CONFIG,
  STAGE2B_WIDTH,
  stage2bFrameState,
  type Stage2BConfig,
} from "../apps/web/lib/providers/stage2b-animation.ts";
import { ARTISAN_V2_SLOTS } from "../apps/web/lib/providers/rig-slots.ts";
import { validateProviderPack } from "../apps/web/lib/providers/rig-validation.ts";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");

interface PackPart {
  readonly id: string;
  readonly file: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
}

interface PackManifest {
  readonly rigId?: string;
  readonly parts: readonly PackPart[];
  readonly missingSlots?: readonly string[];
}

type Provider = "openai" | "gemini";
type Variant = "base" | "variation";

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || process.argv[index + 1] === undefined) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing --${name}`);
  }
  return process.argv[index + 1]!;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function configFor(variant: Variant): Stage2BConfig {
  return variant === "variation" ? STAGE2B_VARIATION_CONFIG : STAGE2B_BASE_CONFIG;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function loadPack(provider: Provider, packDir: string) {
  const manifest = JSON.parse(
    await readFile(path.join(packDir, "manifest.json"), "utf8"),
  ) as PackManifest;
  const validation = await validateProviderPack({
    manifest,
    packDir,
    slots: ARTISAN_V2_SLOTS,
  });
  if (!validation.ok) {
    const missing = validation.missingPartIds.length
      ? ` Missing: ${validation.missingPartIds.join(", ")}.`
      : "";
    throw new Error(
      `Refusing to render an incomplete provider pack.${missing}\n${validation.errors
        .map((entry) => `${entry.code}: ${entry.message}`)
        .join("\n")}`,
    );
  }
  const images = new Map<string, string>();
  for (const part of manifest.parts) {
    images.set(part.id, (await readFile(path.join(packDir, part.file))).toString("base64"));
  }
  return { manifest, images, validation };
}

function statePayload(config: Stage2BConfig, manifest: PackManifest) {
  const parts = new Map(manifest.parts.map((part) => [part.id, part]));
  return Array.from({ length: STAGE2B_FRAMES }, (_, frame) => {
    const state = stage2bFrameState(config, frame);
    return {
      frame,
      phase: state.phase,
      placement: state.placement,
      bell: { x: state.bellWorld.x, y: state.bellWorld.y, scale: config.bell.scale },
      nodes: state.nodes
        .filter((node) => node.visible)
        .map((node) => {
          const part = parts.get(node.partId);
          if (!part) throw new Error(`Missing part ${node.partId} for frame ${frame}.`);
          return {
            partId: node.partId,
            matrix: node.world,
            offsetX: part.offsetX,
            offsetY: part.offsetY,
            width: part.width,
            height: part.height,
          };
        }),
    };
  });
}

function htmlFor(
  provider: Provider,
  variant: Variant,
  frames: unknown,
  images: ReadonlyMap<string, string>,
  videoPath: string,
): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#1a0d08}canvas{display:block}</style></head><body>
  <canvas id="c" width="${STAGE2B_WIDTH}" height="${STAGE2B_HEIGHT}"></canvas>
  <script>
  const payload=${JSON.stringify({ provider, variant, frames, images: Object.fromEntries(images), videoPath })};
  const canvas=document.getElementById('c'); const ctx=canvas.getContext('2d');
  const imgs={};
  for(const [id,b64] of Object.entries(payload.images)){
    const img=new Image(); img.src='data:image/png;base64,'+b64; imgs[id]=img;
  }
  function checker(x,y,w,h){for(let yy=0;yy<h;yy+=18){for(let xx=0;xx<w;xx+=18){ctx.fillStyle=((Math.floor(xx/18)+Math.floor(yy/18))%2===0)?'#d9d9d9':'#f3f3f3';ctx.fillRect(x+xx,y+yy,Math.min(18,w-xx),Math.min(18,h-yy));}}}
  function frameState(index){return payload.frames[index];}
  function draw(index){
    const state=frameState(index);
    // Same background and camera for both providers and both variants.
    const sky=ctx.createLinearGradient(0,0,0,620); sky.addColorStop(0,'#f4d9a6'); sky.addColorStop(1,'#e7b97e');
    ctx.fillStyle=sky; ctx.fillRect(0,0,${STAGE2B_WIDTH},${STAGE2B_HEIGHT});
    ctx.fillStyle='#d79b5b'; ctx.fillRect(0,620,${STAGE2B_WIDTH},100);
    ctx.fillStyle='#c58a4a'; ctx.fillRect(0,620,${STAGE2B_WIDTH},4);
    // Courtyard wall and pedestal, deliberately minimal and identical for A/B.
    ctx.fillStyle='#b9773f'; ctx.fillRect(60,260,1160,360);
    ctx.fillStyle='#a96635'; ctx.fillRect(60,260,1160,22);
    for(let x=110;x<1200;x+=150){ctx.fillStyle='#c98a4e';ctx.fillRect(x,310,92,250);ctx.fillStyle='#b9773f';ctx.fillRect(x+18,340,56,220);}
    ctx.fillStyle='#7d4a2b'; ctx.fillRect(805,560,90,60);
    ctx.fillStyle='#9a5a32'; ctx.fillRect(795,548,110,16);
    // Actor.
    ctx.save();
    const p=state.placement;
    ctx.translate(p.x,p.y); ctx.scale(p.scale,p.scale);
    for(const node of state.nodes){
      const img=imgs[node.partId]; if(!img) continue;
      const m=node.matrix;
      ctx.save();
      ctx.setTransform(p.scale*m.a,p.scale*m.b,p.scale*m.c,p.scale*m.d,p.x+p.scale*m.e,p.y+p.scale*m.f);
      ctx.drawImage(img,node.offsetX,node.offsetY,node.width,node.height);
      ctx.restore();
    }
    // Bell in rig coordinates; drawn after the hand so it reads as held during grip.
    const bell=imgs['bell_bell'];
    if(bell){
      const s=state.bell.scale;
      ctx.save();
      ctx.setTransform(p.scale,0,0,p.scale,p.x,p.y);
      ctx.translate(state.bell.x,state.bell.y);
      ctx.drawImage(bell,-72*s,-250*s,144*s,250*s);
      ctx.restore();
    }
    ctx.restore();
    // Diagnostics burned into the local video, never into provider art.
    ctx.fillStyle='rgba(26,13,8,0.82)'; ctx.fillRect(20,20,430,72);
    ctx.fillStyle='#fff2cf'; ctx.font='600 22px Georgia, serif';
    ctx.fillText(payload.provider.toUpperCase()+' · '+payload.variant,36,50);
    ctx.fillStyle='#d2a164'; ctx.font='12px Menlo, monospace';
    ctx.fillText('frame '+state.frame+' · '+(state.frame/24).toFixed(3)+'s · '+state.phase,36,74);
    return canvas.toDataURL('image/png');
  }
  window.renderFrame=(index)=>draw(index);
  window.__frameCount=payload.frames.length;
  Promise.all(Object.values(imgs).map((img)=>img.decode())).then(()=>{window.__ready=true;});
  </script></body></html>`;
}

async function main(): Promise<void> {
  const provider = arg("provider") as Provider;
  if (provider !== "openai" && provider !== "gemini")
    throw new Error("provider must be openai or gemini");
  const variant = arg("config", "base") as Variant;
  if (variant !== "base" && variant !== "variation")
    throw new Error("config must be base or variation");
  const root = process.cwd();
  const packDir = path.resolve(
    arg(
      "pack",
      path.join(root, "outputs", "folk-provider-benchmark", "stage-2b", provider, "pack"),
    ),
  );
  const outputDir = path.resolve(
    arg("output-dir", path.join(root, "outputs", "folk-provider-benchmark", "stage-2b", provider)),
  );
  const config = configFor(variant);
  const pack = await loadPack(provider, packDir);
  const bellFile = path.join(root, "apps/web/public/assets/folk-pilot/parts/bell/bell.png");
  pack.images.set("bell_bell", (await readFile(bellFile)).toString("base64"));
  const videoPath = path.join(
    outputDir,
    variant === "variation" ? "variation.mp4" : "character-test.mp4",
  );
  const frameDir = path.join(outputDir, variant === "variation" ? "frames-variation" : "frames");
  await mkdir(outputDir, { recursive: true });
  await mkdir(frameDir, { recursive: true });

  const frames = statePayload(config, pack.manifest);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: STAGE2B_WIDTH, height: STAGE2B_HEIGHT },
  });
  await page.setContent(htmlFor(provider, variant, frames, pack.images, videoPath), {
    waitUntil: "load",
  });
  await page.waitForFunction(
    () => (window as unknown as { __ready?: boolean }).__ready === true,
    null,
    {
      timeout: 30_000,
    },
  );

  if (flag("verify")) {
    const indexes = [0, 60, 108, 144, 168, 191];
    const hashes: Record<string, string> = {};
    for (const index of indexes) {
      const data = await page.evaluate(
        (frame) =>
          (window as unknown as { renderFrame: (index: number) => string }).renderFrame(frame),
        index,
      );
      const first = sha256(data);
      const again = await page.evaluate(
        (frame) =>
          (window as unknown as { renderFrame: (index: number) => string }).renderFrame(frame),
        index,
      );
      if (first !== sha256(again)) throw new Error(`Non-deterministic frame ${index}.`);
      hashes[String(index)] = first;
    }
    await writeFile(
      path.join(outputDir, `determinism-${variant}.json`),
      `${JSON.stringify({ frames: indexes, hashes }, null, 2)}\n`,
    );
    if (flag("verify-only")) {
      await browser.close();
      console.log(JSON.stringify({ provider, variant, frames: indexes, hashes }, null, 2));
      return;
    }
  }

  for (let frame = 0; frame < STAGE2B_FRAMES; frame += 1) {
    const data = await page.evaluate(
      (index) =>
        (window as unknown as { renderFrame: (index: number) => string }).renderFrame(index),
      frame,
    );
    const base64 = data.split(",", 2)[1];
    if (!base64) throw new Error(`Frame ${frame} returned no PNG data.`);
    await writeFile(
      path.join(frameDir, `frame-${String(frame).padStart(4, "0")}.png`),
      Buffer.from(base64, "base64"),
    );
  }
  await browser.close();

  const ffmpeg = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      "-framerate",
      String(STAGE2B_FPS),
      "-i",
      path.join(frameDir, "frame-%04d.png"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      "-movflags",
      "+faststart",
      videoPath,
    ],
    { encoding: "utf8" },
  );
  if (ffmpeg.status !== 0) throw new Error(ffmpeg.stderr || "ffmpeg failed");

  const contactFrames = [0, 45, 90, 120, 160, 191];
  const tiles = await Promise.all(
    contactFrames.map(async (frame) => {
      const file = path.join(frameDir, `frame-${String(frame).padStart(4, "0")}.png`);
      const buffer = await sharp(file).resize(640, 360).toBuffer();
      return { frame, buffer };
    }),
  );
  const contact = sharp({
    create: { width: 1920, height: 720, channels: 4, background: { r: 26, g: 13, b: 8, alpha: 1 } },
  });
  const composites = tiles.map((tile, index) => ({
    input: tile.buffer,
    left: (index % 3) * 640,
    top: Math.floor(index / 3) * 360,
  }));
  await contact
    .composite(composites)
    .png()
    .toFile(path.join(outputDir, `contact-${variant}.png`));

  const probe = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,nb_frames,avg_frame_rate,duration",
      "-of",
      "json",
      videoPath,
    ],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) throw new Error(probe.stderr || "ffprobe failed");
  const decoded = spawnSync("ffmpeg", ["-v", "error", "-i", videoPath, "-f", "null", "-"], {
    encoding: "utf8",
  });
  if (decoded.status !== 0) throw new Error(decoded.stderr || "full decode failed");

  const report = {
    generatedAt: new Date().toISOString(),
    provider,
    variant,
    configId: config.id,
    width: STAGE2B_WIDTH,
    height: STAGE2B_HEIGHT,
    fps: STAGE2B_FPS,
    frames: STAGE2B_FRAMES,
    durationSeconds: STAGE2B_FRAMES / STAGE2B_FPS,
    packDir: path.relative(root, packDir),
    video: path.relative(root, videoPath),
    contact: path.relative(root, path.join(outputDir, `contact-${variant}.png`)),
    validation: pack.validation,
    probe: JSON.parse(probe.stdout || "{}"),
    videoSha256: sha256(await readFile(videoPath)),
  };
  await writeFile(
    path.join(outputDir, `render-${variant}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
