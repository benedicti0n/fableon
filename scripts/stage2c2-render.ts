#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { chromium } from "@playwright/test";
import { resolveFolkPose, type FolkRig } from "../packages/folk-motion/src/index.ts";

const require = createRequire(new URL("../apps/web/package.json", import.meta.url));
const sharp = require("sharp");
const root = process.cwd();
const stage = path.join(root, "outputs", "folk-provider-benchmark", "stage-2c2");
const docs = path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c2");

async function keyGreen(source: string, target: string) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const b = Buffer.from(data);
  for (let i = 0; i < b.length; i += 4) {
    const r = b[i] ?? 0,
      g = b[i + 1] ?? 0,
      bl = b[i + 2] ?? 0;
    if (g > 145 && g > r * 1.4 && g > bl * 1.4) b[i + 3] = 0;
    else if (g > Math.max(r, bl) + 8) b[i + 1] = Math.max(r, bl);
  }
  await sharp(b, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(target);
}
async function trim(source: string, target: string) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width,
    minY = info.height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
  const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  await sharp(source).extract(box).png().toFile(target);
  const m = await sharp(target).metadata();
  return { width: m.width!, height: m.height!, buffer: await readFile(target) };
}

async function main() {
  await mkdir(stage, { recursive: true });
  await mkdir(docs, { recursive: true });
  const providers = ["openai", "gemini"] as const;
  const report: Record<string, unknown> = {};
  for (const provider of providers) {
    const dir = path.join(stage, provider, "parts");
    await mkdir(dir, { recursive: true });
    const parts: Record<
      string,
      {
        file: string;
        width: number;
        height: number;
        scale: number;
        sourcePivot: { x: number; y: number };
        targetPivot: { x: number; y: number };
      }
    > = {};
    const defs = [
      ["arm", "upperArm", 0, 174, 135],
      ["arm", "forearm", 1, 174, 135],
      ["leg", "thigh", 0, 195, 115],
      ["leg", "shin", 1, 195, 115],
    ] as const;
    for (const [assembly, part, cell, targetArm, targetLeg] of defs) {
      const sheet = path.join(
        root,
        "outputs",
        "folk-provider-benchmark",
        provider,
        "attempts",
        `stage2c2-${provider}-${assembly}`,
        "output-00.png",
      );
      const keyed = path.join(dir, `${assembly}-keyed.png`);
      if (provider === "gemini") await keyGreen(sheet, keyed);
      else await sharp(sheet).png().toFile(keyed);
      const meta = await sharp(keyed).metadata();
      const W = meta.width!,
        H = meta.height!;
      const cellFile = path.join(dir, `${assembly}-${cell}-cell.png`);
      await sharp(keyed)
        .extract({
          left: cell === 0 ? 0 : Math.floor(W / 2),
          top: 0,
          width: Math.floor(W / 2),
          height: H,
        })
        .png()
        .toFile(cellFile);
      const trimmed = path.join(dir, `${part}.png`);
      const t = await trim(cellFile, trimmed);
      const target = assembly === "arm" ? targetArm : targetLeg;
      // upperArm/thigh use the master segment length; forearm/shin use their own.
      const length =
        part === "upperArm"
          ? target
          : part === "forearm"
            ? provider === "openai"
              ? 135
              : 229
            : part === "thigh"
              ? target
              : provider === "openai"
                ? 115
                : 183;
      const scale = length / t.height;
      const targetPivot =
        part === "upperArm"
          ? { x: 508, y: 470 }
          : part === "forearm"
            ? { x: 532, y: 610 }
            : part === "thigh"
              ? { x: 470, y: 670 }
              : { x: 476, y: 824 };
      const sourcePivot = {
        x: t.width * 0.5,
        y: part === "forearm" || part === "shin" ? t.height * 0.08 : t.height * 0.06,
      };
      parts[part] = {
        file: trimmed,
        width: t.width,
        height: t.height,
        scale,
        sourcePivot,
        targetPivot,
      };
    }
    // existing torso and pelvis for context
    for (const [, file] of [
      ["torso", "torso"],
      ["pelvis", "pelvis"],
    ] as const) {
      const src = path.join(
        root,
        "outputs",
        "folk-provider-benchmark",
        "stage-2b",
        provider,
        "pack",
        "parts",
        `artisan_${file}.png`,
      );
      const dst = path.join(dir, `${file}.png`);
      await sharp(src).png().toFile(dst);
    }
    const rigArm: FolkRig = {
      id: `stage2c2-${provider}-arm`,
      nodes: [
        { id: "torso", partId: "torso", parentId: null, pivot: { x: 440, y: 540 }, drawOrder: 1 },
        {
          id: "upperArm",
          partId: "upperArm",
          parentId: "torso",
          pivot: { x: 508, y: 470 },
          drawOrder: 2,
        },
        {
          id: "forearm",
          partId: "forearm",
          parentId: "upperArm",
          pivot: { x: 532, y: 610 },
          drawOrder: 3,
        },
      ],
    };
    const rigLeg: FolkRig = {
      id: `stage2c2-${provider}-leg`,
      nodes: [
        { id: "pelvis", partId: "pelvis", parentId: null, pivot: { x: 440, y: 660 }, drawOrder: 1 },
        {
          id: "thigh",
          partId: "thigh",
          parentId: "pelvis",
          pivot: { x: 470, y: 670 },
          drawOrder: 2,
        },
        { id: "shin", partId: "shin", parentId: "thigh", pivot: { x: 476, y: 824 }, drawOrder: 3 },
      ],
    };
    const images: Record<string, string> = {};
    for (const part of Object.keys(parts))
      images[part] = (await readFile(parts[part]!.file)).toString("base64");
    for (const id of ["torso", "pelvis"])
      images[id] = (await readFile(path.join(dir, `${id}.png`))).toString("base64");
    const frames = [];
    for (let f = 0; f < 120; f++) {
      const phase = (f / 119) * Math.PI * 2;
      const armPose = {
        nodes: {
          torso: { rotation: 0 },
          upperArm: { rotation: -18 * Math.sin(phase) },
          forearm: { rotation: -45 + 45 * Math.cos(phase) },
        },
      };
      const legPose = {
        nodes: {
          pelvis: { y: 0 },
          thigh: { rotation: 20 * Math.sin(phase) },
          shin: { rotation: 35 - 35 * Math.cos(phase) },
        },
      };
      const armNodes = resolveFolkPose(rigArm, armPose);
      const legNodes = resolveFolkPose(rigLeg, legPose);
      frames.push({
        f,
        arm: armNodes.map((n) => ({ id: n.id, partId: n.partId, world: n.world })),
        leg: legNodes.map((n) => ({ id: n.id, partId: n.partId, world: n.world })),
      });
    }
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const payload = { provider, frames, images, parts };
    const html = `<!doctype html><html><body style="margin:0;background:#1a0d08"><canvas id="c" width="1280" height="720"></canvas><script>const p=${JSON.stringify(payload)};const c=document.getElementById('c').getContext('2d');const imgs={};for(const [id,b] of Object.entries(p.images)){const i=new Image();i.src='data:image/png;base64,'+b;imgs[id]=i;}function draw(index){const f=p.frames[index];c.fillStyle='#1a0d08';c.fillRect(0,0,1280,720);for(let y=0;y<720;y+=24)for(let x=0;x<1280;x+=24){c.fillStyle=((x/24+y/24)%2===0)?'#d9d9d9':'#f3f3f3';c.fillRect(x,y,24,24);}c.fillStyle='#fff2cf';c.font='600 24px Georgia';c.fillText(p.provider+' · arm / leg articulation · frame '+f.f,30,40);function drawSet(nodes,ox,oy){for(const n of nodes){const part=p.parts[n.partId];if(!part)continue;const m=n.world;c.save();c.setTransform(m.a,m.b,m.c,m.d,m.e+ox,m.f+oy);c.drawImage(imgs[n.partId],part.targetPivot.x-part.sourcePivot.x*part.scale,part.targetPivot.y-part.sourcePivot.y*part.scale,part.width*part.scale,part.height*part.scale);c.restore();}}drawSet(f.arm,60,120);drawSet(f.leg,700,50);return c.toDataURL('image/png');}window.render=(i)=>draw(i);Promise.all(Object.values(imgs).map(i=>i.decode())).then(()=>window.ready=true);</script></body></html>`;
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
    const frameDir = path.join(stage, provider, "frames");
    await mkdir(frameDir, { recursive: true });
    for (let i = 0; i < 120; i++) {
      const d = await page.evaluate((n) => window.render(n), i);
      const b = d.split(",", 2)[1];
      await writeFile(
        path.join(frameDir, `frame-${String(i).padStart(4, "0")}.png`),
        Buffer.from(b, "base64"),
      );
    }
    await browser.close();
    const video = path.join(stage, provider, "articulation-test.mp4");
    const ff = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-v",
        "error",
        "-framerate",
        "24",
        "-i",
        path.join(frameDir, "frame-%04d.png"),
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
    if (ff.status !== 0) throw new Error(ff.stderr);
    const probe = JSON.parse(
      spawnSync(
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
          video,
        ],
        { encoding: "utf8" },
      ).stdout,
    );
    const decode = spawnSync("ffmpeg", ["-v", "error", "-i", video, "-f", "null", "-"], {
      encoding: "utf8",
    });
    if (decode.status !== 0) throw new Error("decode failed");
    await sharp(path.join(frameDir, "frame-0060.png"))
      .resize(960, 540)
      .png()
      .toFile(path.join(docs, `${provider}-articulation-frame.png`));
    report[provider] = {
      video: path.relative(root, video),
      probe,
      parts: Object.fromEntries(
        Object.entries(parts).map(([k, v]) => [
          k,
          {
            file: path.relative(root, v.file),
            width: v.width,
            height: v.height,
            scale: v.scale,
            targetPivot: v.targetPivot,
          },
        ]),
      ),
      sha256: createHash("sha256")
        .update(await readFile(video))
        .digest("hex"),
    };
  }
  await writeFile(path.join(stage, "render-report.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(path.join(docs, "render-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exitCode = 1;
});
