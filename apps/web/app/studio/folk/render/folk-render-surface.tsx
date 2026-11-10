"use client";

import { useEffect, useState } from "react";

import { loadFolkAssets } from "@/lib/folk/assets";
import { loadFolkConfig } from "@/lib/folk/config";
import { FolkRenderer } from "@/lib/folk/renderer";
import { evaluateFolkFrame } from "@/lib/folk/evaluate";

export interface FolkRenderApi {
  readonly ready: boolean;
  readonly frameCount: number;
  readonly fps: number;
  readonly title: string;
  readonly specVersion: string;
  readonly specHash: string;
  readonly configUrl: string;
  readonly packUrl: string | null;
  renderFrame(frame: number, width: number, height: number): string;
  renderDebug(frame: number, width: number, height: number): string;
  renderContactSheet(frames: readonly number[]): string;
  inspectFrame(frame: number): unknown;
}

declare global {
  interface Window {
    __FABLEON_FOLK__?: FolkRenderApi;
  }
}

export function FolkRenderSurface() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const configUrl = params.get("config") ?? "/assets/folk-pilot/film.json";
        const packUrl = params.get("pack");
        const [config, assets] = await Promise.all([
          loadFolkConfig(configUrl),
          packUrl
            ? loadFolkAssets({
                manifestUrl: `${packUrl.replace(/\/+$/, "")}/manifest.json`,
                baseUrl: packUrl,
              })
            : loadFolkAssets(),
        ]);
        if (cancelled) return;
        const renderer = new FolkRenderer(assets, config);
        const configResponse = await fetch(configUrl, { cache: "no-store" });
        const configText = await configResponse.text();
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(configText));
        const specHash = [...new Uint8Array(digest)]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
        const api: FolkRenderApi = {
          ready: true,
          frameCount: 720,
          fps: 24,
          title: config.title,
          specVersion: config.specVersion,
          specHash,
          configUrl,
          packUrl,
          renderFrame: (frame, width, height) => renderer.renderFrameDataUrl(frame, width, height),
          renderDebug: (frame, width, height) => {
            const canvas = document.createElement("canvas");
            const source = renderer.renderFrame(frame, { debug: true });
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Canvas 2D unavailable.");
            context.drawImage(source, 0, 0, width, height);
            return canvas.toDataURL("image/png");
          },
          renderContactSheet: (frames) => renderer.renderContactSheet(frames),
          inspectFrame: (frame) => {
            const state = evaluateFolkFrame(config, frame);
            return {
              shot: state.shot.id,
              background: state.background,
              artisan: state.artisan
                ? { x: state.artisan.placement.x, scale: state.artisan.placement.scale }
                : null,
              horse: state.horse
                ? { x: state.horse.placement.x, scale: state.horse.placement.scale }
                : null,
              cart: state.cart ? { x: state.cart.placement.x } : null,
              bell: state.bell,
            };
          },
        };
        window.__FABLEON_FOLK__ = api;
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      }
    })();
    return () => {
      cancelled = true;
      delete window.__FABLEON_FOLK__;
    };
  }, []);

  return (
    <div data-testid="folk-render-surface" className="p-6 font-mono text-xs text-mist-400">
      {error ? (
        <p role="alert" className="text-clay-500">
          {error}
        </p>
      ) : (
        <p>Folk film render surface. Waiting for local assets…</p>
      )}
    </div>
  );
}
