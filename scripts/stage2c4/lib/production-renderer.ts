import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Browser, Page } from "@playwright/test";

const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));
const sharp = require("sharp");

export type Provider = "openai" | "gemini";

interface BasePart {
  id: string;
  file: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  sha256?: string;
  bytes?: number;
  origin?: string;
  provider?: string;
  model?: string;
  reviewStatus?: string;
  targetPivot?: { x: number; y: number };
  sourcePivot?: { x: number; y: number };
  scale?: number;
  [key: string]: unknown;
}

interface BaseManifest {
  parts: BasePart[];
  [key: string]: unknown;
}

interface PaidPartSpec {
  part: string;
  targetHeight: number;
  pivotFraction: number;
}

const PAID_PARTS: readonly PaidPartSpec[] = [
  { part: "nearUpperArm", targetHeight: 221, pivotFraction: 0.06 },
  { part: "nearForearm", targetHeight: 209, pivotFraction: 0.08 },
  { part: "nearThigh", targetHeight: 235, pivotFraction: 0.06 },
  { part: "nearShin", targetHeight: 232, pivotFraction: 0.08 },
];
const HIDDEN_PARTS = [
  "artisan_handOpen",
  "artisan_handGrip",
  "artisan_nearElbowCover",
  "artisan_nearDhoti",
  "artisan_nearFoot",
] as const;
const TRANSPARENT_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000000020001e221bc330000000049454e44ae426082",
  "hex",
);

export interface ProductionPayload {
  provider: Provider;
  parts: Array<
    BasePart & {
      id: string;
      base64: string;
      offsetX: number;
      offsetY: number;
      width: number;
      height: number;
    }
  >;
  backgrounds: Record<
    string,
    {
      layers: Array<{
        id: string;
        depth: number;
        opacity: number;
        base64: string;
        drawX?: number;
        drawY?: number;
        drawWidth?: number;
        drawHeight?: number;
      }>;
    }
  >;
  config: unknown;
}

export async function ensureRendererBundle(
  root: string,
  log: (message: string) => void,
): Promise<string> {
  const bundle = path.join(
    "/private/var/folders/cr/8rgz9nyd2_j5gqhftt3_97gc0000gn/T/opencode/stage2c4/bundle",
    "renderer.js",
  );
  const entry = path.join(root, "scripts/stage2c4/renderer-entry.ts");
  const bootstrap = path.join(root, "scripts/stage2c4/production-bootstrap.js");
  const build = path.join(root, "scripts/stage2c4/vite.config.mjs");
  const needsBuild =
    !existsSync(bundle) ||
    [entry, bootstrap, build].some((file) => {
      try {
        return statSync(file).mtimeMs > statSync(bundle).mtimeMs;
      } catch {
        return true;
      }
    });
  if (needsBuild) {
    log("renderer-bundle-build-start");
    const result = spawnSync("./node_modules/.bin/vite", ["build", "--config", build], {
      cwd: root,
      encoding: "utf8",
      timeout: 30000,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || "vite build failed");
    log("renderer-bundle-build-done");
  }
  return bundle;
}

function transparentPart(base: BasePart): BasePart & { base64: string } {
  return {
    ...base,
    base64: TRANSPARENT_PNG.toString("base64"),
    sha256: createHash("sha256").update(TRANSPARENT_PNG).digest("hex"),
    bytes: TRANSPARENT_PNG.length,
    origin: "stage2c4-hidden-for-technical-test",
    reviewStatus: "hidden",
  };
}

export async function buildProductionPayload(
  root: string,
  provider: Provider,
  log: (message: string) => void,
): Promise<ProductionPayload> {
  const baseDir = path.join(
    root,
    "outputs",
    "folk-provider-benchmark",
    "stage-2b",
    provider,
    "pack",
  );
  const manifest = JSON.parse(
    await readFile(path.join(baseDir, "manifest.json"), "utf8"),
  ) as BaseManifest;
  const byId = new Map(manifest.parts.map((part) => [part.id, part]));
  const stageDir = path.join(root, "outputs", "folk-provider-benchmark", "stage-2c4", provider);
  const paidFiles: Record<string, string> = {
    nearUpperArm: path.join(stageDir, "parts", "nearUpperArm.png"),
    nearForearm: path.join(stageDir, "parts", "nearForearm.png"),
    nearThigh: path.join(stageDir, "parts", "nearThigh.png"),
    nearShin: path.join(stageDir, "parts", "nearShin.png"),
  };
  const overrides = new Map<string, BasePart & { base64: string }>();
  for (const spec of PAID_PARTS) {
    const base = byId.get(`artisan_${spec.part}`);
    if (!base) throw new Error(`Base pack has no ${spec.part}.`);
    const source = paidFiles[spec.part]!;
    const bytes = await readFile(source);
    const metadata = await sharp(bytes).metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Could not read ${source}.`);
    const scale = spec.targetHeight / metadata.height;
    const pivot = base.targetPivot;
    if (!pivot) throw new Error(`Base part ${base.id} has no target pivot.`);
    overrides.set(base.id, {
      ...base,
      file: path.relative(root, source),
      offsetX: pivot.x - (metadata.width / 2) * scale,
      offsetY: pivot.y - metadata.height * spec.pivotFraction * scale,
      width: metadata.width * scale,
      height: metadata.height * scale,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
      origin: "provider-generated-stage-2c2-stage-2c4-extraction",
      provider,
      reviewStatus: "technical-test-only",
      base64: bytes.toString("base64"),
    });
    log(
      `paid-part ${provider} ${spec.part} ${metadata.width}x${metadata.height} scale=${scale.toFixed(5)}`,
    );
  }
  const parts = manifest.parts.map((part) => {
    const override = overrides.get(part.id);
    if (override) return override;
    if ((HIDDEN_PARTS as readonly string[]).includes(part.id)) {
      log(`hidden-part ${provider} ${part.id}`);
      return transparentPart(part);
    }
    return { ...part, base64: readFileSync(path.join(baseDir, part.file)).toString("base64") };
  });
  const folkManifest = JSON.parse(
    await readFile(path.join(root, "apps/web/public/assets/folk-pilot/manifest.json"), "utf8"),
  ) as {
    parts: {
      id: string;
      file: string;
      offsetX: number;
      offsetY: number;
      width: number;
      height: number;
      sha256?: string;
    }[];
  };
  const bellPart = folkManifest.parts.find((part) => part.id === "bell_bell");
  if (!bellPart) throw new Error("Bell part missing from folk-pilot pack.");
  parts.push({
    ...bellPart,
    base64: (
      await readFile(path.join(root, "apps/web/public/assets/folk-pilot", bellPart.file))
    ).toString("base64"),
  });
  const backgroundManifest = JSON.parse(
    await readFile(path.join(root, "apps/web/public/assets/folk-pilot/manifest.json"), "utf8"),
  ) as {
    backgrounds: Record<
      string,
      {
        layers: Array<{
          id: string;
          file: string;
          depth: number;
          opacity: number;
          drawX?: number;
          drawY?: number;
          drawWidth?: number;
          drawHeight?: number;
        }>;
      }
    >;
  };
  const backgrounds: ProductionPayload["backgrounds"] = {};
  for (const [id, background] of Object.entries(backgroundManifest.backgrounds)) {
    backgrounds[id] = { layers: [] };
    for (const layer of background.layers) {
      backgrounds[id]!.layers.push({
        ...layer,
        base64: (
          await readFile(path.join(root, "apps/web/public/assets/folk-pilot", layer.file))
        ).toString("base64"),
      });
    }
  }
  const baseConfig = JSON.parse(
    await readFile(path.join(root, "apps/web/public/assets/folk-pilot/film.json"), "utf8"),
  ) as Record<string, unknown> & {
    motion: unknown;
    shots: Array<Record<string, unknown>>;
  };
  const config = {
    ...baseConfig,
    id: `stage-2c4-${provider}-paid-parts`,
    title: `Stage 2C.4 ${provider} paid-part technical test`,
    shots: [
      {
        id: "shot-1",
        title: "Stage 2C.4 paid-part test",
        startFrame: 0,
        frameCount: 720,
        background: "courtyard",
        camera: [
          { frame: 0, x: 820, y: 760, zoom: 1.8, easing: "linear" },
          { frame: 719, x: 820, y: 760, zoom: 1.8, easing: "linear" },
        ],
        transitionIn: { type: "cut", frames: 0 },
        transitionOut: null,
        artisan: {
          action: "reach",
          fromX: 680,
          toX: 680,
          scale: 0.52,
          startFrame: 0,
          endFrame: 719,
          speed: 0,
          bell: "none",
          reach: {
            targetX: 1039,
            targetY: 864,
            startFrame: 26,
            endFrame: 78,
            gripFrame: 60,
            releaseFrame: 96,
          },
        },
        horse: null,
        cart: null,
        bell: { mode: "hidden" },
        notes: "Technical integration test; paid Stage 2C.2 artwork is not artistically approved.",
      },
    ],
    titles: [],
  };
  log(`payload ${provider} parts=${parts.length} backgrounds=${Object.keys(backgrounds).length}`);
  return { provider, parts, backgrounds, config };
}

export async function openProductionRenderer(
  browser: Browser,
  root: string,
  payload: ProductionPayload,
  bundlePath: string,
  log: (message: string) => void,
): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => log(`PAGEERROR ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") log(`CONSOLE ${message.text()}`);
  });
  await page.setContent("<html><body></body></html>");
  await page.addScriptTag({ content: await readFile(bundlePath, "utf8") });
  await page.addScriptTag({ content: `window.__STAGE2C4_PAYLOAD=${JSON.stringify(payload)};` });
  await page.addScriptTag({
    content: await readFile(path.join(root, "scripts/stage2c4/production-bootstrap.js"), "utf8"),
  });
  await page.waitForFunction(
    () => (window as unknown as { __ready?: boolean }).__ready === true,
    null,
    { timeout: 30000 },
  );
  const error = await page.evaluate(
    () => (window as unknown as { __stage2c4Error?: string }).__stage2c4Error ?? null,
  );
  if (error) throw new Error(error);
  log(`renderer-ready ${payload.provider}`);
  return page;
}

export async function renderProductionFrame(
  page: Page,
  frame: number,
  width = 640,
  height = 360,
): Promise<Buffer> {
  const data = await page.evaluate(`window.__stage2c4.render(${frame}, ${width}, ${height})`);
  return Buffer.from(data.split(",", 2)[1]!, "base64");
}

export async function renderProductionJoint(
  page: Page,
  frame: number,
  node: string,
  extra: number,
  width = 640,
  height = 360,
): Promise<Buffer> {
  const data = await page.evaluate(
    `window.__stage2c4.renderRig(${frame}, "${node}", ${extra}, ${width}, ${height})`,
  );
  return Buffer.from(data.split(",", 2)[1]!, "base64");
}

export async function savePng(file: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
