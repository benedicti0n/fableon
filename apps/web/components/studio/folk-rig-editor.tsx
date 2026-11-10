"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ARTISAN_RIG, CART_RIG, HORSE_RIG } from "@fableon/folk-motion";

import { StudioHeader } from "@/components/studio/studio-header";
import { loadFolkAssets } from "@/lib/folk/assets";
import { loadFolkConfig, type FolkFilmConfig } from "@/lib/folk/config";
import { FolkRenderer } from "@/lib/folk/renderer";

type ActorId = "artisan" | "horse" | "cart";

const PRESETS: Record<ActorId, { readonly label: string; readonly frame: number }[]> = {
  artisan: [
    { label: "Walk · shot 2", frame: 200 },
    { label: "Idle · shot 3", frame: 340 },
    { label: "Reach / grip · shot 4", frame: 500 },
    { label: "Watch · shot 5", frame: 660 },
  ],
  horse: [
    { label: "Walk · shot 3", frame: 340 },
    { label: "Nod · shot 4", frame: 520 },
    { label: "Walk away · shot 5", frame: 660 },
  ],
  cart: [
    { label: "Rolling · shot 3", frame: 340 },
    { label: "Parked · shot 4", frame: 500 },
    { label: "Rolling away · shot 5", frame: 660 },
  ],
};

export interface FolkRigEditorProps {
  readonly packUrl?: string;
}

export function FolkRigEditor({ packUrl }: FolkRigEditorProps = {}) {
  const [config, setConfig] = useState<FolkFilmConfig | null>(null);
  const [renderer, setRenderer] = useState<FolkRenderer | null>(null);
  const [actor, setActor] = useState<ActorId>("artisan");
  const [frame, setFrame] = useState(200);
  const [nodeId, setNodeId] = useState("nearForearm");
  const [extraRotation, setExtraRotation] = useState(0);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rig = actor === "artisan" ? ARTISAN_RIG : actor === "horse" ? HORSE_RIG : CART_RIG;
  const nodes = useMemo(
    () => [...rig.nodes].sort((left, right) => left.drawOrder - right.drawOrder),
    [rig],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nextConfig, assets] = await Promise.all([
          loadFolkConfig(),
          packUrl
            ? loadFolkAssets({
                manifestUrl: `${packUrl.replace(/\/+$/, "")}/manifest.json`,
                baseUrl: packUrl,
              })
            : loadFolkAssets(),
        ]);
        if (!cancelled) {
          setConfig(nextConfig);
          setRenderer(new FolkRenderer(assets, nextConfig));
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : String(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packUrl]);

  useEffect(() => {
    if (!renderer || !config) return;
    const handle = requestAnimationFrame(() => {
      try {
        setImage(renderer.renderRigTestDataUrl(frame, 1280, 720, actor, nodeId, extraRotation));
        setError(null);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [renderer, config, frame, actor, nodeId, extraRotation]);

  function selectActor(next: ActorId): void {
    setActor(next);
    const preset = PRESETS[next][0];
    if (preset) setFrame(preset.frame);
    setNodeId(
      next === "artisan" ? "nearForearm" : next === "horse" ? "nearFrontLower" : "nearWheel",
    );
    setExtraRotation(0);
  }

  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] space-y-5 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5 · rig editor
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              Joint and preset inspection
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
              The skeleton overlay is drawn from the same resolved matrices used for the film.
              Rotating a joint here changes the actual Canvas output, not a decorative slider.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/studio/folk/rigs/connectors"
              className="rounded-md border border-ochre-500/60 bg-ochre-500/10 px-3 py-2 text-xs text-ochre-200"
            >
              Connector calibration
            </Link>
            <Link
              href="/studio/folk"
              className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300 hover:text-paper-50"
            >
              Back to production
            </Link>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
          >
            {error}
          </p>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3 rounded-lg border border-ink-700 bg-ink-950 p-4">
            <div className="overflow-hidden rounded border border-ink-700 bg-black">
              {image ? (
                <img
                  data-testid="folk-rig-canvas"
                  src={image}
                  alt="Folk rig test frame"
                  className="aspect-video w-full object-contain"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center font-mono text-xs text-mist-500">
                  Loading rig…
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFrame((value) => Math.max(0, value - 1))}
                className="rounded border border-ink-700 px-3 py-1.5 text-xs text-mist-300"
              >
                Previous frame
              </button>
              <button
                type="button"
                onClick={() => setFrame((value) => Math.min(719, value + 1))}
                className="rounded border border-ink-700 px-3 py-1.5 text-xs text-mist-300"
              >
                Next frame
              </button>
              <span className="font-mono text-[11px] text-mist-400">
                frame {frame} · {(frame / 24).toFixed(2)} s
              </span>
              <input
                aria-label="Rig frame"
                type="range"
                min={0}
                max={719}
                value={frame}
                onChange={(event) => setFrame(Number(event.target.value))}
                className="min-w-0 flex-1 accent-ochre-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-lg border border-ink-700 bg-ink-950 p-4">
              <h2 className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">
                Actor
              </h2>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["artisan", "horse", "cart"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectActor(id)}
                    className={`rounded border px-2 py-2 text-xs capitalize ${
                      actor === id
                        ? "border-ochre-500/70 bg-ochre-500/10 text-paper-50"
                        : "border-ink-700 text-mist-300"
                    }`}
                  >
                    {id}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS[actor].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setFrame(preset.frame)}
                    className="rounded border border-ink-700 px-2 py-1 text-[10px] text-mist-400 hover:text-paper-100"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-ink-700 bg-ink-950 p-4">
              <h2 className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">
                Joint
              </h2>
              <select
                aria-label="Rig joint"
                value={nodeId}
                onChange={(event) => {
                  setNodeId(event.target.value);
                  setExtraRotation(0);
                }}
                className="mt-2 w-full rounded border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-paper-100"
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.id} · pivot {Math.round(node.pivot.x)},{Math.round(node.pivot.y)}
                  </option>
                ))}
              </select>
              <label className="mt-3 block text-xs text-mist-400">
                Extra rotation: {extraRotation}°
                <input
                  aria-label="Extra joint rotation"
                  type="range"
                  min={-60}
                  max={60}
                  step={1}
                  value={extraRotation}
                  onChange={(event) => setExtraRotation(Number(event.target.value))}
                  className="mt-2 w-full accent-ochre-500"
                />
              </label>
              <button
                type="button"
                onClick={() => setExtraRotation(0)}
                className="mt-2 rounded border border-ink-700 px-3 py-1.5 text-[10px] text-mist-400"
              >
                Reset joint
              </button>
            </section>

            <section className="rounded-lg border border-ink-700 bg-ink-950 p-4">
              <h2 className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">
                Hierarchy
              </h2>
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto font-mono text-[10px] text-mist-400">
                {nodes.map((node) => (
                  <li key={node.id} className="flex justify-between gap-2">
                    <span className={node.id === nodeId ? "text-ochre-300" : ""}>{node.id}</span>
                    <span className="text-mist-600">{node.parentId ?? "root"}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
