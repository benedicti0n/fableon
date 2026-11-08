import { mixHexColors } from "../../color";
import type { Vec2 } from "../../geometry";
import { createSeededRandom, derivePaintSeed } from "../../random";
import {
  createDryBrush,
  createOrganicStroke,
  createWash,
  renderDryBrush,
  renderOrganicStroke,
  renderWash,
} from "../../strokes";
import { createPaperGrain, renderPaperGrain } from "../../texture";

export interface LandingSceneArt {
  readonly background: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
}

const PALETTE = {
  skyTop: "#13231f",
  skyMid: "#50604a",
  skyHorizon: "#c7a66b",
  sun: "#f3dca8",
  distant: "#354b3d",
  mid: "#263b2d",
  dark: "#101d16",
  foliage: ["#3d5841", "#5f704e", "#829065", "#a99d68"],
  branch: "#5c432c",
  branchLight: "#9c7447",
  branchDark: "#2d2117",
} as const;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("A 2D context is required for the landing scene.");
  }
  return context;
}

function paintLeafShape(
  context: CanvasRenderingContext2D,
  base: Vec2,
  angle: number,
  length: number,
  width: number,
  color: string,
  alpha: number,
): void {
  const tip = {
    x: base.x + Math.cos(angle) * length,
    y: base.y + Math.sin(angle) * length,
  };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const controlA = {
    x: base.x + Math.cos(angle) * length * 0.48 + normal.x * width * 0.72,
    y: base.y + Math.sin(angle) * length * 0.48 + normal.y * width * 0.72,
  };
  const controlB = {
    x: base.x + Math.cos(angle) * length * 0.48 - normal.x * width * 0.72,
    y: base.y + Math.sin(angle) * length * 0.48 - normal.y * width * 0.72,
  };

  context.save();
  try {
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(base.x, base.y);
    context.quadraticCurveTo(controlA.x, controlA.y, tip.x, tip.y);
    context.quadraticCurveTo(controlB.x, controlB.y, base.x, base.y);
    context.closePath();
    context.fill();

    context.globalAlpha = alpha * 0.35;
    context.strokeStyle = mixHexColors(color, "#f0dfb9", 0.42);
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(base.x, base.y);
    context.quadraticCurveTo(
      (controlA.x + controlB.x) / 2,
      (controlA.y + controlB.y) / 2,
      tip.x,
      tip.y,
    );
    context.stroke();
  } finally {
    context.restore();
  }
}

function paintLeafCluster(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radiusX: number,
  radiusY: number,
  count: number,
  seed: number,
  opacity = 0.8,
): void {
  const rng = createSeededRandom(seed);
  const wash = createWash({
    seed: derivePaintSeed(seed, "mass"),
    center,
    radiusX,
    radiusY,
    color: PALETTE.mid,
    opacity: opacity * 0.36,
    lobes: 3,
    irregularity: 0.38,
    granulation: 0.1,
  });
  renderWash(context, wash);

  for (let index = 0; index < count; index += 1) {
    const angle = rng() * Math.PI * 2;
    const radial = Math.sqrt(rng());
    const base = {
      x: center.x + Math.cos(angle) * radiusX * radial,
      y: center.y + Math.sin(angle) * radiusY * radial,
    };
    const leafAngle = angle + (rng() - 0.5) * 1.2;
    const length = 26 + rng() * 52;
    const width = 8 + rng() * 14;
    const color = PALETTE.foliage[Math.floor(rng() * PALETTE.foliage.length)] as string;
    paintLeafShape(context, base, leafAngle, length, width, color, opacity * (0.55 + rng() * 0.4));
  }
}

function paintSoftCanopy(
  context: CanvasRenderingContext2D,
  center: Vec2,
  radiusX: number,
  radiusY: number,
  seed: number,
  opacity: number,
): void {
  context.save();
  try {
    context.filter = "blur(18px)";
    const wash = createWash({
      seed,
      center,
      radiusX,
      radiusY,
      color: PALETTE.distant,
      opacity,
      lobes: 4,
      irregularity: 0.45,
      granulation: 0.03,
    });
    renderWash(context, wash);
  } finally {
    context.restore();
  }

  paintLeafCluster(
    context,
    center,
    radiusX * 0.85,
    radiusY * 0.8,
    Math.max(7, Math.round(radiusX / 42)),
    derivePaintSeed(seed, "leaves"),
    opacity * 1.5,
  );
}

function paintTrunk(
  context: CanvasRenderingContext2D,
  x: number,
  width: number,
  yTop: number,
  yBottom: number,
  lean: number,
  seed: number,
  dark: boolean,
): void {
  const gradient = context.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
  const base = dark ? "#0c1712" : PALETTE.mid;
  gradient.addColorStop(0, mixHexColors(base, "#050a07", 0.25));
  gradient.addColorStop(0.5, mixHexColors(base, PALETTE.skyHorizon, dark ? 0.08 : 0.16));
  gradient.addColorStop(1, mixHexColors(base, "#050a07", 0.45));

  context.save();
  try {
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(x - width / 2, yBottom);
    context.bezierCurveTo(
      x - width * 0.45,
      yBottom - (yBottom - yTop) * 0.35,
      x + lean - width * 0.25,
      yTop + (yBottom - yTop) * 0.25,
      x + lean - width * 0.12,
      yTop,
    );
    context.lineTo(x + lean + width * 0.12, yTop);
    context.bezierCurveTo(
      x + lean + width * 0.34,
      yTop + (yBottom - yTop) * 0.32,
      x + width * 0.44,
      yBottom - (yBottom - yTop) * 0.24,
      x + width / 2,
      yBottom,
    );
    context.closePath();
    context.fill();
  } finally {
    context.restore();
  }

  const barkPath: Vec2[] = [];
  for (let index = 0; index < 8; index += 1) {
    const t = index / 7;
    barkPath.push({
      x: x + lean * t,
      y: yBottom - (yBottom - yTop) * t,
    });
  }

  renderDryBrush(
    context,
    createDryBrush({
      seed: derivePaintSeed(seed, "bark-dark"),
      points: barkPath,
      width: width * 0.6,
      opacity: dark ? 0.25 : 0.2,
      color: "#1a1510",
      bristles: 7,
      gapRatio: 0.52,
      jitter: 0.2,
    }),
  );
  renderDryBrush(
    context,
    createDryBrush({
      seed: derivePaintSeed(seed, "bark-light"),
      points: barkPath.map((point) => ({
        x: point.x - width * 0.18,
        y: point.y,
      })),
      width: width * 0.16,
      opacity: 0.18,
      color: mixHexColors(PALETTE.branchLight, PALETTE.skyHorizon, 0.3),
      bristles: 4,
      gapRatio: 0.55,
      jitter: 0.2,
    }),
  );
}

function paintBranch(context: CanvasRenderingContext2D, seed: number): void {
  const top = 930;
  const path = (ctx: CanvasRenderingContext2D) => {
    ctx.moveTo(-30, top + 38);
    ctx.bezierCurveTo(360, top - 10, 690, top + 20, 980, top);
    ctx.bezierCurveTo(1240, top + 12, 1580, top - 38, 1950, top - 8);
    ctx.bezierCurveTo(1910, top + 36, 1600, top + 64, 1320, top + 48);
    ctx.bezierCurveTo(1020, top + 30, 630, top + 58, 300, top + 78);
    ctx.bezierCurveTo(120, top + 88, -10, top + 78, -30, top + 38);
    ctx.closePath();
  };

  const gradient = context.createLinearGradient(0, top - 30, 0, top + 84);
  gradient.addColorStop(0, PALETTE.branchLight);
  gradient.addColorStop(0.35, PALETTE.branch);
  gradient.addColorStop(1, PALETTE.branchDark);
  context.save();
  try {
    context.fillStyle = gradient;
    context.beginPath();
    path(context);
    context.fill();

    context.globalAlpha = 0.32;
    context.fillStyle = "#12160f";
    context.beginPath();
    context.moveTo(0, top + 50);
    context.bezierCurveTo(480, top + 38, 1070, top + 40, 1920, top + 26);
    context.lineTo(1920, top + 64);
    context.bezierCurveTo(1180, top + 76, 430, top + 68, 0, top + 84);
    context.closePath();
    context.fill();
  } finally {
    context.restore();
  }

  // A small twig and leaf group at each end, leaving a clear landing area.
  const twigs = [
    [
      { x: 270, y: top + 34 },
      { x: 220, y: top - 20 },
      { x: 180, y: top - 62 },
    ],
    [
      { x: 1630, y: top + 26 },
      { x: 1680, y: top - 40 },
      { x: 1730, y: top - 78 },
    ],
    [
      { x: 1180, y: top + 26 },
      { x: 1230, y: top - 42 },
      { x: 1280, y: top - 82 },
    ],
  ] as const;

  twigs.forEach((points, index) => {
    renderOrganicStroke(
      context,
      createOrganicStroke({
        seed: derivePaintSeed(seed, "twig", index),
        points,
        width: 7,
        opacity: 0.75,
        color: PALETTE.branch,
        widthVariation: 0.25,
        edgeIrregularity: 0.35,
      }),
    );
    paintLeafCluster(
      context,
      points[points.length - 1] as Vec2,
      84,
      58,
      8,
      derivePaintSeed(seed, "branch-leaf", index),
      0.8,
    );
  });

  renderDryBrush(
    context,
    createDryBrush({
      seed: derivePaintSeed(seed, "branch-bark"),
      points: [
        { x: 80, y: top + 24 },
        { x: 620, y: top + 18 },
        { x: 1420, y: top + 14 },
        { x: 1880, y: top + 30 },
      ],
      width: 28,
      opacity: 0.32,
      color: "#241810",
      bristles: 10,
      gapRatio: 0.55,
      jitter: 0.25,
    }),
  );
}

function paintLight(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  try {
    context.globalCompositeOperation = "screen";
    const glow = context.createRadialGradient(1540, 240, 30, 1540, 240, 680);
    glow.addColorStop(0, "rgba(255, 239, 193, 0.35)");
    glow.addColorStop(0.42, "rgba(238, 205, 140, 0.12)");
    glow.addColorStop(1, "rgba(238, 205, 140, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.filter = "blur(28px)";
    const shaft = context.createLinearGradient(1540, 210, 720, 1040);
    shaft.addColorStop(0, "rgba(255, 241, 198, 0.22)");
    shaft.addColorStop(0.55, "rgba(240, 207, 141, 0.08)");
    shaft.addColorStop(1, "rgba(240, 207, 141, 0)");
    context.fillStyle = shaft;
    context.beginPath();
    context.moveTo(1430, 190);
    context.lineTo(1660, 190);
    context.lineTo(1040, 1080);
    context.lineTo(450, 1080);
    context.closePath();
    context.fill();
  } finally {
    context.restore();
  }
}

export function createLandingSceneArt(seed = 20261109): LandingSceneArt {
  const width = 1920;
  const height = 1080;
  const canvas = createCanvas(width, height);
  const context = contextFor(canvas);

  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.42, PALETTE.skyMid);
  sky.addColorStop(0.72, "#777a53");
  sky.addColorStop(1, PALETTE.skyHorizon);
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.save();
  try {
    const sun = context.createRadialGradient(1540, 240, 10, 1540, 240, 190);
    sun.addColorStop(0, "rgba(255, 244, 208, 0.95)");
    sun.addColorStop(0.38, "rgba(244, 213, 151, 0.35)");
    sun.addColorStop(1, "rgba(244, 213, 151, 0)");
    context.fillStyle = sun;
    context.fillRect(1210, 0, 700, 620);
  } finally {
    context.restore();
  }

  paintSoftCanopy(context, { x: 210, y: 120 }, 330, 180, derivePaintSeed(seed, "canopy-left"), 0.5);
  paintSoftCanopy(
    context,
    { x: 1720, y: 160 },
    340,
    210,
    derivePaintSeed(seed, "canopy-right"),
    0.56,
  );
  paintSoftCanopy(context, { x: 950, y: 95 }, 280, 150, derivePaintSeed(seed, "canopy-top"), 0.32);

  paintTrunk(context, 120, 90, 90, 1080, 16, derivePaintSeed(seed, "trunk-left"), true);
  paintTrunk(context, 1820, 70, 110, 1080, -20, derivePaintSeed(seed, "trunk-right"), true);
  paintTrunk(context, 1620, 34, 220, 1080, -6, derivePaintSeed(seed, "trunk-mid"), false);

  paintLeafCluster(
    context,
    { x: 120, y: 220 },
    150,
    150,
    10,
    derivePaintSeed(seed, "left-leaves"),
    0.7,
  );
  paintLeafCluster(
    context,
    { x: 1770, y: 300 },
    140,
    150,
    10,
    derivePaintSeed(seed, "right-leaves"),
    0.7,
  );

  paintLight(context, width, height);
  paintBranch(context, derivePaintSeed(seed, "branch"));

  // Soft foreground framing masses, kept large and sparse.
  paintLeafCluster(
    context,
    { x: 55, y: 1040 },
    250,
    140,
    8,
    derivePaintSeed(seed, "foreground-left"),
    0.9,
  );
  paintLeafCluster(
    context,
    { x: 1870, y: 1020 },
    230,
    150,
    8,
    derivePaintSeed(seed, "foreground-right"),
    0.9,
  );

  renderPaperGrain(
    context,
    createPaperGrain({
      seed: derivePaintSeed(seed, "paper"),
      width,
      height,
      density: 0.00055,
      minSize: 0.4,
      maxSize: 1.7,
      opacity: 0.65,
    }),
    0.75,
  );

  return Object.freeze({ background: canvas, width, height });
}
