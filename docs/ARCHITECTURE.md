# Fableon Architecture

> **Status:** Phase 4 — Local 30-second film. The versioned scene schema,
> deterministic timeline, procedural paint primitives, Canvas 2D renderer, live
> Studio preview, local project/shot/take store, media import, review workflow,
> take comparison, regeneration planning, four-shot composition timeline,
> cinematic camera, layered environment motion, character motion presets, and
> local FFmpeg video export exist today. Artistic quality remains under human
> review. Paid generation execution, AI story planning, audio, and production
> deployment remain future work.

## 1. Architectural goals

Fableon turns a short idea into an illustrated, narrated, animated film. The
system must remain useful while its individual engines are replaced:

- **Renderer-independent scene data.** The authored story is data, not a
  screenshot, canvas object graph, or provider-specific prompt.
- **Deterministic evaluation.** A scene plus assets plus engine versions plus a
  seed must produce the same frame plan on every run.
- **Replaceable engines.** Paint, motion, camera, audio, and composition are
  separate modules behind explicit contracts.
- **Provider neutrality.** AI models are optional adapters, never core domain
  dependencies.
- **Local-first development.** No cloud infrastructure or paid service is
  required to build and validate the foundation.
- **Editability.** Every generated artifact can be regenerated or replaced
  without rebuilding the whole film.

The primary visual target is hand-drawn, painterly 2D and 2.5D animation. The
architecture should not assume 3D, WebGL, or any single rendering technology.

## 2. System context

```text
Creator
  │
  ▼
apps/web (Next.js, React, Studio UI)
  │  consumes contracts
  ▼
packages/shared (brand, product constants; future shared domain contracts)
  │
  ├── scene-schema .............. implemented versioned story data + validation
  ├── animation-core ............ implemented timeline + keyframe evaluation
  ├── paint-engine .............. implemented seeded painterly primitives
  ├── render-engine ............. implemented Canvas 2D frame composition
  ├── future motion-engine ...... character rig and motion evaluation
  ├── future camera-engine ...... camera and parallax evaluation
  ├── future asset-providers .... image, video, audio generation adapters
  ├── future ai-orchestration ... planning jobs, prompts, provenance
  ├── future audio-engine ....... narration, music, alignment, captions
  └── future video-compositor ... frame assembly, encoding, muxing, export
```

The web application is a client of the domain, not the owner of it. A future
CLI or headless render service must be able to load the same scene data and
produce the same output without importing React.

## 3. Module boundaries

| Module                               | Responsibility                                                                  | May depend on                                                               | Status      |
| ------------------------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------- |
| `apps/web`                           | Next.js routes, Studio shell, preview, inspector, browser interaction           | `shared`, `scene-schema`, `animation-core`, `render-engine`, `paint-engine` | Implemented |
| `packages/shared`                    | Cross-surface product constants and stable contracts that are not scene schemas | Nothing application-specific                                                | Implemented |
| `packages/scene-schema`              | Versioned serializable project/scene definitions, validation, and serialization | No UI, engine, or provider packages                                         | Implemented |
| `packages/animation-core`            | Pure timeline resolution, keyframe evaluation, and `FramePlan` generation       | `scene-schema`                                                              | Implemented |
| `packages/paint-engine`              | Seeded strokes, washes, grain, and procedural benchmark artwork                 | Browser Canvas APIs; no UI or provider code                                 | Implemented |
| `packages/render-engine`             | FramePlan composition, Canvas 2D backend, and local image loading               | `animation-core`, `scene-schema`, browser APIs                              | Implemented |
| `packages/motion-engine` (future)    | Character rig, pose, cycle, and secondary-motion evaluation                     | `scene-schema`, `animation-core`                                            | Planned     |
| `packages/camera-engine` (future)    | Camera path sampling and projection/parallax                                    | `scene-schema`, `animation-core`                                            | Planned     |
| `packages/asset-providers` (future)  | Ports and adapters for generated/imported media                                 | Domain asset contracts, never scene UI                                      | Planned     |
| `packages/ai-orchestration` (future) | Prompt planning, job state, approval gates, provenance                          | Provider ports, scene-schema                                                | Planned     |
| `packages/audio-engine` (future)     | Narration, music, alignment, caption timing                                     | Domain audio contracts                                                      | Planned     |
| `packages/video-compositor` (future) | Frame rasterization orchestration, encoding, muxing, export                     | `animation-core`, engines, asset and audio APIs                             | Planned     |

Dependency rules:

1. Domain packages must not import Next.js, React, browser globals, or a
   provider SDK.
2. The UI may import domain packages; domain packages may not import the UI.
3. Provider adapters implement ports owned by Fableon. Provider types must not
   leak into scene data or engine code.
4. A rendering engine may be replaced without changing scene files or the
   editor's public contracts.
5. Cross-package contracts are versioned when they are persisted or exchanged
   outside a single process.

Empty future packages are deliberately not scaffolded. Boundaries become real
when the feature that needs them is implemented and tested.

## 4. Renderer-independent scene data

The version-1 schema is implemented in `packages/scene-schema`. Its principles
are fixed:

- **Serializable:** plain JSON-compatible values with no functions, class
  instances, DOM nodes, canvas handles, or SDK objects.
- **Versioned:** an explicit `schemaVersion` on the project and migration
  functions for older documents. Unknown future versions fail loudly rather
  than render incorrectly.
- **Stable identity:** every project, scene, layer, track target, and asset has
  an ID that survives reordering and regeneration. Keyframes are identified by
  their integer frame within a track.
- **Explicit timing:** timing uses integer frame indices at a declared frame
  rate. Avoid floating-point seconds as the source of truth.
- **Declared units and coordinate space:** transforms use canvas pixels,
  degrees, and a top-left origin with declared opacity/scale semantics.
- **Asset references, not blobs:** scenes reference assets by ID. Version 1
  stores safe relative manifest paths; content hashes and immutable storage are
  deferred until the asset pipeline exists.
- **Provenance:** generated content will record its origin
  (provider/model/prompt/seed or imported source) for reproducibility, review,
  and licensing. No provenance schema is implemented in version 1.
- **No engine leakage:** scenes contain brush, rig, and camera intent, not
  engine-specific callbacks, shaders, or framework components.

Implemented version-1 shape:

```text
Project
├── format, schemaVersion, id, title
├── frameRate (24), canvas (1920×1080), deterministic seed
├── assets[]            id, type, name, safe relative path
└── scenes[]            ordered, half-open global timeline intervals
    ├── id, name, durationFrames
    └── layers[]        id, type, name, visible, order, transform, animation?
        ├── asset       assetId -> assets[]
        ├── text        text, fontFamily, fontSize, color
        └── solid       color
```

Transform tracks animate `x`, `y`, `scaleX`, `scaleY`, `rotation`, and
`opacity` with scene-local keyframe indices. Character rigs, camera tracks,
audio tracks, captions, and provenance structures remain deferred to their
respective phases rather than being guessed in version 1.

The scene format is the contract between the editor, evaluators, and renderers.
Changing it is a compatibility event, not an implementation detail.

## 5. Deterministic frame evaluation

The central runtime contract is implemented in `packages/animation-core`:

```text
evaluateProjectFrame(project, globalFrame) -> FramePlan
```

`FramePlan` is a serializable description of a single frame: the global frame,
active scene ID/index, local scene frame, frame rate, and layer states in
ascending stacking order with resolved transforms, visibility, and content
references. It is not a raster image. Project validation is an import boundary;
the evaluator assumes a validated document and never mutates it.

Determinism requirements:

- No `Math.random()`; seeded pseudo-random generators derive from stable scene
  and effect IDs.
- No wall-clock time, filesystem ordering, network calls, or locale-dependent
  formatting inside evaluation.
- Layers are evaluated in stable ascending `order`; scene timing is resolved in
  declared scene order.
- Interpolation is defined in Fableon code, not inherited accidentally from a
  framework's undocumented behavior.
- Frame indices are authoritative. Converting to seconds is a presentation
  concern at the declared frame rate.
- Engine versions and seeds participate in cache keys and render manifests.
- Floating-point outputs are treated with a defined tolerance for visual
  comparison; structural plans are compared directly.

Caching may store evaluated frame plans or rendered layers, but the cache is an
optimization. A clean render with an empty cache must reproduce the same result.

## 6. Layer composition

Composition is ordered and explicit. A provisional layer stack:

1. Background / environment paint
2. Midground environment and atmosphere
3. Characters and props
4. Foreground paint and framing elements
5. Camera effects (vignette, grain, depth of field)
6. Titles, captions, and overlays

Each layer participates in one contract:

- content source (painted surface, generated image, vector strokes, or effect)
- transform and anchor
- opacity and blend mode
- optional mask and clipping group
- depth/parallax factor
- visibility range in time
- cache key and provenance

The compositor applies camera and layer transforms before final rasterization.
Paint and motion engines produce content; they do not own the final frame. This
keeps transitions, title overlays, and export settings independent of any one
engine.

Layers may be raster caches, but the authored representation should stay
resolution-independent where practical. The layer contract must be settled in
Phase 1/2 using a real rendered scene, not only diagrams.

## 7. Paint engine direction (Phase 2 prototype)

Phase 2 implemented `packages/paint-engine` as a deterministic prototype:
seeded Mulberry32 variation, curved organic ribbon strokes, bristle-structured
dry brush, layered translucent washes, paper grain, and procedurally painted
forest/branch/bird benchmark assets. The Canvas 2D renderer in
`packages/render-engine` composites those baked assets with solid, text, and
image layers from a `FramePlan`.

This is an engineering and visual-direction prototype, not a final production
brush engine. Artistic quality is under human review. The longer-term paint
engine is expected to explore:

- A stroke model containing path, pressure, tilt, color, texture, opacity,
  seed, and blend behavior.
- Deterministic brush rasterization at a target resolution.
- Layered painting with wet/dry media behavior and paper/canvas texture.
- Cached layers that can be re-rendered when camera scale or resolution
  changes.
- Procedural and sampled brush behavior rather than a single fixed brush.
- Export of strokes as data so they can be replayed outside the editor.

Prior experiments with `p5.brush` and the `animate` repository are inputs to
Phase 2 evaluation, not architectural commitments. Canvas 2D, OffscreenCanvas,
WebGL, WebGPU, and native rasterization remain candidates. The engine is
expected to sit behind a paint contract so a faster renderer can be swapped in.

Open problems to settle with prototypes: stroke performance at 1080p, visual
consistency across scales, layer caching, texture memory, and whether final
frames are rasterized in-browser or by a headless worker.

## 8. Character and motion architecture (future)

Characters need consistent appearance across scenes and independent, editable
motion:

- A canonical character definition with stable part IDs, palette, reference
  sheet, and optional rig.
- Layered painted parts or a deformable surface; the choice is provisional.
- Motion tracks per part: keyframed transforms, procedural cycles (wing beat,
  breathing, hair/cloth), and layered secondary motion.
- A pose evaluator that samples at a frame index, with explicit easing and
  interpolation.
- Contact-aware behavior for events such as landing on a branch, including
  anticipation, impact, recoil, and settle.
- Expressions and mouth shapes kept separate from body motion.

Generated images may supply a reference or a layer texture, but motion must be
driven by Fableon's deterministic animation data. Identity consistency may use
provider-assisted references and seed reuse; those mechanisms live in adapters
or orchestration, never in the motion engine's core API.

## 9. Camera system (future)

The camera is a tracked scene object, not a CSS transform bolted onto a preview.
Provisional camera data:

- Position, zoom/scale, rotation, anchor, and perspective/parallax depth.
- Keyframes with defined interpolation and easing.
- Shake, drift, and handheld noise driven by a seed.
- Cuts, holds, and scene transitions owned by the timeline.
- Resolution-independent framing with safe areas for captions and titles.

Camera evaluation produces transforms consumed by the compositor. The first
implementation should target 2D/2.5D parallax. A full 3D camera is not required
for the MVP and must not complicate the scene model prematurely.

## 10. AI provider abstraction (future)

AI capabilities are ports with replaceable adapters:

- Text/story planning
- Image and character/environment generation
- Image-to-animation or GIF generation
- Speech synthesis
- Optional embeddings for character/style consistency

Every request/result should carry model identity, prompt/version, seed, usage,
cost metadata, and provenance. Async jobs need explicit states, cancellation,
idempotency keys, bounded retries, and human approval points before generated
content enters a scene.

Rules:

- Provider SDK types and credentials never enter scene data or the browser.
- Secrets come from server-side environment configuration and are never
  committed.
- Local or free providers are the default during development; paid services are
  not introduced without an explicit decision.
- Prompt templates are versioned artifacts. Regeneration records which version
  produced an asset.
- A provider failure degrades one asset or job, not the whole project.
- Generated media is stored as an immutable asset with provenance; the scene
  references the asset ID.

## 11. Audio and captions (future)

Narration, music, and effects are tracks with explicit timing. A speech provider
adapter produces audio plus word/segment timing; the audio engine aligns that
timing to scenes and derives initial captions. Humans can edit both. Audio
composition belongs to the video compositor's final mux, not the visual engine.

The MVP requires narration and readable subtitles. Lip-sync and full voice
direction are not MVP requirements.

## 12. Video composition and export (future)

Remotion is a candidate, not a commitment. The compositor boundary is:

```text
Scene + FramePlan[] + layer renders + audio tracks + captions
        -> encoded video file + render manifest
```

Provisional pipeline:

1. Validate the scene and asset manifest.
2. Evaluate frame plans deterministically.
3. Rasterize paint/motion/camera layers, with caching.
4. Composite each frame at the target resolution.
5. Mux narration, music, and effects.
6. Burn in or attach captions.
7. Encode the master and record engine versions, hashes, and diagnostics.

Export must be frame-accurate and restartable. A render manifest records the
input hash, frame rate, resolution, codec settings, and software versions.
MVP target: 1920×1080, 24 fps, H.264 MP4 with AAC audio, 45–60 seconds.
Longer videos and higher resolutions are future work.

## 12.1 Phase 3 local Studio workspace (implemented)

Phase 3 adds the first production-facing workspace around imported animation.
It is deliberately separate from the deterministic scene schema:

```text
StudioProject
├── id, title, description, target frame/render settings
├── shotOrder[]
├── shots[]
│   └── StudioShot
│       ├── id, title, description, target duration
│       ├── renderingMethod: ai-video | deterministic
│       ├── referenceImageMediaId?
│       ├── generationPrompt
│       ├── currentTakeId?
│       └── takes[]
│           └── StudioTake
│               ├── immutable mediaId + copied metadata/hash
│               ├── sourceType, provider, model, prompt
│               ├── reviewStatus + reviewHistory[]
│               └── issues[]
├── media[]  (video/image assets with FFprobe metadata and SHA-256)
└── regenerationRequests[]
```

Domain boundaries:

- `apps/web/lib/studio/types.ts` — serializable Studio contracts shared by
  server and client code.
- `apps/web/lib/studio/validation.ts` — strict read/write validation, ID and
  media filename allowlists, cross-reference checks.
- `apps/web/lib/studio/repository.ts` — atomic JSON manifests, project locks,
  project/shot/take/review/regeneration mutations.
- `apps/web/lib/studio/media.ts` — magic-byte validation, FFprobe inspection,
  hashing, immutable copies, duplicate reuse, safe media paths, range parsing.
- `apps/web/lib/studio/demo.ts` — explicit idempotent demo importer.
- `apps/web/app/api/studio/...` — constrained route handlers for local writes,
  media upload, review, regeneration planning, and media streaming.
- `apps/web/app/studio/projects/...` and `components/studio/` — responsive
  Studio UI and native video preview.

Persistence is a local-first filesystem repository:

```text
.fableon-data/
└── projects/<projectId>/
    ├── project.json
    └── media/<mediaId>.<ext>
```

Manifest writes use a temporary file followed by rename. Reads never repair
invalid JSON or invalid cross-references silently. Media is copied, never
modified; take metadata stores a snapshot of the imported file. The store is
intended for local development or a persistent single server. It has no
authentication boundary and must not be exposed as an unauthenticated public
production API.

Phase 3 does **not** execute paid generation. Regeneration requests are durable
planning records only. Provider adapters and authorization remain future work.

## 12.2 Phase 4 local film pipeline (implemented)

Phase 4 adds a renderer-independent film composition layer on top of the
existing paint, rig, and Studio systems:

```text
apps/web/lib/film/where-the-light-lands.ts
  ├── FilmComposition (4 shots, exact 720-frame global timeline)
  ├── camera tracks (packages/camera-engine)
  ├── character presets (packages/character-motion)
  ├── environment layers (conservative two-plane parallax)
  ├── ambient state (absolute-frame deterministic)
  ├── titles and transitions (packages/composition-core)
  └── FilmRenderer (Canvas 2D, shared by preview and export)
```

The timeline contract is integer-frame based and validates contiguity, shot
order, transition ranges, titles, and global frame bounds. Crossfades hold the
outgoing shot's last frame while the incoming shot fades in; the global output
frame count is never changed. A 30-second film is exactly 720 output frames at
24 fps.

`FilmRenderer` draws the painted environment, the nine-part rig, deterministic
atmosphere, titles, transitions, and fades into a canonical 1920×1080 canvas.
The Studio composition page and the offline render surface both instantiate the
same renderer and evaluator. The offline CLI drives Chromium to rasterize frames
and pipes PNG frames to local FFmpeg; it does not use a separate animation
implementation.

The composition remains separate from the Phase 1 scene schema and Phase 3
Studio project model. It references existing assets and reusable packages rather
than replacing those contracts.

## 13. Asset storage

Phase 0 stores no user assets. Phase 3 implements the first local Studio store
described in section 12.1. The broader intended local-first model:

- A project directory with a JSON project/scene document and an asset
  manifest.
- Content-addressed binary assets (for example by SHA-256) stored outside Git.
- A lightweight metadata index for lookup; no database is required initially.
- Explicit provenance, license/source fields, and original/derived relationships.
- Regenerable caches separated from source assets and final renders.

Later, an S3-compatible object store can replace the local store behind the same
asset API. Project import/export should bundle the manifest and required assets
without depending on absolute local paths. Large generated media must never be
committed to the repository.

## 14. Error handling

- Validate at boundaries: project import, schema load, provider response, asset
  manifest, render request.
- Use typed domain errors with actionable context (scene ID, frame, asset ID,
  engine, provider job).
- Distinguish user errors, invalid data, provider failures, engine failures, and
  infrastructure failures.
- Provider calls are timeout-bounded, cancellable, and classified as retryable
  or fatal. Jobs are idempotent where possible.
- A failed render never produces a silently partial "success". Mark outputs
  invalid and keep diagnostics.
- Schema version mismatches fail explicitly; migrations are explicit and
  tested.
- UI error states should explain what failed and what is preserved. No silent
  fallback to unrelated assets or placeholder frames in a final export.
- Logs and render manifests must never contain secrets or private prompt data
  that is not intended for export.

## 15. Testing strategy

- **Unit tests:** pure evaluation, interpolation, seeds, timeline math, schema
  migrations, asset-reference validation.
- **Schema fixtures:** canonical project documents proving forward compatibility
  and rejection of malformed data.
- **Golden frame plans:** structural snapshots or hashes for deterministic
  evaluation, not brittle full-DOM snapshots.
- **Visual regression:** rendered frames compared with perceptual tolerances;
  reviewed by humans for painterly quality.
- **Integration tests:** asset generation adapters with fakes, paint engine into
  compositor, audio/caption alignment.
- **Runtime smoke tests:** the web app routes load from a production build.
- **Export validation:** duration, frame count, resolution, audio stream, and
  caption presence verified with media probing.
- **Performance budgets:** per-frame evaluation/rasterization time and peak
  memory tracked once rendering exists.

Phase 0 gates are `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and a
production runtime check of `/` and `/studio`. Tests must exercise real
behavior; placeholder tests that always pass are not acceptable.

## 16. Security and operational boundaries

- No credentials in the repository. Runtime secrets are server-side only.
- Untrusted project files are validated before evaluation; never execute
  arbitrary code from scene documents.
- Generated assets and prompts retain provenance for review and licensing.
- Dependency surface stays minimal; new native or paid dependencies require a
  concrete feature need.
- Render workers should eventually be sandboxed with resource limits.
- No cloud deployment is defined in the foundation phases.

## 17. Provisional decisions and open questions

Decisions that are stable enough to guide Phase 1:

- pnpm workspace, strict TypeScript, Next.js App Router for the web surface.
- Scene data is versioned, serializable, and renderer-independent.
- Determinism is a first-class requirement.
- 2D/2.5D painterly animation is the primary target.
- Local-first asset and render workflows precede cloud services.
- AI and rendering providers are replaceable adapters.

Still provisional:

- Exact scene schema and coordinate conventions.
- Frame rate defaults and video codec profile details.
- Vector stroke vs raster layer representation.
- Browser vs native paint rasterization.
- Remotion vs a custom compositor.
- First AI provider choices and prompt strategy.
- Caption format and burn-in policy.
- Storage backend and project packaging format.

These decisions should be resolved by prototypes, tests, and the Phase 1 scene
specification — not by speculative scaffolding.
