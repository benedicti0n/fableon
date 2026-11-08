# Phase 2.6 Completion Report

- **Phase:** 2.6 — High-Quality Illustration Asset Pipeline & Hybrid Animation Validation
- **Date:** 2026-11-09
- **Branch:** `main`
- **Starting baseline:** `8fb4e31` (Phase 2.5 completion)
- **Implementation head before this report:** `4074b31`
- **Status:** Engineering complete; premium source artwork blocked; artistic gate pending user review
- **Next phase:** Not started

## A. Executive Summary

Phase 2.6 built a versioned illustration-asset pipeline and proved that imported
artwork can pass through preparation, validation, ZIP round-trip, rig mapping,
and deterministic Canvas animation without destructive repainting.

What Fableon can now do:

- Describe character parts, environment layers, props, provenance, pivots,
  registration, draw order, trim offsets, and hashes in a strict versioned pack.
- Import PNG, WebP, and JPEG files locally, inspect alpha/content bounds, detect
  halo risks, strip only fully transparent padding, preserve original positions,
  and hash both source and prepared bytes.
- Prepare nine-part character artwork, edit pivots and registration, inspect
  bounds, extract visible pixels with an explicit mask, and block unresolved
  hidden-anatomy work.
- Prepare a single background plate or a layered environment with explicit depth
  ordering and transparent foreground/atmosphere validation.
- Export and re-import a portable `.fableon-pack.zip` containing the manifest,
  prepared derivatives, original sources, and provenance.
- Map imported parts onto the existing Phase 2.5 hierarchical rig without
  rewriting the motion system or repainting the artwork.
- Render a diagnostic 48-frame, 1920×1080, 24 FPS-target landing comparison and
  measure import fidelity, rig compatibility, foot lock, determinism, and
  playback performance.

What remains future work:

- A production character/rig schema (Phase 3).
- Premium source artwork and a premium-art visual comparison.
- Deformation, IK, soft-body motion, camera parallax, and final film quality.
- Durable asset storage and full asset-management workflows.

No premium-artwork validation is claimed. The benchmark is explicitly labeled
**DIAGNOSTIC ARTWORK — NOT ARTISTIC VALIDATION**.

## B. Initial Repository State

- **Starting branch:** `main`
- **Starting HEAD:** `8fb4e31a7766a28420d0470108beb9b9ab2afa8d`
- **Starting working tree:** clean
- **Upstream:** no push was performed during this phase. At final inspection,
  `origin/main` resolved to `8fb4e31`; the Phase 2.6 commits remain local-only.
- **Workspace:** pnpm monorepo with `apps/web` and packages for scene schema,
  animation core, render engine, paint engine, sprite motion, and shared
  contracts. Phase 2.6 added `packages/illustration-pipeline`.
- **Preserved:** the homepage, `/studio`, `/benchmarks/phase-02`,
  `/benchmarks/phase-02-5`, the Phase 1 schema, the Phase 2 renderer, and the
  Phase 2.5 landing rig/motion.
- **No user work was overwritten.** No database, provider credentials, paid
  service, or cloud storage was added.

## C. Completed Features

### 2.6.1 — Versioned Illustration Asset Packs

- **Commit:** `b449f51705599dbd039d48fb20570676f787ffc0`
- **Implementation:** Added `@fableon/illustration-pipeline` with a strict
  `fableon.illustration-pack` version-1 schema, source-space pivots,
  registration, trim metadata, hierarchy, draw order, provenance, hashes, and
  structured validation errors.
- **Key files:**
  - `packages/illustration-pipeline/{package.json,tsconfig.json}`
  - `packages/illustration-pipeline/src/{constants,schema,index}.ts`
  - `packages/illustration-pipeline/src/schema.test.ts`
  - `docs/illustration/ILLUSTRATION_PACK_FORMAT.md`
- **Tests:** 8 unit tests covering valid packs, round-trip serialization,
  duplicate IDs/orders, missing parents, cycles, invalid pivots/paths/trims,
  unknown versions, and issue paths.
- **Acceptance:** PASS.

### 2.6.2 — Fidelity-Preserving Image Import and Normalization

- **Commit:** `c4541f6183d51931ada2c3da9f83816d2c7b5cdf`
- **Implementation:** Added magic-byte format validation for PNG/WebP/JPEG,
  browser decoding, alpha/content/opaque/transparent bounds, halo and
  premultiplied-risk warnings, conservative trimming at alpha threshold 0,
  lossless padding/normalization, Web Crypto SHA-256 source and prepared hashes,
  explicit PNG derivative encoding, and structured import errors.
- **Key files:**
  - `packages/illustration-pipeline/src/{image,browser-import,index}.ts`
  - `packages/illustration-pipeline/src/image.test.ts`
  - `docs/illustration/IMAGE_IMPORT.md`
- **Tests:** 11 unit tests covering format signatures, SVG/GIF rejection,
  alpha preservation, trim offsets, padding, normalization, halo/empty warnings,
  malformed buffers, hashes, and prepared derivatives.
- **Acceptance:** PASS.

### 2.6.3 — Character Part Preparation

- **Commit:** `250740390c5c32dac76e91a1d1dff005ffeb8c77`
- **Implementation:** Added the nine-part storybook-bird template, imported-part
  assignment, source-space pivot/registration edits, descendant-safe removal,
  missing-part/parent/alpha/hash/draw-order diagnostics, unresolved-occlusion
  blocking, and a constrained mask-extraction workflow that copies selected
  pixels exactly and never infers hidden anatomy.
- **Key files:**
  - `packages/illustration-pipeline/src/{character,mask,index}.ts`
  - `packages/illustration-pipeline/src/{character,mask}.test.ts`
  - `docs/illustration/CHARACTER_PREPARATION.md`
- **Tests:** 13 unit tests covering template shape, assignment metadata, missing
  parts, parent/alpha/occlusion errors, warnings, immutable edits, descendant
  removal, mask preservation, region bounds, empty/near-full masks, and
  transparent content.
- **Acceptance:** PASS technically; premium illustration quality remains
  blocked by source artwork.

### 2.6.4 — Imported Pack Rig Adapter

- **Commit:** `8be6c93a62762769c294aecdae864e70228e47be`
- **Implementation:** Added `createImportedCharacterRig`, compatibility
  validation, pivot remapping with
  `drawOffset = preparedOffset + baseRigPivot - importedPivot`, pack z-order
  rendering, hidden-part support, and deterministic exact-frame evaluation.
  The Phase 2.5 hierarchy and motion tracks are reused; the scene schema is
  unchanged.
- **Key files:**
  - `packages/illustration-pipeline/src/{rig-adapter,index}.ts`
  - `packages/illustration-pipeline/src/rig-adapter.test.ts`
  - `docs/illustration/RIG_ADAPTER.md`
- **Tests:** 8 unit tests covering pivot alignment, hierarchy, draw order,
  missing parts/images, parent mismatches, order warnings, deterministic frame
  sampling, and explicit node-to-part overrides.
- **Acceptance:** PASS. Existing Phase 2.5 rig tests remain passing.

### 2.6.5 — Layered Environment Pipeline

- **Commit:** `02f1b91b4939e01b6c0192d3d1e0fd9f5bd07947`
- **Implementation:** Added environment role templates, single-plate and
  multi-layer packs, explicit depth ordering, registration/transform planning,
  opacity-aware Canvas composition, transparent foreground/atmosphere
  validation, missing-background errors, and missing-image errors.
- **Key files:**
  - `packages/illustration-pipeline/src/{environment,index}.ts`
  - `packages/illustration-pipeline/src/environment.test.ts`
  - `docs/illustration/ENVIRONMENT_PIPELINE.md`
- **Tests:** 7 unit tests covering single plates, missing backgrounds, opaque
  overlay rejection, depth ordering, registration/transforms, reordering,
  Canvas draw order, missing images, and warning cases.
- **Acceptance:** PASS. The benchmark uses a single imported plate; multi-layer
  support is structurally tested but lacks premium layered artwork.

### 2.6.6 — Illustration Asset Preparation Workspace

- **Commit:** `f5299d7380d38e76c995083354130351a896ed94`
- **Implementation:** Added `/studio/assets` with local multi-file import,
  checkerboard original/prepared previews, source metadata, alpha/edge warnings,
  character/environment mode tabs, role assignment, pivot/registration editing,
  bounds/pivot overlays, missing-part diagnostics, occlusion blocking, layer
  reordering, session-only persistence messaging, ZIP export, ZIP import, and
  re-export. Added `fflate`-based archive creation/reading with safe-path,
  entry-count, and expansion-size checks.
- **Key files:**
  - `apps/web/app/studio/assets/{page,asset-workspace}.tsx`
  - `packages/illustration-pipeline/src/{archive,index}.ts`
  - `packages/illustration-pipeline/src/archive.test.ts`
  - `tests/browser/assets.spec.ts`
  - `docs/illustration/ASSET_WORKSPACE.md`
- **Tests:** 6 archive unit tests plus 6 browser tests covering workspace load,
  transparent import, metadata, invalid SVG, pivot edits, ZIP round-trip,
  archive re-import, and layered environment assignment.
- **Acceptance:** PASS. No fake generation or auto-rigging controls exist.

### 2.6.7 — Hybrid Visual Benchmark

- **Commit:** `4464adc3431af246fbef3dc6136e3d1d836fd05c`
- **Implementation:** Added `/benchmarks/phase-02-6`, which rasterizes the Phase
  2.5 diagnostic bird and forest to PNG, imports them through the real pipeline,
  validates the nine-part pack, maps it onto the existing landing rig, renders
  the same 48-frame motion, and captures comparison and fidelity evidence.
  Clearly labels premium artwork as blocked.
- **Key files:**
  - `apps/web/app/benchmarks/phase-02-6/{page,benchmark,diagnostic-pack,render}.tsx/ts`
  - `scripts/capture-phase-02-6.mjs`
  - `tests/browser/phase-02-6.spec.ts`
  - `docs/benchmarks/phase-02-6/*`
  - `package.json`, `.gitignore`, `README.md`
- **Tests:** 5 browser tests covering diagnostic labeling, both pipelines,
  scrubbing, playback/replay, actual PNG capture dimensions, validation, foot
  lock, determinism, fidelity, and contact-sheet capture.
- **Acceptance:** PASS technically; premium-art validation BLOCKED.

### 2.6.8 — Automated Quality & Regression Testing

- **Commit:** `43ab50e576c7c09bad3cffe9e5e99e0ccbdb6cf4`
- **Implementation:** Added corrupted-PNG handling, occlusion-export blocking,
  environment depth-order assertions, layer-order metadata, and route
  preservation tests for every existing surface.
- **Key files:**
  - `tests/browser/assets.spec.ts`
  - `tests/browser/routes.spec.ts`
  - `apps/web/app/studio/assets/asset-workspace.tsx`
- **Tests:** 2 additional asset browser tests and 6 route smoke tests.
- **Acceptance:** PASS. Final suite: 36/36 browser tests.

### 2.6.9 — Professional Artwork Handoff Guide

- **Commit:** `5afb455ea886ef6d8838f1a86ee0ef5efb82951e`
- **Implementation:** Defined delivery structure, character/environment source
  requirements, part IDs, pivot/registration expectations, occlusion rules,
  provenance format, quality checklist, import/review workflow, and acceptance
  gate.
- **Key files:** `docs/illustration/ARTWORK_HANDOFF_GUIDE.md`
- **Tests:** Documentation-only.
- **Acceptance:** PASS.

### Corrective — Refreshed Capture Metrics

- **Commit:** `4074b314afa13c9ed2f896ddb695c59daf8360ef`
- **Implementation:** Refreshed `performance.json` and `import-validation.json`
  after the final capture run.
- **Acceptance:** PASS.

## D. Illustration Asset Contract

**Format:** `fableon.illustration-pack`  
**Version:** `1` (unknown versions fail loudly)  
**Pack kinds:** `character`, `environment`, `prop`, `mixed`  
**Categories:** character-part, background, midground, foreground, prop,
atmosphere, reference.

### Canonical coordinates

- `pivot` is always in **original untrimmed source-image coordinates**:
  `{ "space": "source", "x": …, "y": … }`.
- `registration` is the top-left of the original source in the pack canvas.
- `trim.contentBounds` is the retained rectangle in original source coordinates.
- `preparedOffset` is the top-left of the prepared derivative in source
  coordinates. The renderer draws at `registration + preparedOffset`.
- Pivot does not move when trimming. This is validated and tested.
- Character rigs use source-local pivots and their own parent transforms;
  registration is presentation/composition metadata and is not silently added to
  rig motion.

### Part metadata

Each part records: unique ID, display name, category, prepared source path,
optional original source path, original/prepared dimensions, registration,
source-space pivot, prepared offset, trim metadata, alpha expectation, parent
ID, unique zIndex, optional character role and occlusion status, SHA-256 hashes,
and provenance.

### Validation

The parser rejects duplicate IDs/orders, missing parents, cycles, invalid
dimensions, pivots outside the source, unsafe paths, unsupported extensions,
trim bounds outside the source, prepared images smaller than retained content,
malformed provenance/transforms/hashes, and unknown versions. Issues carry a
path such as `parts.3.pivot`. Empty packs are structurally valid so incomplete
work can be inspected, but character/environment readiness checks mark them not
animation-ready.

### Provenance

Required kinds: user-created, artist-created, ai-generated,
licensed-third-party, procedurally-generated, diagnostic. Optional creator,
source reference, license, and notes. The format is not a legal guarantee; human
owners remain responsible for usage rights.

## E. Image Import Architecture

- **Format detection:** PNG, WebP, and JPEG are detected by magic bytes, not just
  file extension. SVG is rejected as an active privileged import; GIF and other
  formats fail with an actionable error.
- **Decoding:** browser `createImageBitmap` with an HTMLImageElement fallback;
  pixels are read as straight RGBA from Canvas 2D.
- **Inspection:** dimensions, file size, alpha presence, opaque/transparent
  ratios, content/opaque/transparent bounds, semi-transparent count, color space
  where available, SHA-256 source hash, and warnings.
- **Warnings:** alpha missing, opaque background, white/black halos,
  transparent RGB residue, possible premultiplied risk, empty content.
- **Trimming:** threshold 0 by default so only fully transparent pixels are
  removed; intentional low-alpha watercolor edges survive. Trimming is optional.
  Offsets and content bounds are retained.
- **Normalization:** lossless transparent padding or target-canvas placement;
  existing RGBA bytes are copied unchanged.
- **Color fidelity:** no automatic recoloring, sharpening, blur, contrast, or
  texture filtering.
- **Hashing:** SHA-256 via Web Crypto for source and prepared bytes.
- **Derivatives:** prepared PNGs are pixel-equivalent, not guaranteed
  byte-identical across browsers/operating systems. Source bytes remain in the
  exported archive when supplied.
- **Archive:** ZIP contains manifest, provenance, prepared assets, and originals;
  unsafe paths, duplicate/overlarge expansion, missing assets, and invalid
  manifests are rejected. Import is limited to 256 entries and 100 MiB expanded.
- **Errors:** unsupported format, invalid file/pixels, empty image, decode
  failure, encode failure, hash unavailable.

## F. Character Preparation Pipeline

Template:

```text
body
├── head
│   ├── eye
│   └── beak
├── wing-far
├── wing-near
├── tail
├── leg-left
└── leg-right
```

- Imported parts are assigned by stable role/ID matching; unmatched files remain
  available for manual assignment.
- Pivots and registration are editable numerically with immediate preview.
- The overlay shows source bounds, prepared bounds, and pivot.
- Missing parts, parent mismatches, opaque character parts, missing hashes,
  draw-order deviations, and unresolved occlusion are reported. Only blocking
  errors prevent `ready`.
- Mask extraction requires a source and a same-size mask, copies selected source
  RGBA exactly, makes unselected pixels transparent, and reports visible bounds,
  coverage, and hidden-anatomy risk. It does not inpaint or infer geometry.
- Occlusion metadata marks hidden anatomy. An unresolved part blocks export and
  animation readiness.

Rig mapping:

```text
drawOffset =
  preparedOffset + baseRigPivot - importedPartPivot
drawOffset + importedPartPivot = baseRigPivot
```

The base rig pivots, tracks, hierarchy, and draw-order intent remain
authoritative. Pack zIndex becomes render order. Missing parts, duplicate
matches, and incompatible parents are blocking; draw-order deviations and pivot
remaps are reported without repainting or editing the manifest.

## G. Environment Asset Pipeline

Supported:

1. One polished background plate.
2. Layered environment with independently replaceable transparent layers.

Recommended order:

```text
sky (0), distant-forest (10), midground-trees (20),
foreground-trees (30), landing-branch (40),
atmospheric-light (50), foreground-details (60)
```

- At least one background plate is required.
- Foreground/atmosphere layers must be transparent; opaque overlays are errors.
- Opaque props produce warnings.
- Render plan:
  `x = registration.x + preparedOffset.x + transform.x`,
  `y = registration.y + preparedOffset.y + transform.y`.
- Transforms support translation, scale, rotation, and opacity; Phase 2.6 uses
  the layer top-left as the transform origin.
- `renderEnvironmentPack` draws prepared derivatives directly, preserves alpha,
  applies opacity/depth order, and fails on missing decoded layers.
- The benchmark uses one imported 1920×1080 plate; multi-layer behavior is
  unit-tested but not visually validated with premium layered artwork.

## H. Visual Benchmark

- **Route:** `/benchmarks/phase-02-6`
- **Source artwork:** Phase 2.5 procedural storybook bird and forest, used as a
  diagnostic fixture only.
- **Prepared pack:** `diagnostic-bird`, nine parts, generated in the browser by
  encoding the Phase 2.5 part canvases to PNG and feeding them through the real
  import pipeline.
- **Environment pack:** `diagnostic-forest`, one imported 1920×1080 background
  plate.
- **Motion:** same Phase 2.5 landing hierarchy and 48-frame tracks.
- **Full sequence:** `docs/benchmarks/phase-02-6/frames/` (ignored generation
  directory).
- **Selected frames:** `docs/benchmarks/phase-02-6/selected-frames/` — frames 0,
  8, 16, 24, 30, 38, 47 at 1920×1080.
- **Contact sheet:** `docs/benchmarks/phase-02-6/contact-sheet.png`.
- **Fidelity comparison:** `docs/benchmarks/phase-02-6/fidelity-comparison.png`.
- **Source artwork preview:** `docs/benchmarks/phase-02-6/source-artwork.png`.
- **Prepared character:** `docs/benchmarks/phase-02-6/prepared-character.png`.
- **Playable MP4:** `docs/benchmarks/phase-02-6/animation-preview.mp4` — H.264,
  1920×1080, 48 frames, 24 FPS, 2.000 s.
- **Import evidence:** `docs/benchmarks/phase-02-6/import-validation.json`.
- **Rig evidence:** `docs/benchmarks/phase-02-6/rig-validation.json`.
- **Performance:** `docs/benchmarks/phase-02-6/performance.json`.
- **Quality assessment:** `docs/benchmarks/phase-02-6/QUALITY_ASSESSMENT.md`.
- **Source requirements:** `docs/benchmarks/phase-02-6/SOURCE_ASSET_REQUIREMENTS.md`.

High-quality source artwork was **not available**. Premium-art comparison is
**BLOCKED**, not passed. No GIF was produced for Phase 2.6; the MP4 is the
playable preview.

## I. Tests & Verification

All checks below were executed after the implementation.

| Check             | Command                     | Result                                                 |
| ----------------- | --------------------------- | ------------------------------------------------------ |
| Install           | `pnpm install`              | PASS — lockfile up to date, pnpm 11.1.3, Node v25.9.0  |
| Formatting        | `pnpm format:check`         | PASS                                                   |
| Lint              | `pnpm lint`                 | PASS — zero warnings                                   |
| Type check        | `pnpm typecheck`            | PASS — root Playwright config + all workspace projects |
| Unit tests        | `pnpm test`                 | PASS — 22 files, 181 tests                             |
| Production build  | `pnpm build`                | PASS                                                   |
| Browser tests     | `pnpm test:browser`         | PASS — 36/36 in 55.1 s                                 |
| Benchmark capture | `pnpm benchmark:phase-02-6` | PASS — 48 frames, MP4, no page errors                  |

### Route verification on the built app

| Route                    | HTTP | Content                        |
| ------------------------ | ---- | ------------------------------ |
| `/`                      | 200  | Homepage                       |
| `/studio`                | 200  | Studio preview                 |
| `/studio/assets`         | 200  | Illustration Asset Preparation |
| `/benchmarks/phase-02`   | 200  | Phase 2 benchmark              |
| `/benchmarks/phase-02-5` | 200  | The Little Bird Comes Home     |
| `/benchmarks/phase-02-6` | 200  | Imported Artwork, Same Motion  |

### Import/export evidence

- Unit suite includes 53 new illustration-pipeline tests.
- ZIP round-trip preserves manifest, prepared assets, originals, provenance, and
  hashes; unsafe paths and missing assets fail.
- Every diagnostic prepared part matches its source crop at mean absolute error
  **0**.
- Environment plate difference: **0**.
- Full-frame baseline vs imported difference at frame 47:
  **0.0002318 mean absolute error**; changed-pixel ratio **0.00386%**.
- Character parts: 9/9; environment layers: 1/1; rig compatibility: ready.
- Foot contact: left `(910, 930)`, right `(1020, 930)`; max drift **0** across
  frames 30–47.
- Repeated evaluation across all 48 frames: equal.

### Performance

From the final `performance.json`:

- Ready time: 2459 ms (page + asset generation + diagnostic import).
- Import: 1904 ms; decode 18.2 ms; pack build 1885.8 ms.
- Warm compositor work (15 samples): environment 0.8 ms, shadow 0 ms,
  character 0.1 ms, baseline 0.9 ms.
- Capture render timing: first 44.9 ms, median 44.0 ms, p95 45.9 ms. This
  includes per-frame canvas readback synchronization in headless Chromium before
  PNG encoding; it is not the warm compositor cost.
- Playback: 26 frames in 1151 ms ≈ **22.59 FPS** (24 FPS target).
- Memory: 18.2 MB used before/after; 29.4 MB total heap; 3.76 GB limit.
- Page errors: none.
- MP4: 1920×1080, 48 frames, 24/1 FPS, 2.000 s.

The 24 FPS target is not reached in observed playback. Rendering/compositing is
well below the frame budget; browser scheduling and capture readback dominate.

## J. Technical Decisions

- **Separate generation from preparation.** No image-generation provider was
  added. The pipeline accepts external assets and never pretends to generate
  premium illustration.
- **Strict versioned pack schema.** Zod validation, structured errors, and
  explicit versioning make packs inspectable and persistable without schema
  ambiguity.
- **Source-space pivots.** Pivots do not change when trimming; registration and
  `preparedOffset` preserve composition. This avoids silent part movement.
- **Conservative trimming.** Alpha threshold 0 protects intentional soft edges;
  destructive keying is not automatic.
- **Web Crypto and PNG derivatives.** SHA-256 identifies source/prepared
  versions. PNG is pixel-equivalent rather than cross-platform byte-identical.
- **No scene-schema change.** Character packs and rigs remain benchmark-local
  until Phase 3 defines production contracts.
- **Reuse the Phase 2.5 rig.** The adapter maps imported pivots onto existing
  attachments rather than rewriting motion. This isolates artwork quality from
  motion changes.
- **fflate for ZIP.** Small browser-safe dependency; justified by portable
  manifests/assets/provenance and tested round-trip behavior.
- **Diagnostic benchmark instead of fabricated quality.** The Phase 2.5 art is
  re-imported and clearly labeled; the premium comparison is blocked rather than
  faked.
- **Session-only workspace.** No database or cloud storage; export is the
  durable artifact, matching Phase 2.6 scope.

## K. Known Limitations

- **No premium source artwork.** This is the primary limitation and the reason
  artistic validation is blocked.
- **No hidden-anatomy inference.** Flattened or masked artwork cannot recover
  occluded wings/body; authored reconstruction is required.
- **No deformation or IK.** Imported parts are rigid; there is no mesh
  deformation, feather bending, toe grip, or physical settling.
- **Single-plate benchmark environment.** Layered environments are implemented
  and unit-tested but not visually validated with premium layers.
- **Session-only workspace.** Browser state is lost unless exported; there is no
  durable asset database.
- **PNG derivatives are pixel-equivalent, not byte-identical** across platforms.
- **Capture performance includes readback.** The 44 ms capture metric is not the
  warm compositing cost; the report distinguishes them.
- **Observed playback ~22.6 FPS**, below the 24 FPS target.
- **JPEG has no alpha.** JPEG is for opaque plates only.
- **No PSD/layered-design import.** Artists must rasterize parts first.
- **No Phase 3 schema.** The pack/rig contract is benchmark-local and may evolve.

## L. Phase 3 Readiness

**Engineering readiness: GO**

The pack schema, import/normalization, character preparation, environment
layers, ZIP round-trip, rig adapter, benchmark, workspace, tests, build, and
preserved routes all work.

**Source-artwork readiness: BLOCKED**

The following must be delivered before premium-art validation:

- master character sheet with consistent anatomy/palette/lighting;
- neutral, wings-raised, wings-lowered, landing, perched poses;
- nine transparent parts with source-space pivots and registration;
- authored hidden-side reconstruction where needed;
- 1920×1080+ painterly forest plate and independent branch, preferably layered;
- provenance and usage rights for every source.

**Artistic readiness: PENDING USER REVIEW**

The pipeline preserves the diagnostic artwork, but the diagnostic artwork is
still Phase 2.5 procedural art. The user and ChatGPT must review the actual
animation and the premium assets when available. No artistic PASS is
self-certified.

**Phase 3: NOT STARTED.** No push was performed.

## Final Repository State

The Phase 2.6 implementation commits are:

```text
b449f51 feat(illustration): define versioned illustration asset packs
c4541f6 feat(illustration): add fidelity-preserving image import and normalization
2507403 feat(illustration): prepare layered character assets for rigging
8be6c93 feat(motion): integrate imported illustration packs with character rig
02f1b91 feat(illustration): support layered painterly environment assets
f5299d7 feat(studio): build illustration asset preparation workspace
4464adc feat(benchmark): validate hybrid illustration animation pipeline
43ab50e test(illustration): add asset fidelity and rig integration regression tests
5afb455 docs(illustration): define professional artwork delivery requirements
4074b31 test(benchmark): refresh phase 2.6 capture metrics
```

This report is committed after those changes with
`docs(report): record phase 2.6 completion`. The working tree is clean at phase
completion. `origin/main` remains at `8fb4e31`; the Phase 2.6 commits are
local-only. No remote push was performed.
