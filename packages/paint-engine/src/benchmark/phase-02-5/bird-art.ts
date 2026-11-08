import { mixHexColors } from "../../color";
import type { Vec2 } from "../../geometry";
import { createSeededRandom, derivePaintSeed } from "../../random";
import {
  createDryBrush,
  createOrganicStroke,
  renderDryBrush,
  renderOrganicStroke,
} from "../../strokes";
import { createPaperGrain, renderPaperGrain } from "../../texture";

export const BIRD_PART_IDS = [
  "tail",
  "wingFar",
  "legLeft",
  "legRight",
  "body",
  "head",
  "beak",
  "eye",
  "wingNear",
] as const;

export type BirdPartId = (typeof BIRD_PART_IDS)[number];

export interface BirdPartArtwork {
  readonly id: BirdPartId;
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly pivot: Vec2;
}

export interface StorybookBirdArt {
  readonly parts: Readonly<Record<BirdPartId, BirdPartArtwork>>;
  readonly palette: {
    readonly body: string;
    readonly breast: string;
    readonly cream: string;
    readonly crown: string;
    readonly wing: string;
    readonly wingLight: string;
    readonly wingDark: string;
    readonly beak: string;
    readonly dark: string;
  };
}

export const BIRD_PART_PIVOTS = Object.freeze({
  tail: { x: 440, y: 108 },
  wingFar: { x: 418, y: 394 },
  legLeft: { x: 60, y: 20 },
  legRight: { x: 60, y: 20 },
  body: { x: 380, y: 300 },
  head: { x: 120, y: 245 },
  beak: { x: 8, y: 38 },
  eye: { x: 24, y: 24 },
  wingNear: { x: 418, y: 394 },
} as const satisfies Record<BirdPartId, Vec2>);

const PALETTE = {
  body: "#c48b4f",
  breast: "#d79c57",
  cream: "#f2dfb8",
  crown: "#4a3528",
  wing: "#39555d",
  wingLight: "#7e9993",
  wingDark: "#22383e",
  beak: "#d5a257",
  dark: "#241c16",
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
    throw new Error("A Canvas 2D context is required for bird artwork.");
  }
  return context;
}

function fillPath(
  context: CanvasRenderingContext2D,
  fill: string | CanvasGradient,
  build: (path: CanvasRenderingContext2D) => void,
): void {
  context.save();
  try {
    context.fillStyle = fill;
    context.beginPath();
    build(context);
    context.fill();
  } finally {
    context.restore();
  }
}

function applyGrain(
  canvas: HTMLCanvasElement,
  seed: number,
  options: { density?: number; opacity?: number } = {},
): void {
  const context = contextFor(canvas);
  context.save();
  try {
    context.globalCompositeOperation = "source-atop";
    renderPaperGrain(
      context,
      createPaperGrain({
        seed,
        width: canvas.width,
        height: canvas.height,
        density: options.density ?? 0.0007,
        minSize: 0.4,
        maxSize: 1.5,
        opacity: options.opacity ?? 0.5,
      }),
      0.75,
    );
  } finally {
    context.restore();
  }
}

function paintBody(canvas: HTMLCanvasElement, seed: number): void {
  const context = contextFor(canvas);
  const bodyPath = (path: CanvasRenderingContext2D) => {
    path.moveTo(160, 310);
    path.bezierCurveTo(170, 230, 230, 165, 325, 145);
    path.bezierCurveTo(415, 126, 505, 148, 568, 198);
    path.bezierCurveTo(628, 247, 640, 316, 600, 372);
    path.bezierCurveTo(550, 438, 448, 464, 350, 452);
    path.bezierCurveTo(252, 441, 180, 390, 160, 310);
    path.closePath();
  };

  const bodyGradient = context.createLinearGradient(160, 150, 610, 440);
  bodyGradient.addColorStop(0, "#7b5539");
  bodyGradient.addColorStop(0.36, PALETTE.body);
  bodyGradient.addColorStop(0.72, PALETTE.breast);
  bodyGradient.addColorStop(1, PALETTE.cream);
  fillPath(context, bodyGradient, bodyPath);

  // Warm belly and chest feather masses.
  context.save();
  try {
    context.globalAlpha = 0.75;
    context.fillStyle = PALETTE.cream;
    context.beginPath();
    context.ellipse(390, 365, 150, 82, -0.08, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.48;
    context.fillStyle = PALETTE.breast;
    context.beginPath();
    context.ellipse(515, 300, 105, 130, 0.1, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.36;
    context.fillStyle = PALETTE.crown;
    context.beginPath();
    context.ellipse(325, 215, 170, 82, -0.24, 0, Math.PI * 2);
    context.fill();
  } finally {
    context.restore();
  }

  // Soft under-wing shadow and back contour.
  context.save();
  try {
    context.globalAlpha = 0.25;
    context.fillStyle = "#291d16";
    context.beginPath();
    context.ellipse(430, 270, 145, 72, -0.08, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.24;
    context.fillStyle = "#5f4029";
    context.beginPath();
    context.ellipse(225, 338, 92, 70, 0.2, 0, Math.PI * 2);
    context.fill();
  } finally {
    context.restore();
  }

  // Broad flank/chest feather groups break up the large smooth belly.
  context.save();
  try {
    for (let index = 0; index < 4; index += 1) {
      context.globalAlpha = 0.16 + index * 0.035;
      context.fillStyle = index % 2 === 0 ? "#f7e8c9" : "#a96f3e";
      context.beginPath();
      context.ellipse(
        465 - index * 18,
        340 + index * 22,
        74 - index * 5,
        22,
        -0.18,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  } finally {
    context.restore();
  }

  const rng = createSeededRandom(seed);
  const featherSeeds: Vec2[][] = [
    [
      { x: 260, y: 245 },
      { x: 330, y: 230 },
      { x: 400, y: 245 },
    ],
    [
      { x: 290, y: 290 },
      { x: 365, y: 270 },
      { x: 445, y: 286 },
    ],
    [
      { x: 335, y: 335 },
      { x: 410, y: 316 },
      { x: 490, y: 328 },
    ],
    [
      { x: 350, y: 385 },
      { x: 425, y: 370 },
      { x: 505, y: 372 },
    ],
  ];

  featherSeeds.forEach((points, index) => {
    renderDryBrush(
      context,
      createDryBrush({
        seed: derivePaintSeed(seed, "body-feather", index),
        points,
        width: 6 + rng() * 5,
        opacity: 0.24,
        color: index < 2 ? "#5a3e2a" : "#f7e8c7",
        bristles: 5,
        gapRatio: 0.48,
        jitter: 0.2,
      }),
    );
  });

  // A few fine contour strokes, kept irregular and never a heavy outline.
  renderOrganicStroke(
    context,
    createOrganicStroke({
      seed: derivePaintSeed(seed, "body-contour"),
      points: [
        { x: 182, y: 330 },
        { x: 245, y: 404 },
        { x: 365, y: 444 },
      ],
      width: 3.5,
      opacity: 0.22,
      color: "#3b291e",
      widthVariation: 0.3,
      edgeIrregularity: 0.35,
    }),
  );

  applyGrain(canvas, derivePaintSeed(seed, "body-grain"));
}

function paintHead(canvas: HTMLCanvasElement, seed: number): void {
  const context = contextFor(canvas);
  const headPath = (path: CanvasRenderingContext2D) => {
    path.moveTo(62, 236);
    path.bezierCurveTo(46, 184, 82, 104, 148, 78);
    path.bezierCurveTo(218, 50, 298, 86, 318, 155);
    path.bezierCurveTo(337, 222, 298, 270, 232, 279);
    path.bezierCurveTo(174, 286, 108, 271, 62, 236);
    path.closePath();
  };

  const headGradient = context.createLinearGradient(90, 80, 305, 270);
  headGradient.addColorStop(0, PALETTE.crown);
  headGradient.addColorStop(0.28, "#8a5d39");
  headGradient.addColorStop(0.58, PALETTE.body);
  headGradient.addColorStop(1, PALETTE.cream);
  fillPath(context, headGradient, headPath);

  context.save();
  try {
    context.globalAlpha = 0.58;
    context.fillStyle = PALETTE.cream;
    context.beginPath();
    context.ellipse(238, 196, 65, 58, -0.14, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.38;
    context.fillStyle = PALETTE.breast;
    context.beginPath();
    context.ellipse(245, 254, 62, 36, 0.1, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.3;
    context.fillStyle = "#2d2118";
    context.beginPath();
    context.ellipse(152, 118, 97, 42, -0.3, 0, Math.PI * 2);
    context.fill();
  } finally {
    context.restore();
  }

  renderDryBrush(
    context,
    createDryBrush({
      seed: derivePaintSeed(seed, "head-crown-feathers"),
      points: [
        { x: 118, y: 100 },
        { x: 190, y: 81 },
        { x: 260, y: 106 },
      ],
      width: 9,
      opacity: 0.27,
      color: "#2f2118",
      bristles: 6,
      gapRatio: 0.42,
      jitter: 0.25,
    }),
  );

  applyGrain(canvas, derivePaintSeed(seed, "head-grain"), { density: 0.001 });
}

function paintBeak(canvas: HTMLCanvasElement, seed: number): void {
  const context = contextFor(canvas);
  const upper = context.createLinearGradient(0, 18, 118, 42);
  upper.addColorStop(0, "#f0cf88");
  upper.addColorStop(0.45, PALETTE.beak);
  upper.addColorStop(1, "#9d682f");
  fillPath(context, upper, (path) => {
    path.moveTo(8, 31);
    path.bezierCurveTo(35, 17, 80, 15, 125, 30);
    path.bezierCurveTo(88, 36, 42, 42, 8, 45);
    path.closePath();
  });

  fillPath(context, "#a46e35", (path) => {
    path.moveTo(12, 43);
    path.bezierCurveTo(46, 42, 88, 39, 119, 34);
    path.bezierCurveTo(84, 55, 38, 59, 12, 52);
    path.closePath();
  });

  context.save();
  try {
    context.strokeStyle = "#6f4a27";
    context.lineCap = "round";
    context.lineWidth = 2.2;
    context.globalAlpha = 0.55;
    context.beginPath();
    context.moveTo(20, 43);
    context.bezierCurveTo(54, 43, 88, 40, 112, 35);
    context.stroke();
    context.strokeStyle = "#f8e2b2";
    context.globalAlpha = 0.5;
    context.beginPath();
    context.moveTo(30, 24);
    context.bezierCurveTo(58, 20, 84, 21, 105, 27);
    context.stroke();
  } finally {
    context.restore();
  }

  applyGrain(canvas, derivePaintSeed(seed, "beak-grain"), { density: 0.002 });
}

function paintEye(canvas: HTMLCanvasElement, seed: number): void {
  const context = contextFor(canvas);
  const center = 24;

  context.save();
  try {
    context.fillStyle = "#f4e4c0";
    context.beginPath();
    context.arc(center, center, 18, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#9d7444";
    context.globalAlpha = 0.4;
    context.lineWidth = 1.5;
    context.stroke();

    const iris = context.createRadialGradient(27, 22, 2, center, center, 12);
    iris.addColorStop(0, "#dfb264");
    iris.addColorStop(0.65, "#8a602f");
    iris.addColorStop(1, "#3a291b");
    context.fillStyle = iris;
    context.beginPath();
    context.arc(center, center, 11, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#1a1511";
    context.beginPath();
    context.arc(24, 24, 6.2, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#fff5db";
    context.beginPath();
    context.arc(27, 20, 2.3, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.2;
    context.strokeStyle = "#6f4e2d";
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(center, center, 15.5, -2.2, 1.1);
    context.stroke();
  } finally {
    context.restore();
  }

  applyGrain(canvas, derivePaintSeed(seed, "eye-grain"), { density: 0.003 });
}

function paintWing(canvas: HTMLCanvasElement, seed: number, far: boolean): void {
  const context = contextFor(canvas);
  const ink = far ? "#1c3035" : PALETTE.wingDark;
  const mid = far ? "#344b50" : PALETTE.wing;
  const light = far ? "#5e7875" : PALETTE.wingLight;

  const wingGradient = context.createLinearGradient(240, 60, 430, 390);
  wingGradient.addColorStop(0, light);
  wingGradient.addColorStop(0.34, mid);
  wingGradient.addColorStop(1, ink);
  fillPath(context, wingGradient, (path) => {
    path.moveTo(418, 394);
    path.bezierCurveTo(384, 347, 362, 296, 358, 230);
    path.bezierCurveTo(352, 156, 318, 88, 248, 42);
    path.bezierCurveTo(226, 87, 226, 132, 244, 178);
    path.bezierCurveTo(214, 222, 212, 292, 238, 344);
    path.bezierCurveTo(268, 390, 338, 412, 418, 394);
    path.closePath();
  });

  // Feather groups, broad shapes first, then narrower overlays.
  const groups = [
    { offset: 0, color: mixHexColors(mid, ink, 0.2), width: 70 },
    { offset: 22, color: mixHexColors(mid, light, 0.12), width: 58 },
    { offset: 42, color: mixHexColors(ink, mid, 0.28), width: 54 },
    { offset: 60, color: mixHexColors(mid, light, 0.28), width: 42 },
  ] as const;

  groups.forEach((group, index) => {
    context.save();
    try {
      context.globalAlpha = far ? 0.72 : 0.8;
      context.fillStyle = group.color;
      context.beginPath();
      context.moveTo(405 - group.offset, 382);
      context.bezierCurveTo(
        350 - group.offset * 0.4,
        310,
        305 + group.offset * 0.1,
        185,
        254 + group.offset * 0.25,
        58 + group.offset * 0.35,
      );
      context.bezierCurveTo(
        278 + group.offset * 0.15,
        132,
        314 - group.offset * 0.1,
        248,
        338 - group.offset * 0.15,
        366,
      );
      context.closePath();
      context.fill();
      context.globalAlpha = 0.28;
      context.strokeStyle = index % 2 === 0 ? light : "#16292d";
      context.lineWidth = 2;
      context.stroke();
    } finally {
      context.restore();
    }
  });

  // Layered primary feathers with soft tips and light-catching edges.
  for (let index = 0; index < 4; index += 1) {
    const base = { x: 400 - index * 8, y: 365 - index * 3 };
    const tip = { x: 242 + index * 12, y: 54 + index * 18 };
    context.save();
    try {
      context.globalAlpha = far ? 0.42 : 0.55;
      context.fillStyle = mixHexColors(
        index % 2 === 0 ? mid : ink,
        index % 3 === 0 ? light : "#162b2f",
        0.18 + index * 0.05,
      );
      context.beginPath();
      context.moveTo(base.x, base.y);
      context.bezierCurveTo(345 - index * 7, 276, 290 + index * 4, 145 + index * 10, tip.x, tip.y);
      context.bezierCurveTo(tip.x + 18, tip.y + 58, 305 + index * 7, 280, base.x + 8, base.y);
      context.closePath();
      context.fill();
      context.globalAlpha = far ? 0.16 : 0.24;
      context.strokeStyle = light;
      context.lineWidth = 2.2;
      context.stroke();
    } finally {
      context.restore();
    }
  }

  renderDryBrush(
    context,
    createDryBrush({
      seed: derivePaintSeed(seed, far ? "wing-far-feathers" : "wing-near-feathers"),
      points: [
        { x: 386, y: 365 },
        { x: 330, y: 260 },
        { x: 270, y: 92 },
      ],
      width: 54,
      opacity: far ? 0.24 : 0.32,
      color: light,
      bristles: far ? 7 : 10,
      gapRatio: 0.5,
      jitter: 0.28,
    }),
  );

  // Small covert feathers at the shoulder.
  context.save();
  try {
    context.globalAlpha = far ? 0.55 : 0.72;
    for (let index = 0; index < 4; index += 1) {
      context.fillStyle = mixHexColors(mid, light, 0.1 + index * 0.05);
      context.beginPath();
      context.ellipse(389 - index * 15, 350 - index * 8, 30 - index * 3, 12, -0.6, 0, Math.PI * 2);
      context.fill();
    }
  } finally {
    context.restore();
  }

  applyGrain(canvas, derivePaintSeed(seed, far ? "wing-far-grain" : "wing-near-grain"), {
    density: 0.0012,
  });
}

function paintTail(canvas: HTMLCanvasElement, seed: number): void {
  const context = contextFor(canvas);

  const feathers = [
    { end: { x: 36, y: 84 }, width: 48, color: "#405d5f" },
    { end: { x: 32, y: 112 }, width: 54, color: "#334b51" },
    { end: { x: 45, y: 142 }, width: 46, color: "#6c5a45" },
    { end: { x: 78, y: 168 }, width: 38, color: "#8a6b4c" },
  ] as const;

  feathers.forEach((feather, index) => {
    const gradient = context.createLinearGradient(420, 100, feather.end.x, feather.end.y);
    gradient.addColorStop(0, mixHexColors(feather.color, "#c1955c", 0.18));
    gradient.addColorStop(0.55, feather.color);
    gradient.addColorStop(1, mixHexColors(feather.color, "#15262a", 0.4));

    fillPath(context, gradient, (path) => {
      path.moveTo(440, 92 + index * 8);
      path.bezierCurveTo(320, 50 + index * 18, 180, 55 + index * 26, feather.end.x, feather.end.y);
      path.bezierCurveTo(
        160,
        feather.end.y + feather.width * 0.55,
        300,
        128 + index * 20,
        437,
        128 + index * 11,
      );
      path.closePath();
    });
  });

  renderDryBrush(
    context,
    createDryBrush({
      seed: derivePaintSeed(seed, "tail-feathers"),
      points: [
        { x: 385, y: 106 },
        { x: 230, y: 110 },
        { x: 100, y: 132 },
      ],
      width: 54,
      opacity: 0.24,
      color: "#a6a889",
      bristles: 8,
      gapRatio: 0.5,
      jitter: 0.3,
    }),
  );

  applyGrain(canvas, derivePaintSeed(seed, "tail-grain"), { density: 0.001 });
}

function paintLeg(canvas: HTMLCanvasElement, seed: number, side: "left" | "right"): void {
  const context = contextFor(canvas);
  const flip = side === "left" ? -1 : 1;
  const legPoints = [
    { x: 60, y: 20 },
    { x: 57 + flip * 2, y: 105 },
    { x: 54 + flip * 4, y: 196 },
  ] as const;

  renderOrganicStroke(
    context,
    createOrganicStroke({
      seed: derivePaintSeed(seed, "leg", side),
      points: legPoints,
      width: 9,
      opacity: 0.95,
      color: "#9a6a3f",
      widthVariation: 0.12,
      edgeIrregularity: 0.25,
      colorVariation: 0.1,
    }),
  );

  context.save();
  try {
    context.strokeStyle = "#7a512f";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(54 + flip * 4, 194);
    context.lineTo(26 + flip * 3, 216);
    context.moveTo(54 + flip * 4, 194);
    context.lineTo(55 + flip * 2, 228);
    context.moveTo(54 + flip * 4, 194);
    context.lineTo(86 + flip * 2, 214);
    context.stroke();

    context.lineWidth = 1.7;
    context.strokeStyle = "#4d3422";
    context.globalAlpha = 0.6;
    context.beginPath();
    context.moveTo(30 + flip * 3, 218);
    context.lineTo(24 + flip * 3, 225);
    context.moveTo(90 + flip * 2, 216);
    context.lineTo(95 + flip * 2, 223);
    context.stroke();
  } finally {
    context.restore();
  }

  applyGrain(canvas, derivePaintSeed(seed, "leg-grain", side), { density: 0.0015 });
}

function part(id: BirdPartId, canvas: HTMLCanvasElement, pivot: Vec2): BirdPartArtwork {
  return Object.freeze({
    id,
    canvas,
    width: canvas.width,
    height: canvas.height,
    pivot: Object.freeze(pivot),
  });
}

/**
 * Creates the master layered bird artwork. Every part is a transparent canvas
 * generated from stable, seeded paint code; the same parts are reused for every
 * pose and animation frame.
 */
export function createStorybookBirdArt(seed = 20261109): StorybookBirdArt {
  const body = createCanvas(760, 520);
  const head = createCanvas(360, 300);
  const beak = createCanvas(140, 78);
  const eye = createCanvas(48, 48);
  const wingNear = createCanvas(500, 480);
  const wingFar = createCanvas(500, 480);
  const tail = createCanvas(500, 240);
  const legLeft = createCanvas(120, 250);
  const legRight = createCanvas(120, 250);

  paintBody(body, derivePaintSeed(seed, "bird", "body"));
  paintHead(head, derivePaintSeed(seed, "bird", "head"));
  paintBeak(beak, derivePaintSeed(seed, "bird", "beak"));
  paintEye(eye, derivePaintSeed(seed, "bird", "eye"));
  paintWing(wingNear, derivePaintSeed(seed, "bird", "wing-near"), false);
  paintWing(wingFar, derivePaintSeed(seed, "bird", "wing-far"), true);
  paintTail(tail, derivePaintSeed(seed, "bird", "tail"));
  paintLeg(legLeft, derivePaintSeed(seed, "bird", "leg-left"), "left");
  paintLeg(legRight, derivePaintSeed(seed, "bird", "leg-right"), "right");

  return Object.freeze({
    parts: Object.freeze({
      tail: part("tail", tail, BIRD_PART_PIVOTS.tail),
      wingFar: part("wingFar", wingFar, BIRD_PART_PIVOTS.wingFar),
      legLeft: part("legLeft", legLeft, BIRD_PART_PIVOTS.legLeft),
      legRight: part("legRight", legRight, BIRD_PART_PIVOTS.legRight),
      body: part("body", body, BIRD_PART_PIVOTS.body),
      head: part("head", head, BIRD_PART_PIVOTS.head),
      beak: part("beak", beak, BIRD_PART_PIVOTS.beak),
      eye: part("eye", eye, BIRD_PART_PIVOTS.eye),
      wingNear: part("wingNear", wingNear, BIRD_PART_PIVOTS.wingNear),
    }),
    palette: PALETTE,
  });
}
