import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { StudioHeader } from "@/components/studio/studio-header";
import { readFolkManifest } from "@/lib/folk/manifest";

export const metadata: Metadata = {
  title: "Folk Asset Workshop",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function FolkAssetsPage() {
  const manifest = await readFolkManifest();
  const characters = Object.entries(manifest.characters);
  const backgrounds = Object.entries(manifest.backgrounds);
  return (
    <div className="min-h-screen">
      <StudioHeader />
      <main className="mx-auto max-w-[1600px] space-y-6 px-5 py-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
              Phase 5 · asset workshop
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-paper-50">
              Folk asset provenance
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist-400">
              Original local vector masters decomposed into {manifest.parts.length} transparent
              parts. AI image generation is blocked on this host; no paid provider was contacted.
              All artwork is marked pending artistic approval.
            </p>
          </div>
          <Link
            href="/studio/folk"
            className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-mist-300 hover:text-paper-50"
          >
            Back to production
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
            <span className="font-mono text-[9px] uppercase tracking-wide text-mist-500">
              Generation mode
            </span>
            <p className="mt-1 text-sm text-paper-100">{manifest.generationMode}</p>
          </div>
          <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
            <span className="font-mono text-[9px] uppercase tracking-wide text-mist-500">
              AI generation
            </span>
            <p className="mt-1 text-sm text-clay-400">{manifest.aiGeneration.status}</p>
            <p className="mt-1 text-[11px] leading-5 text-mist-500">
              {manifest.aiGeneration.reason}
            </p>
          </div>
          <div className="rounded-lg border border-ink-700 bg-ink-900 p-4">
            <span className="font-mono text-[9px] uppercase tracking-wide text-mist-500">
              Paid API calls
            </span>
            <p className="mt-1 text-sm text-paper-100">{manifest.aiGeneration.paidApiCalls}</p>
          </div>
        </div>

        {characters.map(([name, character]) => (
          <section key={name} className="rounded-lg border border-ink-700 bg-ink-950 p-4">
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <h2 className="font-serif text-2xl capitalize text-paper-50">{name}</h2>
                <p className="mt-1 font-mono text-[10px] text-mist-500">{character.masterSvg}</p>
                <div className="mt-3 overflow-hidden rounded border border-ink-700 bg-[#f7e8c8] p-2">
                  <Image
                    src={`/assets/folk-pilot/${character.masterPng}`}
                    alt={`${name} master artwork`}
                    width={character.width}
                    height={character.height}
                    className="h-auto w-full"
                    unoptimized
                  />
                </div>
                <p className="mt-2 break-all font-mono text-[9px] text-mist-600">
                  master sha256 {character.masterPngSha256.slice(0, 20)}…
                </p>
                <p className="mt-1 font-mono text-[9px] text-mist-500">
                  {character.parts.length} exported parts
                </p>
              </div>
              <div className="grid content-start gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {character.parts.map((part) => (
                  <div key={part.id} className="rounded border border-ink-800 bg-ink-900 p-2">
                    <div className="flex h-24 items-center justify-center rounded bg-[#f7e8c8] p-1">
                      <Image
                        src={`/assets/folk-pilot/${part.file}`}
                        alt={part.id}
                        width={part.width}
                        height={part.height}
                        className="max-h-20 w-auto object-contain"
                        unoptimized
                      />
                    </div>
                    <p className="mt-2 truncate font-mono text-[10px] text-paper-200">{part.id}</p>
                    <p className="font-mono text-[9px] text-mist-500">
                      {part.width}×{part.height} · {Math.round(part.bytes / 1024)} KB
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-mist-600">
                      {part.sha256.slice(0, 16)}…
                    </p>
                    <p className="mt-1 text-[9px] text-clay-400">{part.reviewStatus}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="font-serif text-2xl text-paper-50">Backgrounds</h2>
          {backgrounds.map(([name, background]) => (
            <div key={name} className="rounded-lg border border-ink-700 bg-ink-950 p-4">
              <p className="font-mono text-[10px] uppercase tracking-wide text-ochre-400">{name}</p>
              <div className="mt-3 overflow-hidden rounded border border-ink-700">
                <Image
                  src={`/assets/folk-pilot/${background.masterPng}`}
                  alt={`${name} background master`}
                  width={background.width}
                  height={background.height}
                  className="h-auto w-full"
                  unoptimized
                />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {background.layers.map((layer) => (
                  <div key={layer.id} className="rounded border border-ink-800 bg-ink-900 p-2">
                    <div className="overflow-hidden rounded bg-[#1a0d08]">
                      <Image
                        src={`/assets/folk-pilot/${layer.file}`}
                        alt={`${name} ${layer.id} layer`}
                        width={background.width}
                        height={background.height}
                        className="h-auto w-full"
                        unoptimized
                      />
                    </div>
                    <p className="mt-2 font-mono text-[10px] text-paper-200">{layer.id}</p>
                    <p className="font-mono text-[9px] text-mist-500">depth {layer.depth}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
