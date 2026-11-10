#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

import {
  resolveFolkPose,
  type FolkRig,
  type FolkRigNode,
} from "../packages/folk-motion/src/index.ts";

type Provider = "openai" | "gemini";
type Mode = "before" | "after";

interface PackPart {
  readonly id: string;
  readonly file: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
  readonly targetPivot: { readonly x: number; readonly y: number };
}

interface PackManifest {
  readonly parts: readonly PackPart[];
}

interface DiagnosticNode {
  readonly id: string;
  readonly partId: string;
  readonly parentId: string | null;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly drawOrder: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
}

interface FrameNode {
  readonly partId: string;
  readonly matrix: {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
    readonly e: number;
    readonly f: number;
  };
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
}

const BASE = {
  openai: { upper: -21.5, forearm: 44.3 },
  gemini: { upper: 0, forearm: 90 },
} as const;

const ANGLES = [0, 15, 30, 45, 60, 75, 90] as const;
const TILE = { width: 360, height: 460 } as const;
const SHEET = { width: 2800, height: 2100 } as const;
const GRID = { labelWidth: 160, gap: 8, top: 140, left: 24 } as const;

async function loadPack(provider: Provider): Promise<{
  readonly parts: ReadonlyMap<string, PackPart>;
  readonly images: ReadonlyMap<string, string>;
}> {
  const root = process.cwd();
  const packDir = path.join(
    root,
    "outputs",
    "folk-provider-benchmark",
    "stage-2a",
    `${provider}-pack`,
  );
  const manifest = JSON.parse(
    await readFile(path.join(packDir, "manifest.json"), "utf8"),
  ) as PackManifest;
  const parts = new Map(manifest.parts.map((part) => [part.id, part]));
  const images = new Map<string, string>();
  for (const part of manifest.parts) {
    images.set(part.id, (await readFile(path.join(packDir, part.file))).toString("base64"));
  }
  return { parts, images };
}

function requirePart(parts: ReadonlyMap<string, PackPart>, id: string): PackPart {
  const part = parts.get(id);
  if (!part) throw new Error(`Missing Stage 2A part ${id}.`);
  return part;
}

function scaledRect(
  part: PackPart,
  factor: number,
): Pick<DiagnosticNode, "offsetX" | "offsetY" | "width" | "height"> {
  return {
    offsetX: part.targetPivot.x + (part.offsetX - part.targetPivot.x) * factor,
    offsetY: part.targetPivot.y + (part.offsetY - part.targetPivot.y) * factor,
    width: part.width * factor,
    height: part.height * factor,
  };
}

function node(
  id: string,
  part: PackPart,
  parentId: string | null,
  drawOrder: number,
  factor = 1,
  pivot: { readonly x: number; readonly y: number } = part.targetPivot,
): DiagnosticNode {
  const base = { ...part, targetPivot: pivot };
  return {
    id,
    partId: part.id,
    parentId,
    pivot,
    drawOrder,
    ...scaledRect(base, factor),
  };
}

function rigFor(parts: ReadonlyMap<string, PackPart>, mode: Mode): FolkRig {
  const torso = requirePart(parts, "artisan_torso");
  const head = requirePart(parts, "artisan_head");
  const upper = requirePart(parts, "artisan_nearUpperArm");
  const forearm = requirePart(parts, "artisan_nearForearm");
  const nodes: FolkRigNode[] =
    mode === "before"
      ? [
          node("torso", torso, null, 1),
          node("head", head, "torso", 2),
          node("nearUpperArm", upper, "torso", 3),
          node("nearForearm", forearm, "nearUpperArm", 4),
        ]
      : [
          node("nearUpperArm", upper, "torso", 18, 1.03, {
            x: upper.targetPivot.x + 26,
            y: upper.targetPivot.y + 2,
          }),
          node("torso", torso, null, 20),
          node("head", head, "torso", 30),
          node("nearForearm", forearm, "nearUpperArm", 41, 1.06, {
            x: forearm.targetPivot.x + 20,
            y: forearm.targetPivot.y,
          }),
        ];
  return { id: `stage2b-diagnostic-${mode}`, nodes };
}

function framesFor(
  provider: Provider,
  rig: FolkRig,
): readonly { readonly bend: number; readonly nodes: readonly FrameNode[] }[] {
  const byId = new Map(rig.nodes.map((entry) => [entry.id, entry]));
  return ANGLES.map((bend) => {
    const rotations = {
      torso: { rotation: 0 },
      head: { rotation: 0 },
      nearUpperArm: { rotation: BASE[provider].upper - bend * 0.12 },
      nearForearm: { rotation: BASE[provider].forearm - bend },
    };
    const resolved = resolveFolkPose(rig, { nodes: rotations });
    return {
      bend,
      nodes: resolved.map((entry) => {
        const source = byId.get(entry.id)!;
        return {
          partId: source.partId,
          matrix: entry.world,
          offsetX: source.offsetX,
          offsetY: source.offsetY,
          width: source.width,
          height: source.height,
        };
      }),
    };
  });
}

async function main(): Promise<void> {
  const root = process.cwd();
  const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2b", "diagnostics");
  const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2b");
  await mkdir(stage, { recursive: true });
  await mkdir(docs, { recursive: true });

  const packs = {
    openai: await loadPack("openai"),
    gemini: await loadPack("gemini"),
  };
  const rows = (["openai", "gemini"] as const).flatMap((provider) =>
    (["before", "after"] as const).map((mode) => ({
      provider,
      mode,
      frames: framesFor(provider, rigFor(packs[provider].parts, mode)),
    })),
  );
  const payload = {
    rows,
    images: {
      openai: Object.fromEntries(packs.openai.images),
      gemini: Object.fromEntries(packs.gemini.images),
    },
    angles: ANGLES,
    tile: TILE,
    sheet: SHEET,
    grid: GRID,
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: SHEET.width, height: SHEET.height } });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;background:#1a0d08}canvas{display:block}
  </style></head><body><canvas id="sheet" width="${SHEET.width}" height="${SHEET.height}"></canvas>
  <script>
  const payload=${JSON.stringify(payload)};
  const canvas=document.getElementById('sheet');
  const ctx=canvas.getContext('2d');
  const images={};
  for(const [provider, map] of Object.entries(payload.images)){
    images[provider]={};
    for(const [id,b64] of Object.entries(map)){
      const img=new Image(); img.src='data:image/png;base64,'+b64; images[provider][id]=img;
    }
  }
  function checker(x,y,w,h){
    const s=20;
    for(let yy=0;yy<h;yy+=s){for(let xx=0;xx<w;xx+=s){
      ctx.fillStyle=((Math.floor(xx/s)+Math.floor(yy/s))%2===0)?'#d9d9d9':'#f3f3f3';
      ctx.fillRect(x+xx,y+yy,Math.min(s,w-xx),Math.min(s,h-yy));
    }}
  }
  function drawTile(x,y,provider,mode,frame){
    checker(x,y,payload.tile.width,payload.tile.height);
    const scale=0.30, ox=x+24, oy=y+28;
    for(const node of frame.nodes){
      const img=images[provider][node.partId]; if(!img) continue;
      const m=node.matrix;
      ctx.save();
      ctx.setTransform(scale*m.a,scale*m.b,scale*m.c,scale*m.d,ox+scale*m.e,oy+scale*m.f);
      ctx.drawImage(img,node.offsetX,node.offsetY,node.width,node.height);
      ctx.restore();
    }
    ctx.fillStyle='#1a0d08'; ctx.font='600 17px Georgia, serif';
    ctx.fillText(provider.toUpperCase()+' · '+mode+' · '+frame.bend+'°',x+12,y+payload.tile.height-12);
  }
  Promise.all(Object.values(images).flatMap((map)=>Object.values(map).map((img)=>img.decode()))).then(()=>{
    ctx.fillStyle='#1a0d08'; ctx.fillRect(0,0,payload.sheet.width,payload.sheet.height);
    ctx.fillStyle='#fff2cf'; ctx.font='600 34px Georgia, serif';
    ctx.fillText('Stage 2B — joint concealment before/after',24,48);
    ctx.fillStyle='#d2a164'; ctx.font='13px Menlo, monospace';
    ctx.fillText('Existing Stage 2A OpenAI and Gemini artwork · old layering vs Stage 2B overlap + draw order · elbow 0–90°',24,74);
    const {labelWidth,gap,top,left}=payload.grid;
    const tileW=payload.tile.width, tileH=payload.tile.height;
    payload.angles.forEach((angle,index)=>{
      ctx.fillStyle='#d2a164'; ctx.font='12px Menlo, monospace'; ctx.textAlign='center';
      ctx.fillText(angle+'°',left+labelWidth+gap+index*(tileW+gap)+tileW/2,112);
    });
    ctx.textAlign='left';
    payload.rows.forEach((row,rowIndex)=>{
      const y=top+rowIndex*(tileH+18);
      ctx.fillStyle='#fff2cf'; ctx.font='600 18px Georgia, serif';
      ctx.fillText(row.provider==='openai'?'OpenAI':'Gemini',left,y+30);
      ctx.fillStyle='#d2a164'; ctx.font='12px Menlo, monospace';
      ctx.fillText(row.mode,left,y+52);
      row.frames.forEach((frame,index)=>{
        const x=left+labelWidth+gap+index*(tileW+gap);
        drawTile(x,y,row.provider,row.mode,frame);
      });
    });
    window.__sheetReady=true;
  });
  </script></body></html>`;
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForFunction(
    () => (window as unknown as { __sheetReady?: boolean }).__sheetReady === true,
    null,
    {
      timeout: 30_000,
    },
  );
  const output = path.join(docs, "before-after-elbow.png");
  await page.screenshot({ path: output, fullPage: true });
  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    source: "Stage 2A provider packs, existing artwork only",
    angles: ANGLES,
    before: {
      registration: "Stage 2A target pivots and original draw order",
      shoulderOcclusion: "upper arm above torso",
      elbowOcclusion: "forearm above upper arm",
    },
    after: {
      registration:
        "Stage 2B v2 draw order plus 3% upper-arm and 6% forearm overlap expansion around the pivot",
      shoulderOcclusion: "torso above upper arm",
      elbowOcclusion: "forearm above upper arm with expanded hidden overlap",
    },
    providers: { openai: { base: BASE.openai }, gemini: { base: BASE.gemini } },
    note: "Diagnostic registration test with the existing four Stage 2A parts, not a production character pack.",
  };
  await writeFile(
    path.join(docs, "before-after-elbow.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await writeFile(
    path.join(stage, "before-after-elbow.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(output);
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
