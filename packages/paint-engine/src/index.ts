export { createSeededRandom, derivePaintSeed, hashSeed } from "./random";
export { hexLuminance, hexToRgba, mixHexColors } from "./color";
export { distance, normalAt, sampleCurve } from "./geometry";
export type { Vec2 } from "./geometry";
export {
  createDryBrush,
  createOrganicStroke,
  createWash,
  renderDryBrush,
  renderOrganicStroke,
  renderWash,
} from "./strokes";
export type {
  DryBrushBristle,
  DryBrushData,
  DryBrushOptions,
  OrganicStrokeData,
  OrganicStrokeOptions,
  WashData,
  WashGranule,
  WashLobe,
  WashOptions,
} from "./strokes";
export { createPaperGrain, renderPaperGrain } from "./texture";
export type { GrainSpeck, PaperGrainData, PaperGrainOptions } from "./texture";
export {
  BENCHMARK_ASSET_DIMENSIONS,
  createWhereTheLightLandsAssets,
} from "./benchmark/where-the-light-lands";
export type { PaintedBenchmarkAssets } from "./benchmark/where-the-light-lands";

export {
  createStorybookBirdArt,
  BIRD_PART_IDS,
  BIRD_PART_PIVOTS,
} from "./benchmark/phase-02-5/bird-art";
export type {
  BirdPartArtwork,
  BirdPartId,
  StorybookBirdArt,
} from "./benchmark/phase-02-5/bird-art";
export { createLandingSceneArt } from "./benchmark/phase-02-5/scene-art";
export type { LandingSceneArt } from "./benchmark/phase-02-5/scene-art";
export {
  BIRD_FOOT_LOCAL,
  createLandingRig,
  evaluateLandingRig,
  LANDING_CONTACT_FRAME,
  LANDING_FPS,
  LANDING_FRAME_COUNT,
  LANDING_SETTLE_FRAME,
  landingPhaseForFrame,
} from "./benchmark/phase-02-5/landing-rig";
export type { LandingPhase } from "./benchmark/phase-02-5/landing-rig";
export {
  createLandingBenchmark,
  renderLandingCharacter,
  renderLandingFrame,
} from "./benchmark/phase-02-5/landing-render";
export type { LandingBenchmark } from "./benchmark/phase-02-5/landing-render";
export type { LandingRenderOptions } from "./benchmark/phase-02-5/landing-render";
