#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { chromium } from "@playwright/test";
import {
  ARTISAN_V2_RIG,
  resolveConnectorPose,
  resolveFolkPose,
  type ConnectorRig,
  type FolkPose,
  type ResolvedConnectorPart,
} from "../packages/folk-motion/src/index.ts";

import {
  STAGE2B1_BASE_CONFIG,
  STAGE2B1_FPS,
  STAGE2B1_FRAMES,
  STAGE2B1_HEIGHT,
  STAGE2B1_VARIATION_CONFIG,
  STAGE2B1_WIDTH,
  fitCamera,
  stage2b1CameraBounds,
  stage2b1FrameState,
  stage2b1FrameStates,
  type Stage2B1Config,
  type Stage2B1FrameState,
} from "../apps/web/lib/providers/stage2b1-motion.ts";
import { ARTISAN_V2_SLOTS } from "../apps/web/lib/providers/rig-slots.ts";
import { validateProviderPack } from "../apps/web/lib/providers/rig-validation.ts";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");

type Provider = "openai" | "gemini";

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

interface LoadedPack {
  readonly provider: Provider;
  readonly dir: string;
  readonly manifest: PackManifest;
  readonly images: ReadonlyMap<string, string>;
  readonly bounds: Readonly<
    Record<string, { offsetX: number; offsetY: number; width: number; height: number }>
  >;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function run(command: string, args: readonly string[]): void {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
}

function probe(file: string): unknown {
  const result = spawnSync(
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
      file,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr || "ffprobe failed");
  return JSON.parse(result.stdout || "{}");
}

async function loadPack(provider: Provider): Promise<LoadedPack> {
  const root = process.cwd();
  const dir = path.join(root, "outputs", "folk-provider-benchmark", "stage-2b", provider, "pack");
  const manifest = JSON.parse(
    await readFile(path.join(dir, "manifest.json"), "utf8"),
  ) as PackManifest;
  const validation = await validateProviderPack({
    manifest,
    packDir: dir,
    slots: ARTISAN_V2_SLOTS,
  });
  if (!validation.ok) {
    throw new Error(
      `Invalid Stage 2B.1 pack for ${provider}: ${validation.errors
        .map((entry) => entry.message)
        .join(" ")}`,
    );
  }
  const images = new Map<string, string>();
  const bounds: Record<
    string,
    { offsetX: number; offsetY: number; width: number; height: number }
  > = {};
  for (const part of manifest.parts) {
    images.set(part.id, (await readFile(path.join(dir, part.file))).toString("base64"));
    bounds[part.id] = {
      offsetX: part.offsetX,
      offsetY: part.offsetY,
      width: part.width,
      height: part.height,
    };
  }
  return { provider, dir, manifest, images, bounds };
}

function statesFor(config: Stage2B1Config): readonly Stage2B1FrameState[] {
  return stage2b1FrameStates(config);
}

async function loadConnectorRig(provider: Provider): Promise<ConnectorRig> {
  const file = path.join(
    process.cwd(),
    "outputs",
    "folk-provider-benchmark",
    "stage-2b2",
    provider,
    "connectors.json",
  );
  const payload = JSON.parse(await readFile(file, "utf8")) as { rig: ConnectorRig };
  return payload.rig;
}

function withConnectorNodes(
  states: readonly Stage2B1FrameState[],
  rig: ConnectorRig,
): readonly Stage2B1FrameState[] {
  return states.map((state) => {
    const base = resolveFolkPose(ARTISAN_V2_RIG, state.pose);
    const pelvis = base.find((node) => node.id === "pelvis");
    if (!pelvis) throw new Error("Missing pelvis for connector resolution.");
    const resolved: readonly ResolvedConnectorPart[] = resolveConnectorPose(
      rig,
      state.pose,
      pelvis.world,
    );
    return { ...state, nodes: resolved as unknown as Stage2B1FrameState["nodes"] };
  });
}

function framePayload(
  state: Stage2B1FrameState,
  pack: LoadedPack,
  camera: { scale: number; x: number; y: number },
  pedestal: { x: number; y: number },
  bellScale: number,
) {
  return {
    frame: state.frame,
    phase: state.phase,
    interaction: state.interaction,
    placement: state.placement,
    camera,
    pedestal,
    bell: { x: state.bellWorld.x, y: state.bellWorld.y, scale: bellScale },
    nodes: state.nodes
      .filter((node) => node.visible)
      .map((node) => {
        const part = pack.manifest.parts.find((entry) => entry.id === node.partId);
        if (!part) throw new Error(`Missing part ${node.partId}`);
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
}

function htmlFor(
  provider: Provider,
  pack: LoadedPack,
  frames: readonly ReturnType<typeof framePayload>[],
  images: ReadonlyMap<string, string>,
): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#1a0d08}canvas{display:block}</style></head><body>
  <canvas id="c" width="${STAGE2B1_WIDTH}" height="${STAGE2B1_HEIGHT}"></canvas>
  <script>
  const payload=${JSON.stringify({ provider, frames, images: Object.fromEntries(images) })};
  const canvas=document.getElementById('c'); const ctx=canvas.getContext('2d');
  const imgs={};
  for(const [id,b64] of Object.entries(payload.images)){
    const img=new Image(); img.src='data:image/png;base64,'+b64; imgs[id]=img;
  }
  function draw(index){
    const f=payload.frames[index];
    const sky=ctx.createLinearGradient(0,0,0,620); sky.addColorStop(0,'#f4d9a6'); sky.addColorStop(1,'#e7b97e');
    ctx.fillStyle=sky; ctx.fillRect(0,0,${STAGE2B1_WIDTH},${STAGE2B1_HEIGHT});
    ctx.fillStyle='#d79b5b'; ctx.fillRect(0,620,${STAGE2B1_WIDTH},100);
    ctx.fillStyle='#c58a4a'; ctx.fillRect(0,620,${STAGE2B1_WIDTH},4);
    ctx.fillStyle='#b9773f'; ctx.fillRect(60,260,1160,360);
    ctx.fillStyle='#a96635'; ctx.fillRect(60,260,1160,22);
    for(let x=110;x<1200;x+=150){ctx.fillStyle='#c98a4e';ctx.fillRect(x,310,92,250);ctx.fillStyle='#b9773f';ctx.fillRect(x+18,340,56,220);}
    const cam=f.camera, p=f.placement;
    const sx=cam.x+cam.scale*p.x, sy=cam.y+cam.scale*p.y, ss=cam.scale*p.scale;
    // Pedestal and bell use the actor's rig placement, not raw camera space.
    const ped=f.pedestal;
    ctx.save();
    ctx.setTransform(cam.scale*p.scale,0,0,cam.scale*p.scale,cam.x+cam.scale*p.x,cam.y+cam.scale*p.y);
    ctx.fillStyle='#7d4a2b'; ctx.fillRect(ped.x-45,ped.y,90,620-ped.y);
    ctx.fillStyle='#9a5a32'; ctx.fillRect(ped.x-55,ped.y-12,110,16);
    ctx.restore();
    for(const node of f.nodes){
      const img=imgs[node.partId]; if(!img) continue;
      const m=node.matrix;
      ctx.save(); ctx.setTransform(ss*m.a,ss*m.b,ss*m.c,ss*m.d,sx+ss*m.e,sy+ss*m.f);
      ctx.drawImage(img,node.offsetX,node.offsetY,node.width,node.height);
      ctx.restore();
    }
    const bell=imgs['bell_bell'];
    if(bell){const s=f.bell.scale;ctx.save();ctx.setTransform(cam.scale*p.scale,0,0,cam.scale*p.scale,cam.x+cam.scale*p.x,cam.y+cam.scale*p.y);ctx.translate(f.bell.x,f.bell.y);ctx.drawImage(bell,-72*s,-250*s,144*s,250*s);ctx.restore();}
    ctx.fillStyle='rgba(26,13,8,0.82)'; ctx.fillRect(20,20,440,72);
    ctx.fillStyle='#fff2cf'; ctx.font='600 22px Georgia, serif';
    ctx.fillText(payload.provider.toUpperCase()+' · '+f.phase,36,50);
    ctx.fillStyle='#d2a164'; ctx.font='12px Menlo, monospace';
    ctx.fillText('frame '+f.frame+' · '+(f.frame/24).toFixed(3)+'s · '+f.interaction,36,74);
    return canvas.toDataURL('image/png');
  }
  window.renderFrame=(index)=>draw(index);
  window.__frameCount=payload.frames.length;
  Promise.all(Object.values(imgs).map((img)=>img.decode())).then(()=>{window.__ready=true;});
  </script></body></html>`;
}

async function renderFrames(
  page: import("@playwright/test").Page,
  frameDir: string,
  count: number,
): Promise<void> {
  await mkdir(frameDir, { recursive: true });
  for (let index = 0; index < count; index += 1) {
    const data = await page.evaluate(
      (frame) =>
        (window as unknown as { renderFrame: (index: number) => string }).renderFrame(frame),
      index,
    );
    const base64 = data.split(",", 2)[1];
    if (!base64) throw new Error(`Frame ${index} returned no PNG data.`);
    await writeFile(
      path.join(frameDir, `frame-${String(index).padStart(4, "0")}.png`),
      Buffer.from(base64, "base64"),
    );
  }
}

async function encode(file: string, frameDir: string, fps = STAGE2B1_FPS): Promise<void> {
  run("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-framerate",
    String(fps),
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
    file,
  ]);
  run("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"]);
}

async function renderJointSheet(
  browser: import("@playwright/test").Browser,
  pack: LoadedPack,
  camera: { scale: number; x: number; y: number },
  output: string,
): Promise<void> {
  const base = stage2b1FrameState(STAGE2B1_BASE_CONFIG, 0);
  const cases: Array<{ label: string; override: Record<string, { rotation: number }> }> = [];
  for (const angle of [0, 45, 90])
    cases.push({ label: `Shoulder ${angle}°`, override: { nearUpperArm: { rotation: -angle } } });
  for (const angle of [0, 30, 60, 90])
    cases.push({ label: `Elbow ${angle}°`, override: { nearForearm: { rotation: -angle } } });
  for (const angle of [-25, 0, 25])
    cases.push({ label: `Wrist ${angle}°`, override: { handOpen: { rotation: angle } } });
  for (const angle of [-25, 25])
    cases.push({ label: `Hip ${angle}°`, override: { nearThigh: { rotation: angle } } });
  for (const angle of [0, 35])
    cases.push({ label: `Knee ${angle}°`, override: { nearShin: { rotation: angle } } });
  for (const angle of [0, 18])
    cases.push({ label: `Neck ${angle}°`, override: { head: { rotation: angle } } });

  const columns = 4;
  const rows = Math.ceil(cases.length / columns);
  const tileW = 320;
  const tileH = 180;
  const width = columns * tileW;
  const height = rows * tileH + 72;
  const page = await browser.newPage({
    viewport: { width: STAGE2B1_WIDTH, height: STAGE2B1_HEIGHT },
  });
  const tiles: Buffer[] = [];
  for (const entry of cases) {
    const pose: FolkPose = {
      nodes: { ...base.pose.nodes, ...entry.override },
    };
    const state: Stage2B1FrameState = {
      ...base,
      pose,
      nodes: resolveFolkPose(ARTISAN_V2_RIG, pose),
    };
    const payload = framePayload(
      state,
      pack,
      camera,
      STAGE2B1_BASE_CONFIG.bell.pedestal,
      STAGE2B1_BASE_CONFIG.bell.scale,
    );
    await page.setContent(htmlFor(pack.provider, pack, [payload], pack.images), {
      waitUntil: "load",
    });
    await page.waitForFunction(
      () => (window as unknown as { __ready?: boolean }).__ready === true,
      null,
      { timeout: 30_000 },
    );
    const data = await page.evaluate(() =>
      (window as unknown as { renderFrame: (index: number) => string }).renderFrame(0),
    );
    const base64 = data.split(",", 2)[1];
    if (!base64) throw new Error(`Joint tile ${entry.label} returned no PNG data.`);
    const tile = await sharp(Buffer.from(base64, "base64"))
      .resize(tileW, tileH)
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}"><rect y="${tileH - 26}" width="${tileW}" height="26" fill="rgba(26,13,8,0.82)"/><text x="8" y="${tileH - 8}" fill="#fff2cf" font-family="Menlo,monospace" font-size="12">${entry.label}</text></svg>`,
          ),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer();
    tiles.push(tile);
  }
  await page.close();
  const sheet = sharp({
    create: { width, height, channels: 4, background: { r: 26, g: 13, b: 8, alpha: 1 } },
  });
  const header = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="72"><text x="16" y="32" fill="#fff2cf" font-family="Georgia,serif" font-size="22">${pack.provider} · joint stress test</text><text x="16" y="54" fill="#d2a164" font-family="Menlo,monospace" font-size="12">existing Stage 2B artwork · Stage 2B.1 joint poses</text></svg>`,
  );
  const composites: Array<{ input: Buffer; left: number; top: number }> = [
    { input: header, left: 0, top: 0 },
  ];
  tiles.forEach((tile, index) => {
    composites.push({
      input: tile,
      left: (index % columns) * tileW,
      top: 72 + Math.floor(index / columns) * tileH,
    });
  });
  await sheet.composite(composites).png().toFile(output);
}

async function main(): Promise<void> {
  const root = process.cwd();
  const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2b2");
  const packs = {
    openai: await loadPack("openai"),
    gemini: await loadPack("gemini"),
  };
  for (const provider of ["openai", "gemini"] as const) {
    const target = path.join(stage, provider, "pack");
    await mkdir(target, { recursive: true });
    for (const file of ["manifest.json", "rig-manifest.json"]) {
      await writeFile(
        path.join(target, file),
        await readFile(path.join(packs[provider].dir, file)),
      );
    }
    const sourceParts = path.join(packs[provider].dir, "parts");
    const targetParts = path.join(target, "parts");
    await mkdir(targetParts, { recursive: true });
    for (const part of packs[provider].manifest.parts) {
      await writeFile(
        path.join(targetParts, path.basename(part.file)),
        await readFile(path.join(sourceParts, path.basename(part.file))),
      );
    }
  }
  const connectorRigs = {
    openai: await loadConnectorRig("openai"),
    gemini: await loadConnectorRig("gemini"),
  };
  const baseStates = {
    openai: withConnectorNodes(statesFor(STAGE2B1_BASE_CONFIG), connectorRigs.openai),
    gemini: withConnectorNodes(statesFor(STAGE2B1_BASE_CONFIG), connectorRigs.gemini),
  };
  const variationStates = {
    openai: withConnectorNodes(statesFor(STAGE2B1_VARIATION_CONFIG), connectorRigs.openai),
    gemini: withConnectorNodes(statesFor(STAGE2B1_VARIATION_CONFIG), connectorRigs.gemini),
  };
  const allBounds = (["openai", "gemini"] as const).map((provider) =>
    stage2b1CameraBounds(
      [...baseStates[provider], ...variationStates[provider]],
      packs[provider].bounds,
    ),
  );
  const union = {
    minX: Math.min(...allBounds.map((entry) => entry.minX)),
    minY: Math.min(...allBounds.map((entry) => entry.minY)),
    maxX: Math.max(...allBounds.map((entry) => entry.maxX)),
    maxY: Math.max(...allBounds.map((entry) => entry.maxY)),
  };
  const camera = fitCamera(union, STAGE2B1_WIDTH, STAGE2B1_HEIGHT, 8);
  const bellFile = path.join(root, "apps/web/public/assets/folk-pilot/parts/bell/bell.png");
  const bellBase64 = (await readFile(bellFile)).toString("base64");
  const browser = await chromium.launch({ headless: true });

  for (const provider of ["openai", "gemini"] as const) {
    const pack = packs[provider];
    const dir = path.join(stage, provider);
    await mkdir(path.join(dir, "frames"), { recursive: true });
    await mkdir(path.join(dir, "frames-variation"), { recursive: true });
    await mkdir(path.join(dir, "walking-frames"), { recursive: true });
    pack.images.set("bell_bell", bellBase64);
    const page = await browser.newPage({
      viewport: { width: STAGE2B1_WIDTH, height: STAGE2B1_HEIGHT },
    });
    const basePayload = baseStates[provider].map((state) =>
      framePayload(
        state,
        pack,
        camera,
        STAGE2B1_BASE_CONFIG.bell.pedestal,
        STAGE2B1_BASE_CONFIG.bell.scale,
      ),
    );
    await page.setContent(htmlFor(provider, pack, basePayload, pack.images), { waitUntil: "load" });
    await page.waitForFunction(
      () => (window as unknown as { __ready?: boolean }).__ready === true,
      null,
      { timeout: 30_000 },
    );
    await renderFrames(page, path.join(dir, "frames"), STAGE2B1_FRAMES);
    await encode(path.join(dir, "polished-character.mp4"), path.join(dir, "frames"));
    await page.close();

    const variationPage = await browser.newPage({
      viewport: { width: STAGE2B1_WIDTH, height: STAGE2B1_HEIGHT },
    });
    const variationPayload = variationStates[provider].map((state) =>
      framePayload(
        state,
        pack,
        camera,
        STAGE2B1_VARIATION_CONFIG.bell.pedestal,
        STAGE2B1_VARIATION_CONFIG.bell.scale,
      ),
    );
    await variationPage.setContent(htmlFor(provider, pack, variationPayload, pack.images), {
      waitUntil: "load",
    });
    await variationPage.waitForFunction(
      () => (window as unknown as { __ready?: boolean }).__ready === true,
      null,
      { timeout: 30_000 },
    );
    await renderFrames(variationPage, path.join(dir, "frames-variation"), STAGE2B1_FRAMES);
    await encode(path.join(dir, "variation.mp4"), path.join(dir, "frames-variation"));
    await variationPage.close();

    const walkingPage = await browser.newPage({
      viewport: { width: STAGE2B1_WIDTH, height: STAGE2B1_HEIGHT },
    });
    const walkingPayload = baseStates[provider]
      .slice(0, 60)
      .map((state) =>
        framePayload(
          state,
          pack,
          camera,
          STAGE2B1_BASE_CONFIG.bell.pedestal,
          STAGE2B1_BASE_CONFIG.bell.scale,
        ),
      );
    await walkingPage.setContent(htmlFor(provider, pack, walkingPayload, pack.images), {
      waitUntil: "load",
    });
    await walkingPage.waitForFunction(
      () => (window as unknown as { __ready?: boolean }).__ready === true,
      null,
      { timeout: 30_000 },
    );
    await renderFrames(walkingPage, path.join(dir, "walking-frames"), 60);
    await walkingPage.close();
    await encode(path.join(dir, "walking-normal.mp4"), path.join(dir, "walking-frames"), 24);
    await encode(path.join(dir, "walking-slow.mp4"), path.join(dir, "walking-frames"), 12);
    run("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      path.join(dir, "walking-normal.mp4"),
      "-i",
      path.join(dir, "walking-slow.mp4"),
      "-filter_complex",
      "[0:v][1:v]concat=n=2:v=1:a=0[v]",
      "-map",
      "[v]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      path.join(dir, "walking-diagnostic.mp4"),
    ]);
    await renderJointSheet(browser, pack, camera, path.join(dir, "joint-stress-test.png"));

    const report = {
      generatedAt: new Date().toISOString(),
      provider,
      camera,
      bounds: union,
      config: STAGE2B1_BASE_CONFIG.id,
      frames: STAGE2B1_FRAMES,
      fps: STAGE2B1_FPS,
      resolution: [STAGE2B1_WIDTH, STAGE2B1_HEIGHT],
      video: path.relative(root, path.join(dir, "polished-character.mp4")),
      variation: path.relative(root, path.join(dir, "variation.mp4")),
      walking: path.relative(root, path.join(dir, "walking-diagnostic.mp4")),
      jointStress: path.relative(root, path.join(dir, "joint-stress-test.png")),
      probe: probe(path.join(dir, "polished-character.mp4")),
      hashes: {
        video: sha256(await readFile(path.join(dir, "polished-character.mp4"))),
        variation: sha256(await readFile(path.join(dir, "variation.mp4"))),
        walking: sha256(await readFile(path.join(dir, "walking-diagnostic.mp4"))),
      },
    };
    await writeFile(path.join(dir, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  await browser.close();

  const comparison = path.join(stage, "comparison");
  await mkdir(comparison, { recursive: true });
  const old = path.join(root, "outputs", "folk-provider-benchmark", "stage-2b1");
  for (const provider of ["openai", "gemini"] as const) {
    run("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      path.join(old, provider, "polished-character.mp4"),
      "-i",
      path.join(stage, provider, "polished-character.mp4"),
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
      path.join(comparison, `before-after-${provider}.mp4`),
    ]);
  }
  run("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-i",
    path.join(stage, "openai", "polished-character.mp4"),
    "-i",
    path.join(stage, "gemini", "polished-character.mp4"),
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
    path.join(comparison, "provider-side-by-side.mp4"),
  ]);
  // Contact sheet: old/new per provider, four timestamps each.
  const framesToShow = [0, 104, 120, 168];
  const tiles: Buffer[] = [];
  for (const provider of ["openai", "gemini"] as const) {
    for (const source of ["stage-2b1", "stage-2b2"] as const) {
      for (const frame of framesToShow) {
        const frameDir = "frames";
        const file = path.join(
          root,
          "outputs",
          "folk-provider-benchmark",
          source,
          provider,
          frameDir,
          `frame-${String(frame).padStart(4, "0")}.png`,
        );
        const buffer = await sharp(file).resize(320, 180).png().toBuffer();
        const label = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect y="150" width="320" height="30" fill="rgba(26,13,8,0.8)"/><text x="8" y="170" fill="#fff2cf" font-family="Menlo,monospace" font-size="12">${provider} · ${source} · ${frame}</text></svg>`,
        );
        tiles.push(buffer);
        tiles.push(label);
      }
    }
  }
  const sheet = sharp({
    create: {
      width: 1280,
      height: 1440,
      channels: 4,
      background: { r: 26, g: 13, b: 8, alpha: 1 },
    },
  });
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  for (let index = 0; index < 32; index += 2) {
    const tile = tiles[index]!;
    const label = tiles[index + 1]!;
    const row = Math.floor(index / 8);
    const col = (index % 8) / 2;
    const left = Math.round(col * 320);
    const top = row * 360;
    composites.push({ input: tile, left, top });
    composites.push({ input: label, left, top: top + 180 });
  }
  await sheet
    .composite(composites)
    .png()
    .toFile(path.join(comparison, "comparison-contact-sheet.png"));
  console.log(JSON.stringify({ camera, union, outputs: comparison }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
