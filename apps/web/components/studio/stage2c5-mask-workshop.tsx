"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import {
  canvasToSource,
  clamp,
  createMask,
  cropRgba,
  extractWithMask,
  maskBounds,
  maskViewport,
  paintMaskPoint,
  paintMaskSegment,
  restoreMask,
  snapshotMask,
  validateImportedMaskDimensions,
  type CanvasRect,
  type MaskPlane,
} from "@/lib/providers/stage2c5-mask";
import type {
  Stage2C5MaskRevision,
  Stage2C5PartDefinition,
  Stage2C5Provider,
  Stage2C5SourceInfo,
} from "@/lib/providers/stage2c5-storage";

export interface Stage2C5WorkshopState {
  readonly providers: readonly Stage2C5Provider[];
  readonly sources: readonly Stage2C5SourceInfo[];
  readonly parts: readonly Stage2C5PartDefinition[];
}

type Tool = "brush" | "eraser" | "pan";

interface DisplaySize {
  readonly width: number;
  readonly height: number;
}

interface CursorPoint {
  readonly x: number;
  readonly y: number;
}

const MAX_UNDO = 16;
const API_ROOT = "/api/studio/providers/stage-2c5";

export function Stage2C5MaskWorkshop({ state }: { readonly state: Stage2C5WorkshopState }) {
  const initialPart =
    state.parts.find((entry) => entry.provider === "openai" && entry.id === "nearUpperArm") ??
    state.parts[0];
  if (!initialPart) {
    return (
      <p
        role="alert"
        className="rounded border border-clay-500/40 bg-clay-500/10 p-3 text-xs text-clay-300"
      >
        No Stage 2C.5 source parts are available.
      </p>
    );
  }
  return <Stage2C5MaskWorkshopInner state={state} initialPart={initialPart} />;
}

function Stage2C5MaskWorkshopInner({
  state,
  initialPart,
}: {
  readonly state: Stage2C5WorkshopState;
  readonly initialPart: Stage2C5PartDefinition;
}) {
  const [provider, setProvider] = useState<Stage2C5Provider>(initialPart.provider);
  const [partId, setPartId] = useState(initialPart.id);
  const [tool, setTool] = useState<Tool>("brush");
  const [brushDiameter, setBrushDiameter] = useState(48);
  const [hardness, setHardness] = useState(0.82);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showMask, setShowMask] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [display, setDisplay] = useState<DisplaySize>({ width: 800, height: 560 });
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [revisions, setRevisions] = useState<Stage2C5MaskRevision[]>([]);
  const [latestRevision, setLatestRevision] = useState(0);
  const [selectedRevision, setSelectedRevision] = useState<string>("latest");
  const [unsaved, setUnsaved] = useState(false);
  const [maskVersion, setMaskVersion] = useState(0);
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });
  const [saving, setSaving] = useState(false);
  const [loadingMask, setLoadingMask] = useState(false);
  const [status, setStatus] = useState<string>("Loading source…");
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<CursorPoint | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewBox, setPreviewBox] = useState<CanvasRect | null>(null);

  const displayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<MaskPlane | null>(null);
  const undoRef = useRef<Uint8ClampedArray[]>([]);
  const redoRef = useRef<Uint8ClampedArray[]>([]);
  const syncHistory = useCallback(() => {
    setHistoryCounts({ undo: undoRef.current.length, redo: redoRef.current.length });
  }, []);
  const drawingRef = useRef(false);
  const panningRef = useRef(false);
  const lastSourceRef = useRef<CursorPoint | null>(null);
  const lastClientRef = useRef<{ x: number; y: number } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const providerParts = useMemo(
    () => state.parts.filter((entry) => entry.provider === provider),
    [provider, state.parts],
  );
  const part = state.parts.find((entry) => entry.provider === provider && entry.id === partId);
  const source = state.sources.find(
    (entry) => entry.provider === provider && entry.sheet === part?.sourceSheet,
  );

  useEffect(() => {
    const element = displayRef.current;
    if (!element) return;
    const update = () => {
      setDisplay({
        width: Math.max(320, element.clientWidth),
        height: Math.max(420, Math.min(720, Math.round(element.clientWidth * 0.68))),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const setMask = useCallback((mask: MaskPlane) => {
    maskRef.current = mask;
    const canvas = maskCanvasRef.current ?? document.createElement("canvas");
    canvas.width = mask.width;
    canvas.height = mask.height;
    maskCanvasRef.current = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Mask canvas unavailable.");
    const image = context.createImageData(mask.width, mask.height);
    for (let index = 0; index < mask.data.length; index += 1) {
      const offset = index * 4;
      image.data[offset] = 255;
      image.data[offset + 1] = 181;
      image.data[offset + 2] = 78;
      image.data[offset + 3] = mask.data[index] ?? 0;
    }
    context.putImageData(image, 0, 0);
    setMaskVersion((value) => value + 1);
  }, []);

  const updateMaskCanvas = useCallback((box: CanvasRect) => {
    const mask = maskRef.current;
    const canvas = maskCanvasRef.current;
    if (!mask || !canvas || box.width <= 0 || box.height <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(box.width, box.height);
    for (let y = 0; y < box.height; y += 1) {
      for (let x = 0; x < box.width; x += 1) {
        const sourceIndex = (box.y + y) * mask.width + (box.x + x);
        const targetIndex = y * box.width + x;
        const offset = targetIndex * 4;
        image.data[offset] = 255;
        image.data[offset + 1] = 181;
        image.data[offset + 2] = 78;
        image.data[offset + 3] = mask.data[sourceIndex] ?? 0;
      }
    }
    context.putImageData(image, box.x, box.y);
  }, []);

  const loadMaskFromUrl = useCallback(
    async (url: string, plane?: MaskPlane) => {
      if (!source) return;
      setLoadingMask(true);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        if (image.naturalWidth !== source.width || image.naturalHeight !== source.height) {
          throw new Error(
            `Mask is ${image.naturalWidth}×${image.naturalHeight}; source is ${source.width}×${source.height}.`,
          );
        }
        const canvas = document.createElement("canvas");
        canvas.width = source.width;
        canvas.height = source.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not create mask loader canvas.");
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, source.width, source.height).data;
        const next = plane ?? createMask(source.width, source.height);
        for (let index = 0; index < next.data.length; index += 1) {
          next.data[index] = pixels[index * 4 + 3] ?? 0;
        }
        undoRef.current.length = 0;
        redoRef.current.length = 0;
        syncHistory();
        setMask(next);
        setUnsaved(false);
        setPreview(null);
        setStatus("Mask loaded.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setLoadingMask(false);
      }
    },
    [setMask, source, syncHistory],
  );

  const loadLatestForPart = useCallback(async () => {
    if (!provider || !part) return;
    setError(null);
    setLoadingMask(true);
    try {
      const response = await fetch(`${API_ROOT}/revisions/${provider}/${part.id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        revisions?: Stage2C5MaskRevision[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Could not load mask revisions.");
      const list = payload.revisions ?? [];
      setRevisions(list);
      const latest = list[0] ?? null;
      setLatestRevision(latest?.revision ?? 0);
      setSelectedRevision(latest ? String(latest.revision) : "latest");
      if (latest) {
        await loadMaskFromUrl(`${API_ROOT}/mask/${provider}/${part.id}/latest`);
      } else {
        await loadMaskFromUrl(`${API_ROOT}/seed/${provider}/${part.id}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setStatus("Mask load failed.");
    } finally {
      setLoadingMask(false);
    }
  }, [loadMaskFromUrl, part, provider]);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) {
        setSourceImage(image);
        setStatus(`Loaded ${source.provider} ${source.sheet} sheet.`);
      }
    };
    image.onerror = () => {
      if (!cancelled) setError("Source sheet could not be decoded.");
    };
    image.src = `${API_ROOT}/source/${source.provider}/${source.sheet}?v=${source.sha256}`;
    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    if (provider && part) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadLatestForPart();
    }
    // loadLatestForPart is intentionally keyed by provider/part.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, partId]);

  const renderRect = useMemo(() => {
    if (!source) return null;
    return maskViewport(
      display.width,
      display.height,
      source.width,
      source.height,
      zoom,
      pan.x,
      pan.y,
    );
  }, [display, pan.x, pan.y, source, zoom]);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !source || !renderRect) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(display.width * dpr);
    canvas.height = Math.round(display.height * dpr);
    canvas.style.width = `${display.width}px`;
    canvas.style.height = `${display.height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, display.width, display.height);
    context.fillStyle = "#100c0a";
    context.fillRect(0, 0, display.width, display.height);
    for (let y = 0; y < display.height; y += 18) {
      for (let x = 0; x < display.width; x += 18) {
        context.fillStyle = (x / 18 + y / 18) % 2 === 0 ? "#d6d1c8" : "#f2ede3";
        context.fillRect(x, y, 18, 18);
      }
    }
    if (sourceImage) {
      context.imageSmoothingEnabled = true;
      context.drawImage(
        sourceImage,
        renderRect.x,
        renderRect.y,
        renderRect.width,
        renderRect.height,
      );
    }
    if (showMask && maskCanvasRef.current) {
      context.save();
      context.globalAlpha = 0.48;
      context.drawImage(
        maskCanvasRef.current,
        renderRect.x,
        renderRect.y,
        renderRect.width,
        renderRect.height,
      );
      context.restore();
    }
    if (showGuides) {
      context.save();
      context.lineWidth = 1.5;
      context.setLineDash([6, 4]);
      context.strokeStyle = "#38bdf8";
      const cellX = renderRect.x + (source.width / 2) * renderRect.scale;
      context.beginPath();
      context.moveTo(cellX, renderRect.y);
      context.lineTo(cellX, renderRect.y + renderRect.height);
      context.stroke();
      if (part?.splitY !== null && part?.splitY !== undefined) {
        const splitY = renderRect.y + part.splitY * renderRect.scale;
        context.strokeStyle = "#fb923c";
        context.beginPath();
        context.moveTo(renderRect.x, splitY);
        context.lineTo(renderRect.x + renderRect.width, splitY);
        context.stroke();
      }
      context.setLineDash([]);
      context.strokeStyle = "#fff2cf";
      context.strokeRect(renderRect.x, renderRect.y, renderRect.width, renderRect.height);
      context.fillStyle = "rgba(26,13,8,.82)";
      context.fillRect(renderRect.x + 8, renderRect.y + 8, 220, 24);
      context.fillStyle = "#fff2cf";
      context.font = "12px Menlo, monospace";
      context.fillText(
        `${provider} · ${part?.id ?? ""} · ${source.width}×${source.height}`,
        renderRect.x + 14,
        renderRect.y + 25,
      );
      context.restore();
    }
    if (cursor) {
      const x = renderRect.x + cursor.x * renderRect.scale;
      const y = renderRect.y + cursor.y * renderRect.scale;
      const radius = (brushDiameter / 2) * renderRect.scale;
      context.save();
      context.strokeStyle = tool === "eraser" ? "#fb7185" : "#fbbf24";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
  }, [
    brushDiameter,
    cursor,
    display,
    part,
    provider,
    renderRect,
    showGuides,
    showMask,
    source,
    sourceImage,
    tool,
  ]);

  useEffect(() => {
    drawScene();
  }, [drawScene, maskVersion]);

  function sourcePointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>): CursorPoint | null {
    const canvas = canvasRef.current;
    if (!canvas || !source) return null;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return canvasToSource(
      {
        width: display.width,
        height: display.height,
        sourceWidth: source.width,
        sourceHeight: source.height,
        zoom,
        panX: pan.x,
        panY: pan.y,
      },
      x,
      y,
    );
  }

  function beginStroke(point: CursorPoint) {
    const mask = maskRef.current;
    if (!mask) return;
    undoRef.current.push(snapshotMask(mask));
    if (undoRef.current.length > MAX_UNDO) undoRef.current.shift();
    redoRef.current.length = 0;
    syncHistory();
    const box = paintMaskPoint(mask, point, {
      radius: brushDiameter / 2,
      hardness,
      erase: tool === "eraser",
    });
    updateMaskCanvas(box);
    setMaskVersion((value) => value + 1);
    setUnsaved(true);
  }

  function continueStroke(point: CursorPoint) {
    const mask = maskRef.current;
    if (!mask || !lastSourceRef.current) return;
    const box = paintMaskSegment(mask, lastSourceRef.current, point, {
      radius: brushDiameter / 2,
      hardness,
      erase: tool === "eraser",
    });
    lastSourceRef.current = point;
    updateMaskCanvas(box);
    setMaskVersion((value) => value + 1);
    setUnsaved(true);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    if (tool === "pan") {
      panningRef.current = true;
      lastClientRef.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const point = sourcePointFromEvent(event);
    if (!point) return;
    drawingRef.current = true;
    lastSourceRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
    beginStroke(point);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const point = sourcePointFromEvent(event);
    setCursor(point);
    if (panningRef.current && lastClientRef.current) {
      const dx = event.clientX - lastClientRef.current.x;
      const dy = event.clientY - lastClientRef.current.y;
      lastClientRef.current = { x: event.clientX, y: event.clientY };
      setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
      return;
    }
    if (!drawingRef.current || !point) return;
    continueStroke(point);
  }

  function endPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drawingRef.current = false;
    panningRef.current = false;
    lastSourceRef.current = null;
    lastClientRef.current = null;
  }

  function handleWheel(event: ReactWheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.15 : 0.87;
    setZoom((value) => clamp(value * factor, 1, 8));
  }

  function undo() {
    const mask = maskRef.current;
    const previous = undoRef.current.pop();
    if (!mask || !previous) return;
    redoRef.current.push(snapshotMask(mask));
    restoreMask(mask, previous);
    setMask(mask);
    setUnsaved(true);
    syncHistory();
  }

  function redo() {
    const mask = maskRef.current;
    const next = redoRef.current.pop();
    if (!mask || !next) return;
    undoRef.current.push(snapshotMask(mask));
    restoreMask(mask, next);
    setMask(mask);
    setUnsaved(true);
    syncHistory();
  }

  async function saveMask() {
    if (!maskRef.current || !source || !part) return;
    setSaving(true);
    setError(null);
    try {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) throw new Error("Mask canvas unavailable.");
      const dataUrl = maskCanvas.toDataURL("image/png");
      const response = await fetch(`${API_ROOT}/masks/${provider}/${part.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maskPngBase64: dataUrl.split(",", 2)[1],
          sourceSha256: source.sha256,
          width: source.width,
          height: source.height,
          expectedRevision: latestRevision,
          editOrigin: "studio-stage2c5-brush",
          notes: `Edited ${part.id} on ${source.id}.`,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        revision?: Stage2C5MaskRevision;
      };
      if (!response.ok) {
        if (response.status === 409) {
          await loadLatestForPart();
        }
        throw new Error(payload.error ?? "Mask save failed.");
      }
      if (payload.revision) {
        setLatestRevision(payload.revision.revision);
        setRevisions((current) => [payload.revision!, ...current]);
        setSelectedRevision(String(payload.revision.revision));
      }
      setUnsaved(false);
      setStatus(`Saved mask revision ${payload.revision?.revision ?? "?"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setStatus("Mask save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function reloadRevision() {
    if (!source || !part) return;
    if (selectedRevision === "latest") {
      await loadLatestForPart();
    } else {
      await loadMaskFromUrl(`${API_ROOT}/mask/${provider}/${part.id}/${selectedRevision}`);
    }
  }

  function importMask(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !source) return;
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        try {
          const image = new Image();
          image.src = String(reader.result);
          await image.decode();
          validateImportedMaskDimensions(
            image.naturalWidth,
            image.naturalHeight,
            source.width,
            source.height,
          );
          await loadMaskFromUrl(String(reader.result));
          setUnsaved(true);
          setStatus(`Imported mask ${file.name} at source resolution.`);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      })();
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  async function previewExtraction() {
    if (!sourceImage || !maskRef.current || !source) return;
    try {
      const canvas = sourceCanvasRef.current ?? document.createElement("canvas");
      sourceCanvasRef.current = canvas;
      canvas.width = source.width;
      canvas.height = source.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Source canvas unavailable.");
      context.clearRect(0, 0, source.width, source.height);
      context.drawImage(sourceImage, 0, 0);
      const pixels = context.getImageData(0, 0, source.width, source.height);
      const box = maskBounds(maskRef.current);
      if (!box) throw new Error("Mask is empty; nothing to extract.");
      const extracted = extractWithMask(pixels.data, maskRef.current);
      const cropped = cropRgba(extracted, source.width, source.height, box);
      const previewCanvas = document.createElement("canvas");
      previewCanvas.width = box.width;
      previewCanvas.height = box.height;
      const previewContext = previewCanvas.getContext("2d");
      if (!previewContext) throw new Error("Preview canvas unavailable.");
      previewContext.putImageData(
        new ImageData(new Uint8ClampedArray(cropped), box.width, box.height),
        0,
        0,
      );
      setPreview(previewCanvas.toDataURL("image/png"));
      setPreviewBox(box);
      setStatus(`Extraction preview ${box.width}×${box.height}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  const activeRevision = revisions.find((entry) => entry.revision === latestRevision) ?? null;
  const canUndo = historyCounts.undo > 0;
  const canRedo = historyCounts.redo > 0;

  return (
    <div data-testid="stage2c5-workshop" className="space-y-4">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-3 rounded-lg border border-ink-700 bg-ink-950 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-mist-400">
              Provider
              <select
                aria-label="Provider"
                data-testid="stage2c5-provider"
                value={provider}
                onChange={(event) => {
                  const nextProvider = event.target.value as Stage2C5Provider;
                  setProvider(nextProvider);
                  const firstPart = state.parts.find((entry) => entry.provider === nextProvider);
                  if (firstPart) setPartId(firstPart.id);
                  setSourceImage(null);
                }}
                className="ml-2 rounded border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-paper-100"
              >
                {state.providers.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-mist-400">
              Anatomical part
              <select
                aria-label="Anatomical part"
                data-testid="stage2c5-part"
                value={partId}
                onChange={(event) => {
                  setPartId(event.target.value);
                  setSourceImage(null);
                }}
                className="ml-2 rounded border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-paper-100"
              >
                {providerParts.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="font-mono text-[10px] text-mist-500">
              {source ? `${source.format} · ${source.width}×${source.height}` : "source missing"}
            </span>
            <span className="font-mono text-[10px] text-mist-500">
              revision {latestRevision || "seed"} · {unsaved ? "unsaved" : "saved"}
            </span>
          </div>
          <div
            ref={displayRef}
            className="relative overflow-hidden rounded border border-ink-700 bg-black"
          >
            <canvas
              ref={canvasRef}
              data-testid="stage2c5-canvas"
              aria-label="Stage 2C.5 mask editor canvas"
              className={`block touch-none select-none ${tool === "pan" ? "cursor-grab" : "cursor-crosshair"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              onPointerLeave={() => setCursor(null)}
              onWheel={handleWheel}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-mist-500">
            <span>
              source x {cursor ? Math.round(cursor.x) : "—"} · y{" "}
              {cursor ? Math.round(cursor.y) : "—"}
            </span>
            <span>zoom {zoom.toFixed(2)}×</span>
            <span>{loadingMask ? "loading mask…" : status}</span>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-ink-700 bg-ink-950 p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">Tools</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["brush", "eraser", "pan"] as const).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  data-testid={`stage2c5-tool-${entry}`}
                  onClick={() => setTool(entry)}
                  className={`rounded border px-2 py-2 text-xs capitalize ${
                    tool === entry
                      ? "border-ochre-500/70 bg-ochre-500/10 text-paper-50"
                      : "border-ink-700 text-mist-300"
                  }`}
                >
                  {entry}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-xs text-mist-400">
              Brush diameter: {brushDiameter}px source
              <input
                aria-label="Brush diameter"
                type="range"
                min={2}
                max={300}
                value={brushDiameter}
                onChange={(event) => setBrushDiameter(Number(event.target.value))}
                className="mt-1 w-full accent-ochre-500"
              />
            </label>
            <label className="mt-2 block text-xs text-mist-400">
              Hardness: {Math.round(hardness * 100)}%
              <input
                aria-label="Brush hardness"
                type="range"
                min={0}
                max={100}
                value={Math.round(hardness * 100)}
                onChange={(event) => setHardness(Number(event.target.value) / 100)}
                className="mt-1 w-full accent-ochre-500"
              />
            </label>
            <label className="mt-2 block text-xs text-mist-400">
              Zoom: {zoom.toFixed(2)}×
              <input
                aria-label="Zoom"
                type="range"
                min={1}
                max={8}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-1 w-full accent-ochre-500"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-mist-400">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={showMask}
                  onChange={(event) => setShowMask(event.target.checked)}
                />
                Mask
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(event) => setShowGuides(event.target.checked)}
                />
                Guides
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="stage2c5-undo"
                disabled={!canUndo}
                onClick={undo}
                className="rounded border border-ink-700 px-2 py-1 text-xs text-mist-300 disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                data-testid="stage2c5-redo"
                disabled={!canRedo}
                onClick={redo}
                className="rounded border border-ink-700 px-2 py-1 text-xs text-mist-300 disabled:opacity-40"
              >
                Redo
              </button>
              <button
                type="button"
                onClick={() => setPan({ x: 0, y: 0 })}
                className="rounded border border-ink-700 px-2 py-1 text-xs text-mist-300"
              >
                Center
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-ink-700 bg-ink-950 p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">
              Revision
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="stage2c5-save"
                disabled={!unsaved || saving}
                onClick={() => void saveMask()}
                className="rounded border border-ochre-500/70 bg-ochre-500/10 px-3 py-1.5 text-xs text-paper-50 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save revision"}
              </button>
              <button
                type="button"
                data-testid="stage2c5-reload"
                onClick={() => void reloadRevision()}
                className="rounded border border-ink-700 px-3 py-1.5 text-xs text-mist-300"
              >
                Reload saved
              </button>
              <button
                type="button"
                onClick={() => void loadLatestForPart()}
                className="rounded border border-ink-700 px-3 py-1.5 text-xs text-mist-300"
              >
                Revert
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="rounded border border-ink-700 px-3 py-1.5 text-xs text-mist-300"
              >
                Import mask
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={importMask}
              />
            </div>
            <label className="mt-3 block text-xs text-mist-400">
              Load revision
              <select
                aria-label="Saved mask revision"
                value={selectedRevision}
                onChange={(event) => setSelectedRevision(event.target.value)}
                className="ml-2 rounded border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-paper-100"
              >
                <option value="latest">latest</option>
                {revisions.map((entry) => (
                  <option key={entry.revision} value={String(entry.revision)}>
                    r{entry.revision} · {entry.createdAt.slice(11, 19)}
                  </option>
                ))}
              </select>
            </label>
            {activeRevision ? (
              <div className="mt-3 space-y-1 font-mono text-[10px] text-mist-500">
                <p>mask {activeRevision.maskSha256.slice(0, 16)}…</p>
                <p>source {activeRevision.sourceHash.slice(0, 16)}…</p>
                <p>review {activeRevision.reviewStatus}</p>
                <p>extraction {activeRevision.extractionCorrectness}</p>
                <p>articulation {activeRevision.articulationCompatibility}</p>
              </div>
            ) : (
              <p className="mt-3 font-mono text-[10px] text-mist-500">
                Unsaved seed mask. Save to create revision 1.
              </p>
            )}
            <p className="mt-2 text-[10px] leading-4 text-mist-500">{part?.notes}</p>
          </section>

          <section className="rounded-lg border border-ink-700 bg-ink-950 p-4">
            <h2 className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">
              Extraction preview
            </h2>
            <button
              type="button"
              data-testid="stage2c5-preview"
              onClick={() => void previewExtraction()}
              className="mt-2 rounded border border-ink-700 px-3 py-1.5 text-xs text-mist-300"
            >
              Preview extracted part
            </button>
            {previewBox ? (
              <p className="mt-2 font-mono text-[10px] text-mist-500">
                {previewBox.x},{previewBox.y} · {previewBox.width}×{previewBox.height}
              </p>
            ) : null}
            {preview ? (
              <div className="mt-3 rounded border border-ink-800 bg-[linear-gradient(45deg,#2a2a2a_25%,transparent_25%,transparent_75%,#2a2a2a_75%),linear-gradient(45deg,#2a2a2a_25%,#181818_25%,#181818_75%,#2a2a2a_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-2">
                <img
                  data-testid="stage2c5-preview-image"
                  src={preview}
                  alt="Extracted Stage 2C.5 part preview"
                  className="mx-auto max-h-72 object-contain"
                />
              </div>
            ) : null}
          </section>
        </aside>
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}
      <p className="rounded border border-ink-800 bg-ink-900/60 px-3 py-2 text-[11px] leading-5 text-mist-500">
        Brush and eraser coordinates are mapped through the current zoom and pan into full
        source-image pixels. Saved masks retain the source hash and dimensions. Revision saves are
        atomic and reject stale writes. Hidden overlap is still an artwork decision; this editor
        does not auto-approve a mask.
      </p>
    </div>
  );
}
