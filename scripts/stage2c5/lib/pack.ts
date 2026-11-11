import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ProductionPayload } from "../../stage2c4/lib/production-renderer.ts";

const require = createRequire(path.join(process.cwd(), "apps/web/package.json"));

const TRANSPARENT_PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000000020001e221bc330000000049454e44ae426082",
  "hex",
);

interface CandidateRecord {
  provider: "openai" | "gemini";
  part: string;
  candidateFile: string;
  candidateDimensions: { width: number; height: number };
  crop: { x: number; y: number; width: number; height: number };
  splitY: number | null;
}

interface BasePart {
  id: string;
  file: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  targetPivot?: { x: number; y: number };
  [key: string]: unknown;
}

interface BaseManifest {
  parts: BasePart[];
  [key: string]: unknown;
}

export interface Stage2C5Pack {
  payload: ProductionPayload;
  registration: Record<string, unknown>;
}

const TARGETS = {
  shoulder: { x: 508, y: 470 },
  elbow: { x: 532, y: 610 },
  wrist: { x: 548, y: 742 },
  hip: { x: 470, y: 670 },
  knee: { x: 476, y: 824 },
  ankle: { x: 480, y: 978 },
};

const DISTANCE = {
  upperArm: Math.hypot(TARGETS.elbow.x - TARGETS.shoulder.x, TARGETS.elbow.y - TARGETS.shoulder.y),
  forearm: Math.hypot(TARGETS.wrist.x - TARGETS.elbow.x, TARGETS.wrist.y - TARGETS.elbow.y),
  thigh: Math.hypot(TARGETS.knee.x - TARGETS.hip.x, TARGETS.knee.y - TARGETS.hip.y),
  shin: Math.hypot(TARGETS.ankle.x - TARGETS.knee.x, TARGETS.ankle.y - TARGETS.knee.y),
};

const HIDDEN = ["artisan_handGrip", "artisan_nearDhoti", "artisan_nearElbowCover"] as const;

function transparentPart(base: BasePart): BasePart & { base64: string } {
  return {
    ...base,
    base64: TRANSPARENT_PNG.toString("base64"),
    sha256: createHash("sha256").update(TRANSPARENT_PNG).digest("hex"),
    bytes: TRANSPARENT_PNG.length,
    origin: "stage2c5-hidden-duplicate",
    reviewStatus: "hidden",
  };
}

function cameraConfig(
  base: Record<string, unknown>,
  camera: { x: number; y: number; zoom: number },
  action: "idle" | "reach",
) {
  return {
    ...base,
    shots: [
      {
        id: "shot-1",
        title: "Stage 2C.5 separated-part test",
        startFrame: 0,
        frameCount: 720,
        background: "courtyard",
        camera: [
          { frame: 0, ...camera, easing: "linear" },
          { frame: 719, ...camera, easing: "linear" },
        ],
        transitionIn: { type: "cut", frames: 0 },
        transitionOut: null,
        artisan: {
          action,
          fromX: 680,
          toX: 680,
          scale: 0.52,
          startFrame: 0,
          endFrame: 719,
          speed: 0,
          bell: "none",
          ...(action === "reach"
            ? {
                reach: {
                  targetX: 1039,
                  targetY: 864,
                  startFrame: 26,
                  endFrame: 78,
                  gripFrame: 60,
                  releaseFrame: 96,
                },
              }
            : {}),
        },
        horse: null,
        cart: null,
        bell: { mode: "hidden" },
        notes: "Technical Stage 2C.5 separation test; no artistic approval.",
      },
    ],
    titles: [],
  };
}

export async function buildStage2C5Pack(
  root: string,
  provider: "openai" | "gemini",
  camera: { x: number; y: number; zoom: number },
  action: "idle" | "reach" = "idle",
): Promise<Stage2C5Pack> {
  const inventory = JSON.parse(
    await readFile(
      path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c5", "candidate-inventory.json"),
      "utf8",
    ),
  ) as { parts: CandidateRecord[] };
  const c4 = JSON.parse(
    await readFile(
      path.join(root, "docs", "benchmarks", "phase-05.1", "stage-2c4", "smoke", "04-extract.json"),
      "utf8",
    ),
  ) as {
    provider: string;
    part: string;
    candidateDimensions: { width: number; height: number };
    extractionBox: { x: number; y: number; width: number; height: number };
  }[];
  const baseDir = path.join(
    root,
    "outputs",
    "folk-provider-benchmark",
    "stage-2b",
    provider,
    "pack",
  );
  const baseManifest = JSON.parse(
    await readFile(path.join(baseDir, "manifest.json"), "utf8"),
  ) as BaseManifest;
  const byId = new Map(baseManifest.parts.map((part) => [part.id, part]));
  const candidates = new Map(
    inventory.parts.filter((part) => part.provider === provider).map((part) => [part.part, part]),
  );
  const c4ByPart = new Map(
    c4.filter((entry) => entry.provider === provider).map((entry) => [entry.part, entry]),
  );
  const overrides = new Map<string, BasePart & { base64: string }>();
  const registration: Record<string, unknown> = {};

  const candidateBytes = async (part: string) =>
    readFile(path.join(root, candidates.get(part)!.candidateFile));

  const setPart = (
    part: string,
    data: {
      scale: number;
      offsetX: number;
      offsetY: number;
      width: number;
      height: number;
      sourceFullHeight: number;
      pivotFraction: number;
      splitLocal?: number;
    },
  ) => {
    const candidate = candidates.get(part);
    const base = byId.get(`artisan_${part}`);
    if (!candidate || !base) throw new Error(`Missing candidate/base for ${provider}/${part}.`);
    return candidateBytes(part).then((bytes) => {
      overrides.set(base.id, {
        ...base,
        file: candidate.candidateFile,
        offsetX: data.offsetX,
        offsetY: data.offsetY,
        width: data.width,
        height: data.height,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
        origin: "provider-generated-stage2c2",
        provider,
        reviewStatus: "technical-test-only",
        base64: bytes.toString("base64"),
      });
      registration[part] = {
        source: candidate.candidateFile,
        offsetX: data.offsetX,
        offsetY: data.offsetY,
        width: data.width,
        height: data.height,
        scale: data.scale,
        sourceFullHeight: data.sourceFullHeight,
        pivotFraction: data.pivotFraction,
        splitLocal: data.splitLocal ?? null,
        targetPivot: base.targetPivot ?? null,
      };
    });
  };

  const upper = candidates.get("nearUpperArm")!;
  const upperScale = 221 / upper.candidateDimensions.height;
  await setPart("nearUpperArm", {
    scale: upperScale,
    offsetX: TARGETS.shoulder.x - (upper.candidateDimensions.width / 2) * upperScale,
    offsetY: TARGETS.shoulder.y - 0.06 * upper.candidateDimensions.height * upperScale,
    width: upper.candidateDimensions.width * upperScale,
    height: upper.candidateDimensions.height * upperScale,
    sourceFullHeight: upper.candidateDimensions.height,
    pivotFraction: 0.06,
  });

  const fore = candidates.get("nearForearm")!;
  const foreC4 = c4ByPart.get("nearForearm")!;
  const foreSplitLocal = (fore.splitY ?? 0) - fore.crop.y;
  const forePivotOffset = 0.08 * foreC4.candidateDimensions.height;
  const forePivotToSplit = foreSplitLocal - forePivotOffset;
  const foreScale = DISTANCE.forearm / forePivotToSplit;
  await setPart("nearForearm", {
    scale: foreScale,
    offsetX: TARGETS.elbow.x - (fore.candidateDimensions.width / 2) * foreScale,
    offsetY: TARGETS.elbow.y - forePivotOffset * foreScale,
    width: fore.candidateDimensions.width * foreScale,
    height: fore.candidateDimensions.height * foreScale,
    sourceFullHeight: foreC4.candidateDimensions.height,
    pivotFraction: 0.08,
    splitLocal: foreSplitLocal,
  });

  const hand = candidates.get("handOpen")!;
  await setPart("handOpen", {
    scale: foreScale,
    offsetX: TARGETS.wrist.x - (hand.candidateDimensions.width / 2) * foreScale,
    offsetY: TARGETS.wrist.y,
    width: hand.candidateDimensions.width * foreScale,
    height: hand.candidateDimensions.height * foreScale,
    sourceFullHeight: hand.candidateDimensions.height,
    pivotFraction: 0,
  });

  const thigh = candidates.get("nearThigh")!;
  const thighScale = 235 / thigh.candidateDimensions.height;
  await setPart("nearThigh", {
    scale: thighScale,
    offsetX: TARGETS.hip.x - (thigh.candidateDimensions.width / 2) * thighScale,
    offsetY: TARGETS.hip.y - 0.06 * thigh.candidateDimensions.height * thighScale,
    width: thigh.candidateDimensions.width * thighScale,
    height: thigh.candidateDimensions.height * thighScale,
    sourceFullHeight: thigh.candidateDimensions.height,
    pivotFraction: 0.06,
  });

  const shin = candidates.get("nearShin")!;
  const shinC4 = c4ByPart.get("nearShin")!;
  const shinSplitLocal = (shin.splitY ?? 0) - shin.crop.y;
  const shinPivotOffset = 0.08 * shinC4.candidateDimensions.height;
  const shinPivotToSplit = shinSplitLocal - shinPivotOffset;
  const shinScale = DISTANCE.shin / shinPivotToSplit;
  await setPart("nearShin", {
    scale: shinScale,
    offsetX: TARGETS.knee.x - (shin.candidateDimensions.width / 2) * shinScale,
    offsetY: TARGETS.knee.y - shinPivotOffset * shinScale,
    width: shin.candidateDimensions.width * shinScale,
    height: shin.candidateDimensions.height * shinScale,
    sourceFullHeight: shinC4.candidateDimensions.height,
    pivotFraction: 0.08,
    splitLocal: shinSplitLocal,
  });

  const foot = candidates.get("nearFoot")!;
  await setPart("nearFoot", {
    scale: shinScale,
    offsetX: TARGETS.ankle.x - (foot.candidateDimensions.width / 2) * shinScale,
    offsetY: TARGETS.ankle.y,
    width: foot.candidateDimensions.width * shinScale,
    height: foot.candidateDimensions.height * shinScale,
    sourceFullHeight: foot.candidateDimensions.height,
    pivotFraction: 0,
  });

  const parts = baseManifest.parts.map((part) => {
    const override = overrides.get(part.id);
    if (override) return override;
    if ((HIDDEN as readonly string[]).includes(part.id)) return transparentPart(part);
    return {
      ...part,
      base64: require("node:fs").readFileSync(path.join(baseDir, part.file)).toString("base64"),
    };
  });
  const folk = JSON.parse(
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
    backgrounds: Record<
      string,
      {
        layers: {
          id: string;
          file: string;
          depth: number;
          opacity: number;
          drawX?: number;
          drawY?: number;
          drawWidth?: number;
          drawHeight?: number;
        }[];
      }
    >;
  };
  const bell = folk.parts.find((part) => part.id === "bell_bell");
  if (!bell) throw new Error("Bell part missing.");
  parts.push({
    ...bell,
    base64: (
      await readFile(path.join(root, "apps/web/public/assets/folk-pilot", bell.file))
    ).toString("base64"),
  });
  const backgrounds: ProductionPayload["backgrounds"] = {};
  for (const [id, background] of Object.entries(folk.backgrounds)) {
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
  ) as Record<string, unknown>;
  return {
    payload: {
      provider,
      parts: parts as ProductionPayload["parts"],
      backgrounds,
      config: cameraConfig(baseConfig, camera, action),
    },
    registration: {
      provider,
      camera,
      masterDistances: DISTANCE,
      parts: registration,
    },
  };
}
