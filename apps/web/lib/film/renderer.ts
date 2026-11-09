import { layerCameraMatrix, worldToScreen, type CameraMatrix } from "@fableon/camera-engine";
import { rigForPose } from "@fableon/character-motion";
import { evaluateSpriteRig, multiplyMatrices } from "@fableon/sprite-motion";

import { ENVIRONMENT_LAYERS, environmentLayerMatrix } from "./environment";
import type { FilmAssets } from "./assets";
import { titleFont, wrapTitle } from "./titles";
import {
  evaluateFilmFrame,
  FILM_TOTAL_FRAMES,
  FILM_VIEWPORT,
  FILM_WORLD,
  previousGlobalFrameForTransition,
  WHERE_THE_LIGHT_LANDS,
  type FilmFrameState,
} from "./where-the-light-lands";

const CANONICAL_WIDTH = FILM_VIEWPORT.width;
const CANONICAL_HEIGHT = FILM_VIEWPORT.height;

function contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D is required for the Fableon film renderer.");
  }
  return context;
}

export class FilmRenderer {
  private readonly assets: FilmAssets;
  private readonly output = document.createElement("canvas");
  private readonly current = document.createElement("canvas");
  private readonly previous = document.createElement("canvas");

  constructor(assets: FilmAssets) {
    this.assets = assets;
    for (const canvas of [this.output, this.current, this.previous]) {
      canvas.width = CANONICAL_WIDTH;
      canvas.height = CANONICAL_HEIGHT;
    }
  }

  renderFrame(frame: number): HTMLCanvasElement {
    const state = evaluateFilmFrame(frame);
    const outputContext = contextFor(this.output);
    outputContext.clearRect(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);

    if (state.composition.previousOpacity > 0 && state.composition.previousShot) {
      const previousFrame = previousGlobalFrameForTransition(state.composition);
      if (previousFrame !== null) {
        this.renderShot(this.previous, evaluateFilmFrame(previousFrame));
        outputContext.save();
        outputContext.globalAlpha = state.composition.previousOpacity;
        outputContext.drawImage(this.previous, 0, 0);
        outputContext.restore();
      }
      this.renderShot(this.current, state);
      outputContext.save();
      outputContext.globalAlpha = state.composition.incomingOpacity;
      outputContext.drawImage(this.current, 0, 0);
      outputContext.restore();
    } else {
      this.renderShot(this.output, state);
    }

    this.drawTitles(outputContext, state);
    if (state.composition.blackOpacity > 0) {
      outputContext.save();
      outputContext.globalAlpha = state.composition.blackOpacity;
      outputContext.fillStyle = "#050607";
      outputContext.fillRect(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);
      outputContext.restore();
    }
    return this.output;
  }

  renderToCanvas(canvas: HTMLCanvasElement, frame: number, width: number, height: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error("Film export dimensions must be positive integers.");
    }
    if (Math.abs(width / height - CANONICAL_WIDTH / CANONICAL_HEIGHT) > 0.001) {
      throw new Error("Fableon film export currently requires a 16:9 output.");
    }
    const source = this.renderFrame(frame);
    canvas.width = width;
    canvas.height = height;
    const context = contextFor(canvas);
    context.clearRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, width, height);
  }

  renderFrameDataUrl(frame: number, width: number, height: number): string {
    const canvas = document.createElement("canvas");
    this.renderToCanvas(canvas, frame, width, height);
    return canvas.toDataURL("image/png");
  }

  renderContactSheet(frames: readonly number[], columns = 4): string {
    const tileWidth = 400;
    const tileHeight = 225;
    const gap = 16;
    const margin = 24;
    const header = 72;
    const labelHeight = 28;
    const rows = Math.ceil(frames.length / columns);
    const width = margin * 2 + columns * tileWidth + (columns - 1) * gap;
    const height = margin * 2 + header + rows * (tileHeight + labelHeight) + (rows - 1) * gap;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = contextFor(canvas);
    context.fillStyle = "#0b0d10";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#f8f5ed";
    context.font = "600 26px Georgia, serif";
    context.fillText("Where the Light Lands — selected frames", margin, 42);
    context.fillStyle = "#898d96";
    context.font = "12px Menlo, monospace";
    context.fillText(
      "Actual Fableon Canvas 2D output · 30 seconds · 24 fps · 1920×1080 target",
      margin,
      62,
    );

    const tile = document.createElement("canvas");
    frames.forEach((frame, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + column * (tileWidth + gap);
      const y = margin + header + row * (tileHeight + labelHeight + gap);
      this.renderToCanvas(tile, frame, tileWidth, tileHeight);
      context.drawImage(tile, x, y);
      context.strokeStyle = "#2a2f38";
      context.lineWidth = 1;
      context.strokeRect(x + 0.5, y + 0.5, tileWidth - 1, tileHeight - 1);
      const state = evaluateFilmFrame(frame);
      context.fillStyle = "#e7e3d7";
      context.font = "600 14px Georgia, serif";
      context.fillText(state.composition.shot.title, x, y + tileHeight + 18);
      context.fillStyle = "#7f858d";
      context.font = "11px Menlo, monospace";
      context.fillText(
        `frame ${frame} · ${(frame / 24).toFixed(2)} s · ${state.composition.shot.id}`,
        x,
        y + tileHeight + 31,
      );
    });
    return canvas.toDataURL("image/png");
  }

  renderTimelineDiagram(width = 1600, height = 360): string {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = contextFor(canvas);
    context.fillStyle = "#0b0d10";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#f8f5ed";
    context.font = "600 28px Georgia, serif";
    context.fillText("Where the Light Lands — 30-second timeline", 40, 52);
    context.fillStyle = "#898d96";
    context.font = "12px Menlo, monospace";
    context.fillText("720 frames · 24 fps · 4 shots · exact output duration 30.000 s", 40, 78);

    const margin = 40;
    const top = 130;
    const barHeight = 92;
    const innerWidth = width - margin * 2;
    const colors = ["#7d9778", "#c4934a", "#9db398", "#b86f57"];
    WHERE_THE_LIGHT_LANDS.shots.forEach((shot, index) => {
      const x = margin + (shot.startFrame / FILM_TOTAL_FRAMES) * innerWidth;
      const barWidth = (shot.frameCount / FILM_TOTAL_FRAMES) * innerWidth - 4;
      context.fillStyle = colors[index % colors.length] ?? "#7d9778";
      context.fillRect(x, top, barWidth, barHeight);
      context.fillStyle = "#0b0d10";
      context.font = "600 16px Georgia, serif";
      context.fillText(shot.title, x + 12, top + 32);
      context.font = "11px Menlo, monospace";
      context.fillText(
        `${shot.frameCount}f · ${(shot.frameCount / 24).toFixed(2)}s`,
        x + 12,
        top + 54,
      );
      context.fillText(
        `${shot.startFrame}–${shot.startFrame + shot.frameCount - 1}`,
        x + 12,
        top + 74,
      );
    });

    context.strokeStyle = "#363d48";
    context.fillStyle = "#6e727b";
    context.font = "10px Menlo, monospace";
    for (let frame = 0; frame <= FILM_TOTAL_FRAMES; frame += 120) {
      const x = margin + (frame / FILM_TOTAL_FRAMES) * innerWidth;
      context.beginPath();
      context.moveTo(x, top + barHeight + 8);
      context.lineTo(x, top + barHeight + 22);
      context.stroke();
      context.fillText(String(frame), x - 8, top + barHeight + 38);
    }
    context.fillText("global frame", margin, top + barHeight + 62);
    return canvas.toDataURL("image/png");
  }

  private renderShot(canvas: HTMLCanvasElement, state: FilmFrameState): void {
    const context = contextFor(canvas);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);
    context.fillStyle = "#0b0d10";
    context.fillRect(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);

    for (const layer of ENVIRONMENT_LAYERS) {
      if (layer.assetId === null) continue;
      const asset = layer.assetId === "plate" ? this.assets.plate : this.assets.plateDistant;
      const matrix = environmentLayerMatrix(state.camera, FILM_VIEWPORT, FILM_WORLD, layer);
      context.save();
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.globalAlpha = layer.opacity;
      context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
      context.drawImage(asset, -120, -80, 2640, 1510);
      context.restore();
    }

    if (state.character) {
      this.drawCharacter(context, state);
    }
    this.drawAtmosphere(context, state);
  }

  private drawCharacter(context: CanvasRenderingContext2D, state: FilmFrameState): void {
    if (!state.character) return;
    const cameraMatrix = layerCameraMatrix(state.camera, FILM_VIEWPORT, FILM_WORLD, 1);

    if (state.character.contact && state.footPoints) {
      const shadowPoint = worldToScreen(state.camera, FILM_VIEWPORT, {
        x: (state.footPoints.left.x + state.footPoints.right.x) / 2,
        y: (state.footPoints.left.y + state.footPoints.right.y) / 2,
      });
      context.save();
      context.translate(shadowPoint.x, shadowPoint.y);
      context.scale(1, 0.2);
      const shadow = context.createRadialGradient(0, 0, 4, 0, 0, 90);
      shadow.addColorStop(0, "rgba(12, 9, 6, 0.34)");
      shadow.addColorStop(0.7, "rgba(12, 9, 6, 0.12)");
      shadow.addColorStop(1, "rgba(12, 9, 6, 0)");
      context.fillStyle = shadow;
      context.beginPath();
      context.arc(0, 0, 90, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    const posedRig = rigForPose(state.character);
    const resolved = evaluateSpriteRig(posedRig, 0);
    context.save();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    for (const node of resolved) {
      if (!node.visible) continue;
      const part = this.assets.character.partsByNodeId.get(node.id);
      if (!part) {
        throw new Error(`Film character is missing a rendered part for node "${node.id}".`);
      }
      const matrix: CameraMatrix = multiplyMatrices(cameraMatrix, node.world);
      context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
      context.drawImage(part.image, part.drawOffsetX, part.drawOffsetY, part.width, part.height);
    }
    context.restore();
  }

  private drawAtmosphere(context: CanvasRenderingContext2D, state: FilmFrameState): void {
    const ambient = state.ambient;
    const cameraShiftX = (state.camera.centerX - FILM_WORLD.width / 2) * 0.02;
    const cameraShiftY = (state.camera.centerY - FILM_WORLD.height / 2) * 0.015;

    context.save();
    context.globalCompositeOperation = "screen";

    const glow = context.createRadialGradient(
      1480 + cameraShiftX,
      120 + cameraShiftY,
      20,
      1480 + cameraShiftX,
      120 + cameraShiftY,
      980,
    );
    glow.addColorStop(0, `rgba(255, 238, 182, ${ambient.sunOpacity + 0.16})`);
    glow.addColorStop(0.45, `rgba(255, 220, 142, ${ambient.sunOpacity * 0.45})`);
    glow.addColorStop(1, "rgba(255, 220, 142, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);

    context.globalAlpha = 0.12;
    context.strokeStyle = "#ffe8b2";
    context.lineWidth = 42;
    for (let index = 0; index < 3; index += 1) {
      const startX = 1180 + index * 120 + cameraShiftX;
      context.beginPath();
      context.moveTo(startX, -40);
      context.lineTo(startX + 360, CANONICAL_HEIGHT + 40);
      context.stroke();
    }
    context.restore();

    const mist = context.createLinearGradient(0, 460, 0, CANONICAL_HEIGHT);
    mist.addColorStop(0, "rgba(218, 228, 208, 0)");
    mist.addColorStop(0.55, `rgba(218, 228, 208, ${ambient.mistOpacity})`);
    mist.addColorStop(1, "rgba(218, 228, 208, 0)");
    context.save();
    context.globalAlpha = 0.9;
    context.fillStyle = mist;
    context.fillRect(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);
    context.restore();

    for (const particle of ambient.particles) {
      const x = particle.x * CANONICAL_WIDTH + cameraShiftX * particle.radius;
      const y = particle.y * CANONICAL_HEIGHT + cameraShiftY * particle.radius;
      context.save();
      context.globalAlpha = particle.opacity;
      context.fillStyle = particle.id % 3 === 0 ? "#f5e7b8" : "#d7e4b8";
      context.beginPath();
      context.ellipse(x, y, particle.radius, particle.radius * 0.62, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    for (const leaf of ambient.leaves) {
      const x = leaf.x * CANONICAL_WIDTH;
      const y = leaf.y * CANONICAL_HEIGHT;
      context.save();
      context.translate(x, y);
      context.rotate((leaf.rotation * Math.PI) / 180);
      context.globalAlpha = leaf.opacity;
      context.fillStyle = "#8ea879";
      context.beginPath();
      context.ellipse(0, 0, leaf.length, leaf.length * 0.32, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    const vignette = context.createRadialGradient(
      CANONICAL_WIDTH / 2,
      CANONICAL_HEIGHT / 2,
      CANONICAL_HEIGHT * 0.28,
      CANONICAL_WIDTH / 2,
      CANONICAL_HEIGHT / 2,
      CANONICAL_HEIGHT * 0.82,
    );
    vignette.addColorStop(0, "rgba(8, 10, 9, 0)");
    vignette.addColorStop(1, "rgba(8, 10, 9, 0.34)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, CANONICAL_WIDTH, CANONICAL_HEIGHT);
  }

  private drawTitles(context: CanvasRenderingContext2D, state: FilmFrameState): void {
    for (const title of state.composition.titles) {
      const wrapped = wrapTitle(title, (text, font) => {
        context.font = font;
        return context.measureText(text).width;
      });
      if (wrapped.lines.length === 0) continue;
      context.save();
      context.globalAlpha = title.opacity;
      context.font = titleFont(title);
      context.textAlign = title.align;
      context.textBaseline = "middle";
      context.fillStyle = title.color;
      context.shadowColor = "rgba(0, 0, 0, 0.55)";
      context.shadowBlur = 14;
      context.shadowOffsetY = 3;
      const startY = title.y - ((wrapped.lines.length - 1) * wrapped.lineHeight) / 2;
      wrapped.lines.forEach((line, index) => {
        context.fillText(line, title.x, startY + index * wrapped.lineHeight);
      });
      context.restore();
    }
  }
}
