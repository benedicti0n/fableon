# Fableon

Fableon is an AI-native animation studio for turning a simple idea into an
illustrated, narrated animated film. The product is designed around a
renderer-independent pipeline — from story planning and painterly asset
generation through deterministic motion, camera work, sound, and video export.

> **Status: Phase 0 — Foundation.** The repository contains the workspace,
> web shell, quality gates, and architecture documentation. No rendering, AI,
> audio, or video-generation capability is implemented yet.

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
shell.

## Commands

| Command             | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `pnpm dev`          | Run the Next.js application in development mode  |
| `pnpm build`        | Create a production build of the web application |
| `pnpm start`        | Serve the production build                       |
| `pnpm lint`         | Run ESLint across the workspace                  |
| `pnpm typecheck`    | Run strict TypeScript checks for every package   |
| `pnpm test`         | Run the Vitest suite once                        |
| `pnpm test:watch`   | Run Vitest in watch mode                         |
| `pnpm format`       | Format the repository with Prettier              |
| `pnpm format:check` | Verify formatting without writing changes        |

## Workspace layout

```text
fableon/
├── apps/
│   └── web/                 # Next.js App Router application
├── packages/
│   └── shared/              # Cross-surface brand and product domain constants
├── docs/                    # Architecture, roadmap, MVP scope, protocol, reports
├── package.json             # Root scripts and shared tooling
├── pnpm-workspace.yaml      # Workspace definition
└── tsconfig.base.json       # Strict TypeScript baseline
```

Future packages such as the paint engine, motion engine, camera engine, asset
providers, audio engine, and video compositor are documented in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). They are intentionally not
scaffolded before their phases begin.

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
- Minimal dependencies; no cloud infrastructure or paid services in Phase 0.
- No credentials or secrets in the repository.

## License

Private and unlicensed. All rights reserved.
