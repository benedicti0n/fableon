import { layerCameraMatrix, worldToScreen, type CameraMatrix } from "@fableon/camera-engine";
import {
  multiplyMatrices,
  rotationMatrix,
  scaleMatrix,
  transformPoint,
  translationMatrix,
} from "@fableon/sprite-motion";

import { titleFont, wrapTitle } from "@/lib/film/titles";
import { ARTISAN_RIG, CART_RIG, HORSE_RIG, resolveFolkPose } from "@fableon/folk-motion";

import type { FolkAssets } from "./assets";
import type { FolkFilmConfig } from "./config";
import {
  evaluateFolkFrame,
  previousFolkFrame,
  type FolkActorState,
  type FolkBellState,
  type FolkFrameState,
} from "./evaluate";

const VIEWPORT = { width: 1920, height: 1080 } as const;
const BACKGROUND_DRAW = { x: -100, y: -75, width: 2600, height: 1500 } as const;

function contextFor(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is required for the folk film renderer.");
  return context;
}

function seededNoise(index: number, seed: number): number {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export interface FolkRenderOptions {
  readonly debug?: boolean;
}

export class FolkRenderer {
  private readonly assets: FolkAssets;
  private readonly config: FolkFilmConfig;
  private readonly output = document.createElement("canvas");
  private readonly current = document.createElement("canvas");
  private readonly previous = document.createElement("canvas");
  private readonly actors = document.createElement("canvas");
  private readonly cameraMatrix = (state: FolkFrameState): CameraMatrix =>
    layerCameraMatrix(state.camera, VIEWPORT, this.config.world, 1);

  constructor(assets: FolkAssets, config: FolkFilmConfig) {
    this.assets = assets;
    this.config = config;
    for (const canvas of [this.output, this.current, this.previous, this.actors]) {
      canvas.width = VIEWPORT.width;
      canvas.height = VIEWPORT.height;
    }
  }

  renderFrame(frame: number, options: FolkRenderOptions = {}): HTMLCanvasElement {
    const state = evaluateFolkFrame(this.config, frame);
    const outputContext = contextFor(this.output);
    outputContext.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height);

    if (state.previousOpacity > 0 && state.previousShot) {
      const previousFrame = previousFolkFrame(state);
      if (previousFrame !== null) {
        this.renderScene(
          this.previous,
          evaluateFolkFrame(this.config, previousFrame),
          false,
          options,
        );
        outputContext.save();
        outputContext.globalAlpha = state.previousOpacity;
        outputContext.drawImage(this.previous, 0, 0);
        outputContext.restore();
      }
      this.renderScene(this.current, state, false, options);
      outputContext.save();
      outputContext.globalAlpha = state.incomingOpacity;
      outputContext.drawImage(this.current, 0, 0);
      outputContext.restore();
      // Characters are never alpha-blended between shots. The incoming cast
      // appears at full opacity while only the environment dissolves.
      this.renderActorLayer(this.actors, state, options);
      outputContext.drawImage(this.actors, 0, 0);
    } else {
      this.renderScene(this.output, state, true, options);
    }

    this.drawTitles(outputContext, state);
    if (state.blackOpacity > 0) {
      outputContext.save();
      outputContext.globalAlpha = state.blackOpacity;
      outputContext.fillStyle = "#1a0d08";
      outputContext.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
      outputContext.restore();
    }
    return this.output;
  }

  renderToCanvas(canvas: HTMLCanvasElement, frame: number, width: number, height: number): void {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new Error("Folk export dimensions must be positive integers.");
    }
    if (Math.abs(width / height - 16 / 9) > 0.001) {
      throw new Error("Folk film export requires a 16:9 output.");
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

  renderRigTestDataUrl(
    frame: number,
    width: number,
    height: number,
    actorId: "artisan" | "horse" | "cart",
    nodeId: string,
    extraRotation: number,
  ): string {
    const base = evaluateFolkFrame(this.config, frame);
    const target = base[actorId];
    if (!target) throw new Error(`Actor "${actorId}" is not present at frame ${frame}.`);
    const rig = actorId === "artisan" ? ARTISAN_RIG : actorId === "horse" ? HORSE_RIG : CART_RIG;
    const current = target.pose.nodes[nodeId];
    const pose = {
      nodes: {
        ...target.pose.nodes,
        [nodeId]: {
          ...current,
          rotation: (current?.rotation ?? 0) + extraRotation,
        },
      },
    };
    const nodes = resolveFolkPose(rig, pose);
    const state: FolkFrameState = {
      ...base,
      [actorId]: { ...target, pose, nodes },
    };
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    this.renderScene(this.current, state, true, { debug: true });
    const context = contextFor(canvas);
    context.drawImage(this.current, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  }

  renderContactSheet(frames: readonly number[], columns = 4): string {
    const tileWidth = 400;
    const tileHeight = 225;
    const gap = 16;
    const margin = 24;
    const header = 84;
    const labelHeight = 42;
    const rows = Math.ceil(frames.length / columns);
    const width = margin * 2 + columns * tileWidth + (columns - 1) * gap;
    const height = margin * 2 + header + rows * (tileHeight + labelHeight) + (rows - 1) * gap;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = contextFor(canvas);
    context.fillStyle = "#1a0d08";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#fff2cf";
    context.font = '600 28px "Iowan Old Style", Georgia, serif';
    context.fillText("The Little Brass Bell — selected frames", margin, 44);
    context.fillStyle = "#d2a164";
    context.font = "12px Menlo, monospace";
    context.fillText(
      "Actual Fableon Canvas 2D output · 30 seconds · 24 fps · 1920×1080 target",
      margin,
      66,
    );
    const tile = document.createElement("canvas");
    frames.forEach((frame, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + column * (tileWidth + gap);
      const y = margin + header + row * (tileHeight + labelHeight + gap);
      this.renderToCanvas(tile, frame, tileWidth, tileHeight);
      context.drawImage(tile, x, y);
      context.strokeStyle = "#4a2a1b";
      context.lineWidth = 1;
      context.strokeRect(x + 0.5, y + 0.5, tileWidth - 1, tileHeight - 1);
      const state = evaluateFolkFrame(this.config, frame);
      context.fillStyle = "#f2e3c6";
      context.font = "600 14px Georgia, serif";
      context.fillText(state.shot.title, x, y + tileHeight + 18);
      context.fillStyle = "#b9a17d";
      context.font = "11px Menlo, monospace";
      context.fillText(
        `frame ${frame} · ${(frame / 24).toFixed(2)} s · ${state.shot.id}`,
        x,
        y + tileHeight + 34,
      );
    });
    return canvas.toDataURL("image/png");
  }

  private renderScene(
    canvas: HTMLCanvasElement,
    state: FolkFrameState,
    includeActors: boolean,
    options: FolkRenderOptions,
  ): void {
    const context = contextFor(canvas);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    context.fillStyle = "#e7c18a";
    context.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);

    const layers = this.assets.backgrounds.get(state.background);
    if (!layers) throw new Error(`Missing folk background "${state.background}".`);
    for (const layer of layers) {
      const matrix = layerCameraMatrix(state.camera, VIEWPORT, this.config.world, layer.depth);
      context.save();
      context.globalAlpha = layer.opacity;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
      context.drawImage(
        layer.image,
        layer.drawX ?? BACKGROUND_DRAW.x,
        layer.drawY ?? BACKGROUND_DRAW.y,
        layer.drawWidth ?? BACKGROUND_DRAW.width,
        layer.drawHeight ?? BACKGROUND_DRAW.height,
      );
      context.restore();
    }

    this.drawAtmosphere(context, state);

    if (includeActors) {
      this.renderActorLayer(this.actors, state, options);
      context.drawImage(this.actors, 0, 0);
    }
    this.drawVignette(context);
  }

  private renderActorLayer(
    canvas: HTMLCanvasElement,
    state: FolkFrameState,
    options: FolkRenderOptions,
  ): void {
    const context = contextFor(canvas);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    const camera = this.cameraMatrix(state);
    if (state.cart) this.drawShadow(context, state.cart, state, 190, 0.18);
    if (state.horse) this.drawShadow(context, state.horse, state, 230, 0.24);
    if (state.artisan) this.drawShadow(context, state.artisan, state, 90, 0.24);

    if (state.cart) this.drawActor(context, camera, state.cart, options);
    if (state.horse) this.drawActor(context, camera, state.horse, options);
    if (state.bell) this.drawBell(context, camera, state.bell);
    if (state.artisan) this.drawActor(context, camera, state.artisan, options);
    if (options.debug) {
      if (state.cart) this.drawSkeleton(context, camera, state.cart);
      if (state.horse) this.drawSkeleton(context, camera, state.horse);
      if (state.artisan) this.drawSkeleton(context, camera, state.artisan);
    }
  }

  private drawActor(
    context: CanvasRenderingContext2D,
    camera: CameraMatrix,
    actor: FolkActorState,
    options: FolkRenderOptions,
  ): void {
    const placement = multiplyMatrices(
      translationMatrix(actor.placement.x, actor.placement.y),
      scaleMatrix(actor.placement.scale, actor.placement.scale),
    );
    const base = multiplyMatrices(camera, placement);
    for (const node of actor.nodes) {
      if (!node.visible) continue;
      const part = this.assets.parts.get(node.partId);
      if (!part) {
        if (options.debug) continue;
        throw new Error(`Missing folk sprite part "${node.partId}".`);
      }
      const matrix = multiplyMatrices(base, node.world);
      context.save();
      context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(part.image, part.offsetX, part.offsetY, part.width, part.height);
      context.restore();
    }
  }

  private drawBell(
    context: CanvasRenderingContext2D,
    camera: CameraMatrix,
    bell: FolkBellState,
  ): void {
    const part = this.assets.parts.get("bell_bell");
    if (!part) throw new Error('Missing folk sprite part "bell".');
    const local = multiplyMatrices(
      translationMatrix(bell.x, bell.y),
      multiplyMatrices(
        rotationMatrix(bell.rotation),
        multiplyMatrices(scaleMatrix(bell.scale, bell.scale), translationMatrix(-90, -16)),
      ),
    );
    const matrix = multiplyMatrices(camera, local);
    context.save();
    context.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    context.drawImage(part.image, part.offsetX, part.offsetY, part.width, part.height);
    context.restore();
  }

  private drawShadow(
    context: CanvasRenderingContext2D,
    actor: FolkActorState,
    state: FolkFrameState,
    radius: number,
    opacity: number,
  ): void {
    const center = worldToScreen(state.camera, VIEWPORT, {
      x: actor.placement.x + 450 * actor.placement.scale,
      y: this.config.groundY + 4,
    });
    context.save();
    context.translate(center.x, center.y);
    context.scale(1, 0.18);
    const gradient = context.createRadialGradient(0, 0, 4, 0, 0, radius * state.camera.zoom);
    gradient.addColorStop(0, `rgba(56, 28, 16, ${opacity})`);
    gradient.addColorStop(1, "rgba(56, 28, 16, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(0, 0, radius * state.camera.zoom, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private drawSkeleton(
    context: CanvasRenderingContext2D,
    camera: CameraMatrix,
    actor: FolkActorState,
  ): void {
    const placement = multiplyMatrices(
      translationMatrix(actor.placement.x, actor.placement.y),
      scaleMatrix(actor.placement.scale, actor.placement.scale),
    );
    const base = multiplyMatrices(camera, placement);
    context.save();
    context.strokeStyle = "rgba(72, 210, 255, 0.85)";
    context.fillStyle = "rgba(72, 210, 255, 0.95)";
    context.lineWidth = 2;
    for (const node of actor.nodes) {
      const world = multiplyMatrices(base, node.world);
      const point = transformPoint(world, node.pivot);
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fill();
      if (node.parentId) {
        const parent = actor.nodes.find((candidate) => candidate.id === node.parentId);
        if (parent) {
          const parentWorld = multiplyMatrices(base, parent.world);
          const parentPoint = transformPoint(parentWorld, parent.pivot);
          context.beginPath();
          context.moveTo(parentPoint.x, parentPoint.y);
          context.lineTo(point.x, point.y);
          context.stroke();
        }
      }
    }
    context.restore();
  }

  private drawAtmosphere(context: CanvasRenderingContext2D, state: FolkFrameState): void {
    const shiftX = (state.camera.centerX - this.config.world.width / 2) * 0.02;
    context.save();
    context.globalCompositeOperation = "screen";
    const glow = context.createRadialGradient(1540 + shiftX, 190, 30, 1540 + shiftX, 190, 900);
    glow.addColorStop(0, "rgba(255, 240, 188, 0.5)");
    glow.addColorStop(0.45, "rgba(255, 218, 142, 0.15)");
    glow.addColorStop(1, "rgba(255, 218, 142, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    context.globalAlpha = 0.1;
    context.strokeStyle = "#ffe8b2";
    context.lineWidth = 34;
    for (let index = 0; index < 3; index += 1) {
      const startX = 1220 + index * 120 + shiftX;
      context.beginPath();
      context.moveTo(startX, -40);
      context.lineTo(startX + 330, VIEWPORT.height + 40);
      context.stroke();
    }
    context.restore();

    for (let index = 0; index < 48; index += 1) {
      const baseX = seededNoise(index, this.config.seed);
      const baseY = seededNoise(index + 100, this.config.seed);
      const drift = Math.sin((state.frame / 24) * (0.3 + baseY) + index) * 22;
      const x =
        (((baseX * VIEWPORT.width + drift + shiftX) % VIEWPORT.width) + VIEWPORT.width) %
        VIEWPORT.width;
      const y =
        (baseY * VIEWPORT.height - ((state.frame * 0.45) % VIEWPORT.height) + VIEWPORT.height) %
        VIEWPORT.height;
      const radius = 1.5 + baseX * 3.4;
      context.save();
      context.globalAlpha = 0.18 + baseY * 0.32;
      context.fillStyle = index % 4 === 0 ? "#fff0bd" : "#e7b96f";
      context.beginPath();
      context.ellipse(x, y, radius, radius * 0.65, baseX * Math.PI, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  private drawVignette(context: CanvasRenderingContext2D): void {
    const vignette = context.createRadialGradient(
      VIEWPORT.width / 2,
      VIEWPORT.height / 2,
      VIEWPORT.height * 0.42,
      VIEWPORT.width / 2,
      VIEWPORT.height / 2,
      VIEWPORT.width * 0.7,
    );
    vignette.addColorStop(0, "rgba(42, 23, 16, 0)");
    vignette.addColorStop(1, "rgba(42, 23, 16, 0.22)");
    context.save();
    context.fillStyle = vignette;
    context.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    context.restore();
  }

  private drawTitles(context: CanvasRenderingContext2D, state: FolkFrameState): void {
    for (const title of state.titles) {
      if (title.opacity <= 0) continue;
      const wrapped = wrapTitle(title, (text, font) => {
        context.font = font;
        return context.measureText(text).width;
      });
      context.save();
      context.globalAlpha = title.opacity;
      context.textBaseline = "top";
      context.textAlign = title.align;
      context.font = titleFont(title);
      const anchorX =
        title.align === "center"
          ? VIEWPORT.width / 2
          : title.align === "right"
            ? title.x + title.maxWidth
            : title.x;
      const startY = title.y - ((wrapped.lines.length - 1) * wrapped.lineHeight) / 2;
      wrapped.lines.forEach((line, index) => {
        const y = startY + index * wrapped.lineHeight;
        context.fillStyle = "rgba(42, 23, 16, 0.55)";
        context.fillText(line, anchorX + 3, y + 4);
        context.fillStyle = title.color;
        context.fillText(line, anchorX, y);
      });
      context.restore();
    }
  }
}
