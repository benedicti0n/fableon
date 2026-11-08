# Phase 0 Completion Report

- **Phase:** 0 — Foundation
- **Date:** 2026-11-08
- **Branch:** `main`
- **Base commit:** `f4239f9` (Initial commit)
- **Implementation head before this report:** `f100865`
- **Status:** Complete; submitted for architectural review
- **Next phase:** Not started

## A. Executive Summary

Phase 0 established the Fableon engineering foundation:

- A pnpm workspace with strict shared TypeScript configuration.
- A Next.js App Router web application with a public homepage (`/`) and a
  Studio shell (`/studio`).
- A responsive, dark creative-software interface with reusable primitives and
  explicitly labeled placeholders. No placeholder is presented as a working
  control.
- Shared brand and pipeline constants in `@fableon/shared`.
- ESLint, Prettier, strict TypeScript validation, Vitest, build verification,
  and meaningful page/domain smoke tests.
- Complete architecture, roadmap, MVP scope, and development protocol
  documentation.
- Production and development runtime verification of both routes.

The phase achieved its goals without installing Remotion, AI SDKs, databases,
rendering libraries, or cloud services. No Phase 1 scene model or rendering
work was implemented. All required verification commands passed, and the working
tree was clean before this report was committed.

**Recommendation:** GO for reviewer acceptance of Phase 0. This is not
authorization to begin Phase 1; a new phase prompt is required.

## B. Initial Repository State

Inspected before any changes:

- Branch `main` tracking `origin/main`, with remote
  `https://github.com/benedicti0n/fableon.git`.
- Working tree clean.
- Exactly one commit: `f4239f9` — `Initial commit`.
- That commit contained only `README.md` with the single line `# fableon`.
- No `package.json`, lockfile, workspace configuration, TypeScript config, app,
  packages, tests, or documentation existed.
- No uncommitted user work existed.
- No pre-existing authoritative MVP specification existed. The initial README
  contained no product requirements, so there was no existing MVP document to
  preserve or conflict with.
- Local environment: Node.js `v25.9.0`, pnpm `11.1.3`, npm `11.18.0`, macOS.
- The initial README was expanded rather than overwritten with unrelated
  content. No user commits were rewritten or removed.

## C. Completed Features

### Feature 0.1 — Repository Foundation

**Commit:** `eee6f7f27da1c2f09ac4d2f917650c3bdd556875`  
**Message:** `chore(repo): establish fableon workspace`

**Implementation summary**

- Created a pnpm workspace for `apps/*` and `packages/*`.
- Added root scripts for `dev`, `build`, `start`, `lint`, `typecheck`, `test`,
  `test:watch`, `format`, and `format:check`.
- Added a strict shared TypeScript baseline with `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and related
  guardrails.
- Added `.gitignore`, `.editorconfig`, `.nvmrc`, Prettier configuration, and a
  pnpm lockfile.
- Created `packages/shared` with typed brand constants and the planned
  ten-stage product pipeline. The package is functional and consumed by the web
  application; no empty speculative packages were created.
- Wrote installation, command, structure, and scope instructions in the README.
- Declared Node compatibility as `^22.13.0 || >=24.0.0`; `.nvmrc` recommends
  Node 24 LTS.

**Files added/modified**

- `.editorconfig`
- `.gitignore`
- `.nvmrc`
- `.prettierignore`
- `.prettierrc.json`
- `README.md`
- `package.json`
- `packages/shared/package.json`
- `packages/shared/src/brand.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/pipeline.ts`
- `packages/shared/tsconfig.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`

**Acceptance results**

| Criterion                                          | Result | Evidence                                                                  |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| pnpm workspace configuration                       | PASS   | Three workspace projects resolved; workspace links installed              |
| Strict TypeScript configuration                    | PASS   | `pnpm typecheck` passed for shared package at foundation stage            |
| Required root scripts                              | PASS   | All required scripts present and exercised by final verification          |
| Appropriate `.gitignore` and dependency management | PASS   | Lockfile and ignores present; generated output excluded                   |
| Node.js compatibility declared and workable        | PASS   | Engine range corrected in `f036458`; build and tests run on Node 25.9.0   |
| Functional local development environment           | PASS   | `pnpm build`, production start, and `pnpm dev` each served both routes    |
| Clear README installation instructions             | PASS   | Requirements, quick start, commands, structure, and docs links documented |

### Feature 0.2 — Fableon Web Application

**Commit:** `e343ffedc467bf7d64ac02d9d5cdd0d5d6ce7cac`  
**Message:** `feat(web): create fableon studio shell`

**Implementation summary**

- Created the Next.js App Router application under `apps/web`.
- Homepage `/` includes Fableon branding, product description, pipeline
  overview, Studio navigation, a static visual-direction study, and honest
  Phase 0 status messaging.
- Studio `/studio` includes labeled regions for Project, Scenes, Canvas /
  Preview, Timeline, Assets, and Properties.
- Every unfinished Studio panel carries a visible “Not yet implemented” badge
  and explicit empty-state guidance. No fake buttons, transport controls, or
  simulated project data were added.
- Added reusable UI primitives: `Badge`, `ButtonLink`, `Panel`, and
  `EmptyState`, plus a minimal `cn` class combiner and inline icon set.
- Added a static SVG concept plate of a bird in a painted forest, clearly
  labeled “Concept · not rendered.”
- Established the dark creative-software design system with warm ochre accents,
  system font stacks, responsive layouts, focus-visible states, and
  reduced-motion handling.
- The `next-env.d.ts` file added by this commit was later removed from version
  control as a generated artifact in `862dcaa`.

**Files added/modified**

- `apps/web/app/globals.css`
- `apps/web/app/icon.svg`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/studio/page.tsx`
- `apps/web/components/brand-mark.tsx`
- `apps/web/components/forest-plate.tsx`
- `apps/web/components/icons.tsx`
- `apps/web/components/pipeline-overview.tsx`
- `apps/web/components/site-footer.tsx`
- `apps/web/components/site-header.tsx`
- `apps/web/components/ui/badge.tsx`
- `apps/web/components/ui/button-link.tsx`
- `apps/web/components/ui/empty-state.tsx`
- `apps/web/components/ui/panel.tsx`
- `apps/web/lib/cn.ts`
- `apps/web/next-env.d.ts` (later untracked in `862dcaa`)
- `apps/web/next.config.ts`
- `apps/web/package.json`
- `apps/web/postcss.config.mjs`
- `apps/web/tsconfig.json`
- `pnpm-lock.yaml`

**Acceptance results**

| Criterion                                            | Result | Evidence                                                                  |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Homepage branding, description, pipeline, navigation | PASS   | Rendered content and RTL smoke tests                                      |
| Studio shell anticipates all six requested regions   | PASS   | Six labeled panels rendered and tested                                    |
| Placeholders explicitly labeled as unimplemented     | PASS   | Six “Not yet implemented” status badges                                   |
| No fake working controls                             | PASS   | Studio test asserts zero buttons; only navigation links exist             |
| Professional dark, responsive UI                     | PASS   | Implemented with dark design tokens and responsive grid/stack breakpoints |
| Reusable UI primitives                               | PASS   | Four primitives used across both pages                                    |
| No excessive animations or dependencies              | PASS   | No animation or component library added; only color transitions           |

Visual rendering was verified structurally via server-rendered HTML and DOM
tests. It was not screenshot-reviewed in a browser; see Limitations.

### Feature 0.3 — Development Quality Gates

**Commit:** `191291bfb2d505beaabecbd15d33e6afee256c1a`  
**Message:** `test(repo): add validation and smoke checks`

**Implementation summary**

- Added a flat ESLint 9 configuration using `eslint-config-next` core web vitals
  and TypeScript configs, Prettier conflict disabling, monorepo ignores, and an
  explicit Next.js root directory to avoid monorepo page-resolution noise.
- Added Vitest 4 with jsdom, React Testing Library, jest-dom matchers, the `@/`
  alias, and a setup file with cleanup.
- Added 12 meaningful tests across four files:
  - Homepage identity, pipeline, concept plate, and Studio links.
  - Studio panel labels, absence of fake buttons, and navigation back home.
  - Shared pipeline invariants (unique IDs, contiguous order, valid phases,
    idea-to-export shape).
  - `cn` class-name combiner behavior.
- Added type declarations for jest-dom Vitest matchers so strict typechecking
  covers tests.
- Added the Studio page’s visually hidden `h1` for accessible document
  structure.
- Made lint fail on warnings with `--max-warnings=0`.

**Files added/modified**

- `apps/web/app/page.test.tsx`
- `apps/web/app/studio/page.test.tsx`
- `apps/web/app/studio/page.tsx`
- `apps/web/lib/cn.test.ts`
- `apps/web/test/testing-library.d.ts`
- `eslint.config.mjs`
- `package.json`
- `packages/shared/src/pipeline.test.ts`
- `vitest.config.ts`
- `vitest.setup.ts`

**Acceptance results**

| Criterion                       | Result | Evidence                                               |
| ------------------------------- | ------ | ------------------------------------------------------ |
| ESLint configured and passing   | PASS   | `eslint . --max-warnings=0`, no warnings               |
| Prettier configured and passing | PASS   | `pnpm format:check` passed                             |
| Strict TypeScript validation    | PASS   | Both workspace packages pass `tsc --noEmit`            |
| Vitest configured and passing   | PASS   | 4 files, 12 tests passed                               |
| Build verification              | PASS   | Next.js production build completed                     |
| Meaningful smoke tests          | PASS   | Page, domain, and utility assertions exercise behavior |

### Feature 0.4 — Architecture Documentation

**Commit:** `6e9832bc476f6836fc4e4520876a17d373d2c657`  
**Message:** `docs: establish fableon architecture and roadmap`

**Implementation summary**

- `docs/ARCHITECTURE.md` documents module responsibilities and boundaries,
  renderer-independent scene data, deterministic frame evaluation, layer
  composition, future paint/motion/camera systems, AI provider abstraction,
  video composition, asset storage, error handling, and testing strategy.
- `docs/ROADMAP.md` covers Phases 0–11 with goals, expected features,
  dependencies, acceptance criteria, and major risks.
- `docs/MVP_SCOPE.md` defines the target experience, required features,
  non-goals, workflow, technical targets, visual quality requirements, the
  “Where the Light Lands” bird benchmark, a weighted evaluation rubric, and MVP
  acceptance criteria.
- `docs/DEVELOPMENT_PROTOCOL.md` documents the nine-step collaboration loop,
  repository inspection, commit discipline, verification protocol, report
  template, review gates, corrective work, and the rule that no phase advances
  without a new prompt.
- Future decisions are explicitly marked provisional. No future package was
  scaffolded.
- No existing authoritative MVP specification was present to preserve.

**Files added/modified**

- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_PROTOCOL.md`
- `docs/MVP_SCOPE.md`
- `docs/ROADMAP.md`

**Acceptance results**

| Criterion                                     | Result | Evidence                                                            |
| --------------------------------------------- | ------ | ------------------------------------------------------------------- |
| Architecture topics covered                   | PASS   | All requested topics have dedicated sections                        |
| Roadmap phases 0–11 with required subsections | PASS   | Every phase includes goals, features, dependencies, criteria, risks |
| MVP scope defines benchmark and acceptance    | PASS   | Bird benchmark, scene plan, rubric, functional criteria included    |
| Development protocol documents 9-step loop    | PASS   | Loop, gates, reporting template, and no-advance rule included       |
| Existing specification preserved              | N/A    | None existed in the initial repository                              |

### Corrective Commits Within Phase 0

These were made during final verification, before the report, and are part of
the Phase 0 deliverable.

**`f0364589eeb6965548b3d171804e9ce849550d99` — `fix(repo): align node engine floor with tooling`**

- Raised the declared Node floor from `>=22.12.0` to
  `^22.13.0 || >=24.0.0` to match jsdom 29’s actual engine requirement.
- Updated the README requirement accordingly.
- Re-ran install, formatting, lint, typecheck, tests, build, and runtime checks.

**`862dcaa0f540702eed774ab59cba9881f6a0dd01` — `fix(web): keep generated next artifacts out of git`**

- Removed auto-generated `apps/web/next-env.d.ts` from version control and
  ignored it, following Next.js guidance that it should not be tracked.
- Set `agentRules: false` so `next dev` does not create a managed `AGENTS.md`
  block that dirties the tree; Fableon owns its agent guidance in
  `docs/DEVELOPMENT_PROTOCOL.md`.
- Removed `.next/dev/types/**/*.ts` from the web tsconfig include list. Next
  16’s CLI typechecker checks the full tsconfig, and stale dev route types
  caused a production build failure after a dev session.
- Re-ran the full verification suite and both production/development runtime
  checks successfully.

**`f100865989d2bb60081f86703776a08de4344126` — `chore(deps): upgrade typescript to 6.0.3`**

- Upgraded TypeScript from 5.9.3 to 6.0.3 in the root, web, and shared packages.
  TypeScript 6.0.3 is the newest stable line supported by `typescript-eslint`
  (`<6.1.0`) and is supported by Next.js 16.
- Re-ran lint, both typecheck targets, 12 tests, and the production build
  successfully.

## D. Final Repository Structure

```text
fableon/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── globals.css
│       │   ├── icon.svg
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── page.test.tsx
│       │   └── studio/
│       │       ├── page.tsx
│       │       └── page.test.tsx
│       ├── components/
│       │   ├── brand-mark.tsx
│       │   ├── forest-plate.tsx
│       │   ├── icons.tsx
│       │   ├── pipeline-overview.tsx
│       │   ├── site-footer.tsx
│       │   ├── site-header.tsx
│       │   └── ui/
│       │       ├── badge.tsx
│       │       ├── button-link.tsx
│       │       ├── empty-state.tsx
│       │       └── panel.tsx
│       ├── lib/
│       │   ├── cn.test.ts
│       │   └── cn.ts
│       ├── test/
│       │   └── testing-library.d.ts
│       ├── next.config.ts
│       ├── package.json
│       ├── postcss.config.mjs
│       └── tsconfig.json
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── brand.ts
│       │   ├── index.ts
│       │   ├── pipeline.test.ts
│       │   └── pipeline.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/
│   ├── reports/
│   │   └── PHASE_00_REPORT.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_PROTOCOL.md
│   ├── MVP_SCOPE.md
│   └── ROADMAP.md
├── .editorconfig
├── .gitignore
├── .nvmrc
├── .prettierignore
├── .prettierrc.json
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
└── vitest.setup.ts
```

Ignored/generated and not part of the committed tree: `node_modules/`,
`apps/web/.next/`, `apps/web/next-env.d.ts`, `*.tsbuildinfo`, coverage, and
local environment files.

## E. Architecture Decisions

### 1. Minimal pnpm workspace over a build orchestrator

**Decision:** Use pnpm workspaces directly with two real packages rather than
adding Turborepo, Nx, or speculative future packages.

**Rationale:** The dependency graph is small. pnpm already provides workspace
linking, filtered scripts, and a reproducible lockfile. A task orchestrator can
be added when there are enough packages and build steps to justify it.

**Trade-off:** Root scripts are explicit and slightly manual. This is preferable
to hidden pipeline configuration at this stage.

### 2. Strict shared TypeScript baseline

**Decision:** Put strictness in `tsconfig.base.json` and extend it in each
package. Enable `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
unused checks, and `verbatimModuleSyntax`.

**Rationale:** Scene and engine contracts will be long-lived. Catching null
index access, optional-property mistakes, and accidental runtime imports early
is cheaper than fixing them after renderer integration.

**Trade-off:** Some library and test ergonomics are stricter; the team must use
type-only imports and explicit handling. This is intentional.

### 3. Next.js App Router with a presentation-only web layer

**Decision:** Use Next.js 16 App Router, React 19, and Tailwind CSS 4. Keep
routes and presentation in `apps/web`; keep product constants in
`packages/shared`.

**Rationale:** The App Router provides static rendering for the public pages,
clear layouts, and a path to a richer Studio. The web layer does not own future
scene data or engine behavior.

**Trade-off:** The Studio shell is server-rendered and static in Phase 0. Real
editor state will require deliberate client boundaries in later phases; those
boundaries are not guessed now.

### 4. No component library

**Decision:** Build four small UI primitives and an inline icon set rather than
adding a component library.

**Rationale:** Keeps dependencies minimal, gives full control over the
professional dark aesthetic, and avoids adopting a design system that may not
fit the future editor.

**Trade-off:** More local component code and fewer prebuilt controls. This is
acceptable for the shell; a focused review can revisit once editor interactions
exist.

### 5. Honest placeholder design

**Decision:** Every incomplete Studio area is a non-interactive panel with a
visible “Not yet implemented” badge and a phase reference. No fake buttons,
transport controls, sliders, or invented project data were added.

**Rationale:** The shell must communicate structure without implying working
capability. A test enforces the absence of `<button>` elements on the page.

**Trade-off:** The Studio is intentionally sparse. This is preferable to a
deceptive demo.

### 6. Version pins driven by compatibility

**Decision:** Use Next.js `16.4.5`, React `19.3.1`, TypeScript `6.0.3`,
ESLint `9.39.5`, Vitest `4.1.12`, jsdom `29.1.1`, and Tailwind CSS `4.3.5`.

**Rationale and constraints:**

- ESLint 10 was rejected because `eslint-config-next@16.4.5`’s bundled React,
  import, and jsx-a11y plugins peer-support ESLint 9 at most. Using ESLint 10
  produced unmet-peer warnings.
- TypeScript 7 was rejected because `typescript-eslint` currently requires
  TypeScript `<6.1.0`. TypeScript 6.0.3 is the newest compatible stable line.
- Vitest 5 was rejected for this environment because its engine range excludes
  Node 25; Vitest 4.1.12 supports the installed Node 25.9.0.
- jsdom 31 was rejected because its engine range excludes Node 25; jsdom 29.1.1
  is compatible.
- The project’s supported range is `^22.13.0 || >=24.0.0`, with Node 24 LTS
  recommended in `.nvmrc`.

**Trade-off:** These are slightly behind the newest majors until the ecosystem
and supported Node baseline align. The constraints are documented for future
upgrade work.

### 7. Generated Next.js files are not versioned

**Decision:** Ignore `next-env.d.ts` and disable `agentRules`; include only
`.next/types` (not `.next/dev/types`) in the web tsconfig.

**Rationale:** Next 16 rewrites `next-env.d.ts` differently between dev and
build, and its managed agent block is generated state. Tracking them produces a
perpetually dirty tree. Including stale dev route types also caused a real
production build failure after a dev session because Next 16.4 uses the
TypeScript CLI checker over the full project.

**Trade-off:** A fresh checkout relies on Next to regenerate `next-env.d.ts`
during dev/build. Clean-clone typechecking was verified to pass without it.
Typechecking during an active dev session does not include dev-only generated
route validators; production type safety remains covered by `pnpm build`.

### 8. Page-level tests with Testing Library instead of browser E2E in Phase 0

**Decision:** Render the server components directly with React Testing Library
under jsdom and assert accessible roles/content. Use HTTP checks against real
dev and production servers for runtime confidence.

**Rationale:** This catches broken links, missing labels, fake controls, and
content regressions without adding Playwright or browser infrastructure to the
foundation. The shared pipeline has independent invariant tests.

**Trade-off:** No pixel-level, responsive, or real-browser verification. The
report explicitly records this limitation; browser E2E/visual regression is a
future quality-gate addition.

### 9. Documentation-first renderer independence

**Decision:** Write the module boundaries, deterministic evaluation principles,
scene-data rules, asset model, provider abstraction, and provisional engine
direction before implementing any of them.

**Rationale:** Phase 1 will define the scene format. Establishing boundaries now
reduces the chance that UI state, a renderer, or an AI provider becomes the
de facto schema.

**Trade-off:** Some future decisions remain open by design; the docs mark them
provisional rather than over-specifying.

## F. Verification Results

All commands were run from the repository root on the final corrected code
state, unless noted. The code tree was clean apart from this untracked report
before it was committed.

| Check             | Command                                             | Result | Notes                                                                                                                                                                                   |
| ----------------- | --------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependencies      | `pnpm install`                                      | PASS   | 3 workspace projects; “Already up to date”; pnpm 11.1.3. Earlier resolution exposed an ESLint 10 peer conflict, fixed by pinning ESLint 9.39.5. Final install emitted no peer warnings. |
| Lint              | `pnpm lint`                                         | PASS   | Runs `eslint . --max-warnings=0`; no warnings after configuring the Next monorepo root.                                                                                                 |
| TypeScript        | `pnpm typecheck`                                    | PASS   | Runs strict `tsc --noEmit` in `@fableon/web` and `@fableon/shared`; verified after removing `.next` and generated `next-env.d.ts`.                                                      |
| Tests             | `pnpm test`                                         | PASS   | 4 test files, 12 tests passed in 1.58s. Covers pages, fake-control absence, navigation, shared pipeline invariants, and `cn`.                                                           |
| Build             | `pnpm build`                                        | PASS   | Next.js 16.4.5 with Turbopack; compiled and typechecked; four static routes (`/`, `/_not-found`, `/icon.svg`, `/studio`).                                                               |
| Runtime (prod)    | `PORT=3100 pnpm --filter @fableon/web start` + curl | PASS   | `/` → 200, `/studio` → 200. Homepage marker “Stories,” and Studio markers “Canvas / Preview” / “Not yet implemented” present. Server intentionally stopped (exit 143 from SIGTERM).     |
| Runtime (dev)     | `PORT=3101 pnpm dev` + curl                         | PASS   | `next dev` ready in 309–375 ms; `/` → 200, `/studio` → 200 with expected content. No `AGENTS.md` was generated after `agentRules: false`. Server intentionally stopped.                 |
| Formatting        | `pnpm format:check`                                 | PASS   | All matched files use Prettier style.                                                                                                                                                   |
| Peer dependencies | `pnpm peers check`                                  | PASS   | No peer dependency issues after pinning ESLint 9.39.5.                                                                                                                                  |

### Verification remediation history

- Initial ESLint 10 installation produced unmet peer dependencies from
  `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-react`.
  Remediated by pinning ESLint `9.39.5`.
- Initial test run had one ambiguous text query; changed to an exact text query.
  Re-run passed.
- Initial test-aware typecheck lacked jest-dom matcher types; added
  `apps/web/test/testing-library.d.ts`. Re-run passed.
- ESLint printed a “Pages directory cannot be found” warning at the monorepo
  root; configured `settings.next.rootDir = "apps/web"`. Re-run clean.
- A dev-then-build sequence failed on stale `.next/dev/types` because Next 16’s
  TypeScript CLI checker includes the full tsconfig. Removed dev types from the
  include list; re-ran build, lint, typecheck, tests, formatting, and runtime
  checks successfully.

### Known warnings

- `eslint@9.39.5` is marked deprecated by npm because ESLint 10 is current.
  ESLint 10 is blocked by the peer ranges of `eslint-config-next` 16.4.5’s
  plugins. This is a temporary compatibility pin.
- The local Node version is `25.9.0` (non-LTS). The project recommends Node 24
  LTS via `.nvmrc` and declares a compatible range.
- Stopping background Next servers intentionally produced exit status 143.
  This is SIGTERM from the verification cleanup, not an application failure.

## G. Issues and Limitations

1. **No browser-based visual review or screenshot diff.** Runtime was verified
   with HTTP status and rendered HTML content, and DOM behavior with jsdom.
   Layout aesthetics, responsive breakpoints, and real-browser rendering were
   not screenshot-audited. A Playwright/visual-regression layer is recommended
   before editor-heavy phases.
2. **No CI pipeline.** All gates pass locally and are scripted, but no GitHub
   Actions or other CI configuration exists yet. This is not a Phase 0
   requirement; it should be added before collaboration scales.
3. **Temporary dependency pins.** ESLint 9.39.5, Vitest 4.1.12, and jsdom
   29.1.1 are compatibility pins for the current Next.js plugin and Node
   environment. TypeScript 6.0.3 is the newest line supported by
   `typescript-eslint`; TypeScript 7 remains blocked. Upgrade the pins together
   when Node 24 LTS is the baseline and ESLint 10/TypeScript 7 support is
   available.
4. **Node 25 verification environment.** The implementation ran on Node 25.9.0,
   which is not an LTS release. The declared floor is 22.13/24+, and `.nvmrc`
   recommends 24. CI should use Node 24 LTS.
5. **Generated Next.js state is ignored.** `next-env.d.ts` is not tracked, and
   `agentRules` is disabled. This keeps the tree clean but means a fresh clone
   must run a Next command before editor route types are generated. Clean
   typechecking without it passes.
6. **Static concept illustration only.** The homepage forest plate is a
   hand-authored SVG study for visual direction. It is not renderer output and
   is explicitly labeled “Concept · not rendered.”
7. **No accessibility audit tooling.** The interface uses semantic landmarks,
   labels, one `h1` per page, focus-visible styles, and reduced-motion handling,
   but no axe or Lighthouse audit was run. Add automated accessibility checks
   with the future browser test suite.
8. **No persistence, scene model, renderer, AI, audio, or video.** These are
   intentionally absent and documented as future phases. The Studio’s six panels
   are placeholders, not partial features.
9. **No deployment definition.** No hosting, container, render worker, or cloud
   configuration was introduced, consistent with the Phase 0 constraint.

## H. Scope Deviations

There were no functional scope deviations. Phase 0 did not begin Phase 1 and did
not install Remotion, AI SDKs, databases, rendering libraries, or paid services.

Small additions within the foundation scope:

- `.editorconfig`, `.nvmrc`, `pnpm format:check`, and a strict `--max-warnings=0`
  lint gate.
- Shared brand and pipeline constants, used by the actual homepage and Studio
  routes rather than left as empty scaffolding.
- A static SVG visual-direction study on the homepage, clearly labeled as a
  concept rather than rendered output.
- Three corrective commits for Node engine accuracy, generated Next.js
  artifacts, and a compatible TypeScript upgrade, all discovered during final
  verification.
- `agentRules: false` in the Next config to prevent generated agent files from
  dirtying the repository.

The `next-env.d.ts` file initially committed with the web feature was later
untracked as a generated file. The final committed tree reflects the corrected
state. No remote push was performed. No Phase 1 work was started.

## I. Phase 1 Readiness

**Recommendation: GO** for Phase 0 acceptance.

Evidence:

- All required commands ran successfully: install, lint, typecheck, 12 tests,
  production build.
- Both `/` and `/studio` returned HTTP 200 from production and development
  servers with expected content.
- Every Studio region is explicitly labeled as not implemented, and a test
  enforces the absence of fake buttons.
- Commits are focused and independently reviewable; the working tree was clean
  before the report was committed.
- Architecture, roadmap, MVP scope, and development protocol are complete and
  mark future choices as provisional.
- No out-of-scope service, secret, renderer, AI SDK, or Phase 1 implementation
  was introduced.

The only meaningful evidence gap is visual browser review, which is documented
above and is not a blocker for a foundation phase with no real rendering.

**GO is limited to accepting Phase 0. Phase 1 must not begin without a new phase
prompt.**

## J. Next Phase Considerations

Phase 1 should start from the following decisions and constraints:

1. **Define the canonical scene document.** Decide schema versioning, project
   and scene identity, frame-rate policy, coordinate units, transforms, layer
   ordering, asset references, and migration behavior. The MVP scope already
   requires a 4–6 scene, 45–60 second story with narration and captions.
2. **Choose validation deliberately.** Runtime validation is required at import
   boundaries. Decide whether to use a schema library or hand-written
   validators, and justify the dependency. Validation errors must be typed and
   actionable.
3. **Keep scene data renderer- and provider-independent.** Do not let editor
   component state, Next.js types, canvas handles, or provider response objects
   become the persisted format.
4. **Create future packages only when used.** `packages/scene-schema` and
   `packages/animation-core` are the likely Phase 1 packages. Do not scaffold
   paint, motion, camera, asset, AI, audio, or video packages yet.
5. **Establish deterministic timeline evaluation.** Frame indices, boundary
   frames, interpolation, easing, and golden frame-plan fixtures should be
   tested before any paint engine consumes them.
6. **Define the minimal timeline surface.** Phase 1 can prove the data model
   with a read-only/inspectable timeline or a constrained editor slice. Full
   visual editing remains Phase 5.
7. **Decide local project persistence.** A validated JSON project plus asset
   manifest is the local-first direction. Avoid a database until real
   requirements demand one.
8. **Add CI and browser confidence early.** Run the existing gates in CI on Node
   24 LTS. Consider adding Playwright and an accessibility check before the
   editor becomes interactive.
9. **Plan upgrades separately.** Do not mix an ESLint/TypeScript/Node upgrade
   into Phase 1 feature work unless required; keep dependency migrations
   reviewable.
10. **Preserve the honesty rule.** New UI must not imply rendering, playback, or
    generation that is not implemented. Placeholders remain explicit.

The Phase 1 prompt should define the exact scene schema scope, required tests,
commit boundaries, and acceptance criteria before implementation begins.
