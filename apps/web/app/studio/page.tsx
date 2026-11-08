import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import {
  FrameIcon,
  GalleryIcon,
  LayersIcon,
  ScenesIcon,
  SlidersIcon,
  TimelineIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";

export const metadata: Metadata = {
  title: "Studio",
  description:
    "The Fableon Studio shell: workspace, scenes, canvas, timeline, assets, and properties.",
};

export default function StudioPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <h1 className="sr-only">Fableon Studio</h1>
      <header className="flex min-h-14 flex-wrap items-center gap-3 border-b border-ink-700 bg-ink-900/90 px-4 py-2">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Fableon home">
          <BrandMark className="size-8" />
          <span className="hidden font-serif text-lg tracking-tight text-paper-50 sm:inline">
            Fableon
          </span>
        </Link>
        <span aria-hidden="true" className="hidden h-5 w-px bg-ink-600 sm:block" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-paper-100">Untitled project</p>
          <p className="truncate font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
            No scene data
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge variant="accent" className="hidden md:inline-flex">
            Phase 0 shell
          </Badge>
          <Link
            href="/"
            className="rounded-md border border-ink-700 px-2.5 py-1.5 text-[11px] text-mist-300 transition-colors hover:border-ink-500 hover:text-paper-50"
          >
            Exit studio
          </Link>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-[15rem_minmax(0,1fr)_17rem]">
        <aside
          aria-label="Project and scenes"
          className="flex flex-col gap-3 border-b border-ink-700 bg-ink-900/40 p-3 lg:border-r lg:border-b-0"
        >
          <Panel title="Project" bodyClassName="p-2.5">
            <EmptyState
              icon={<ScenesIcon className="size-4" />}
              title="No project open"
              description="Project creation, saving, and loading arrive in Phase 1."
              phase="Phase 1"
              className="min-h-40"
            />
          </Panel>

          <Panel title="Scenes" bodyClassName="p-2.5">
            <EmptyState
              icon={<LayersIcon className="size-4" />}
              title="No scenes yet"
              description="Scene breakdown, ordering, and selection will live here."
              phase="Phase 1"
              className="min-h-40"
            />
          </Panel>
        </aside>

        <main
          aria-label="Canvas and timeline"
          className="flex min-w-0 flex-col gap-3 border-b border-ink-700 p-3 lg:border-b-0"
        >
          <Panel title="Canvas / Preview" bodyClassName="flex flex-col gap-2.5">
            <div
              className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-ink-700 bg-[#080a0b]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgb(38 43 52 / 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgb(38 43 52 / 0.3) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            >
              <span
                aria-hidden="true"
                className="absolute top-3 left-3 size-3 border-t border-l border-ink-500"
              />
              <span
                aria-hidden="true"
                className="absolute top-3 right-3 size-3 border-t border-r border-ink-500"
              />
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-3 size-3 border-b border-l border-ink-500"
              />
              <span
                aria-hidden="true"
                className="absolute right-3 bottom-3 size-3 border-r border-b border-ink-500"
              />

              <span className="absolute top-3 right-6 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                1920 × 1080 · 16:9
              </span>
              <span className="absolute bottom-3 left-6 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
                Scene 00 · Empty
              </span>

              <div className="relative flex max-w-sm flex-col items-center gap-3 px-6 text-center">
                <span className="flex size-10 items-center justify-center rounded-full border border-ink-600 bg-ink-800 text-mist-400">
                  <FrameIcon className="size-5" />
                </span>
                <p className="font-serif text-xl text-paper-100">An empty stage</p>
                <p className="text-xs leading-5 text-mist-400">
                  Scene rendering and playback arrive in Phase 2, after the scene and timeline model
                  lands in Phase 1.
                </p>
                <Badge variant="outline">No renderer connected</Badge>
              </div>
            </div>
            <p className="px-0.5 text-[11px] leading-5 text-mist-500">
              Placeholder stage — no renderer or asset data is connected.
            </p>
          </Panel>

          <Panel title="Timeline" bodyClassName="p-2.5">
            <EmptyState
              icon={<TimelineIcon className="size-4" />}
              title="Timeline is empty"
              description="Scene timing, layers, and keyframes will live here once the Phase 1 scene model exists."
              phase="Phase 1"
              className="min-h-28 py-5"
            />
          </Panel>
        </main>

        <aside
          aria-label="Assets and properties"
          className="flex flex-col gap-3 border-ink-700 bg-ink-900/40 p-3 lg:border-l"
        >
          <Panel title="Assets" bodyClassName="p-2.5">
            <EmptyState
              icon={<GalleryIcon className="size-4" />}
              title="No assets"
              description="Character sheets, environments, audio, and generated media arrive with the asset pipeline in Phase 7."
              phase="Phase 7"
              className="min-h-40"
            />
          </Panel>

          <Panel title="Properties" bodyClassName="p-2.5">
            <EmptyState
              icon={<SlidersIcon className="size-4" />}
              title="No selection"
              description="Selection-aware controls arrive with the visual editor in Phase 5."
              phase="Phase 5"
              className="min-h-40"
            />
          </Panel>
        </aside>
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-700 bg-ink-900 px-4 py-2 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
        <span className="flex items-center gap-2 text-mist-300">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ochre-400" />
          Foundation mode
        </span>
        <span className="hidden sm:inline">Renderer — not connected</span>
        <span className="hidden md:inline">Assets — 0</span>
        <span className="hidden md:inline">Audio — not connected</span>
        <span className="ml-auto">Fableon · Phase 0</span>
      </footer>
    </div>
  );
}
