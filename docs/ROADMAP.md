# Fableon Roadmap

> This roadmap is directional, not a promise of calendar dates. Each phase is
> gated by the development protocol: no phase begins without a new phase prompt,
> an inspected repository, feature-sized commits, executed verification, and an
> approved phase report. Phase descriptions may be refined between phases, but
> the dependency order and quality gates should remain stable.

## Phase summary

| Phase | Objective                           | Primary output                                       | Status    |
| ----- | ----------------------------------- | ---------------------------------------------------- | --------- |
| 0     | Foundation                          | Monorepo, web shell, gates, architecture docs        | Delivered |
| 1     | Scene specification and timeline    | Versioned scene data and deterministic timing        | Next      |
| 2     | Paint engine                        | Reproducible painterly still frames                  | Planned   |
| 3     | Motion and character animation      | Animated character performance in painted scenes     | Planned   |
| 4     | Camera and effects                  | Cinematic 2.5D camera, parallax, and transitions     | Planned   |
| 5     | Visual Studio editor                | End-to-end editing workspace                         | Planned   |
| 6     | AI scene planning and storyboarding | Idea-to-plan assistance with approval and provenance | Planned   |
| 7     | AI-assisted image/GIF animation     | Consistent generated assets and limited animation    | Planned   |
| 8     | Narration and subtitles             | Timed voice track and editable captions              | Planned   |
| 9     | Video composition and export        | Deterministic 1080p MP4 master                       | Planned   |
| 10    | End-to-end generation               | Guided idea-to-video orchestration                   | Planned   |
| 11    | Quality, performance, deployment    | Production readiness and operational confidence      | Planned   |

## Phase 0 — Foundation

**Goal:** Establish a trustworthy engineering base without pretending that
rendering or AI exists.

**Expected features**

- pnpm workspace with strict TypeScript, shared tooling, and reproducible
  installs.
- Next.js App Router homepage and explicitly labeled Studio shell.
- Reusable UI primitives, brand constants, and the planned pipeline overview.
- ESLint, Prettier, Vitest, build verification, and meaningful smoke tests.
- Architecture, roadmap, MVP scope, development protocol, and phase report.
- Production runtime verification of `/` and `/studio`.

**Dependencies:** None.

**Acceptance criteria**

- `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`
  execute successfully from a clean workspace.
- Both routes return HTTP 200 from a production server and render their expected
  content.
- The Studio shell clearly marks every unimplemented panel and contains no fake
  interactive controls.
- No cloud service, AI SDK, renderer, database, or paid dependency is required.
- The completion report records exact commands, outcomes, warnings, and commit
  SHAs.

**Major risks**

- Scope creep into rendering or AI before contracts exist.
- Tooling version incompatibilities in a young monorepo.
- A polished shell that implies capability the system does not have.
- Premature renderer or provider coupling hiding in UI assumptions.

## Phase 1 — Scene specification and timeline

**Goal:** Define the renderer-independent story document and a deterministic
timeline that every future engine consumes.

**Expected features**

- `packages/scene-schema` with TypeScript types, runtime validation, explicit
  schema versions, and migration hooks.
- Project, scene, layer, character, asset-reference, camera, audio, and caption
  structures sufficient for a 4–6 scene story.
- Stable IDs, declared units, frame-rate policy, and serialization round trips.
- `packages/animation-core` with pure timeline sampling: frame indices,
  interpolation, easing primitives, and a `FramePlan` contract.
- A fixture project and golden frame-plan tests.
- A minimal read-only timeline surface or developer preview for inspecting
  scenes; full visual editing remains Phase 5.
- Project save/load in a local, explicit format with validation errors.

**Dependencies:** Phase 0.

**Acceptance criteria**

- A canonical fixture with 4–6 scenes validates, serializes, and deserializes
  without information loss.
- Malformed or unsupported scene versions fail with actionable errors.
- Evaluating the same scene/frame twice yields identical frame plans.
- Timeline operations are covered by meaningful unit tests, including boundary
  frames and easing.
- No rendering, AI, or provider dependency is introduced.
- Schema decisions and migration policy are documented.

**Major risks**

- Over-modeling every future feature before a real frame is rendered.
- Ambiguous time semantics (frames vs seconds) causing drift later.
- Schema churn after assets and UI begin depending on it.
- Letting editor state become the de facto scene format.
- Coordinate-system and unit confusion across paint, motion, and camera.

## Phase 2 — Paint engine

**Goal:** Produce deterministic, high-quality painterly frames from scene data
without requiring AI generation.

**Expected features**

- `packages/paint-engine` with a stroke/brush contract and seeded rendering.
- Paper/canvas textures, layered paint, and at least two distinct brushes.
- Environment and character still-frame rendering from Phase 1 fixtures.
- Resolution handling and layer caching strategy.
- Evaluation of prior `p5.brush` and `animate` experiments against concrete
  benchmarks.
- Image export for still frames plus a render diagnostic manifest.
- Visual comparison against the MVP benchmark composition.

**Dependencies:** Phase 1; asset manifest handling for reference textures.

**Acceptance criteria**

- The same scene, seed, and engine version reproduce visually equivalent frames
  across repeated runs.
- A 1920×1080 painterly benchmark frame renders within an agreed per-frame
  budget on the development machine.
- Brush strokes remain legible at output resolution and scale predictably in
  preview.
- Layer caching can be cleared without changing output.
- The engine is independent of the web UI and any AI provider.
- Human review accepts the painterly direction for the MVP.

**Major risks**

- Poor performance at 1080p or with many layers.
- GPU/precision differences breaking determinism.
- Brush execution looking procedural rather than hand-painted.
- Texture memory and cache invalidation complexity.
- Choosing a rendering technology before comparative prototypes.

## Phase 3 — Motion and character animation

**Goal:** Animate a consistent character with organic, editable motion through
painted environments.

**Expected features**

- `packages/motion-engine` with character parts, rig definitions, and stable
  part IDs.
- Keyframed transforms, interpolation, easing, and procedural cycles (wing beat,
  breathing, secondary motion).
- A deterministic pose evaluator feeding the frame plan.
- Contact and settle handling for landings and interactions.
- Onion-skin or motion-debug visualization for development (not necessarily
  final UI).
- Animated scene preview from a Phase 1 fixture using Phase 2 paint output.

**Dependencies:** Phases 1 and 2.

**Acceptance criteria**

- The benchmark bird keeps a consistent design across 4–6 scenes.
- Flight, descent, contact, and landing read as intentional motion in review.
- Repeated evaluation produces identical poses and motion.
- Motion data is editable and serializable; no engine-specific state is trapped
  in UI components.
- The animation works without an AI provider.
- Frame timing stays synchronized to the timeline.

**Major risks**

- Rig complexity outpacing the visual payoff.
- Painterly surfaces deforming poorly under a rig.
- Motion feeling mechanical or floaty.
- Identity drift between generated reference assets.
- Secondary motion causing performance or determinism problems.

## Phase 4 — Camera and effects

**Goal:** Give scenes cinematic composition and controlled camera language.

**Expected features**

- `packages/camera-engine` with camera tracks, keyframes, easing, and seeded
  handheld motion.
- 2.5D parallax, depth-aware layer transforms, and safe-area framing.
- Transitions between scenes and camera cuts.
- Optional effects: vignette, grain, atmospheric haze, and depth-of-field
  approximation.
- Camera debug overlays and deterministic sampling tests.
- Shot-list support for the MVP benchmark.

**Dependencies:** Phases 1–3.

**Acceptance criteria**

- Camera motion is smooth, frame-stable, and reproducible.
- Parallax and depth remain visually coherent without visible layer separation.
- Camera transforms do not break caption safe areas or composition.
- Transitions are frame-accurate and configurable.
- Effect presence is recorded in the frame plan or render manifest.
- Human review accepts the camera language for the benchmark.

**Major risks**

- 2.5D artifacts and horizon/horizonline drift.
- Camera motion causing discomfort or jitter.
- Effect stacking hurting performance and visual clarity.
- Coupling camera behavior to a specific editor viewport.
- Overcomplicated camera features deferred from the MVP anyway.

## Phase 5 — Visual Studio editor

**Goal:** Make the scene and animation systems editable through a professional
workspace.

**Expected features**

- Project creation/open/save with a clear local storage model.
- Project workspace, scene list, asset panel, canvas preview, timeline, and
  properties panels.
- Scrubbing, playback, selection, transform/keyframe editing, and preview.
- Undo/redo with a defined command or snapshot model.
- Asset browsing, import, and replacement with provenance.
- Error, empty, loading, and invalid-project states.
- Keyboard access and responsive panel behavior.

**Dependencies:** Phases 1–4.

**Acceptance criteria**

- A user can create a 4–6 scene project, edit scene properties, scrub the
  timeline, and save/reload without data loss.
- Undo/redo consistently restores scene state.
- The canvas preview reflects scene data and frame changes.
- Every previously placeholder panel has a real, tested responsibility or
  remains explicitly labeled.
- End-to-end editor tests cover create, edit, save, reload, and invalid data.
- No timeline or canvas state is stored only in component-local state where it
  would be lost.

**Major risks**

- Editor state architecture becoming tangled across panels.
- Canvas performance and selection hit-testing.
- Undo semantics for generated assets and asynchronous jobs.
- Accidental data loss or destructive regeneration.
- Accessibility and responsive complexity.

## Phase 6 — AI scene planning and storyboarding

**Goal:** Assist the creator from idea to a reviewable, structured story plan
without surrendering control.

**Expected features**

- Provider ports and a fake/local adapter for deterministic tests.
- Idea-to-script generation, scene breakdown, shot suggestions, and storyboard
  planning metadata.
- Human approval and editing before a plan enters the project.
- Prompt/version/provenance tracking and cost/usage metadata.
- Retry, cancellation, timeout, and failure states.
- No provider types or secrets leaking into the scene schema or browser.

**Dependencies:** Phases 1 and 5; provider adapter infrastructure.

**Acceptance criteria**

- With a fake adapter, an idea deterministically produces a valid 4–6 scene plan
  fixture.
- A human can accept, edit, or reject generated planning content.
- Every generated planning artifact records its provenance.
- Provider failure leaves the project intact and reports an actionable error.
- Tests run without network access or paid services.
- The scene schema remains provider-neutral.

**Major risks**

- Generated plans that are structurally valid but narratively weak.
- Prompt drift and non-reproducible outputs across model updates.
- Cost, latency, and rate limits.
- Sending sensitive project content to providers without consent.
- Over-automation that removes creative control.

## Phase 7 — AI-assisted image/GIF animation

**Goal:** Generate and integrate consistent visual assets while preserving the
painterly motion pipeline.

**Expected features**

- Image generation adapters for characters, environments, and props.
- Character reference sheets, palette locks, seeds, and consistency workflow.
- Asset review/regeneration per scene or element.
- Optional image-to-animation/GIF experiments, evaluated against deterministic
  motion quality.
- Content-addressed storage, provenance, licensing notes, and cache policy.
- Style presets aligned with the hand-drawn, painterly direction.
- Explicit fallback to manually authored or procedural assets.

**Dependencies:** Phases 2, 3, and 6; asset storage contract.

**Acceptance criteria**

- The benchmark bird and forest can be generated or refined with recognizably
  consistent appearance across 4–6 scenes.
- Regenerating one asset does not invalidate unrelated scenes.
- Every asset is stored immutably with provenance and can be reviewed.
- Provider failure or removal leaves a usable manual/procedural path.
- AI-generated animation, if used, does not bypass timeline determinism for the
  final master.
- Licensing and usage constraints are recorded and surfaced.

**Major risks**

- Character drift and uneditable artifacts.
- Provider non-determinism, quality variance, and cost.
- Hidden licensing or training-data restrictions.
- GIF approaches producing low-quality, hard-to-composite output.
- Asset sprawl and unclear source-of-truth files.

## Phase 8 — Narration and subtitles

**Goal:** Add timed narration and readable captions that stay aligned through
edits and export.

**Expected features**

- Narration script derived from the approved story and editable per scene.
- Speech synthesis provider port with a local/fake adapter for tests.
- Word/segment timing and audio alignment.
- Caption generation, editing, split/merge, and style controls.
- Playback with picture, narration, music, and captions.
- SRT/VTT export and a caption policy for the final master.
- Audio mixing controls for narration, music, and effects.

**Dependencies:** Phases 5 and 6 (story/script); composition integration follows
in Phase 9.

**Acceptance criteria**

- A 45–60 second narration track aligns with the scene plan and remains in sync
  after edits or a full reload.
- Captions are readable, editable, and exported in a standard format.
- Caption timing can be corrected manually.
- Audio playback and final mix settings are persisted in the project.
- Tests cover timing drift, empty narration, and caption overflow.
- Accessibility review accepts contrast, reading speed, and caption placement.

**Major risks**

- Drift between generated word timing and edited picture.
- Voice quality and pronunciation problems.
- Audio licensing and provider restrictions.
- Caption overflow and unsafe areas.
- Mixing loudness inconsistency.

## Phase 9 — Video composition and export

**Goal:** Render a complete, reproducible 1080p master from the project.

**Expected features**

- `packages/video-compositor` consuming frame plans, layer renders, audio, and
  captions.
- Remotion evaluation or an alternative compositor behind an explicit boundary.
- Frame-accurate encoding, audio muxing, and caption burn-in or sidecar export.
- Render queue with progress, cancellation, retry, and diagnostics.
- Render manifest with input hash, software versions, and output hashes.
- Validation with media probing: duration, frame count, resolution, streams.
- Local render workflow without cloud infrastructure.

**Dependencies:** Phases 2–4 and 8; Phase 5 for project input.

**Acceptance criteria**

- The MVP project exports a 45–60 second 1920×1080, 24 fps H.264 MP4 with AAC
  narration and visible or attached captions.
- Duration is frame-accurate within one frame and audio stays synchronized.
- Re-exporting unchanged inputs produces an equivalent master and matching
  manifest.
- A failed render reports the failing frame/scene and does not emit a false
  success.
- The benchmark passes packed-media inspection and human audio/visual review.
- No cloud account or paid service is required for export.

**Major risks**

- Codec/muxing mismatch and platform-specific encoder behavior.
- Browser-based rendering performance, memory, and timeouts.
- Audio drift or lost caption timing.
- Render reproducibility across machines.
- Large temporary files and cleanup failures.

## Phase 10 — End-to-end generation

**Goal:** Guide a creator from a single idea to a finished video while retaining
control at every meaningful decision.

**Expected features**

- Orchestration from idea through script, scenes, storyboard, assets, motion,
  narration, captions, and export.
- Job state, resumability, approvals, budgets, and per-stage diagnostics.
- Regeneration of a single scene or asset without redoing everything.
- Project templates and the bird-in-the-forest benchmark preset.
- Failure recovery and clear handoff to manual editing.
- Cost, latency, and quality telemetry (local by default).
- End-to-end tests using fake providers and deterministic fixtures.

**Dependencies:** Phases 6–9; Phase 5 editing surface.

**Acceptance criteria**

- A new user can go from an idea to a valid exported video through the guided
  flow without manual file edits or hidden setup.
- The benchmark story produces 4–6 coherent scenes with consistent character,
  narration, captions, transitions, and a 1080p master.
- Regenerating one scene preserves the rest of the project and its approvals.
- Failures are recoverable at the stage level, with no silent partial output.
- Usage/cost and provenance are recorded for every automated stage.
- Human review approves narrative, visual, and audio quality.

**Major risks**

- Orchestration complexity and cascading failures.
- Cost/time surprises from repeated generation.
- Non-deterministic provider behavior breaking reproducibility.
- UX that hides decisions or makes correction difficult.
- Data loss across long-running jobs.

## Phase 11 — Quality, performance, deployment

**Goal:** Make Fableon reliable enough for sustained use beyond the demo.

**Expected features**

- Expanded visual regression, schema migration, accessibility, and end-to-end
  test suites.
- Performance budgets for evaluation, rasterization, playback, and export.
- Observability: structured logs, render diagnostics, job metrics, and error
  reporting with privacy controls.
- Secure secret management, dependency review, and sandboxed render workers.
- Packaging, deployment, backup, and rollback runbooks for the web surface and
  render service.
- Documentation for supported environments, project format, and troubleshooting.
- License and provenance audit for generated assets and dependencies.

**Dependencies:** Phases 0–10.

**Acceptance criteria**

- CI enforces lint, strict typecheck, meaningful tests, production build, and
  runtime smoke checks on every change.
- Render performance and memory meet documented budgets for the MVP workload.
- A security review finds no committed secrets and no unvalidated code execution
  path from project data.
- Deployment and rollback are exercised in a staging-like environment.
- Accessibility checks cover the primary editor workflows.
- Schema migrations and project backups are tested.
- Operational runbooks explain recovery from failed jobs and corrupted projects.

**Major risks**

- Infrastructure cost and operational toil.
- Security exposure from untrusted projects or render workers.
- Vendor lock-in for storage, AI, or render infrastructure.
- Performance regressions hidden by local-only testing.
- Maintenance burden of a growing dependency and engine surface.

## Cross-phase rules

1. **A phase starts only with a new prompt.** A completion report and a GO
   recommendation do not authorize the next phase by themselves.
2. **Every feature is independently testable and committed separately.** Do not
   bundle unrelated refactors into feature commits.
3. **The repository is inspected before work begins.** Preserve user changes,
   commits, and documents; extend rather than overwrite.
4. **Verification is executed, not assumed.** Report exact commands and real
   results, including warnings.
5. **The scene format remains the source of truth.** The editor, engines, and
   providers adapt to it; it does not adapt to a temporary implementation.
6. **No paid or cloud services without an explicit decision.** Local/fake
   adapters are preferred for tests.
7. **No secrets in source.** Provider credentials stay server-side.
8. **The MVP scope governs.** Features that do not serve the 45–60 second
   painterly benchmark are deferred.
9. **Quality before automation.** A deterministic manual path must work before
   AI orchestration wraps it.
10. **Every phase ends with a report and review.** Corrective work happens
    before the next phase begins.

## MVP path

Phases 1–9 form the manual MVP path: data model, paint, motion, camera, editor,
narration, captions, composition, and export. Phase 6 and 7 add AI assistance
without replacing the deterministic path. Phase 10 demonstrates one guided
end-to-end run. Phase 11 hardens the result. The detailed product bar is defined
in [MVP_SCOPE.md](MVP_SCOPE.md).
