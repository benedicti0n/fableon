import {
  BIRD_FOOT_LOCAL,
  evaluateLandingRig,
  LANDING_FPS,
  LANDING_FRAME_COUNT,
  renderLandingFrame,
} from "@fableon/paint-engine";
import {
  evaluateImportedCharacterRig,
  renderImportedCharacter,
  renderEnvironmentPack,
  type IllustrationPart,
} from "@fableon/illustration-pipeline";
import { evaluateSpriteRig, transformPoint } from "@fableon/sprite-motion";

import {
  comparePixels,
  type DiagnosticBenchmark,
  type PixelDifferenceMetrics,
} from "./diagnostic-pack";

export const SELECTED_FRAMES = [0, 8, 16, 24, 30, 38, 47] as const;

export interface FrameCapture {
  readonly importedDataUrl: string;
  readonly baselineDataUrl: string;
  readonly importedRenderMs: number;
  readonly baselineRenderMs: number;
}

export interface FidelityComparison {
  readonly dataUrl: string;
  readonly frameMetrics: Readonly<Record<number, PixelDifferenceMetrics>>;
  readonly frame47MeanAbsoluteError: number;
}

export interface RigValidation {
  readonly adaptedDrawOrder: readonly string[];
  readonly nodePartIds: Readonly<Record<string, string>>;
  readonly pivotMappings: readonly {
    readonly nodeId: string;
    readonly partId: string;
    readonly basePivot: { readonly x: number; readonly y: number };
    readonly importedPivot: { readonly x: number; readonly y: number };
    readonly drawOffsetX: number;
    readonly drawOffsetY: number;
  }[];
  readonly footContact: {
    readonly frame: number;
    readonly left: { readonly x: number; readonly y: number };
    readonly right: { readonly x: number; readonly y: number };
    readonly maxDrift: number;
    readonly locked: boolean;
  };
  readonly determinism: {
    readonly framesChecked: number;
    readonly allRepeatedEvaluationsEqual: boolean;
  };
  readonly compatibility: DiagnosticBenchmark["rigCompatibility"];
}

export interface DiagnosticValidationReport {
  readonly diagnostic: true;
  readonly artworkStatus: "diagnostic-not-artistic-validation";
  readonly premiumArtworkBlocked: true;
  readonly seed: number;
  readonly characterPack: DiagnosticBenchmark["characterPack"];
  readonly environmentPack: DiagnosticBenchmark["environmentPack"];
  readonly characterPreparation: DiagnosticBenchmark["characterPreparation"];
  readonly environmentPreparation: DiagnosticBenchmark["environmentPreparation"];
  readonly rigCompatibility: DiagnosticBenchmark["rigCompatibility"];
  readonly parts: DiagnosticBenchmark["parts"];
  readonly environmentDifference: PixelDifferenceMetrics;
  readonly timing: DiagnosticBenchmark["timing"];
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D is required for the Phase 2.6 benchmark.");
  }
  return context;
}

function drawContactShadow(context: CanvasRenderingContext2D, frame: number): void {
  const ramp = Math.min(Math.max((frame - 20) / 10, 0), 1);
  const alpha = frame >= 30 ? 0.3 : ramp * 0.3;
  if (alpha <= 0) return;

  context.save();
  try {
    context.translate(965, 932);
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

export function renderImportedFrame(
  canvas: HTMLCanvasElement,
  frame: number,
  diagnostic: DiagnosticBenchmark,
): void {
  const context = contextFor(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  renderEnvironmentPack(context, diagnostic.environmentPack, diagnostic.environmentImages);
  drawContactShadow(context, frame);
  renderImportedCharacter(context, frame, diagnostic.importedRig);
}

export function renderBaselineFrame(
  canvas: HTMLCanvasElement,
  frame: number,
  diagnostic: DiagnosticBenchmark,
): void {
  const context = contextFor(canvas);
  renderLandingFrame(context, frame, {
    scene: diagnostic.scene,
    bird: diagnostic.bird,
    rig: diagnostic.baseRig,
  });
}

export function renderSourceCharacter(diagnostic: DiagnosticBenchmark): HTMLCanvasElement {
  const canvas = createCanvas(diagnostic.scene.width, diagnostic.scene.height);
  const context = contextFor(canvas);
  const resolved = evaluateSpriteRig(diagnostic.neutralRig, 0);
  for (const node of resolved) {
    const part = diagnostic.bird.parts[node.id as keyof typeof diagnostic.bird.parts];
    if (!part) continue;
    context.save();
    try {
      context.setTransform(
        node.world.a,
        node.world.b,
        node.world.c,
        node.world.d,
        node.world.e,
        node.world.f,
      );
      context.drawImage(part.canvas, 0, 0);
    } finally {
      context.restore();
    }
  }
  return canvas;
}

export function composePreparedCharacter(diagnostic: DiagnosticBenchmark): HTMLCanvasElement {
  const canvas = createCanvas(diagnostic.scene.width, diagnostic.scene.height);
  const context = contextFor(canvas);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  const ordered = [...diagnostic.characterPack.parts].sort(
    (left, right) => left.zIndex - right.zIndex,
  );
  for (const part of ordered) {
    const image = diagnostic.characterImages.get(part.id);
    if (!image) continue;
    context.drawImage(
      image,
      diagnostic.packOrigin.x + part.registration.x + part.preparedOffset.x,
      diagnostic.packOrigin.y + part.registration.y + part.preparedOffset.y,
      part.preparedSize.width,
      part.preparedSize.height,
    );
  }
  return canvas;
}

const captureSurfaceCache = new WeakMap<
  DiagnosticBenchmark,
  { readonly imported: HTMLCanvasElement; readonly baseline: HTMLCanvasElement }
>();

function captureSurfaces(diagnostic: DiagnosticBenchmark): {
  readonly imported: HTMLCanvasElement;
  readonly baseline: HTMLCanvasElement;
} {
  const cached = captureSurfaceCache.get(diagnostic);
  if (cached) return cached;
  const surfaces = {
    imported: createCanvas(diagnostic.scene.width, diagnostic.scene.height),
    baseline: createCanvas(diagnostic.scene.width, diagnostic.scene.height),
  };
  captureSurfaceCache.set(diagnostic, surfaces);
  return surfaces;
}

function frameDataUrl(
  frame: number,
  diagnostic: DiagnosticBenchmark,
  mode: "imported" | "baseline",
): { readonly dataUrl: string; readonly renderMs: number } {
  const surfaces = captureSurfaces(diagnostic);
  const canvas = mode === "imported" ? surfaces.imported : surfaces.baseline;
  const started = performance.now();
  if (mode === "imported") renderImportedFrame(canvas, frame, diagnostic);
  else renderBaselineFrame(canvas, frame, diagnostic);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    renderMs: performance.now() - started,
  };
}

export interface RenderBreakdown {
  readonly environmentMs: number;
  readonly shadowMs: number;
  readonly characterMs: number;
  readonly baselineMs: number;
}

export function measureRenderBreakdown(diagnostic: DiagnosticBenchmark): RenderBreakdown {
  const canvas = createCanvas(diagnostic.scene.width, diagnostic.scene.height);
  const context = contextFor(canvas);

  const environmentStarted = performance.now();
  renderEnvironmentPack(context, diagnostic.environmentPack, diagnostic.environmentImages);
  const environmentMs = performance.now() - environmentStarted;

  const shadowStarted = performance.now();
  drawContactShadow(context, 24);
  const shadowMs = performance.now() - shadowStarted;

  const characterStarted = performance.now();
  renderImportedCharacter(context, 24, diagnostic.importedRig);
  const characterMs = performance.now() - characterStarted;

  const baselineCanvas = createCanvas(diagnostic.scene.width, diagnostic.scene.height);
  const baselineStarted = performance.now();
  renderBaselineFrame(baselineCanvas, 24, diagnostic);
  const baselineMs = performance.now() - baselineStarted;

  return { environmentMs, shadowMs, characterMs, baselineMs };
}

export function captureFrame(frame: number, diagnostic: DiagnosticBenchmark): FrameCapture {
  if (!Number.isInteger(frame) || frame < 0 || frame >= LANDING_FRAME_COUNT) {
    throw new Error(`Frame must be an integer from 0 to ${LANDING_FRAME_COUNT - 1}.`);
  }
  const imported = frameDataUrl(frame, diagnostic, "imported");
  const baseline = frameDataUrl(frame, diagnostic, "baseline");
  return {
    importedDataUrl: imported.dataUrl,
    baselineDataUrl: baseline.dataUrl,
    importedRenderMs: imported.renderMs,
    baselineRenderMs: baseline.renderMs,
  };
}

function renderFrameToCanvas(frame: number, diagnostic: DiagnosticBenchmark): HTMLCanvasElement {
  const canvas = createCanvas(diagnostic.scene.width, diagnostic.scene.height);
  renderImportedFrame(canvas, frame, diagnostic);
  return canvas;
}

function drawPanel(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  subtitle: string,
): void {
  context.fillStyle = "#080a0b";
  context.fillRect(x, y, width, height);
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  context.save();
  try {
    context.beginPath();
    context.rect(x, y, width, height);
    context.clip();
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  } finally {
    context.restore();
  }
  context.strokeStyle = "#2a2f38";
  context.lineWidth = 1;
  context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  context.fillStyle = "#e7e3d7";
  context.font = "600 17px Georgia, serif";
  context.fillText(label, x, y + height + 24);
  context.fillStyle = "#7f858d";
  context.font = "12px Menlo, monospace";
  context.fillText(subtitle, x, y + height + 42);
}

export function createContactSheet(diagnostic: DiagnosticBenchmark): string {
  const columns = 3;
  const tileWidth = 560;
  const tileHeight = 315;
  const gap = 18;
  const margin = 24;
  const header = 82;
  const labelHeight = 48;
  const entries = SELECTED_FRAMES.map((frame) => ({
    canvas: renderFrameToCanvas(frame, diagnostic),
    label: `Frame ${frame}`,
    subtitle: `${(frame / LANDING_FPS).toFixed(3)}s · imported diagnostic pack`,
  }));
  const rows = Math.ceil(entries.length / columns);
  const width = margin * 2 + columns * tileWidth + (columns - 1) * gap;
  const height = margin * 2 + header + rows * (tileHeight + labelHeight) + (rows - 1) * gap;
  const canvas = createCanvas(width, height);
  const context = contextFor(canvas);
  context.fillStyle = "#0b0d10";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#efe9db";
  context.font = "600 28px Georgia, serif";
  context.fillText("Phase 2.6 — imported diagnostic bird landing", margin, 44);
  context.fillStyle = "#9a978f";
  context.font = "13px Menlo, monospace";
  context.fillText(
    "DIAGNOSTIC ARTWORK — NOT ARTISTIC VALIDATION · same 48-frame motion",
    margin,
    68,
  );

  entries.forEach((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawPanel(
      context,
      entry.canvas,
      diagnostic.scene.width,
      diagnostic.scene.height,
      margin + column * (tileWidth + gap),
      margin + header + row * (tileHeight + labelHeight + gap),
      tileWidth,
      tileHeight,
      entry.label,
      entry.subtitle,
    );
  });

  return canvas.toDataURL("image/png");
}

export function createFidelityComparison(diagnostic: DiagnosticBenchmark): FidelityComparison {
  const source = renderSourceCharacter(diagnostic);
  const prepared = composePreparedCharacter(diagnostic);
  const neutral = renderFrameToCanvas(LANDING_FRAME_COUNT - 1, diagnostic);
  const animated = renderFrameToCanvas(24, diagnostic);
  const panelWidth = 760;
  const panelHeight = 428;
  const gap = 18;
  const margin = 24;
  const header = 86;
  const labelHeight = 50;
  const width = margin * 2 + panelWidth * 2 + gap;
  const height = margin * 2 + header + panelHeight * 2 + labelHeight * 2 + gap;

  const canvas = createCanvas(width, height);
  const context = contextFor(canvas);
  context.fillStyle = "#0b0d10";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#efe9db";
  context.font = "600 28px Georgia, serif";
  context.fillText("Phase 2.6 — artwork fidelity and rig comparison", margin, 44);
  context.fillStyle = "#9a978f";
  context.font = "13px Menlo, monospace";
  context.fillText(
    "Diagnostic fixture: same Phase 2.5 art imported and animated by the new pack pipeline",
    margin,
    68,
  );

  drawPanel(
    context,
    source,
    diagnostic.scene.width,
    diagnostic.scene.height,
    margin,
    margin + header,
    panelWidth,
    panelHeight,
    "Source artwork",
    "Phase 2.5 layered parts · neutral registration pose",
  );
  drawPanel(
    context,
    prepared,
    diagnostic.scene.width,
    diagnostic.scene.height,
    margin + panelWidth + gap,
    margin + header,
    panelWidth,
    panelHeight,
    "Prepared pack composition",
    "PNG import · trim offsets · registration · hash · neutral pose",
  );
  drawPanel(
    context,
    neutral,
    diagnostic.scene.width,
    diagnostic.scene.height,
    margin,
    margin + header + panelHeight + labelHeight,
    panelWidth,
    panelHeight,
    "Rendered settled pose",
    "Imported character + imported environment · frame 47",
  );
  drawPanel(
    context,
    animated,
    diagnostic.scene.width,
    diagnostic.scene.height,
    margin + panelWidth + gap,
    margin + header + panelHeight + labelHeight,
    panelWidth,
    panelHeight,
    "Rendered animated pose",
    "Same motion timeline · imported character · frame 24",
  );

  const frameMetrics: Record<number, PixelDifferenceMetrics> = {};
  for (const frame of SELECTED_FRAMES) {
    const baseline = createCanvas(diagnostic.scene.width, diagnostic.scene.height);
    const imported = createCanvas(diagnostic.scene.width, diagnostic.scene.height);
    renderBaselineFrame(baseline, frame, diagnostic);
    renderImportedFrame(imported, frame, diagnostic);
    const baselineContext = contextFor(baseline);
    const importedContext = contextFor(imported);
    frameMetrics[frame] = comparePixels(
      baselineContext.getImageData(0, 0, baseline.width, baseline.height),
      importedContext.getImageData(0, 0, imported.width, imported.height),
    );
  }

  return {
    dataUrl: canvas.toDataURL("image/png"),
    frameMetrics,
    frame47MeanAbsoluteError: frameMetrics[LANDING_FRAME_COUNT - 1]?.meanAbsoluteError ?? 0,
  };
}

export function createValidationReport(
  diagnostic: DiagnosticBenchmark,
): DiagnosticValidationReport {
  return {
    diagnostic: true,
    artworkStatus: "diagnostic-not-artistic-validation",
    premiumArtworkBlocked: true,
    seed: diagnostic.seed,
    characterPack: diagnostic.characterPack,
    environmentPack: diagnostic.environmentPack,
    characterPreparation: diagnostic.characterPreparation,
    environmentPreparation: diagnostic.environmentPreparation,
    rigCompatibility: diagnostic.rigCompatibility,
    parts: diagnostic.parts,
    environmentDifference: diagnostic.environmentDifference,
    timing: diagnostic.timing,
  };
}

export function createRigValidation(diagnostic: DiagnosticBenchmark): RigValidation {
  const pivotMappings = diagnostic.importedRig.rig.nodes.map((node) => {
    const part = diagnostic.importedRig.partsByNodeId.get(node.id);
    const base = diagnostic.baseRig.nodes.find((candidate) => candidate.id === node.id);
    const importedPart = diagnostic.characterPack.parts.find(
      (candidate) => candidate.id === part?.partId,
    );
    return {
      nodeId: node.id,
      partId: part?.partId ?? "missing",
      basePivot: base?.pivot ?? { x: 0, y: 0 },
      importedPivot: importedPart?.pivot
        ? { x: importedPart.pivot.x, y: importedPart.pivot.y }
        : { x: 0, y: 0 },
      drawOffsetX: part?.drawOffsetX ?? 0,
      drawOffsetY: part?.drawOffsetY ?? 0,
    };
  });

  const contactFrame = 30;
  const contact = evaluateLandingRig(contactFrame);
  const contactLeft = contact.find((node) => node.id === "legLeft");
  const contactRight = contact.find((node) => node.id === "legRight");
  const left = contactLeft ? transformPoint(contactLeft.world, BIRD_FOOT_LOCAL) : { x: 0, y: 0 };
  const right = contactRight ? transformPoint(contactRight.world, BIRD_FOOT_LOCAL) : { x: 0, y: 0 };
  let maxDrift = 0;

  for (let frame = contactFrame; frame < LANDING_FRAME_COUNT; frame += 1) {
    const evaluated = evaluateLandingRig(frame);
    const leftNode = evaluated.find((node) => node.id === "legLeft");
    const rightNode = evaluated.find((node) => node.id === "legRight");
    if (!leftNode || !rightNode) continue;
    const currentLeft = transformPoint(leftNode.world, BIRD_FOOT_LOCAL);
    const currentRight = transformPoint(rightNode.world, BIRD_FOOT_LOCAL);
    maxDrift = Math.max(
      maxDrift,
      Math.abs(currentLeft.x - left.x),
      Math.abs(currentLeft.y - left.y),
      Math.abs(currentRight.x - right.x),
      Math.abs(currentRight.y - right.y),
    );
  }

  let deterministic = true;
  for (let frame = 0; frame < LANDING_FRAME_COUNT; frame += 1) {
    const first = evaluateImportedCharacterRig(diagnostic.importedRig, frame);
    const second = evaluateImportedCharacterRig(diagnostic.importedRig, frame);
    if (JSON.stringify(first) !== JSON.stringify(second)) {
      deterministic = false;
      break;
    }
  }

  return {
    adaptedDrawOrder: diagnostic.importedRig.rig.nodes.map((node) => node.id),
    nodePartIds: diagnostic.rigCompatibility.nodePartIds,
    pivotMappings,
    footContact: {
      frame: contactFrame,
      left,
      right,
      maxDrift,
      locked: maxDrift < 1e-5,
    },
    determinism: {
      framesChecked: LANDING_FRAME_COUNT,
      allRepeatedEvaluationsEqual: deterministic,
    },
    compatibility: diagnostic.rigCompatibility,
  };
}

export function sourceArtworkDataUrl(diagnostic: DiagnosticBenchmark): string {
  return renderSourceCharacter(diagnostic).toDataURL("image/png");
}

export function preparedCharacterDataUrl(diagnostic: DiagnosticBenchmark): string {
  return composePreparedCharacter(diagnostic).toDataURL("image/png");
}

export function importedFrameDataUrl(frame: number, diagnostic: DiagnosticBenchmark): string {
  return frameDataUrl(frame, diagnostic, "imported").dataUrl;
}

export function baselineFrameDataUrl(frame: number, diagnostic: DiagnosticBenchmark): string {
  return frameDataUrl(frame, diagnostic, "baseline").dataUrl;
}

export function partDrawSummary(part: IllustrationPart): string {
  return `${part.id} · ${part.preparedSize.width}×${part.preparedSize.height} · z${part.zIndex}`;
}
