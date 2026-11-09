import type { Metadata } from "next";
import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { StudioHeader } from "@/components/studio/studio-header";
import { parseFolkConfig } from "@/lib/folk/config";

export const metadata: Metadata = {
  title: "Folk Shot Board",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function readConfig() {
  const candidates = [
    path.join(process.cwd(), "public", "assets", "folk-pilot", "film.json"),
    path.join(process.cwd(), "apps", "web", "public", "assets", "folk-pilot", "film.json"),
  ];
  for (const candidate of candidates) {
    try {
      return parseFolkConfig(JSON.parse(await readFile(candidate, "utf8")) as unknown);
    } catch {
      // Try the next location.
    }
  }
  throw new Error("Folk film config could not be read.");
}

export default async function FolkProductionPage() {
  const config = await readConfig();
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] space-y-5 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5 · shot board
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              {config.title}
            </h1>
            <p className="mt-2 text-sm text-mist-400">
              Five shots · 720 frames · 30.000 s · one artisan, one horse, one cart, one brass bell.
            </p>
          </div>
          <Link
            href="/studio/folk"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300 hover:text-paper-50"
          >
            Open production preview
          </Link>
        </div>

        <div className="space-y-3">
          {config.shots.map((shot, index) => (
            <section
              key={shot.id}
              className="grid gap-4 rounded-lg border border-ink-700 bg-ink-950 p-4 lg:grid-cols-[130px_minmax(0,1fr)_300px]"
            >
              <div>
                <p className="font-mono text-[10px] text-ochre-400">
                  SHOT {String(index + 1).padStart(3, "0")}
                </p>
                <p className="mt-1 font-serif text-xl text-paper-50">{shot.title}</p>
                <p className="mt-2 font-mono text-[10px] text-mist-500">
                  {shot.startFrame}–{shot.startFrame + shot.frameCount - 1}
                </p>
                <p className="font-mono text-[10px] text-mist-500">
                  {shot.frameCount} frames · {(shot.frameCount / 24).toFixed(0)} s
                </p>
              </div>
              <div className="space-y-2 text-xs leading-5 text-mist-400">
                <p>{shot.notes}</p>
                <div className="flex flex-wrap gap-4 font-mono text-[10px] text-mist-500">
                  <span>background: {shot.background}</span>
                  <span>
                    in: {shot.transitionIn.type}
                    {shot.transitionIn.frames ? ` ${shot.transitionIn.frames}f` : ""}
                  </span>
                  <span>
                    out:{" "}
                    {shot.transitionOut
                      ? `${shot.transitionOut.type} ${shot.transitionOut.frames}f`
                      : "cut"}
                  </span>
                  <span>bell: {shot.bell.mode}</span>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded border border-ink-800 bg-ink-900 p-2">
                  <dt className="font-mono text-[9px] uppercase text-mist-500">Artisan</dt>
                  <dd className="mt-1 text-paper-200">{shot.artisan?.action ?? "off screen"}</dd>
                  <dd className="font-mono text-[9px] text-mist-500">
                    {shot.artisan ? `${shot.artisan.fromX}→${shot.artisan.toX}` : "—"}
                  </dd>
                </div>
                <div className="rounded border border-ink-800 bg-ink-900 p-2">
                  <dt className="font-mono text-[9px] uppercase text-mist-500">Horse</dt>
                  <dd className="mt-1 text-paper-200">{shot.horse?.action ?? "off screen"}</dd>
                  <dd className="font-mono text-[9px] text-mist-500">
                    {shot.horse ? `${shot.horse.fromX}→${shot.horse.toX}` : "—"}
                  </dd>
                </div>
                <div className="rounded border border-ink-800 bg-ink-900 p-2">
                  <dt className="font-mono text-[9px] uppercase text-mist-500">Cart</dt>
                  <dd className="mt-1 text-paper-200">{shot.cart ? "rolling" : "off screen"}</dd>
                  <dd className="font-mono text-[9px] text-mist-500">
                    {shot.cart ? `offset ${shot.cart.offsetX}` : "—"}
                  </dd>
                </div>
                <div className="rounded border border-ink-800 bg-ink-900 p-2">
                  <dt className="font-mono text-[9px] uppercase text-mist-500">Camera</dt>
                  <dd className="mt-1 text-paper-200">
                    {shot.camera[0]?.zoom.toFixed(2)}→{shot.camera.at(-1)?.zoom.toFixed(2)} zoom
                  </dd>
                  <dd className="font-mono text-[9px] text-mist-500">{shot.camera.length} keys</dd>
                </div>
              </dl>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
