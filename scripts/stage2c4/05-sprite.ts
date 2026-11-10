import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
const trace = process.env.STAGE2C4_TRACE;
if (!trace) throw new Error("STAGE2C4_TRACE is required");
mkdirSync(path.dirname(trace), { recursive: true });
writeFileSync(trace, "");
const log = (message: string) => appendFileSync(trace, `${new Date().toISOString()} ${message}\n`);
const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const sharp = require("sharp");

async function main() {
  log("single-sprite-start");
  const root = process.cwd();
  const source = path.join(
    root,
    "outputs/folk-provider-benchmark/stage-2c4/openai/parts/nearUpperArm.png",
  );
  const docs = path.join(root, "docs/benchmarks/phase-05.1/stage-2c4");
  const outDir = path.join(root, "outputs/folk-provider-benchmark/stage-2c4/openai");
  await mkdir(docs, { recursive: true });
  await mkdir(outDir, { recursive: true });
  const metadata = await sharp(source).metadata();
  log(`sprite-decoded ${metadata.width}x${metadata.height}`);
  const image = (await readFile(source)).toString("base64");
  const browser = await chromium.launch({ headless: true });
  log("browser-launched");
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => log(`PAGEERROR ${error.message}`));
    const html = `<!doctype html><html><body style="margin:0;background:#1a0d08"><canvas id="c" width="640" height="640"></canvas><script>
    const c=document.getElementById('c').getContext('2d');const canvas=document.getElementById('c');
    const img=new Image();img.src='data:image/png;base64,${image}';
    function draw(){for(let y=0;y<640;y+=20)for(let x=0;x<640;x+=20){c.fillStyle=((x/20+y/20)%2===0)?'#d9d9d9':'#f3f3f3';c.fillRect(x,y,20,20);}c.fillStyle='rgba(26,13,8,.86)';c.fillRect(0,0,640,52);c.fillStyle='#fff2cf';c.font='600 18px Georgia';c.fillText('Stage 2C.4 · OpenAI paid nearUpperArm extract',16,32);const h=500;const w=img.width*(h/img.height);c.drawImage(img,(640-w)/2,80,w,h);return canvas.toDataURL('image/png');}
    window.render=()=>draw();img.decode().then(()=>window.ready=true);
    </script></body></html>`;
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForFunction(
      () => (window as unknown as { ready?: boolean }).ready === true,
      null,
      { timeout: 15000 },
    );
    log("page-ready");
    const data = await page.evaluate(() =>
      (window as unknown as { render: () => string }).render(),
    );
    const file = path.join(outDir, "single-sprite-frame.png");
    await writeFile(file, Buffer.from(data.split(",", 2)[1]!, "base64"));
    await sharp(file).png().toFile(path.join(docs, "single-sprite-openai.png"));
    const result = {
      marker: "single-sprite-ok",
      source: path.relative(root, source),
      sourceSha256: createHash("sha256")
        .update(await readFile(source))
        .digest("hex"),
      output: path.relative(root, file),
      metadata: await sharp(file).metadata(),
    };
    const reportFile = path.join(docs, "smoke", "05-sprite.json");
    await mkdir(path.dirname(reportFile), { recursive: true });
    await writeFile(reportFile, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
    log("single-sprite-done");
  } finally {
    await browser.close();
    log("browser-closed");
  }
}
main().catch((error) => {
  log(`ERROR ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  console.error(error);
  process.exit(1);
});
