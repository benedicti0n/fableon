/**
 * The intended end-to-end Fableon pipeline, surfaced in the product UI and
 * documentation. This is a roadmap artifact, not a claim that a stage works.
 *
 * Pipeline stages are deliberately independent from any renderer or AI
 * provider. Phase assignments refer to the development roadmap in
 * docs/ROADMAP.md.
 */
export interface PipelineStage {
  readonly id: string;
  readonly order: number;
  readonly title: string;
  readonly summary: string;
  readonly phase: number;
}

export const PIPELINE_STAGES = [
  {
    id: "idea",
    order: 1,
    title: "Idea",
    summary: "Shape a premise, audience, tone, and visual direction.",
    phase: 6,
  },
  {
    id: "script",
    order: 2,
    title: "Script",
    summary: "Turn the premise into narration and story beats.",
    phase: 6,
  },
  {
    id: "scene-breakdown",
    order: 3,
    title: "Scene breakdown",
    summary: "Split the story into timed, editable scenes.",
    phase: 1,
  },
  {
    id: "storyboard",
    order: 4,
    title: "Storyboard",
    summary: "Plan composition, character blocking, and camera movement.",
    phase: 6,
  },
  {
    id: "assets",
    order: 5,
    title: "Asset generation",
    summary: "Create characters, environments, and painterly elements.",
    phase: 7,
  },
  {
    id: "animation",
    order: 6,
    title: "Animation",
    summary: "Drive layered, deterministic character and camera motion.",
    phase: 3,
  },
  {
    id: "narration",
    order: 7,
    title: "Narration",
    summary: "Generate and align voice performance to scene timing.",
    phase: 8,
  },
  {
    id: "subtitles",
    order: 8,
    title: "Subtitles",
    summary: "Derive accessible, editable captions from narration.",
    phase: 8,
  },
  {
    id: "composition",
    order: 9,
    title: "Composition",
    summary: "Composite picture, motion, audio, and titles into frames.",
    phase: 9,
  },
  {
    id: "export",
    order: 10,
    title: "Export",
    summary: "Render a reliable 1080p master with predictable results.",
    phase: 9,
  },
] as const satisfies readonly PipelineStage[];

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];
