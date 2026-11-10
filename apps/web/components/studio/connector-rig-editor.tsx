"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ConnectorDefinition, ConnectorRig } from "@fableon/folk-motion";

type Provider = "openai" | "gemini";

interface PackManifest {
  readonly parts: readonly { readonly id: string; readonly file: string }[];
}

interface ConnectorPayload {
  readonly rig: ConnectorRig;
}

export function ConnectorRigEditor() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [rig, setRig] = useState<ConnectorRig | null>(null);
  const [savedRig, setSavedRig] = useState<ConnectorRig | null>(null);
  const [manifest, setManifest] = useState<PackManifest | null>(null);
  const [partId, setPartId] = useState<string>("artisan_head");
  const [connectorId, setConnectorId] = useState<string>("socket");
  const [zoom, setZoom] = useState(2);
  const [rotation, setRotation] = useState(0);
  const [debug, setDebug] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rigResponse, manifestResponse] = await Promise.all([
          fetch(`/api/studio/providers/stage-2b2/${provider}/connectors`, { cache: "no-store" }),
          fetch(`/api/studio/providers/stage-2b2/${provider}/pack/manifest.json`, {
            cache: "no-store",
          }),
        ]);
        if (!rigResponse.ok) throw new Error(`Connector load failed (${rigResponse.status}).`);
        if (!manifestResponse.ok) throw new Error(`Pack load failed (${manifestResponse.status}).`);
        const payload = (await rigResponse.json()) as ConnectorPayload;
        const nextManifest = (await manifestResponse.json()) as PackManifest;
        if (!cancelled) {
          setRig(payload.rig);
          setSavedRig(payload.rig);
          setManifest(nextManifest);
          const initialPart =
            payload.rig.parts.find((part) => part.id === "artisan_nearForearm") ??
            payload.rig.parts.find((part) => part.id === payload.rig.rootPartId);
          setPartId(initialPart?.id ?? payload.rig.rootPartId);
          setConnectorId(initialPart?.connectors[0]?.id ?? "socket");
          setError(null);
          setMessage(null);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  const part = rig?.parts.find((entry) => entry.id === partId) ?? null;
  const parent =
    rig && part?.attachment
      ? (rig.parts.find((entry) => entry.id === part.attachment?.parentPartId) ?? null)
      : null;
  const connector = part?.connectors.find((entry) => entry.id === connectorId) ?? null;
  const fileFor = useMemo(
    () => (id: string) => manifest?.parts.find((entry) => entry.id === id)?.file ?? null,
    [manifest],
  );

  function updateConnector(patch: Partial<ConnectorDefinition>): void {
    if (!rig || !part || !connector) return;
    setRig({
      ...rig,
      parts: rig.parts.map((entry) =>
        entry.id === part.id
          ? {
              ...entry,
              connectors: entry.connectors.map((item) =>
                item.id === connector.id ? { ...item, ...patch } : item,
              ),
            }
          : entry,
      ),
    });
  }

  function movePointer(event: React.PointerEvent<HTMLDivElement>): void {
    if (!drag || !part || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1);
    updateConnector({ x, y });
  }

  async function save(): Promise<void> {
    if (!rig) return;
    try {
      const response = await fetch(`/api/studio/providers/stage-2b2/${provider}/connectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rig }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Save failed.");
      setSavedRig(rig);
      setMessage("Connector calibration saved.");
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function addConnector(): void {
    if (!rig || !part) return;
    const id = window.prompt("Connector name");
    if (!id) return;
    if (part.connectors.some((entry) => entry.id === id)) {
      setError(`Connector "${id}" already exists.`);
      return;
    }
    setRig({
      ...rig,
      parts: rig.parts.map((entry) =>
        entry.id === part.id
          ? {
              ...entry,
              connectors: [...entry.connectors, { id, x: 0.5, y: 0.5, kind: "joint" }],
            }
          : entry,
      ),
    });
    setConnectorId(id);
  }

  function renameConnector(): void {
    if (!rig || !part || !connector) return;
    const id = window.prompt("New connector name", connector.id);
    if (!id || id === connector.id) return;
    setRig({
      ...rig,
      parts: rig.parts.map((entry) =>
        entry.id === part.id
          ? {
              ...entry,
              connectors: entry.connectors.map((item) =>
                item.id === connector.id ? { ...item, id } : item,
              ),
            }
          : entry,
      ),
    });
    setConnectorId(id);
  }

  function removeConnector(): void {
    if (!rig || !part || !connector) return;
    setRig({
      ...rig,
      parts: rig.parts.map((entry) =>
        entry.id === part.id
          ? { ...entry, connectors: entry.connectors.filter((item) => item.id !== connector.id) }
          : entry,
      ),
    });
    setConnectorId("socket");
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-[1500px] space-y-4 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5.1 · Stage 2B.2
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              Connector calibration
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
              Named normalized connectors and parent sockets. Drag a marker or use the numeric
              inputs; saving writes only connector metadata, never the generated artwork.
            </p>
          </div>
          <Link
            href="/studio/folk/rigs"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300"
          >
            Back to rig editor
          </Link>
        </div>

        {error ? (
          <p className="rounded border border-clay-500/40 bg-clay-500/10 p-3 text-xs text-clay-400">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded border border-sage-500/40 bg-sage-500/10 p-3 text-xs text-sage-300">
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {(["openai", "gemini"] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setProvider(entry)}
              className={`rounded border px-3 py-1.5 text-xs capitalize ${provider === entry ? "border-ochre-500/70 bg-ochre-500/10 text-paper-50" : "border-ink-700 text-mist-300"}`}
            >
              {entry}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void save()}
            className="rounded border border-ochre-500/60 px-3 py-1.5 text-xs text-ochre-300"
          >
            Save connectors
          </button>
          <button
            type="button"
            onClick={() => {
              setRig(savedRig);
              setMessage("Reverted to last saved calibration.");
            }}
            className="rounded border border-ink-700 px-3 py-1.5 text-xs text-mist-300"
          >
            Revert unsaved
          </button>
          <label className="flex items-center gap-2 text-xs text-mist-300">
            <input
              type="checkbox"
              checked={debug}
              onChange={(event) => setDebug(event.target.checked)}
            />
            Debug overlay
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <section className="rounded-lg border border-ink-700 bg-ink-950 p-3">
            <h2 className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">Parts</h2>
            <div className="mt-2 max-h-[560px] space-y-1 overflow-auto">
              {rig?.parts.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setPartId(entry.id);
                    setConnectorId(entry.connectors[0]?.id ?? "socket");
                    setRotation(0);
                  }}
                  className={`block w-full rounded px-2 py-1 text-left font-mono text-[10px] ${partId === entry.id ? "bg-ochre-500/15 text-ochre-200" : "text-mist-400 hover:text-paper-100"}`}
                >
                  {entry.id.replace("artisan_", "")}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-ink-700 bg-ink-950 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] text-mist-300">{partId}</span>
              <label className="text-[11px] text-mist-400">
                Zoom {zoom.toFixed(1)}×
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.1}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="ml-2 align-middle"
                />
              </label>
              <label className="text-[11px] text-mist-400">
                Joint rotate {rotation}°
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={1}
                  value={rotation}
                  onChange={(event) => setRotation(Number(event.target.value))}
                  className="ml-2 align-middle"
                />
              </label>
            </div>
            <div className="mt-3 overflow-auto rounded border border-ink-800 bg-black">
              {part && fileFor(part.id) ? (
                <div
                  ref={imageRef}
                  className="relative mx-auto touch-none select-none"
                  style={{
                    width: `${zoom * 100}%`,
                    aspectRatio: `${part.crop.width} / ${part.crop.height}`,
                  }}
                  onPointerMove={movePointer}
                  onPointerUp={() => setDrag(null)}
                  onPointerLeave={() => setDrag(null)}
                >
                  <img
                    src={`/api/studio/providers/stage-2b2/${provider}/pack/${fileFor(part.id)}`}
                    alt={part.id}
                    className="absolute inset-0 h-full w-full object-contain"
                    draggable={false}
                    style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center" }}
                  />
                  {debug
                    ? part.connectors.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          aria-label={`Connector ${entry.id}`}
                          onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(event.pointerId);
                            setConnectorId(entry.id);
                            setDrag(entry.id);
                          }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${entry.id === connectorId ? "border-cyan-300 bg-cyan-400/40" : "border-ochre-300 bg-ochre-400/30"}`}
                          style={{
                            left: `${entry.x * 100}%`,
                            top: `${entry.y * 100}%`,
                            width: entry.kind === "grip" ? 18 : 14,
                            height: entry.kind === "grip" ? 18 : 14,
                          }}
                          title={`${entry.id} · ${entry.x.toFixed(3)}, ${entry.y.toFixed(3)}`}
                        />
                      ))
                    : null}
                </div>
              ) : (
                <p className="p-8 text-center text-xs text-mist-500">Loading part…</p>
              )}
            </div>
            {parent ? (
              <div className="mt-3 rounded border border-ink-800 p-2">
                <p className="font-mono text-[10px] text-ochre-300">Parent: {parent.id}</p>
                {fileFor(parent.id) ? (
                  <img
                    src={`/api/studio/providers/stage-2b2/${provider}/pack/${fileFor(parent.id)}`}
                    alt={parent.id}
                    className="mt-2 max-h-32 object-contain"
                  />
                ) : null}
                <p className="mt-1 font-mono text-[10px] text-mist-500">
                  {part?.attachment
                    ? `${part.attachment.parentConnector} → ${part.attachment.childConnector}`
                    : "root"}
                </p>
              </div>
            ) : null}
          </section>

          <section className="space-y-3 rounded-lg border border-ink-700 bg-ink-950 p-3">
            <h2 className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">
              Connectors
            </h2>
            <div className="space-y-1">
              {part?.connectors.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setConnectorId(entry.id)}
                  className={`block w-full rounded px-2 py-1 text-left font-mono text-[10px] ${entry.id === connectorId ? "bg-cyan-500/10 text-cyan-200" : "text-mist-400"}`}
                >
                  {entry.id} · {entry.x.toFixed(3)}, {entry.y.toFixed(3)}
                </button>
              ))}
            </div>
            {connector ? (
              <div className="space-y-2 border-t border-ink-800 pt-3">
                <label className="block text-[11px] text-mist-400">
                  X
                  <input
                    type="number"
                    step={0.001}
                    value={connector.x}
                    onChange={(event) => updateConnector({ x: Number(event.target.value) })}
                    className="mt-1 w-full rounded border border-ink-700 bg-ink-900 px-2 py-1 text-paper-100"
                  />
                </label>
                <label className="block text-[11px] text-mist-400">
                  Y
                  <input
                    type="number"
                    step={0.001}
                    value={connector.y}
                    onChange={(event) => updateConnector({ y: Number(event.target.value) })}
                    className="mt-1 w-full rounded border border-ink-700 bg-ink-900 px-2 py-1 text-paper-100"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addConnector}
                    className="rounded border border-ink-700 px-2 py-1 text-[10px] text-mist-300"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={renameConnector}
                    className="rounded border border-ink-700 px-2 py-1 text-[10px] text-mist-300"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={removeConnector}
                    className="rounded border border-clay-500/40 px-2 py-1 text-[10px] text-clay-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : null}
            <div className="border-t border-ink-800 pt-3 text-[11px] leading-5 text-mist-500">
              Connector coordinates are normalized to the transparent registered sprite rect. The
              generated PNG is never modified. Arrow keys work in the numeric inputs for precise
              nudging.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
