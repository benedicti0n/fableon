#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { chromium } from "@playwright/test";
import { resolveFolkPose, type FolkRig } from "../packages/folk-motion/src/index.ts";

type Provider = "openai" | "gemini";

interface PackPart {
  readonly id: string;
  readonly file: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
  readonly targetPivot: { readonly x: number; readonly y: number };
  readonly status: string;
}

async function loadPack(provider: Provider) {
  const root = process.cwd();
  const packDir = path.join(
    root,
    "outputs",
    "folk-provider-benchmark",
    "stage-2a",
    `${provider}-pack`,
  );
  const manifest = JSON.parse(await readFile(path.join(packDir, "manifest.json"), "utf8")) as {
    parts: PackPart[];
  };
  const byId = new Map(manifest.parts.map((part) => [part.id, part]));
  const get = (id: string): PackPart => {
    const part = byId.get(id);
    if (!part) throw new Error(`Missing provider part ${id} in ${provider} pack.`);
    return part;
  };
  const data = new Map<string, string>();
  for (const part of manifest.parts) {
    data.set(part.id, (await readFile(path.join(packDir, part.file))).toString("base64"));
  }
  return { byId, get, data };
}

function rigFor(pack: Awaited<ReturnType<typeof loadPack>>): FolkRig {
  return {
    id: "stage2a-elbow",
    nodes: [
      {
        id: "torso",
        partId: "artisan_torso",
        parentId: null,
        pivot: pack.get("artisan_torso").targetPivot,
        drawOrder: 1,
      },
      {
        id: "head",
        partId: "artisan_head",
        parentId: "torso",
        pivot: pack.get("artisan_head").targetPivot,
        drawOrder: 2,
      },
      {
        id: "upperArm",
        partId: "artisan_nearUpperArm",
        parentId: "torso",
        pivot: pack.get("artisan_nearUpperArm").targetPivot,
        drawOrder: 3,
      },
      {
        id: "forearm",
        partId: "artisan_nearForearm",
        parentId: "upperArm",
        pivot: pack.get("artisan_nearForearm").targetPivot,
        drawOrder: 4,
      },
    ],
  };
}

const BASE = {
  openai: { upper: -21.5, forearm: 44.3 },
  gemini: { upper: 0, forearm: 90 },
} as const;

async function renderProvider(
  browser: import("@playwright/test").Browser,
  provider: Provider,
  pack: Awaited<ReturnType<typeof loadPack>>,
  outputDir: string,
) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 } });
  const rig = rigFor(pack);
  const frames = [];
  const rotations = [];
  for (let index = 0; index <= 12; index += 1) {
    const bend = index * 5;
    const rotationsForFrame = {
      torso: { rotation: 0 },
      head: { rotation: 0 },
      upperArm: { rotation: BASE[provider].upper - bend * 0.12 },
      forearm: { rotation: BASE[provider].forearm - bend },
    };
    rotations.push({ bend, ...rotationsForFrame });
    const resolved = resolveFolkPose(rig, { nodes: rotationsForFrame });
    frames.push({
      bend,
      nodes: resolved.map((node) => {
        const part = pack.get(node.partId);
        return {
          id: node.id,
          partId: node.partId,
          a: node.world.a,
          b: node.world.b,
          c: node.world.c,
          d: node.world.d,
          e: node.world.e,
          f: node.world.f,
          offsetX: part.offsetX,
          offsetY: part.offsetY,
          width: part.width,
          height: part.height,
        };
      }),
    });
  }

  const images = Object.fromEntries(pack.data);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#1a0d08}canvas{display:block}
  </style></head><body><canvas id="c" width="1000" height="1200"></canvas><script>
  const provider=${JSON.stringify(provider)};
  const frames=${JSON.stringify(frames)};
  const images=${JSON.stringify(images)};
  const imgs={};
  for (const [id,b64] of Object.entries(images)) {
    const img=new Image(); img.src='data:image/png;base64,'+b64; imgs[id]=img;
  }
  window.imagesReady=false;
  const canvas=document.getElementById('c'); const ctx=canvas.getContext('2d');
  function draw(index){
    const frame=frames[index]; ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#1a0d08'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const ox=50,oy=70,aw=900,ah=1100;
    for(let y=0;y<ah;y+=20){for(let x=0;x<aw;x+=20){ctx.fillStyle=((x/20+y/20)%2===0)?'#d9d9d9':'#f3f3f3';ctx.fillRect(ox+x,oy+y,20,20);}}
    ctx.strokeStyle='#2a1710'; ctx.lineWidth=4; ctx.strokeRect(ox,oy,aw,ah);
    ctx.fillStyle='#fff2cf'; ctx.font='600 30px Georgia, serif';
    ctx.fillText(provider+' · elbow bend '+frame.bend+'°', 50, 45);
    ctx.font='12px Menlo, monospace'; ctx.fillStyle='#d2a164';
    ctx.fillText('existing @fableon/folk-motion rig · generated provider parts · checkerboard alpha check',50,62);
    ctx.save(); ctx.translate(ox,oy);
    for(const node of frame.nodes){
      const img=imgs[node.partId];
      if(!img) continue;
      ctx.save();
      ctx.setTransform(node.a,node.b,node.c,node.d,node.e,node.f);
      ctx.drawImage(img,node.offsetX,node.offsetY,node.width,node.height);
      ctx.restore();
    }
    ctx.restore();
    // joint markers in master coordinates
    const markers={shoulder:[508,470],elbow:[532,610]};
    for(const [name,[x,y]] of Object.entries(markers)){
      ctx.save(); ctx.translate(ox,oy); ctx.strokeStyle='#26d9ff'; ctx.fillStyle='#26d9ff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
      ctx.font='11px Menlo, monospace'; ctx.fillText(name,x+8,y-8); ctx.restore();
    }
  }
  Promise.all(Object.values(imgs).map((img)=>img.decode())).then(()=>{window.imagesReady=true;});
  window.renderFrame=(index)=>{draw(index);return canvas.toDataURL('image/png');};
  window.frameCount=frames.length;
  </script></body></html>`;
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForFunction(
    () => (window as unknown as { imagesReady?: boolean }).imagesReady === true,
    null,
    { timeout: 30_000 },
  );
  await mkdir(outputDir, { recursive: true });
  for (let index = 0; index < frames.length; index += 1) {
    const data = await page.evaluate(
      (frameIndex) =>
        (window as unknown as { renderFrame(index: number): string }).renderFrame(frameIndex),
      index,
    );
    const base64 = data.split(",", 2)[1];
    await writeFile(
      path.join(outputDir, `frame-${String(index).padStart(2, "0")}.png`),
      Buffer.from(base64, "base64"),
    );
  }
  await page.close();
  const video = path.join(outputDir, `elbow-${provider}.mp4`);
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      "-framerate",
      "12",
      "-i",
      path.join(outputDir, "frame-%02d.png"),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "18",
      video,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr || "ffmpeg failed");
  return { frames: frames.length, video, rotations };
}

async function main() {
  const root = process.cwd();
  const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2a");
  const browser = await chromium.launch({ headless: true });
  const report: Record<string, unknown> = {};
  const providers: Provider[] = ["openai", "gemini"];
  for (const provider of providers) {
    const pack = await loadPack(provider);
    report[provider] = await renderProvider(
      browser,
      provider,
      pack,
      path.join(stage, provider, "rig-test"),
    );
  }
  await browser.close();
  await writeFile(path.join(stage, "rig-test-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
