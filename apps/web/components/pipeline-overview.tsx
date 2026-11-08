import { PIPELINE_STAGES } from "@fableon/shared";

import { Badge } from "@/components/ui/badge";

export function PipelineOverview() {
  return (
    <section id="pipeline" aria-labelledby="pipeline-heading" className="border-t border-ink-800">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:py-28 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ochre-400 uppercase">
            The pipeline
          </p>
          <h2
            id="pipeline-heading"
            className="mt-4 font-serif text-4xl leading-[1.08] text-balance text-paper-50 md:text-5xl"
          >
            One story, ten deliberate stages.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-mist-300">
            Fableon is designed as a chain of replaceable engines rather than a single black box.
            Scene data stays renderer-independent, so paint, motion, camera, and composition can
            evolve without rebuilding the studio.
          </p>
          <p className="mt-5 max-w-md text-xs leading-6 text-mist-500">
            Stages below describe intended behavior. Phase 2 renders painted Canvas 2D frames from
            the schema and deterministic timeline; motion, camera, audio, AI, and composition remain
            future work.
          </p>
        </div>

        <ol className="grid gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700 sm:grid-cols-2">
          {PIPELINE_STAGES.map((stage) => (
            <li key={stage.id} className="group bg-ink-900 p-5 transition-colors hover:bg-ink-850">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] tracking-[0.16em] text-mist-500">
                  {String(stage.order).padStart(2, "0")}
                </span>
                <Badge variant="outline">Phase {stage.phase}</Badge>
              </div>
              <h3 className="mt-5 font-serif text-xl text-paper-100">{stage.title}</h3>
              <p className="mt-2 text-[13px] leading-6 text-mist-400">{stage.summary}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
