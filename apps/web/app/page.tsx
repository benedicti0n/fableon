import { BRAND } from "@fableon/shared";

import { FeatherIcon, FrameIcon, LayersIcon } from "@/components/icons";
import { ForestPlate } from "@/components/forest-plate";
import { PipelineOverview } from "@/components/pipeline-overview";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="mx-auto grid max-w-6xl gap-14 px-6 pt-16 pb-20 md:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-28">
          <div>
            <Badge variant="accent">{BRAND.phaseLabel}</Badge>
            <p className="mt-7 font-mono text-[10px] tracking-[0.22em] text-mist-400 uppercase">
              AI-native animation studio
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.98] tracking-tight text-balance text-paper-50 sm:text-6xl lg:text-[4.4rem]">
              Stories, <span className="text-ochre-300">painted</span> into motion.
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-7 text-mist-300">
              {BRAND.description} Start with an idea, shape the story, paint the world, and direct
              the motion — without locking the work to a single renderer or model.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/studio">
                Enter the Studio
                <span aria-hidden="true">→</span>
              </ButtonLink>
              <ButtonLink href="#pipeline" variant="secondary">
                Explore the pipeline
              </ButtonLink>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-3 gap-y-2 font-mono text-[10px] tracking-[0.13em] text-mist-500 uppercase">
              <li>Renderer-independent</li>
              <li aria-hidden="true" className="text-ink-500">
                /
              </li>
              <li>Versioned scene data</li>
              <li aria-hidden="true" className="text-ink-500">
                /
              </li>
              <li>Deterministic motion</li>
            </ul>
          </div>

          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <ForestPlate />
          </div>
        </section>

        <PipelineOverview />

        <section
          aria-labelledby="foundation-heading"
          className="border-t border-ink-800 bg-ink-900/30"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-end">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
                  Phase 0 · Foundation
                </p>
                <h2
                  id="foundation-heading"
                  className="mt-4 max-w-md font-serif text-4xl leading-[1.08] text-balance text-paper-50"
                >
                  A narrow base, built to carry a studio.
                </h2>
              </div>
              <p className="max-w-lg text-sm leading-7 text-mist-400 md:justify-self-end">
                Phase 0 deliberately stops before scene rendering. It puts the workspace, interface
                structure, quality gates, and architectural boundaries in place so later phases can
                be built and replaced independently.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-ink-700 bg-ink-900 p-6">
                <span className="flex size-10 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-ochre-300">
                  <LayersIcon className="size-5" />
                </span>
                <h3 className="mt-6 font-serif text-xl text-paper-100">A workspace with a spine</h3>
                <p className="mt-3 text-[13px] leading-6 text-mist-400">
                  A pnpm monorepo with strict TypeScript, shared product contracts, and one
                  reproducible path for linting, testing, and building.
                </p>
                <p className="mt-5 font-mono text-[10px] tracking-[0.15em] text-mist-500 uppercase">
                  Foundation · In place
                </p>
              </article>

              <article className="rounded-xl border border-ink-700 bg-ink-900 p-6">
                <span className="flex size-10 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-sage-400">
                  <FrameIcon className="size-5" />
                </span>
                <h3 className="mt-6 font-serif text-xl text-paper-100">A studio-shaped shell</h3>
                <p className="mt-3 text-[13px] leading-6 text-mist-400">
                  Project, scenes, canvas, timeline, assets, and properties are laid out as explicit
                  placeholders. Nothing pretends to be a working control.
                </p>
                <p className="mt-5 font-mono text-[10px] tracking-[0.15em] text-mist-500 uppercase">
                  Interface · Placeholder
                </p>
              </article>

              <article className="rounded-xl border border-ink-700 bg-ink-900 p-6">
                <span className="flex size-10 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-mist-300">
                  <FeatherIcon className="size-5" />
                </span>
                <h3 className="mt-6 font-serif text-xl text-paper-100">An authored direction</h3>
                <p className="mt-3 text-[13px] leading-6 text-mist-400">
                  Architecture, roadmap, MVP scope, and development protocol are written down before
                  engines, providers, or storage choices harden around assumptions.
                </p>
                <p className="mt-5 font-mono text-[10px] tracking-[0.15em] text-mist-500 uppercase">
                  Documentation · Provisional
                </p>
              </article>
            </div>
          </div>
        </section>

        <section aria-labelledby="studio-cta-heading" className="border-t border-ink-800">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 px-6 py-10 md:px-12 md:py-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-32 right-0 size-96 rounded-full bg-ochre-500/10 blur-3xl"
              />
              <div className="relative max-w-2xl">
                <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
                  Enter the workspace
                </p>
                <h2
                  id="studio-cta-heading"
                  className="mt-4 font-serif text-4xl leading-tight text-balance text-paper-50 md:text-5xl"
                >
                  Walk through the studio shell.
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-mist-300">
                  The layout anticipates real scene work while every unfinished capability is
                  labeled. It is the groundwork for the Phase 1 scene model and timeline.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <ButtonLink href="/studio">
                    Open the Studio
                    <span aria-hidden="true">→</span>
                  </ButtonLink>
                  <span className="font-mono text-[10px] tracking-[0.13em] text-mist-500 uppercase">
                    No project data or renderer connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
