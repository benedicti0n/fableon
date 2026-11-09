"use client";

import { useEffect, useState } from "react";

import { loadFilmAssets } from "@/lib/film/assets";
import { FilmRenderer } from "@/lib/film/renderer";
import {
  FILM_SPEC_VERSION,
  FILM_TOTAL_FRAMES,
  WHERE_THE_LIGHT_LANDS,
} from "@/lib/film/where-the-light-lands";

export interface FilmRenderApi {
  readonly ready: boolean;
  readonly frameCount: number;
  readonly fps: number;
  readonly title: string;
  readonly specVersion: string;
  readonly specHash: string;
  renderFrame(frame: number, width: number, height: number): string;
  renderTimelineDiagram(): string;
  renderContactSheet(frames: readonly number[]): string;
}

declare global {
  interface Window {
    __FABLEON_FILM__?: FilmRenderApi;
  }
}

export function FilmRenderSurface() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const assets = await loadFilmAssets();
        if (cancelled) return;
        const renderer = new FilmRenderer(assets);
        const specJson = JSON.stringify(WHERE_THE_LIGHT_LANDS);
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(specJson));
        const specHash = [...new Uint8Array(digest)]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
        const api: FilmRenderApi = {
          ready: true,
          frameCount: FILM_TOTAL_FRAMES,
          fps: 24,
          title: "Where the Light Lands",
          specVersion: FILM_SPEC_VERSION,
          specHash,
          renderFrame: (frame, width, height) => renderer.renderFrameDataUrl(frame, width, height),
          renderTimelineDiagram: () => renderer.renderTimelineDiagram(),
          renderContactSheet: (frames) => renderer.renderContactSheet(frames),
        };
        window.__FABLEON_FILM__ = api;
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      }
    })();
    return () => {
      cancelled = true;
      delete window.__FABLEON_FILM__;
    };
  }, []);

  return (
    <div data-testid="film-render-surface" className="p-6 font-mono text-xs text-mist-400">
      {error ? (
        <p role="alert" className="text-clay-500">
          {error}
        </p>
      ) : (
        <p>Film render surface. Waiting for local assets…</p>
      )}
    </div>
  );
}
