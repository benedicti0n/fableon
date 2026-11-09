import { createLandingSceneArt } from "@fableon/paint-engine";
import {
  createImportedCharacterRig,
  evaluateImportedCharacterRig,
  parseIllustrationPack,
  renderImportedCharacter,
  validateCharacterPreparation,
  validateRigCompatibility,
  type IllustrationPack,
} from "@fableon/illustration-pipeline";
import { transformPoint } from "@fableon/sprite-motion";

import manifestJson from "../../../public/assets/premium-bird-v1/manifest.json";
import {
  createPremiumBaseRig,
  PREMIUM_CONTACT_FRAME,
  PREMIUM_FRAME_COUNT,
  PREMIUM_FPS,
  premiumFootPoints,
} from "./premium-rig";

export const PREMIUM_SELECTED_FRAMES = [0, 4, 8, 16, 24, 30, 33, 38, 47] as const;

export interface PremiumBenchmark {
  readonly pack: IllustrationPack;
  readonly images: ReadonlyMap<string, CanvasImageSource>;
  readonly rig: ReturnType<typeof createImportedCharacterRig>;
  readonly scene: ReturnType<typeof createLandingSceneArt>;
  readonly compatibility: ReturnType<typeof validateRigCompatibility>;
  readonly preparation: ReturnType<typeof validateCharacterPreparation>;
  readonly timing: {
    readonly importMs: number;
    readonly decodeMs: number;
    readonly validationMs: number;
  };
}

export interface PremiumFrameCapture {
  readonly dataUrl: string;
  readonly debugDataUrl: string;
  readonly renderMs: number;
}

export interface PremiumDebugValidation {
  readonly pack: IllustrationPack;
  readonly packId: string;
  readonly parts: readonly {
    readonly id: string;
    readonly source: string;
    readonly originalSize: { readonly width: number; readonly height: number };
    readonly pivot: { readonly x: number; readonly y: number };
    readonly drawOrder: number;
    readonly parentId: string | null;
    readonly sourceHash: string;
  }[];
  readonly compatibilityReady: boolean;
  readonly compatibilityIssues: readonly {
    readonly code: string;
    readonly severity: string;
    readonly message: string;
  }[];
  readonly preparationReady: boolean;
  readonly missingPartIds: readonly string[];
  readonly timing: PremiumBenchmark["timing"];
  readonly nodeMappings: readonly {
    readonly nodeId: string;
    readonly partId: string;
    readonly parentId: string | null;
    readonly drawOrder: number;
    readonly pivot: { readonly x: number; readonly y: number };
    readonly drawOffsetX: number;
    readonly drawOffsetY: number;
  }[];
  readonly footLock: {
    readonly contact: {
      readonly left: { readonly x: number; readonly y: number };
      readonly right: { readonly x: number; readonly y: number };
    };
    readonly maxDrift: number;
    readonly locked: boolean;
  };
  readonly deterministic: boolean;
}

async function decodePartImage(url: string): Promise<CanvasImageSource> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load premium part "${url}" (HTTP ${response.status}).`);
  }
  const blob = await response.blob();
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createPremiumBenchmark(): Promise<PremiumBenchmark> {
  const importStarted = performance.now();
  const pack = parseIllustrationPack(manifestJson as unknown);
  const preparation = validateCharacterPreparation(pack);
  const images = new Map<string, CanvasImageSource>();
  let decodeMs = 0;

  for (const part of pack.parts) {
    const decodeStarted = performance.now();
    const image = await decodePartImage(`/assets/premium-bird-v1/${part.source}`);
    const width = "width" in image ? Number(image.width) : part.preparedSize.width;
    const height = "height" in image ? Number(image.height) : part.preparedSize.height;
    if (width !== part.preparedSize.width || height !== part.preparedSize.height) {
      throw new Error(
        `Premium part "${part.id}" decoded at ${width}x${height}; manifest expects ${part.preparedSize.width}x${part.preparedSize.height}.`,
      );
    }
    images.set(part.id, image);
    decodeMs += performance.now() - decodeStarted;
  }

  const rig = createImportedCharacterRig(createPremiumBaseRig(), pack, images);
  const compatibility = validateRigCompatibility(createPremiumBaseRig(), pack);
  const scene = createLandingSceneArt(20261109);
  const importMs = performance.now() - importStarted;

  return {
    pack,
    images,
    rig,
    scene,
    compatibility,
    preparation,
    timing: {
      importMs,
      decodeMs,
      validationMs: Math.max(0, importMs - decodeMs),
    },
  };
}

function contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D is required for the premium benchmark.");
  }
  return context;
}

function drawContactShadow(context: CanvasRenderingContext2D, frame: number): void {
  const ramp = Math.min(Math.max((frame - 20) / 10, 0), 1);
  const alpha = frame >= PREMIUM_CONTACT_FRAME ? 0.26 : ramp * 0.26;
  if (alpha <= 0) return;

  context.save();
  try {
    context.translate(935, 932);
    context.scale(1, 0.16);
    const shadow = context.createRadialGradient(0, 0, 8, 0, 0, 150);
    shadow.addColorStop(0, `rgba(12, 9, 6, ${alpha})`);
    shadow.addColorStop(0.65, `rgba(12, 9, 6, ${alpha * 0.4})`);
    shadow.addColorStop(1, "rgba(12, 9, 6, 0)");
    context.fillStyle = shadow;
    context.beginPath();
    context.arc(0, 0, 150, 0, Math.PI * 2);
    context.fill();
  } finally {
    context.restore();
  }
}

export function renderPremiumFrame(
  canvas: HTMLCanvasElement,
  frame: number,
  benchmark: PremiumBenchmark,
  options: { readonly hiddenNodeIds?: readonly string[] } = {},
): void {
  if (!Number.isInteger(frame) || frame < 0 || frame >= PREMIUM_FRAME_COUNT) {
    throw new Error(`Frame must be an integer from 0 to ${PREMIUM_FRAME_COUNT - 1}.`);
  }
  const context = contextFor(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(benchmark.scene.background, 0, 0);
  drawContactShadow(context, frame);
  renderImportedCharacter(context, frame, benchmark.rig, options);
}

export function renderPremiumDebugOverlay(
  canvas: HTMLCanvasElement,
  frame: number,
  benchmark: PremiumBenchmark,
  options: { readonly hiddenNodeIds?: readonly string[] } = {},
): void {
  const context = contextFor(canvas);
  const hidden = new Set(options.hiddenNodeIds ?? []);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const resolved = evaluateImportedCharacterRig(benchmark.rig, frame);
  const byId = new Map(resolved.map((node) => [node.id, node]));

  context.save();
  try {
    context.lineWidth = 1.5;
    context.font = "12px Menlo, monospace";
    context.textBaseline = "bottom";

    for (const node of resolved) {
      if (!node.visible || hidden.has(node.id)) continue;
      const part = benchmark.rig.partsByNodeId.get(node.id);
      if (!part) continue;

      const corners = [
        { x: part.drawOffsetX, y: part.drawOffsetY },
        { x: part.drawOffsetX + part.width, y: part.drawOffsetY },
        { x: part.drawOffsetX + part.width, y: part.drawOffsetY + part.height },
        { x: part.drawOffsetX, y: part.drawOffsetY + part.height },
      ].map((point) => transformPoint(node.world, point));

      context.strokeStyle = node.id === "body" ? "#f0cf98" : "#86c4c9";
      context.beginPath();
      corners.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.closePath();
      context.stroke();

      const pivot = transformPoint(node.world, node.pivot);
      context.strokeStyle = "#dfb168";
      context.beginPath();
      context.moveTo(pivot.x - 7, pivot.y);
      context.lineTo(pivot.x + 7, pivot.y);
      context.moveTo(pivot.x, pivot.y - 7);
      context.lineTo(pivot.x, pivot.y + 7);
      context.stroke();
      context.fillStyle = "#dfb168";
      context.beginPath();
      context.arc(pivot.x, pivot.y, 3, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#f8f5ed";
      context.fillText(`${node.id} · z${node.drawOrder}`, pivot.x + 8, pivot.y - 5);

      if (node.parentId) {
        const parent = byId.get(node.parentId);
        if (parent) {
          const parentPivot = transformPoint(parent.world, parent.pivot);
          context.strokeStyle = "rgba(134, 196, 201, 0.45)";
          context.setLineDash([4, 4]);
          context.beginPath();
          context.moveTo(parentPivot.x, parentPivot.y);
          context.lineTo(pivot.x, pivot.y);
          context.stroke();
          context.setLineDash([]);
        }
      }
    }
  } finally {
    context.restore();
  }
}

export function capturePremiumFrame(
  frame: number,
  benchmark: PremiumBenchmark,
  options: { readonly hiddenNodeIds?: readonly string[] } = {},
): PremiumFrameCapture {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const debug = document.createElement("canvas");
  debug.width = 1920;
  debug.height = 1080;

  const started = performance.now();
  renderPremiumFrame(canvas, frame, benchmark, options);
  const renderMs = performance.now() - started;
  renderPremiumDebugOverlay(debug, frame, benchmark, options);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    debugDataUrl: debug.toDataURL("image/png"),
    renderMs,
  };
}

function frameCanvas(
  frame: number,
  benchmark: PremiumBenchmark,
  options: { readonly hiddenNodeIds?: readonly string[] } = {},
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  renderPremiumFrame(canvas, frame, benchmark, options);
  return canvas;
}

export function capturePremiumContactSheet(benchmark: PremiumBenchmark): string {
  const columns = 3;
  const tileWidth = 560;
  const tileHeight = 315;
  const gap = 18;
  const margin = 24;
  const header = 82;
  const labelHeight = 48;
  const frames = PREMIUM_SELECTED_FRAMES;
  const rows = Math.ceil(frames.length / columns);
  const width = margin * 2 + columns * tileWidth + (columns - 1) * gap;
  const height = margin * 2 + header + rows * (tileHeight + labelHeight) + (rows - 1) * gap;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = contextFor(canvas);

  context.fillStyle = "#0b0d10";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#efe9db";
  context.font = "600 28px Georgia, serif";
  context.fillText("Phase 2.7 Gate 2 — imported candidate animation", margin, 44);
  context.fillStyle = "#9a978f";
  context.font = "13px Menlo, monospace";
  context.fillText(
    "NOT APPROVED ARTWORK · Fableon production Canvas renderer · diagnostic forest",
    margin,
    68,
  );

  frames.forEach((frame, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * (tileWidth + gap);
    const y = margin + header + row * (tileHeight + labelHeight + gap);
    context.drawImage(frameCanvas(frame, benchmark), x, y, tileWidth, tileHeight);
    context.strokeStyle = "#2a2f38";
    context.strokeRect(x + 0.5, y + 0.5, tileWidth - 1, tileHeight - 1);
    context.fillStyle = "#e7e3d7";
    context.font = "600 16px Georgia, serif";
    context.fillText(`Frame ${String(frame).padStart(3, "0")}`, x, y + tileHeight + 22);
    context.fillStyle = "#7f858d";
    context.font = "12px Menlo, monospace";
    context.fillText(
      `${(frame / PREMIUM_FPS).toFixed(3)}s · imported pack`,
      x,
      y + tileHeight + 38,
    );
  });

  return canvas.toDataURL("image/png");
}

export function capturePremiumPivotSheet(benchmark: PremiumBenchmark): string {
  const frames = [0, 24, 47];
  const tileWidth = 800;
  const tileHeight = 450;
  const gap = 18;
  const margin = 24;
  const header = 80;
  const labelHeight = 42;
  const width = margin * 2 + tileWidth * 3 + gap * 2;
  const height = margin * 2 + header + tileHeight + labelHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = contextFor(canvas);

  context.fillStyle = "#0b0d10";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#efe9db";
  context.font = "600 26px Georgia, serif";
  context.fillText("Phase 2.7 Gate 2 — pivot and hierarchy debug", margin, 42);
  context.fillStyle = "#9a978f";
  context.font = "12px Menlo, monospace";
  context.fillText("Bounding boxes, pivots, parent connections, IDs, and draw order", margin, 64);

  frames.forEach((frame, index) => {
    const x = margin + index * (tileWidth + gap);
    const y = margin + header;
    const production = frameCanvas(frame, benchmark);
    const debug = document.createElement("canvas");
    debug.width = 1920;
    debug.height = 1080;
    renderPremiumDebugOverlay(debug, frame, benchmark);
    context.drawImage(production, x, y, tileWidth, tileHeight);
    context.save();
    try {
      context.globalAlpha = 0.9;
      context.drawImage(debug, x, y, tileWidth, tileHeight);
    } finally {
      context.restore();
    }
    context.strokeStyle = "#2a2f38";
    context.strokeRect(x + 0.5, y + 0.5, tileWidth - 1, tileHeight - 1);
    context.fillStyle = "#e7e3d7";
    context.font = "600 16px Georgia, serif";
    context.fillText(
      `Frame ${String(frame).padStart(3, "0")} · debug overlay`,
      x,
      y + tileHeight + 20,
    );
  });

  return canvas.toDataURL("image/png");
}

function checkerboardTile(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const size = 12;
  for (let row = 0; row < height / size; row += 1) {
    for (let column = 0; column < width / size; column += 1) {
      context.fillStyle = (row + column) % 2 === 0 ? "#1b1f26" : "#12151a";
      context.fillRect(x + column * size, y + row * size, size, size);
    }
  }
}

export function captureEnvironmentPreview(benchmark: PremiumBenchmark): string {
  const canvas = document.createElement("canvas");
  canvas.width = benchmark.scene.width;
  canvas.height = benchmark.scene.height;
  const context = contextFor(canvas);
  context.drawImage(benchmark.scene.background, 0, 0);
  return canvas.toDataURL("image/png");
}

export function capturePremiumPartsSheet(benchmark: PremiumBenchmark): string {
  const columns = 3;
  const tileWidth = 420;
  const tileHeight = 300;
  const gap = 18;
  const margin = 24;
  const header = 82;
  const labelHeight = 50;
  const rows = Math.ceil(benchmark.pack.parts.length / columns);
  const width = margin * 2 + columns * tileWidth + (columns - 1) * gap;
  const height = margin * 2 + header + rows * (tileHeight + labelHeight) + (rows - 1) * gap;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = contextFor(canvas);

  context.fillStyle = "#0b0d10";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#efe9db";
  context.font = "600 28px Georgia, serif";
  context.fillText("Premium Bird v1 — source parts", margin, 44);
  context.fillStyle = "#9a978f";
  context.font = "13px Menlo, monospace";
  context.fillText(
    "Unmodified candidate sprites · canonical pack dimensions and pivots",
    margin,
    68,
  );

  benchmark.pack.parts.forEach((part, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * (tileWidth + gap);
    const y = margin + header + row * (tileHeight + labelHeight + gap);
    context.fillStyle = "#080a0b";
    context.fillRect(x, y, tileWidth, tileHeight);
    checkerboardTile(context, x, y, tileWidth, tileHeight);
    const image = benchmark.images.get(part.id);
    if (image) {
      const scale = Math.min(
        (tileWidth - 24) / part.preparedSize.width,
        (tileHeight - 24) / part.preparedSize.height,
      );
      const drawWidth = part.preparedSize.width * scale;
      const drawHeight = part.preparedSize.height * scale;
      context.drawImage(
        image,
        x + (tileWidth - drawWidth) / 2,
        y + (tileHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    }
    context.strokeStyle = "#2a2f38";
    context.strokeRect(x + 0.5, y + 0.5, tileWidth - 1, tileHeight - 1);
    context.fillStyle = "#e7e3d7";
    context.font = "600 16px Georgia, serif";
    context.fillText(part.id, x, y + tileHeight + 22);
    context.fillStyle = "#7f858d";
    context.font = "12px Menlo, monospace";
    context.fillText(
      `${part.preparedSize.width}×${part.preparedSize.height} · pivot ${part.pivot.x},${part.pivot.y} · z${part.zIndex}`,
      x,
      y + tileHeight + 40,
    );
  });

  return canvas.toDataURL("image/png");
}

export function capturePremiumValidation(benchmark: PremiumBenchmark): PremiumDebugValidation {
  const contact = premiumFootPoints(PREMIUM_CONTACT_FRAME);
  let maxDrift = 0;
  for (let frame = PREMIUM_CONTACT_FRAME; frame < PREMIUM_FRAME_COUNT; frame += 1) {
    const feet = premiumFootPoints(frame);
    maxDrift = Math.max(
      maxDrift,
      Math.abs(feet.left.x - contact.left.x),
      Math.abs(feet.left.y - contact.left.y),
      Math.abs(feet.right.x - contact.right.x),
      Math.abs(feet.right.y - contact.right.y),
    );
  }

  let deterministic = true;
  for (let frame = 0; frame < PREMIUM_FRAME_COUNT; frame += 1) {
    if (
      JSON.stringify(evaluateImportedCharacterRig(benchmark.rig, frame)) !==
      JSON.stringify(evaluateImportedCharacterRig(benchmark.rig, frame))
    ) {
      deterministic = false;
      break;
    }
  }

  return {
    pack: benchmark.pack,
    packId: benchmark.pack.id,
    parts: benchmark.pack.parts.map((part) => ({
      id: part.id,
      source: part.source,
      originalSize: part.originalSize,
      pivot: { x: part.pivot.x, y: part.pivot.y },
      drawOrder: part.zIndex,
      parentId: part.parentId,
      sourceHash: part.hashes?.source ?? "",
    })),
    compatibilityReady: benchmark.compatibility.ready,
    compatibilityIssues: benchmark.compatibility.issues.map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      message: issue.message,
    })),
    preparationReady: benchmark.preparation.ready,
    missingPartIds: benchmark.preparation.missingPartIds,
    timing: benchmark.timing,
    nodeMappings: benchmark.rig.rig.nodes.map((node) => {
      const part = benchmark.rig.partsByNodeId.get(node.id);
      return {
        nodeId: node.id,
        partId: part?.partId ?? "",
        parentId: node.parentId,
        drawOrder: node.drawOrder,
        pivot: { x: node.pivot.x, y: node.pivot.y },
        drawOffsetX: part?.drawOffsetX ?? 0,
        drawOffsetY: part?.drawOffsetY ?? 0,
      };
    }),
    footLock: {
      contact: {
        left: contact.left,
        right: contact.right,
      },
      maxDrift,
      locked: maxDrift < 1e-5,
    },
    deterministic,
  };
}
