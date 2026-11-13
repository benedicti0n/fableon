"use client";

import { useEffect, useRef, useState } from "react";

import { studioFetch } from "@/lib/studio/client";
import { placeFrame } from "@/lib/rigby2d/placement";
import { DEFAULT_R2_2_SHOT } from "@/lib/rigby2d/shot";
import type { FrameRenderView, RenderJobView } from "@/lib/rigby2d/view-types";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const BACKGROUND = DEFAULT_R2_2_SHOT.background;

interface ShotSurfaceProps {
  readonly renderId: string;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly scale: number;
  readonly clipStartFrame: number;
}

interface ShotApi {
  readonly ready: boolean;
  readonly renderId: string;
  readonly frameCount: number;
  readonly fps: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly anchor: { readonly x: number; readonly y: number; readonly scale: number };
  renderFrame(frame: number, width: number, height: number): string;
  renderContactSheet(frames: readonly number[], columns?: number): string;
}

declare global {
  interface Window {
    __FABLEON_RIGBY2D_SHOT__?: ShotApi;
  }
}

function paintBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  anchorX: number,
  anchorY: number,
  scale: number,
): void {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, BACKGROUND.top);
  gradient.addColorStop(1, BACKGROUND.bottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const horizon = height * BACKGROUND.horizon;
  context.fillStyle = BACKGROUND.floor;
  context.fillRect(0, horizon, width, height - horizon);
  context.strokeStyle = "rgba(73, 58, 44, 0.2)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, horizon + 0.5);
  context.lineTo(width, horizon + 0.5);
  context.stroke();
  const shadow = context.createRadialGradient(anchorX, anchorY, 2, anchorX, anchorY, 95 * scale);
  shadow.addColorStop(0, "rgba(54, 42, 31, 0.28)");
  shadow.addColorStop(1, "rgba(54, 42, 31, 0)");
  context.save();
  context.translate(anchorX, anchorY);
  context.scale(1, 0.22);
  context.fillStyle = shadow;
  context.beginPath();
  context.arc(0, 0, 95 * scale, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function composeFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  image: HTMLImageElement,
  render: FrameRenderView,
  anchorX: number,
  anchorY: number,
  actorScale: number,
): void {
  const sx = width / DESIGN_WIDTH;
  const sy = height / DESIGN_HEIGHT;
  const placement = placeFrame({
    frameWidth: render.frameWidth,
    frameHeight: render.frameHeight,
    pivot: render.pivot,
    actor: { x: anchorX, y: anchorY, scale: actorScale },
    camera: { centerX: 960, centerY: 540, zoom: 1 },
    viewport: { width: DESIGN_WIDTH, height: DESIGN_HEIGHT },
  });
  paintBackground(
    context,
    width,
    height,
    placement.anchorX * sx,
    placement.anchorY * sy,
    actorScale * sx,
  );
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    placement.drawX * sx,
    placement.drawY * sy,
    placement.drawWidth * sx,
    placement.drawHeight * sy,
  );
}

export function Rigby2DShotSurface({
  renderId,
  anchorX,
  anchorY,
  scale,
  clipStartFrame,
}: ShotSurfaceProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [job, setJob] = useState<RenderJobView | null>(null);
  const [images, setImages] = useState<readonly HTMLImageElement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await studioFetch<{ job: RenderJobView }>(
          `/api/studio/folk/rigby2d/renders/${renderId}`,
        );
        if (cancelled) return;
        if (response.job.status !== "completed" || !response.job.frameRender) {
          throw new Error(`Render ${renderId} is ${response.job.status}, not completed.`);
        }
        setJob(response.job);
        const loaded = await Promise.all(
          Array.from({ length: response.job.frameRender.frameCount }, (_, index) => {
            return new Promise<HTMLImageElement>((resolve, reject) => {
              const image = new Image();
              image.onload = () => resolve(image);
              image.onerror = () => reject(new Error(`Frame ${index} could not be loaded.`));
              image.src = `/api/studio/folk/rigby2d/renders/${renderId}/frames/${index}`;
            });
          }),
        );
        if (!cancelled) {
          setImages(loaded);
          setReady(true);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [renderId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const render = job?.frameRender;
    if (!canvas || !render || images.length === 0) return;
    canvas.width = DESIGN_WIDTH;
    canvas.height = DESIGN_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return;
    composeFrame(
      context,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      images[0] as HTMLImageElement,
      render,
      anchorX,
      anchorY,
      scale,
    );
  }, [job, images, anchorX, anchorY, scale]);

  useEffect(() => {
    if (!ready || !job?.frameRender || images.length === 0) return;
    const render = job.frameRender;
    const startFrame = Math.min(
      Math.max(0, Math.floor(clipStartFrame)),
      Math.max(0, render.frameCount - 1),
    );
    const availableFrames = render.frameCount - startFrame;
    const api: ShotApi = {
      ready: true,
      renderId,
      frameCount: availableFrames,
      fps: render.fps,
      frameWidth: render.frameWidth,
      frameHeight: render.frameHeight,
      pivot: render.pivot,
      anchor: { x: anchorX, y: anchorY, scale },
      renderFrame: (frame, width, height) => {
        if (frame < 0 || frame >= availableFrames) {
          throw new Error(`Frame ${frame} is outside the clip.`);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D is required.");
        const image = images[startFrame + frame];
        if (!image) throw new Error(`Frame ${frame} is outside the render.`);
        composeFrame(context, width, height, image, render, anchorX, anchorY, scale);
        return canvas.toDataURL("image/png");
      },
      renderContactSheet: (frames, columns = 4) => {
        const tileWidth = 400;
        const tileHeight = 225;
        const gap = 16;
        const margin = 24;
        const header = 64;
        const label = 28;
        const rows = Math.ceil(frames.length / columns);
        const canvas = document.createElement("canvas");
        canvas.width = margin * 2 + columns * tileWidth + (columns - 1) * gap;
        canvas.height = margin * 2 + header + rows * (tileHeight + label) + (rows - 1) * gap;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D is required.");
        context.fillStyle = "#1a1511";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#fff2cf";
        context.font = '600 24px "Iowan Old Style", Georgia, serif';
        context.fillText("R3.1 · Rigby2D frames composited by Fableon", margin, 38);
        frames.forEach((frame, index) => {
          const sourceFrame = startFrame + frame;
          const image = images[sourceFrame];
          if (!image) return;
          const column = index % columns;
          const row = Math.floor(index / columns);
          const x = margin + column * (tileWidth + gap);
          const y = margin + header + row * (tileHeight + label + gap);
          const temp = document.createElement("canvas");
          temp.width = tileWidth;
          temp.height = tileHeight;
          const tempContext = temp.getContext("2d");
          if (!tempContext) return;
          composeFrame(tempContext, tileWidth, tileHeight, image, render, anchorX, anchorY, scale);
          context.drawImage(temp, x, y);
          context.fillStyle = "#d2a164";
          context.font = "12px Menlo, monospace";
          context.fillText(`frame ${String(sourceFrame).padStart(3, "0")}`, x, y + tileHeight + 18);
        });
        return canvas.toDataURL("image/png");
      },
    };
    window.__FABLEON_RIGBY2D_SHOT__ = api;
    return () => {
      if (window.__FABLEON_RIGBY2D_SHOT__ === api) delete window.__FABLEON_RIGBY2D_SHOT__;
    };
  }, [ready, job, images, renderId, anchorX, anchorY, scale, clipStartFrame]);

  return (
    <div className="relative min-h-screen bg-ink-950">
      <canvas
        ref={canvasRef}
        data-testid="rigby2d-shot-canvas"
        className="aspect-video h-auto w-full"
        aria-label="Fableon-composited Rigby2D shot"
      />
      {error ? (
        <p role="alert" className="p-4 text-sm text-clay-500">
          {error}
        </p>
      ) : null}
      {!ready && !error ? (
        <p className="p-4 font-mono text-xs text-mist-400">Loading Rigby2D frames…</p>
      ) : null}
    </div>
  );
}
