import { mixHexColors } from "../color";
import type { Vec2 } from "../geometry";
import { createSeededRandom, derivePaintSeed } from "../random";
import {
  createDryBrush,
  createOrganicStroke,
  createWash,
  renderDryBrush,
  renderOrganicStroke,
  renderWash,
} from "../strokes";
import { createPaperGrain, renderPaperGrain } from "../texture";

export const BENCHMARK_ASSET_DIMENSIONS = Object.freeze({
  forestDawn: { width: 2048, height: 1152 },
  forestDeep: { width: 2048, height: 1152 },
  branch: { width: 2048, height: 360 },
  bird: { width: 720, height: 540 },
});

export interface PaintedBenchmarkAssets {
  readonly forestDawn: HTMLCanvasElement;
  readonly forestDeep: HTMLCanvasElement;
  readonly branch: HTMLCanvasElement;
  readonly bird: HTMLCanvasElement;
}

interface ForestPalette {
  readonly skyTop: string;
  readonly skyMid: string;
  readonly skyLow: string;
  readonly horizon: string;
  readonly sun: string;
  readonly distant: string;
  readonly mid: string;
  readonly near: string;
  readonly foliage: readonly string[];
  readonly foreground: readonly string[];
}

const DAWN_PALETTE: ForestPalette = {
  skyTop: "#0d1a17",
  skyMid: "#33483a",
  skyLow: "#7c7952",
  horizon: "#cfaa6d",
  sun: "#f6dfaa",
  distant: "#3b5140",
  mid: "#263b2e",
  near: "#122119",
  foliage: ["#6d7a50", "#8c8a58", "#a39860", "#4f6749", "#c0a86b"],
  foreground: ["#0a1510", "#15261a", "#233827", "#31472c"],
};

const DEEP_PALETTE: ForestPalette = {
  skyTop: "#091411",
  skyMid: "#233a2e",
  skyLow: "#536144",
  horizon: "#a58d5d",
  sun: "#edcf97",
  distant: "#314738",
  mid: "#1d3227",
  near: "#0f1e16",
  foliage: ["#566b46", "#748051", "#92905d", "#3e5940", "#b59d62"],
  foreground: ["#07110c", "#102118", "#1b3020", "#2a4129"],
};

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("A 2D canvas context is required for benchmark painting.");
  }
  return context;
}

function paintRidge(
  context: CanvasRenderingContext2D,
  points: readonly Vec2[],
  color: string,
  opacity: number,
): void {
  const first = points[0];
  if (!first) {
    return;
  }

  context.save();
  try {
    context.globalAlpha = opacity;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (const point of points.slice(1)) {
      context.lineTo(point.x, point.y);
    }
    context.lineTo(points[points.length - 1]?.x ?? first.x, 1152);
    context.lineTo(first.x, 1152);
    context.closePath();
    context.fill();
  } finally {
    context.restore();
  }
}

function paintSun(
  context: CanvasRenderingContext2D,
  palette: ForestPalette,
  center: Vec2,
  radius: number,
): void {
  const glow = context.createRadialGradient(
    center.x,
    center.y,
    radius * 0.1,
    center.x,
    center.y,
    radius * 3.2,
  );
  glow.addColorStop(0, "rgba(255, 238, 194, 0.9)");
  glow.addColorStop(0.32, "rgba(235, 194, 116, 0.34)");
  glow.addColorStop(1, "rgba(235, 194, 116, 0)");

  context.save();
  try {
    context.fillStyle = glow;
    context.fillRect(0, 0, 2048, 1152);
    context.globalAlpha = 0.78;
    context.fillStyle = palette.sun;
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.fill();
  } finally {
    context.restore();
  }
}

function paintHillLayer(
  context: CanvasRenderingContext2D,
  palette: ForestPalette,
  baseY: number,
  color: string,
  amplitude: number,
  seed: number,
  opacity: number,
): void {
  const rng = createSeededRandom(seed);
  const points: Vec2[] = [{ x: 0, y: baseY }];

  for (let x = 0; x <= 2048; x += 96) {
    points.push({
      x,
      y: baseY + Math.sin(x * 0.004 + rng() * 2) * amplitude + (rng() - 0.5) * amplitude * 0.5,
    });
  }

  paintRidge(context, points, color, opacity);

  const edge = createOrganicStroke({
    seed: derivePaintSeed(seed, "ridge"),
    points,
    width: 5,
    opacity: 0.18,
    color: mixHexColors(color, palette.horizon, 0.45),
    widthVariation: 0.5,
    edgeIrregularity: 0.5,
    samplesPerSegment: 10,
  });
  renderOrganicStroke(context, edge);
}

function paintMistBand(
  context: CanvasRenderingContext2D,
  palette: ForestPalette,
  center: Vec2,
  radiusX: number,
  radiusY: number,
  seed: number,
  opacity: number,
): void {
  const mist = createWash({
    seed,
    center,
    radiusX,
    radiusY,
    color: mixHexColors(palette.horizon, "#f4e2bd", 0.45),
    opacity,
    lobes: 4,
    irregularity: 0.38,
    granulation: 0.16,
  });
  renderWash(context, mist);
}

function paintLeaf(
  context: CanvasRenderingContext2D,
  position: Vec2,
  angle: number,
  length: number,
  width: number,
  color: string,
  opacity: number,
  seed: number,
): void {
  const bend = (createSeededRandom(seed)() - 0.5) * 0.5;
  const midpoint = {
    x: position.x + Math.cos(angle + bend) * length * 0.52,
    y: position.y + Math.sin(angle + bend) * length * 0.52,
  };
  const end = {
    x: position.x + Math.cos(angle) * length,
    y: position.y + Math.sin(angle) * length,
  };

  renderOrganicStroke(
    context,
    createOrganicStroke({
      seed,
      points: [position, midpoint, end],
      width,
      opacity,
      color,
      widthVariation: 0.18,
      edgeIrregularity: 0.42,
      colorVariation: 0.12,
      samplesPerSegment: 7,
    }),
  );
}

function paintLeafCluster(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radiusX: number,
  radiusY: number,
  palette: readonly string[],
  seed: number,
  leafCount: number,
  leafScale = 1,
  opacity = 0.82,
): void {
  const rng = createSeededRandom(seed);
  const washSeeds = [derivePaintSeed(seed, "wash", 0), derivePaintSeed(seed, "wash", 1)];

  for (const [index, washSeed] of washSeeds.entries()) {
    const wash = createWash({
      seed: washSeed,
      center: {
        x: center.x + (rng() - 0.5) * radiusX * 0.4,
        y: center.y + (rng() - 0.5) * radiusY * 0.4,
      },
      radiusX: radiusX * (0.78 + index * 0.18),
      radiusY: radiusY * (0.78 + index * 0.18),
      color: palette[index % palette.length] as string,
      opacity: opacity * 0.3,
      lobes: 3,
      irregularity: 0.34,
      granulation: 0.28,
    });
    renderWash(context, wash);
  }

  for (let index = 0; index < leafCount; index += 1) {
    const angle = rng() * Math.PI * 2;
    const radial = Math.sqrt(rng());
    const position = {
      x: center.x + Math.cos(angle) * radiusX * radial,
      y: center.y + Math.sin(angle) * radiusY * radial,
    };
    const leafAngle = angle + (rng() - 0.5) * 0.9;
    const length = (16 + rng() * 34) * leafScale;
    const width = (4 + rng() * 8) * leafScale;
    const color = palette[Math.floor(rng() * palette.length)] as string;

    paintLeaf(
      context,
      position,
      leafAngle,
      length,
      width,
      color,
      opacity * (0.5 + rng() * 0.5),
      derivePaintSeed(seed, "leaf", index),
    );
  }
}

function paintTree(
  context: CanvasRenderingContext2D,
  palette: ForestPalette,
  options: {
    x: number;
    baseY: number;
    height: number;
    width: number;
    lean: number;
    seed: number;
    canopyScale: number;
    foreground?: boolean;
  },
): void {
  const { x, baseY, height, width: trunkWidth, lean, seed, canopyScale, foreground } = options;
  const topX = x + lean;
  const topY = baseY - height;
  const rng = createSeededRandom(seed);
  const trunkColor = foreground ? palette.near : palette.mid;

  context.save();
  try {
    const trunkGradient = context.createLinearGradient(
      x - trunkWidth / 2,
      0,
      x + trunkWidth / 2,
      0,
    );
    trunkGradient.addColorStop(0, mixHexColors(trunkColor, "#050b08", 0.25));
    trunkGradient.addColorStop(0.5, mixHexColors(trunkColor, palette.horizon, 0.12));
    trunkGradient.addColorStop(1, mixHexColors(trunkColor, "#050b08", 0.35));
    context.fillStyle = trunkGradient;
    context.beginPath();
    context.moveTo(x - trunkWidth / 2, baseY);
    context.bezierCurveTo(
      x - trunkWidth * 0.45,
      baseY - height * 0.32,
      topX - trunkWidth * 0.3,
      topY + height * 0.25,
      topX - trunkWidth * 0.13,
      topY,
    );
    context.lineTo(topX + trunkWidth * 0.13, topY);
    context.bezierCurveTo(
      topX + trunkWidth * 0.36,
      topY + height * 0.3,
      x + trunkWidth * 0.44,
      baseY - height * 0.28,
      x + trunkWidth / 2,
      baseY,
    );
    context.closePath();
    context.fill();

    const barkPoints: Vec2[] = [];
    for (let step = 0; step <= 8; step += 1) {
      const t = step / 8;
      barkPoints.push({
        x: x + lean * t + (rng() - 0.5) * trunkWidth * 0.14,
        y: baseY - height * t,
      });
    }
    renderDryBrush(
      context,
      createDryBrush({
        seed: derivePaintSeed(seed, "bark-dark"),
        points: barkPoints,
        width: trunkWidth * 0.72,
        opacity: 0.24,
        color: mixHexColors(trunkColor, "#050b08", 0.5),
        bristles: 9,
        gapRatio: 0.44,
        jitter: 0.35,
      }),
    );
    renderDryBrush(
      context,
      createDryBrush({
        seed: derivePaintSeed(seed, "bark-light"),
        points: barkPoints.map((point) => ({ x: point.x - trunkWidth * 0.18, y: point.y })),
        width: trunkWidth * 0.22,
        opacity: 0.2,
        color: mixHexColors(palette.horizon, trunkColor, 0.4),
        bristles: 5,
        gapRatio: 0.48,
        jitter: 0.2,
      }),
    );

    const branchCount = foreground ? 5 : 4;
    for (let branchIndex = 0; branchIndex < branchCount; branchIndex += 1) {
      const t = 0.36 + branchIndex * 0.13;
      const start = { x: x + lean * t, y: baseY - height * t };
      const direction = branchIndex % 2 === 0 ? -1 : 1;
      const end = {
        x: start.x + direction * (70 + rng() * 160) * canopyScale,
        y: start.y - (50 + rng() * 120) * canopyScale,
      };
      const control = {
        x: start.x + direction * (35 + rng() * 60) * canopyScale,
        y: start.y - (35 + rng() * 60) * canopyScale,
      };

      renderOrganicStroke(
        context,
        createOrganicStroke({
          seed: derivePaintSeed(seed, "branch", branchIndex),
          points: [start, control, end],
          width: trunkWidth * (0.22 - branchIndex * 0.025),
          opacity: 0.88,
          color: mixHexColors(trunkColor, palette.horizon, 0.12),
          widthVariation: 0.22,
          edgeIrregularity: 0.4,
        }),
      );

      paintLeafCluster(
        context,
        end,
        (110 + rng() * 90) * canopyScale,
        (60 + rng() * 60) * canopyScale,
        palette.foliage,
        derivePaintSeed(seed, "canopy", branchIndex),
        foreground ? 26 : 14,
        canopyScale * (foreground ? 1.15 : 0.85),
        foreground ? 0.88 : 0.68,
      );
    }

    if (!foreground) {
      paintLeafCluster(
        context,
        { x: topX, y: topY + 30 },
        160 * canopyScale,
        80 * canopyScale,
        palette.foliage,
        derivePaintSeed(seed, "crown"),
        22,
        canopyScale,
        0.7,
      );
    }
  } finally {
    context.restore();
  }
}

function paintDistantForest(
  context: CanvasRenderingContext2D,
  palette: ForestPalette,
  seed: number,
): void {
  const rng = createSeededRandom(seed);

  for (let index = 0; index < 22; index += 1) {
    const x = 30 + rng() * 1988;
    const baseY = 730 + rng() * 70;
    const height = 180 + rng() * 340;
    const width = 4 + rng() * 14;
    const color = mixHexColors(palette.distant, palette.near, 0.2 + rng() * 0.4);

    renderOrganicStroke(
      context,
      createOrganicStroke({
        seed: derivePaintSeed(seed, "distant-trunk", index),
        points: [
          { x, y: baseY },
          { x: x + (rng() - 0.5) * 30, y: baseY - height * 0.55 },
          { x: x + (rng() - 0.5) * 50, y: baseY - height },
        ],
        width,
        opacity: 0.34 + rng() * 0.22,
        color,
        widthVariation: 0.4,
        edgeIrregularity: 0.45,
      }),
    );

    paintLeafCluster(
      context,
      { x: x + (rng() - 0.5) * 50, y: baseY - height },
      34 + rng() * 46,
      24 + rng() * 32,
      palette.foliage,
      derivePaintSeed(seed, "distant-canopy", index),
      7,
      0.55,
      0.48,
    );
  }
}

function paintLightShafts(context: CanvasRenderingContext2D, sun: Vec2, seed: number): void {
  const rng = createSeededRandom(seed);
  context.save();
  try {
    context.globalCompositeOperation = "screen";
    for (let index = 0; index < 5; index += 1) {
      const spread = 180 + index * 90 + rng() * 80;
      const width = 35 + rng() * 80;
      const gradient = context.createLinearGradient(sun.x, sun.y, sun.x - spread, 1152);
      gradient.addColorStop(0, "rgba(255, 236, 189, 0.22)");
      gradient.addColorStop(0.65, "rgba(239, 207, 143, 0.08)");
      gradient.addColorStop(1, "rgba(239, 207, 143, 0)");
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(sun.x - width * 0.18, sun.y);
      context.lineTo(sun.x + width * 0.18, sun.y);
      context.lineTo(sun.x - spread + width, 1152);
      context.lineTo(sun.x - spread - width, 1152);
      context.closePath();
      context.fill();
    }
  } finally {
    context.restore();
  }
}

function paintForest(
  canvas: HTMLCanvasElement,
  palette: ForestPalette,
  seed: number,
  variant: "dawn" | "deep",
): void {
  const context = contextFor(canvas);
  const sun = variant === "dawn" ? { x: 1460, y: 300 } : { x: 1510, y: 250 };

  context.clearRect(0, 0, canvas.width, canvas.height);

  const sky = context.createLinearGradient(0, 0, 0, 1000);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.46, palette.skyMid);
  sky.addColorStop(0.76, palette.skyLow);
  sky.addColorStop(1, palette.horizon);
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  paintSun(context, palette, sun, variant === "dawn" ? 92 : 68);
  paintHillLayer(context, palette, 760, palette.distant, 54, derivePaintSeed(seed, "hill-1"), 0.7);
  paintHillLayer(
    context,
    palette,
    830,
    mixHexColors(palette.distant, palette.near, 0.35),
    40,
    derivePaintSeed(seed, "hill-2"),
    0.84,
  );
  paintMistBand(
    context,
    palette,
    { x: 1040, y: 820 },
    850,
    120,
    derivePaintSeed(seed, "mist"),
    variant === "dawn" ? 0.28 : 0.2,
  );
  paintDistantForest(context, palette, derivePaintSeed(seed, "distant-forest"));

  paintTree(context, palette, {
    x: 250,
    baseY: 1150,
    height: 1010,
    width: 142,
    lean: 34,
    seed: derivePaintSeed(seed, "tree-left"),
    canopyScale: 1.28,
    foreground: true,
  });
  paintTree(context, palette, {
    x: 1740,
    baseY: 1150,
    height: 960,
    width: 118,
    lean: -38,
    seed: derivePaintSeed(seed, "tree-right"),
    canopyScale: 1.18,
    foreground: true,
  });
  paintTree(context, palette, {
    x: 680,
    baseY: 1030,
    height: 620,
    width: 58,
    lean: -20,
    seed: derivePaintSeed(seed, "tree-mid-left"),
    canopyScale: 0.76,
  });
  paintTree(context, palette, {
    x: 1390,
    baseY: 1040,
    height: 680,
    width: 64,
    lean: 24,
    seed: derivePaintSeed(seed, "tree-mid-right"),
    canopyScale: 0.82,
  });

  paintLightShafts(context, sun, derivePaintSeed(seed, "light"));

  paintLeafCluster(
    context,
    { x: 100, y: 1080 },
    330,
    240,
    palette.foreground,
    derivePaintSeed(seed, "foreground-left"),
    42,
    1.5,
    0.95,
  );
  paintLeafCluster(
    context,
    { x: 1970, y: 1030 },
    300,
    260,
    palette.foreground,
    derivePaintSeed(seed, "foreground-right"),
    38,
    1.45,
    0.95,
  );
  paintLeafCluster(
    context,
    { x: 1030, y: 1150 },
    280,
    100,
    palette.foreground,
    derivePaintSeed(seed, "foreground-bottom"),
    24,
    1.1,
    0.88,
  );

  renderPaperGrain(
    context,
    createPaperGrain({
      seed: derivePaintSeed(seed, "paper"),
      width: canvas.width,
      height: canvas.height,
      density: 0.00055,
      minSize: 0.5,
      maxSize: 1.8,
      opacity: 0.65,
    }),
    0.8,
  );
}

function paintBranch(canvas: HTMLCanvasElement, seed: number): void {
  const context = contextFor(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);

  const main = [
    { x: -40, y: 260 },
    { x: 430, y: 238 },
    { x: 900, y: 212 },
    { x: 1420, y: 224 },
    { x: 2100, y: 258 },
  ] as const;

  renderOrganicStroke(
    context,
    createOrganicStroke({
      seed: derivePaintSeed(seed, "branch-shadow"),
      points: main,
      width: 72,
      opacity: 0.95,
      color: "#2c2118",
      widthVariation: 0.18,
      edgeIrregularity: 0.5,
      colorVariation: 0.08,
      samplesPerSegment: 18,
    }),
  );
  renderOrganicStroke(
    context,
    createOrganicStroke({
      seed: derivePaintSeed(seed, "branch-body"),
      points: main,
      width: 52,
      opacity: 0.9,
      color: "#513b27",
      widthVariation: 0.22,
      edgeIrregularity: 0.46,
      colorVariation: 0.12,
      samplesPerSegment: 18,
    }),
  );
  renderOrganicStroke(
    context,
    createOrganicStroke({
      seed: derivePaintSeed(seed, "branch-light"),
      points: main.map((point) => ({ x: point.x, y: point.y - 9 })),
      width: 14,
      opacity: 0.48,
      color: "#a27a48",
      widthVariation: 0.4,
      edgeIrregularity: 0.55,
      samplesPerSegment: 18,
    }),
  );
  renderDryBrush(
    context,
    createDryBrush({
      seed: derivePaintSeed(seed, "branch-bark"),
      points: main,
      width: 44,
      opacity: 0.45,
      color: "#241a12",
      bristles: 13,
      gapRatio: 0.46,
      jitter: 0.4,
    }),
  );

  const twigs = [
    [
      { x: 330, y: 240 },
      { x: 300, y: 160 },
      { x: 270, y: 108 },
    ],
    [
      { x: 1250, y: 218 },
      { x: 1300, y: 130 },
      { x: 1340, y: 82 },
    ],
    [
      { x: 1610, y: 232 },
      { x: 1560, y: 150 },
      { x: 1510, y: 112 },
    ],
  ] as const;

  twigs.forEach((points, index) => {
    renderOrganicStroke(
      context,
      createOrganicStroke({
        seed: derivePaintSeed(seed, "twig", index),
        points,
        width: 10,
        opacity: 0.9,
        color: "#4b3625",
        widthVariation: 0.3,
        edgeIrregularity: 0.5,
      }),
    );
    paintLeafCluster(
      context,
      points[points.length - 1] as Vec2,
      64,
      44,
      ["#4f6749", "#6d7a50", "#8c8a58", "#a39860"],
      derivePaintSeed(seed, "branch-leaves", index),
      11,
      0.9,
      0.82,
    );
  });

  paintLeafCluster(
    context,
    { x: 90, y: 250 },
    120,
    82,
    ["#3e5940", "#566b46", "#748051"],
    derivePaintSeed(seed, "branch-left-leaves"),
    16,
    1,
    0.85,
  );
  paintLeafCluster(
    context,
    { x: 1930, y: 260 },
    130,
    90,
    ["#3e5940", "#566b46", "#748051"],
    derivePaintSeed(seed, "branch-right-leaves"),
    18,
    1,
    0.85,
  );

  renderPaperGrain(
    context,
    createPaperGrain({
      seed: derivePaintSeed(seed, "branch-paper"),
      width: canvas.width,
      height: canvas.height,
      density: 0.0005,
      minSize: 0.5,
      maxSize: 1.5,
      opacity: 0.5,
    }),
    0.7,
  );
}

function paintBird(canvas: HTMLCanvasElement, seed: number): void {
  const context = contextFor(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const palette = {
    ink: "#25353b",
    wing: "#39565a",
    wingLight: "#6f8980",
    body: "#d9b274",
    breast: "#c88d4c",
    cream: "#f1dfb8",
    beak: "#d2a158",
    dark: "#1b2425",
  };

  const rng = createSeededRandom(seed);

  context.save();
  try {
    // Tail feathers, painted before the body.
    const tailColors = ["#2d4347", "#3c5659", "#24373b"];
    for (let index = 0; index < 3; index += 1) {
      const spread = (index - 1) * 22;
      context.fillStyle = tailColors[index] as string;
      context.beginPath();
      context.moveTo(305, 310 + spread * 0.2);
      context.bezierCurveTo(240, 275 + spread, 165, 250 + spread, 105, 238 + spread);
      context.bezierCurveTo(170, 292 + spread, 220, 340 + spread * 0.7, 310, 354 + spread * 0.2);
      context.closePath();
      context.fill();
      context.strokeStyle = "#172728";
      context.globalAlpha = 0.4;
      context.lineWidth = 3;
      context.stroke();
      context.globalAlpha = 1;
    }

    // Far wing.
    const farWing = context.createLinearGradient(360, 100, 520, 330);
    farWing.addColorStop(0, palette.wingLight);
    farWing.addColorStop(0.5, palette.wing);
    farWing.addColorStop(1, palette.ink);
    context.fillStyle = farWing;
    context.beginPath();
    context.moveTo(390, 292);
    context.bezierCurveTo(430, 190, 520, 100, 585, 82);
    context.bezierCurveTo(570, 155, 545, 230, 505, 306);
    context.closePath();
    context.fill();

    // Legs and feet.
    for (const legX of [405, 455]) {
      renderOrganicStroke(
        context,
        createOrganicStroke({
          seed: derivePaintSeed(seed, "leg", legX),
          points: [
            { x: legX, y: 350 },
            { x: legX - 8, y: 430 },
            { x: legX - 15, y: 500 },
          ],
          width: 8,
          opacity: 0.9,
          color: "#6b4a2c",
          widthVariation: 0.18,
          edgeIrregularity: 0.35,
        }),
      );
      context.strokeStyle = "#4b331f";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(legX - 15, 500);
      context.lineTo(legX - 34, 508);
      context.moveTo(legX - 15, 500);
      context.lineTo(legX - 5, 514);
      context.stroke();
    }

    // Body silhouette.
    const bodyGradient = context.createLinearGradient(300, 250, 560, 360);
    bodyGradient.addColorStop(0, palette.cream);
    bodyGradient.addColorStop(0.5, palette.body);
    bodyGradient.addColorStop(1, palette.breast);
    context.fillStyle = bodyGradient;
    context.beginPath();
    context.moveTo(290, 300);
    context.bezierCurveTo(310, 240, 390, 218, 470, 230);
    context.bezierCurveTo(525, 236, 557, 254, 565, 288);
    context.bezierCurveTo(563, 330, 520, 366, 455, 378);
    context.bezierCurveTo(385, 390, 315, 356, 290, 300);
    context.closePath();
    context.fill();

    // Breast shading.
    context.save();
    context.globalAlpha = 0.7;
    context.fillStyle = palette.breast;
    context.beginPath();
    context.ellipse(430, 330, 95, 50, -0.1, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Head and cheek.
    const headGradient = context.createRadialGradient(505, 255, 10, 520, 275, 92);
    headGradient.addColorStop(0, palette.cream);
    headGradient.addColorStop(0.62, palette.body);
    headGradient.addColorStop(1, palette.breast);
    context.fillStyle = headGradient;
    context.beginPath();
    context.arc(518, 268, 66, 0, Math.PI * 2);
    context.fill();

    // Beak.
    context.fillStyle = palette.beak;
    context.beginPath();
    context.moveTo(568, 260);
    context.lineTo(648, 278);
    context.lineTo(568, 294);
    context.closePath();
    context.fill();
    context.fillStyle = "#9b6c36";
    context.beginPath();
    context.moveTo(568, 278);
    context.lineTo(630, 281);
    context.lineTo(568, 294);
    context.closePath();
    context.fill();
    context.strokeStyle = "#6c4b28";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(568, 280);
    context.lineTo(636, 280);
    context.stroke();

    // Eye.
    context.fillStyle = "#f6e9c9";
    context.beginPath();
    context.arc(538, 250, 20, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = palette.dark;
    context.beginPath();
    context.arc(542, 251, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f9f1dc";
    context.beginPath();
    context.arc(546, 246, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#6f4e2d";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(518, 268, 66, -0.5, 2.3);
    context.stroke();

    // Near wing with layered feather strokes.
    const wingGradient = context.createLinearGradient(320, 80, 470, 330);
    wingGradient.addColorStop(0, "#58736d");
    wingGradient.addColorStop(0.35, "#3f5c5d");
    wingGradient.addColorStop(1, "#23383d");
    context.fillStyle = wingGradient;
    context.beginPath();
    context.moveTo(338, 300);
    context.bezierCurveTo(285, 210, 250, 100, 302, 52);
    context.bezierCurveTo(360, 88, 442, 182, 470, 282);
    context.bezierCurveTo(440, 318, 388, 326, 338, 300);
    context.closePath();
    context.fill();

    const wingPoints = [
      { x: 326, y: 280 },
      { x: 302, y: 175 },
      { x: 330, y: 92 },
    ] as const;
    for (let index = 0; index < 7; index += 1) {
      const t = index / 6;
      const start = {
        x: 350 + t * 80,
        y: 292 - t * 34,
      };
      const end = {
        x: 328 + t * 92 + (rng() - 0.5) * 18,
        y: 74 + t * 92 + rng() * 30,
      };
      renderOrganicStroke(
        context,
        createOrganicStroke({
          seed: derivePaintSeed(seed, "wing-feather", index),
          points: [start, { x: (start.x + end.x) / 2 + 20, y: (start.y + end.y) / 2 }, end],
          width: 4 + rng() * 4,
          opacity: 0.32 + rng() * 0.25,
          color: index % 2 === 0 ? palette.wingLight : "#1a2b2e",
          widthVariation: 0.35,
          edgeIrregularity: 0.4,
        }),
      );
    }

    renderDryBrush(
      context,
      createDryBrush({
        seed: derivePaintSeed(seed, "wing-brush"),
        points: wingPoints,
        width: 72,
        opacity: 0.35,
        color: "#86a097",
        bristles: 10,
        gapRatio: 0.5,
        jitter: 0.35,
      }),
    );

    const bodyFeathers = [
      { x: 330, y: 300 },
      { x: 390, y: 280 },
      { x: 430, y: 255 },
      { x: 480, y: 285 },
    ] as const;
    bodyFeathers.forEach((point, index) => {
      renderOrganicStroke(
        context,
        createOrganicStroke({
          seed: derivePaintSeed(seed, "body-feather", index),
          points: [
            point,
            { x: point.x + 24, y: point.y + 12 },
            { x: point.x + 48, y: point.y + 4 },
          ],
          width: 3.5,
          opacity: 0.45,
          color: palette.cream,
          widthVariation: 0.3,
          edgeIrregularity: 0.3,
        }),
      );
    });

    // Soft contour accents keep the silhouette readable against foliage.
    context.globalAlpha = 0.32;
    context.strokeStyle = "#583d26";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(300, 316);
    context.bezierCurveTo(350, 374, 455, 392, 520, 342);
    context.stroke();

    context.globalAlpha = 1;
  } finally {
    context.restore();
  }

  // Grain applies only to painted pixels, preserving transparency elsewhere.
  context.save();
  try {
    context.globalCompositeOperation = "source-atop";
    renderPaperGrain(
      context,
      createPaperGrain({
        seed: derivePaintSeed(seed, "bird-paper"),
        width: canvas.width,
        height: canvas.height,
        density: 0.0008,
        minSize: 0.4,
        maxSize: 1.4,
        opacity: 0.45,
      }),
      0.8,
    );
  } finally {
    context.restore();
  }
}

/**
 * Creates the complete procedural benchmark art set. No external or AI imagery
 * is used. Every painted mark is derived from the supplied seed and stable
 * element identifiers.
 */
export function createWhereTheLightLandsAssets(seed: number): PaintedBenchmarkAssets {
  const forestDawn = createCanvas(
    BENCHMARK_ASSET_DIMENSIONS.forestDawn.width,
    BENCHMARK_ASSET_DIMENSIONS.forestDawn.height,
  );
  const forestDeep = createCanvas(
    BENCHMARK_ASSET_DIMENSIONS.forestDeep.width,
    BENCHMARK_ASSET_DIMENSIONS.forestDeep.height,
  );
  const branch = createCanvas(
    BENCHMARK_ASSET_DIMENSIONS.branch.width,
    BENCHMARK_ASSET_DIMENSIONS.branch.height,
  );
  const bird = createCanvas(
    BENCHMARK_ASSET_DIMENSIONS.bird.width,
    BENCHMARK_ASSET_DIMENSIONS.bird.height,
  );

  paintForest(forestDawn, DAWN_PALETTE, derivePaintSeed(seed, "forest-dawn"), "dawn");
  paintForest(forestDeep, DEEP_PALETTE, derivePaintSeed(seed, "forest-deep"), "deep");
  paintBranch(branch, derivePaintSeed(seed, "branch"));
  paintBird(bird, derivePaintSeed(seed, "bird"));

  return Object.freeze({ forestDawn, forestDeep, branch, bird });
}
