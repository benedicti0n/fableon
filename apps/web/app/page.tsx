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
                  Phase 2 · Paint engine
                </p>
                <h2
                  id="foundation-heading"
                  className="mt-4 max-w-md font-serif text-4xl leading-[1.08] text-balance text-paper-50"
                >
                  A painted frame, rendered from the data.
                </h2>
              </div>
              <p className="max-w-lg text-sm leading-7 text-mist-400 md:justify-self-end">
                Phase 2 adds seeded paint primitives, a Canvas 2D renderer, local asset resolution,
                and a live Studio preview with playback and PNG export. Motion, camera, and sound
                remain future phases.
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
                <h3 className="mt-6 font-serif text-xl text-paper-100">A real scene contract</h3>
                <p className="mt-3 text-[13px] leading-6 text-mist-400">
                  Versioned project, scene, layer, transform, and keyframe data with strict runtime
                  validation, safe asset references, and a four-scene bird-in-the-forest fixture.
                </p>
                <p className="mt-5 font-mono text-[10px] tracking-[0.15em] text-mist-500 uppercase">
                  Schema · Implemented
                </p>
              </article>

              <article className="rounded-xl border border-ink-700 bg-ink-900 p-6">
                <span className="flex size-10 items-center justify-center rounded-lg border border-ink-600 bg-ink-800 text-mist-300">
                  <FeatherIcon className="size-5" />
                </span>
                <h3 className="mt-6 font-serif text-xl text-paper-100">A painterly renderer</h3>
                <p className="mt-3 text-[13px] leading-6 text-mist-400">
                  Seeded organic strokes, dry brush, washes, and paper grain generate the benchmark
                  art. Canvas 2D composes the real FramePlan into stable 1920×1080 frames.
                </p>
                <p className="mt-5 font-mono text-[10px] tracking-[0.15em] text-mist-500 uppercase">
                  Paint + render · Implemented
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
                  Walk through the painted preview.
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-mist-300">
                  The Studio is connected to real scene data, the deterministic evaluator, and a
                  Canvas 2D paint renderer. Scrub frames, play the timeline, inspect transforms, and
                  export the current frame as PNG.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <ButtonLink href="/studio">
                    Open the Studio
                    <span aria-hidden="true">→</span>
                  </ButtonLink>
                  <span className="font-mono text-[10px] tracking-[0.13em] text-mist-500 uppercase">
                    Artistic quality pending human review
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
