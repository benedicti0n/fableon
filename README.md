# Fableon

Fableon is an AI-native animation studio for turning a simple idea into an
illustrated, narrated animated film. The product is designed around a
renderer-independent pipeline — from story planning and painterly asset
generation through deterministic motion, camera work, sound, and video export.

> **Status: Phase 4 — Complete local 30-second film.** The repository now
> includes a deterministic four-shot composition pipeline, reusable camera and
> character-motion systems, layered environment motion, local Canvas 2D frame
> rendering, and local FFmpeg export. The film **Where the Light Lands** renders
> to a verified 30.000-second, 1920×1080, 24 fps MP4 with zero paid API calls.

## Requirements

- **Node.js 22.13+ or 24+** (Node 24 LTS is the recommended baseline; see `.nvmrc`)
- **pnpm 11+** (`corepack enable` is the simplest way to provision it)
- **FFmpeg/FFprobe** on `PATH` for MP4 metadata inspection during import

## Getting started

```bash
corepack enable
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) for the homepage and
[http://localhost:3000/studio](http://localhost:3000/studio) for the Studio
paint preview and timeline inspector.

## Studio preview

The Studio loads the sample project
`packages/scene-schema/fixtures/where-the-light-lands.project.json` through the
real parser, resolves frames with `@fableon/animation-core`, and composites
procedurally painted assets with `@fableon/render-engine` and
`@fableon/paint-engine`.

You can scrub global frames, jump to scene starts, step between scenes, play the
timeline at a 24 FPS target using elapsed time, select layers, inspect resolved
transforms, and export the current canvas frame as a 1920×1080 PNG.

All artwork is generated locally by the Phase 2 paint benchmark. No AI imagery
or external art is used. The five-frame visual benchmark and provenance are in
[docs/benchmarks/phase-02/](docs/benchmarks/phase-02/).

## Phase 3 AI video studio

Open [http://localhost:3000/studio/projects](http://localhost:3000/studio/projects)
for the AI-video workspace. The existing `/studio` timeline inspector and
`/studio/assets` illustration workspace remain available from the Studio
navigation.

The Phase 3 workflow is:

```text
Create project → add shot → import MP4 take → preview/scrub → inspect metadata
→ attach starting frame → annotate visual defects → set review status
→ compare takes → prepare regeneration request → reload/reopen and recover state
```

A real demonstration project can be imported from the Projects dashboard. It
contains the Phase 2.8 Gemini Omni take and the Phase 2.7 Gate 2 deterministic
take, with review issues grounded in the published evaluations. Importing the
demo again reopens the same project without duplicating media or shots.

### Local data and limits

- Project manifests and immutable media copies live under `.fableon-data/`,
  which is ignored by Git.
- Set `FABLEON_DATA_DIR` to use a different local directory.
- Video uploads default to a 100 MB limit (`FABLEON_MAX_VIDEO_MB`); images
  default to 20 MB (`FABLEON_MAX_IMAGE_MB`).
- Media is streamed through constrained application routes with HTTP range
  support for seeking.
- This is a **local, single-user** storage design. Do not expose the write/media
  APIs as an unauthenticated public production service. It is not suitable for
  stateless serverless hosting.

Phase 3 does not execute paid generation. The regeneration form persists a
draft or ready-for-authorization request only; provider execution requires a
separate authorized workflow.

## Phase 4 local film — Where the Light Lands

The composition workspace is at
[http://localhost:3000/studio/composition](http://localhost:3000/studio/composition).
It previews the same four-shot film used by the offline exporter, scrubs across
shot boundaries, plays at 24 fps, and can start a local MP4 export job with
persisted progress.

```bash
# Required short checkpoint: 5 seconds crossing shot 1 → shot 2
pnpm render:demo:checkpoint

# Full 30-second film and review artifacts
pnpm render:demo
```

The full render writes:

```text
outputs/where-the-light-lands/
├── final.mp4
├── render-manifest.json
└── render-report.json
```

`outputs/` is intentionally Git-ignored. The final film is **silent**; audio is
not part of the Phase 4 acceptance gate.

The film uses a conservative two-plane parallax plate derived from the existing
Phase 2.8 painted start frame, plus the Phase 2.7 candidate nine-part bird. The
character artwork is still candidate quality and has visible seams/fringing.
See `docs/benchmarks/phase-04/QUALITY_ASSESSMENT.md`; artistic quality is
**pending user review**.

## Commands

| Command                           | Purpose                                                |
| --------------------------------- | ------------------------------------------------------ |
| `pnpm dev`                        | Run the Next.js application in development mode        |
| `pnpm build`                      | Create a production build of the web application       |
| `pnpm start`                      | Serve the production build                             |
| `pnpm lint`                       | Run ESLint across the workspace                        |
| `pnpm typecheck`                  | Run strict TypeScript checks for every package         |
| `pnpm test`                       | Run the Vitest suite once                              |
| `pnpm test:watch`                 | Run Vitest in watch mode                               |
| `pnpm test:browser`               | Run Playwright checks and performance measurement      |
| `pnpm benchmark:capture`          | Regenerate Phase 2 benchmark assets and frames         |
| `pnpm benchmark:phase-02-5`       | Render the 48-frame bird landing scene + GIF           |
| `pnpm benchmark:phase-02-6`       | Import, rig, and capture the diagnostic 48-frame scene |
| `pnpm benchmark:phase-02-7-gate2` | Render the repaired Gate 2 candidate 48-frame scene    |
| `pnpm render:demo:checkpoint`     | Render a 5-second, 1280×720 multi-shot checkpoint      |
| `pnpm render:demo`                | Render the full 30-second 1920×1080 film + artifacts   |
| `pnpm format`                     | Format the repository with Prettier                    |
| `pnpm format:check`               | Verify formatting without writing changes              |

## Workspace layout

```text
fableon/
├── apps/
│   └── web/                 # Next.js App Router application
├── packages/
│   ├── scene-schema/        # Versioned project/scene contracts and fixtures
│   ├── animation-core/      # Timeline resolution and deterministic frame plans
│   ├── composition-core/    # Multi-shot timeline, transitions, and titles
│   ├── camera-engine/       # Deterministic cinematic camera and parallax math
│   ├── character-motion/    # Reusable Little Bird flight/landing/idle presets
│   ├── render-engine/       # Canvas 2D frame rendering and local asset resolution
│   ├── paint-engine/        # Seeded painterly primitives and benchmark artwork
│   ├── sprite-motion/       # Hierarchical sprite transform prototype
│   ├── illustration-pipeline/ # Packs, image import, preparation, rig adapter, ZIP
│   └── shared/              # Cross-surface brand and product domain constants
├── docs/                    # Architecture, roadmap, MVP scope, protocol, reports
├── package.json             # Root scripts and shared tooling
├── pnpm-workspace.yaml      # Workspace definition
└── tsconfig.base.json       # Strict TypeScript baseline
```

Future packages such as the motion engine, camera engine, asset providers,
audio engine, and video compositor are documented in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). They are intentionally not
scaffolded before their phases begin. Scene data, deterministic evaluation, the
Canvas 2D renderer, procedural paint primitives, and the Phase 3 local Studio
workspace are now real.

Local Phase 3 project data is created under `.fableon-data/` at runtime. It is
ignored by Git and must not be committed or treated as portable project data.

## Benchmark artifacts

The five native 1920×1080 outputs, the contact sheet, and the rendered frame
metrics are in
[docs/benchmarks/phase-02/](docs/benchmarks/phase-02/). All artwork is generated
locally by seeded Fableon Paint code; no external or AI-generated art is used.
Provenance and the honest artistic assessment are documented alongside the
images.

Browser tests cover canvas rendering, deterministic repeat frames, scene
boundaries, playback, PNG export dimensions, asset failures, mobile layout, and
performance. The performance test records first-frame/cached render timing,
playback throughput, and available heap measurements.

```bash
pnpm exec playwright install chromium
pnpm test:browser
```

## Phase 2.5 animation benchmark

The hybrid layered-bird experiment lives at
[http://localhost:3000/benchmarks/phase-02-5](http://localhost:3000/benchmarks/phase-02-5).
It is a 48-frame, 24 FPS, two-second landing sequence with articulated wings,
head, tail, beak, eye, and legs, plus legend controls, part visibility, PNG
export, and elapsed-time playback.

```bash
# Requires ffmpeg on PATH for GIF encoding.
pnpm benchmark:phase-02-5
```

This writes the actual 48-frame sequence to an ignored generation directory,
updates selected frames, contact sheet, character poses, GIF, and
`performance.json` under `docs/benchmarks/phase-02-5/`. The artistic assessment
is in that directory; the result is a feasibility prototype, not production art.

## Phase 2.6 illustration asset pipeline

The preparation workspace is at
[http://localhost:3000/studio/assets](http://localhost:3000/studio/assets). It
imports local PNG/WebP/JPEG artwork, inspects alpha and edge warnings, prepares
trimmed derivatives with hashes, assigns character parts or environment layers,
edits pivots and registration, validates completeness/occlusion, and exports or
re-imports portable `.fableon-pack.zip` archives.

The comparison benchmark is at
[http://localhost:3000/benchmarks/phase-02-6](http://localhost:3000/benchmarks/phase-02-6).
It re-imports the Phase 2.5 bird and forest as **diagnostic artwork**, runs the
same 48-frame landing motion, and reports pixel-fidelity, rig, and performance
evidence. Premium source artwork is currently **BLOCKED**; see
[docs/benchmarks/phase-02-6/SOURCE_ASSET_REQUIREMENTS.md](docs/benchmarks/phase-02-6/SOURCE_ASSET_REQUIREMENTS.md).

```bash
# Requires Playwright Chromium and ffmpeg on PATH.
pnpm benchmark:phase-02-6
```

This writes the actual 48-frame sequence to an ignored directory, updates
selected frames, contact sheet, fidelity comparison, source/prepared previews,
import/rig validation JSON, performance metrics, and an MP4 under
`docs/benchmarks/phase-02-6/`.

## Phase 2.7 Gate 2 candidate

The Gate 2 production-renderer proof is at
[http://localhost:3000/benchmarks/phase-02-7-gate2](http://localhost:3000/benchmarks/phase-02-7-gate2).
It imports the externally supplied repaired nine-part Little Bird candidate as a
validated `fableon.illustration-pack` v1 and renders the existing 48-frame
landing motion through Fableon's Canvas renderer and hierarchical rig.

The artwork is a **candidate, not approved production art**. The background is
the existing diagnostic Phase 2.5 forest. The quality assessment documents
visible matte seams, halos, low resolution, and inferred anatomy.

```bash
pnpm benchmark:phase-02-7-gate2
```

This regenerates the 48-frame sequence, selected frames, contact and pivot-debug
sheets, validation JSON, performance metrics, and reviewable MP4 under
`docs/benchmarks/phase-02-7-gate2/`.

## Continuous integration

`.github/workflows/ci.yml` validates every push to `main` and every pull
request on Node.js 24 LTS. It installs with a frozen lockfile and runs
formatting, linting, type checking, unit tests, the production build, and the
Playwright browser suite. It requires no secrets and performs no deployment.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [MVP scope](docs/MVP_SCOPE.md)
- [Development protocol](docs/DEVELOPMENT_PROTOCOL.md)
- [Phase reports](docs/reports/)

## Principles

- Strict TypeScript and explicit module boundaries.
- Deterministic animation wherever possible.
- Renderers never depend on AI providers.
- Versioned, renderer-independent scene data.
- Minimal dependencies; no cloud infrastructure or paid services are required.
- No credentials or secrets in the repository.

## License

Private and unlicensed. All rights reserved.
