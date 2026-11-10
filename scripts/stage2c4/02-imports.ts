import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const trace = process.env.STAGE2C4_TRACE;
if (!trace) throw new Error("STAGE2C4_TRACE is required");
mkdirSync(path.dirname(trace), { recursive: true });
writeFileSync(trace, "");
const log = (message: string) => appendFileSync(trace, `${new Date().toISOString()} ${message}\n`);

async function main() {
  log("imports-start");
  log("sharp-start");
  const { createRequire } = await import("node:module");
  const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
  const sharp = require("sharp");
  log("sharp-done");
  log("playwright-start");
  await import("@playwright/test");
  log("playwright-done");
  log("folk-motion-start");
  await import("../../packages/folk-motion/src/index.ts");
  log("folk-motion-done");
  log("renderer-start");
  await import("../../apps/web/lib/folk/renderer.ts");
  log("renderer-done");
  const metadata = await sharp(
    "docs/benchmarks/phase-05.1/stage-2c2/openai/arm-sheet.png",
  ).metadata();
  log(`decode-smoke-done ${metadata.width}x${metadata.height}`);
  console.log(
    JSON.stringify({
      marker: "imports-ok",
      sharp: true,
      playwright: true,
      folkMotion: true,
      renderer: true,
      width: metadata.width,
      height: metadata.height,
    }),
  );
}
main()
  .then(() => log("imports-done"))
  .catch((error) => {
    log(`ERROR ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    console.error(error);
    process.exit(1);
  });
