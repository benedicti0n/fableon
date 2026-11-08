# Fableon

Fableon is an AI-native animation studio for turning a simple idea into an
illustrated, narrated animated film. The product is designed around a
renderer-independent pipeline — from story planning and painterly asset
generation through deterministic motion, camera work, sound, and video export.

> **Status: Phase 2 — Canvas paint preview.** The repository now renders real
> 1920×1080 frames from validated scene data using procedural Fableon Paint
> artwork and a Canvas 2D backend. The Studio supports live frame preview,
> elapsed-time playback, and PNG export. Artistic quality is pending human
> review; AI, audio, camera, and video export remain future work.

## Requirements

- **Node.js 22.13+ or 24+** (Node 24 LTS is the recommended baseline; see `.nvmrc`)
- **pnpm 11+** (`corepack enable` is the simplest way to provision it)

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

## Commands

| Command                  | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `pnpm dev`               | Run the Next.js application in development mode   |
| `pnpm build`             | Create a production build of the web application  |
| `pnpm start`             | Serve the production build                        |
| `pnpm lint`              | Run ESLint across the workspace                   |
| `pnpm typecheck`         | Run strict TypeScript checks for every package    |
| `pnpm test`              | Run the Vitest suite once                         |
| `pnpm test:watch`        | Run Vitest in watch mode                          |
| `pnpm test:browser`      | Run Playwright checks and performance measurement |
| `pnpm benchmark:capture` | Regenerate benchmark assets, frames, and metrics  |
| `pnpm format`            | Format the repository with Prettier               |
| `pnpm format:check`      | Verify formatting without writing changes         |

## Workspace layout

```text
fableon/
├── apps/
│   └── web/                 # Next.js App Router application
├── packages/
│   ├── scene-schema/        # Versioned project/scene contracts and fixtures
│   ├── animation-core/      # Timeline resolution and deterministic frame plans
│   ├── render-engine/       # Canvas 2D frame rendering and local asset resolution
│   ├── paint-engine/        # Seeded painterly primitives and benchmark artwork
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
Canvas 2D renderer, and procedural paint primitives are now real.

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
