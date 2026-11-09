# Phase 2.7 Gate 2 Completion Report

- **Phase:** 2.7 Gate 2 — Premium Character Asset Integration, Rig Validation & Animation Benchmark
- **Date:** 2026-11-09
- **Branch:** `main`
- **Starting baseline:** `02bc9a1` (Phase 2.7 Stage A)
- **Input archive:** `incoming/fableon-gate2-repaired-candidate-v2.zip`
- **Final HEAD:** `3676e9c`
- **Status:** Gate 2 technical integration complete; candidate artwork **NOT APPROVED**; Gate C pending user review

## A. Executive Summary

The supplied candidate was genuinely integrated into Fableon:

- the archive was audited safely and its source parts were preserved;
- a canonical `fableon.illustration-pack` v1 was created and validated;
- the pack exports/re-imports as a portable ZIP;
- the nine parts were mapped onto the existing hierarchical landing rig;
- the actual Fableon Canvas renderer produced all 48 frames at 1920×1080;
- the animation exports as a 2.000-second, 24 FPS MP4;
- foot lock, hierarchy, draw order, and deterministic evaluation pass;
- a pivot-debug mode and benchmark route exist at
  `/benchmarks/phase-02-7-gate2`.

The candidate is **technically usable but not production-quality artwork**. The
rendered frames show visible matte seams, light halos, a hard head/body neck
transition, wing-root cutouts, low source resolution, and rigid sprite motion.
The background is the existing diagnostic Phase 2.5 forest, not premium art.

No artistically successful outcome is claimed. Gate C remains for user/ChatGPT
review, and the recommended next action is an artwork repair/higher-resolution
pass before Phase 3.

## B. Repository State

- **Starting baseline:** `02bc9a1`
- **Branch:** `main`
- **Input archive:** present at
  `incoming/fableon-gate2-repaired-candidate-v2.zip`
- **Archive SHA-256:**
  `7b4f732c3b70d51da9bbcd25db96439791f34ee24094e62811110ab95c43f309`
- **Final implementation HEAD:** `3676e9c`
- **Working tree:** clean after this report commit
- **Preserved:** schema version 1, `/studio`, `/studio/assets`,
  `/benchmarks/phase-02`, `/benchmarks/phase-02-5`, `/benchmarks/phase-02-6`,
  and all prior benchmark outputs.
- **Source archive:** git-ignored (`incoming/`); source artwork and candidate
  metadata are preserved in `assets/premium-bird-v1/` and
  `docs/benchmarks/phase-02-7-gate2/source/`.
- **No push was performed.** No Phase 3 work was started.

## C. Feature Implementation

### 2.7.1 — Input Inspection & Source Validation

- **Commit:** `62fc7f63adda9bd1482cdf3b0008ed7b1050b2b2`
- **Files:** `docs/benchmarks/phase-02-7-gate2/INPUT_AUDIT.md`,
  `assets/premium-bird-v1/parts/`, `assets/premium-bird-v1/references/`,
  `docs/benchmarks/phase-02-7-gate2/source/`, `.gitignore`, `.prettierignore`.
- **Implementation:** safe archive inspection, source extraction, nine-part
  inventory, SHA-256 verification against `ART_ASSET_QA.json`, PNG decode/alpha
  bounds, provisional rig/metadata inspection, source limitations, and risk
  register.
- **Tests:** documentation/asset audit; no code tests.
- **Acceptance:** PASS. All nine parts present; all supplied hashes/dimensions
  match; archive safe; candidate limitations documented.

### 2.7.2 — Canonical Fableon Illustration Pack

- **Commit:** `221823f0dc41b2e4410f7a669d76b3519cb4bdf5`
- **Files:** `apps/web/public/assets/premium-bird-v1/manifest.json`,
  `provenance.json`, `parts/`, `scripts/prepare-phase-02-7-gate2-pack.mjs`,
  `apps/web/app/benchmarks/phase-02-7-gate2/premium-pack.test.ts`.
- **Implementation:** converted the candidate into a schema-valid v1 pack with
  source-space pivots, registration, hierarchy, unique draw order, source/
  prepared hashes, provenance, and no source-pixel transformations. Added a
  deterministic preparation script.
- **Tests:** 6 unit tests — validation, nine parts, source hashes/dimensions,
  archive round-trip, deterministic metadata, incomplete-pack rejection.
- **Acceptance:** PASS.

### Corrective — ZIP Directory Entries

- **Commit:** `0f206056b8f7772f6c66bbc3a85bed0015dc258c`
- **Files:** `packages/illustration-pipeline/src/archive.ts`,
  `archive.test.ts`, portable pack ZIP.
- **Implementation:** standard ZIP directory entries are ignored safely when
  reading an archive; real tools such as `zip` emit them. Unsafe paths still
  fail.
- **Tests:** 1 additional archive test.
- **Acceptance:** PASS. The exported `premium-bird-v1.fableon-pack.zip` reads
  successfully.

### 2.7.3 — Character Registration & Pivot Validation

- **Commit:** `12399abc3d91734e75fbe4161da108d757b030bf`
- **Files:** `premium-rig.ts`, `premium-rig.test.ts`.
- **Implementation:** converted the candidate’s 960×540 provisional joints to a
  1920×1080 scene at 2× display scale. Body pivot moved to `(133,80)`, head pivot
  to `(30,150)` while preserving visible registration. The right leg local
  position was adjusted for branch contact. Added exact foot-point evaluation.
- **Tests:** 5 unit tests — part mapping/no pivot offsets, scene registration,
  foot lock, all-frame determinism, imported/base rig equivalence.
- **Acceptance:** PASS. Foot contact left `(884, 935.2)`, right
  `(986, 935.1)`; max drift `1.14e-13` across frames 30–47.

### 2.7.4 — Production Renderer Benchmark

- **Commit:** `2766a3e79b11c8004ad262b56ec7fa04f5985c14`
- **Files:** `apps/web/app/benchmarks/phase-02-7-gate2/{page,benchmark,premium-benchmark}.tsx/ts`.
- **Implementation:** `/benchmarks/phase-02-7-gate2` with production Canvas
  rendering, play/pause/replay, frame stepping, scrubber, part visibility,
  pivot/debug overlay, frame/timestamp/phase display, and PNG export. Uses the
  canonical imported pack and existing landing rig; background is the Phase 2.5
  diagnostic forest.
- **Tests:** browser coverage added in 2.7.7.
- **Acceptance:** PASS technically; artwork label explicitly not approved.

### 2.7.5 — 48-Frame Animation Export

- **Commit:** `0a2d45d8ab524c258c13c003781d2f62ae857973`
- **Files:** `scripts/capture-phase-02-7-gate2.mjs`,
  `package.json`, `.gitignore`, `docs/benchmarks/phase-02-7-gate2/*`.
- **Implementation:** reproducible
  `pnpm benchmark:phase-02-7-gate2`; 48 actual Fableon renderer frames, selected
  frames, contact sheet, pivot-debug sheet, source parts, environment preview,
  validation JSON, fidelity report, performance metrics, and ffmpeg MP4.
- **Tests:** capture command executed successfully; MP4 probe verified
  1920×1080, 48 frames, 24/1 FPS, 2.000 s.
- **Acceptance:** PASS.

### 2.7.6 — Artistic Defect Audit

- **Commit:** `68e55770e7f5e7a58220856532f0489273452476`
- **Files:** `QUALITY_ASSESSMENT.md`, `PROVENANCE.md`, `defects/`,
  `master-vs-render.png`.
- **Implementation:** prioritized defect inventory with severity, evidence,
  likely cause, repair type, and remedies; separation of artwork vs engineering
  defects; comparison with Phase 2.5 and the approved reference.
- **Tests:** visual review/documentation only.
- **Acceptance:** PASS as an honest audit; artwork quality remains **PENDING**.

### 2.7.7 — Regression Testing

- **Commit:** `3676e9c61aea44a27ea7a2353cca96e6ba178387`
- **Files:** `tests/browser/phase-02-7-gate2.spec.ts`,
  `tests/browser/routes.spec.ts`.
- **Tests:** 8 Gate 2 browser tests plus the new route in the preservation suite.
- **Acceptance:** PASS.

### Final Report

This document, committed with `docs(report): record phase 2.7 gate 2 integration`.

## D. Source Asset Audit

Full audit: `docs/benchmarks/phase-02-7-gate2/INPUT_AUDIT.md`.

| Part      | Dimensions | SHA-256          | Alpha | Content bounds | QA match |
| --------- | ---------- | ---------------- | ----- | -------------- | -------- |
| body      | 266×161    | `e6fc1f90…98d07` | 0–255 | 7,0,254,161    | yes      |
| head      | 205×160    | `cfeeaf57…b9b3`  | 0–255 | 18,4,166,156   | yes      |
| eye       | 45×45      | `c0db91cd…6f0a`  | 0–255 | 4,4,37,37      | yes      |
| beak      | 65×40      | `6b560839…51b1`  | 0–255 | 4,4,57,32      | yes      |
| wing-near | 168×149    | `7f2d341b…8404`  | 0–255 | 4,4,160,141    | yes      |
| wing-far  | 163×149    | `c963b91e…46b01` | 0–255 | 4,4,155,141    | yes      |
| tail      | 131×119    | `a6a3b4b4…3d84c` | 0–255 | 4,4,124,111    | yes      |
| leg-left  | 93×138     | `7f9978cb…e142`  | 0–255 | 4,4,85,130     | yes      |
| leg-right | 101×121    | `cfe62c9d…d33c0` | 0–255 | 4,4,93,113     | yes      |

All supplied `ART_ASSET_QA.json` hashes/dimensions and transparent-pixel counts
matched. No black fringe; 66–283 near-white semi-transparent fringe pixels were
measured on several parts. These are potential halos and are visible in the
render.

**Source limitations:** candidate reference-board extraction, inferred
reconstructed body/head, low native resolution (45–266 px), provisional rig and
registration, standalone Python/Pillow preview not accepted as Fableon output.

## E. Illustration Pack

- **Pack:** `premium-bird-v1`, `fableon.illustration-pack` v1, character.
- **Canvas:** 960×540 diagnostic registration layout.
- **Parts:** 9; source-space pivots; explicit parent relationships; z-order
  `tail(10), wingFar(20), legLeft(30), legRight(31), body(50), wingNear(60),
head(70), beak(80), eye(85)`.
- **Hashes:** source and prepared are identical; no trimming/recolor/sharpening
  was applied.
- **Portable archive:**
  `docs/benchmarks/phase-02-7-gate2/premium-bird-v1.fableon-pack.zip`.
- **Round-trip:** `readIllustrationArchive` returns the same manifest and all
  nine assets; verified by `premium-pack.test.ts`.
- **Source immutability:** source bytes are preserved and hash-verified.

## F. Rig Integration

Coordinate conversion:

- Candidate layout is 960×540, x right, y down.
- Pack registration remains in that diagnostic layout for metadata/preview.
- The Gate 2 rig displays at 2× in 1920×1080 with an explicit scene offset.
- Body/head source pivots were moved to meaningful rotation centers:
  - body `(133,80)`;
  - head `(30,150)`.
- The visible top-left registration is preserved through the rig translation and
  draw offset.
- Right-leg local placement was adjusted to match the left-foot branch contact.
- Imported part pivots match base rig pivots exactly, so the adapter draw offset
  is `(0,0)` for every part.

Hierarchy:

```text
body
├── tail
├── wing-far
├── leg-left
├── leg-right
├── wing-near
└── head
    ├── beak
    └── eye
```

Draw order is stable. Pivot/debug mode exposes bounding boxes, pivots, parent
connections, IDs, and draw order. Foot contact is locked after frame 30.

## G. Animation Results

- 48 frames, 0–47, 24 FPS, 1920×1080, 2.000 s.
- Flight/approach/contact/settle timing follows the Phase 2.5 phases.
- Wing poses are clearly distinct at frames 0, 4, 24, 30, 33, 38, and 47.
- Body descends and pitches; head counterbalances; tail follows; eye blinks at
  40–44.
- Feet contact the branch at frame 30 and remain locked through 47; the character
  was lowered during integration to make the toes visually meet the branch.
- No missing parts, blank frames, duplicate eye/beak, or gross detachment were
  observed.
- Motion remains rigid-sprite-based; there is no deformation, IK, or toe grip.

## H. Visual Artifacts

| Artifact                           | Path                                                                |
| ---------------------------------- | ------------------------------------------------------------------- |
| Animation MP4                      | `docs/benchmarks/phase-02-7-gate2/landing-preview.mp4`              |
| Contact sheet                      | `docs/benchmarks/phase-02-7-gate2/contact-sheet.png`                |
| Pivot debug sheet                  | `docs/benchmarks/phase-02-7-gate2/pivot-debug-sheet.png`            |
| Source parts sheet                 | `docs/benchmarks/phase-02-7-gate2/character-parts.png`              |
| Master reference                   | `docs/benchmarks/phase-02-7-gate2/master-character.png`             |
| Master vs render                   | `docs/benchmarks/phase-02-7-gate2/master-vs-render.png`             |
| Source pose preview (external PIL) | `docs/benchmarks/phase-02-7-gate2/source-poses-contact-sheet.png`   |
| Environment preview (diagnostic)   | `docs/benchmarks/phase-02-7-gate2/forest-preview.png`               |
| Selected frames                    | `docs/benchmarks/phase-02-7-gate2/selected-frames/`                 |
| Full sequence                      | `docs/benchmarks/phase-02-7-gate2/frames/` (ignored)                |
| Defect crops                       | `docs/benchmarks/phase-02-7-gate2/defects/`                         |
| Pack validation                    | `docs/benchmarks/phase-02-7-gate2/PACK_VALIDATION.json`             |
| Rig validation                     | `docs/benchmarks/phase-02-7-gate2/RIG_VALIDATION.json`              |
| Fidelity report                    | `docs/benchmarks/phase-02-7-gate2/fidelity-report.json`             |
| Performance                        | `docs/benchmarks/phase-02-7-gate2/performance.json`                 |
| Portable pack ZIP                  | `docs/benchmarks/phase-02-7-gate2/premium-bird-v1.fableon-pack.zip` |

## I. Verification

| Check                             | Result                                |
| --------------------------------- | ------------------------------------- |
| `pnpm install`                    | PASS — up to date                     |
| `pnpm format:check`               | PASS                                  |
| `pnpm lint`                       | PASS                                  |
| `pnpm typecheck`                  | PASS                                  |
| `pnpm test`                       | PASS — 24 files, **193 tests**        |
| `pnpm build`                      | PASS                                  |
| `pnpm test:browser`               | PASS — **45/45 tests**                |
| `pnpm benchmark:phase-02-7-gate2` | PASS — 48 frames, MP4, no page errors |

Production build routes include `/benchmarks/phase-02-7-gate2`. Existing routes
`/`, `/studio`, `/studio/assets`, `/benchmarks/phase-02`,
`/benchmarks/phase-02-5`, and `/benchmarks/phase-02-6` remain passing.

### Performance

- Ready: 1819 ms
- Import: 43.3 ms; decode 27.7 ms; validation 15.6 ms
- First/median/p95 frame render: 0.9 / 0.9 / 1.2 ms
- Total 48-frame render: 44.4 ms
- Observed playback: 25 frames / 1112 ms ≈ **22.48 FPS** (24 FPS target)
- Memory: 19.3 MB used before/after; 27.6 MB total heap
- MP4 encoding: 856 ms
- MP4: 1920×1080, 48 frames, 24/1 FPS, 2.000 s
- Page errors: none

The 24 FPS target is not reached in observed playback; render/compositing is
well below budget, and browser scheduling dominates.

## J. Defect Inventory

Full evidence and remedies: `QUALITY_ASSESSMENT.md`.

| ID  | Defect                                           | Severity                 | Type                 |
| --- | ------------------------------------------------ | ------------------------ | -------------------- |
| D01 | Head/body neck seam and jagged matte edge        | **Critical**             | Artwork              |
| D02 | Wing-root hard seam/halo                         | **Major**                | Artwork              |
| D03 | White/light alpha fringe around parts            | **Major**                | Artwork              |
| D04 | Low source resolution / softness                 | **Major**                | Artwork              |
| D05 | Body/head anatomy and identity drift from master | **Major**                | Artwork              |
| D06 | Rigid sprite/puppet motion, no deformation       | **Major**                | Engineering/Phase 3  |
| D07 | Feet lack toe grip (contact works)               | **Minor**                | Artwork + future rig |
| D08 | Beak/facial edge softness                        | **Minor**                | Artwork              |
| D09 | Far-wing/shoulder coverage incomplete            | **Minor–Major**          | Artwork              |
| D10 | Background is diagnostic, not premium            | **Major for comparison** | Artwork dependency   |

Checked and not observed: missing parts, blank frames, duplicate eye/beak, gross
wing/tail detachment, post-contact foot sliding, nondeterminism, missing assets.

## K. Artistic Assessment

Technical capability is separated from actual illustration quality.

**What genuinely improved over Phase 2.5:**

- richer, more painterly feather and wing texture;
- warmer and more cohesive character palette;
- more expressive face;
- better body volume and less flat vector construction;
- actual imported-art pipeline validation.

**What remains wrong:**

- the head/body and wing-root cutouts look like assembled sprites;
- visible light halos and jagged matte edges;
- low-resolution source art softens at 1920×1080;
- reconstructed body/head do not faithfully match the approved master;
- feet/toes do not grip the branch;
- the background is still the diagnostic Phase 2.5 forest;
- motion remains rigid-sprite based.

**Artistic ratings:**

| Criterion                         | Rating                          |
| --------------------------------- | ------------------------------- |
| Illustration quality              | **PARTIAL**                     |
| Character consistency within pack | **PASS**                        |
| Identity vs approved master       | **PARTIAL**                     |
| Feather anatomy                   | **PARTIAL**                     |
| Painted material richness         | **PARTIAL**                     |
| Edge/alpha quality                | **FAIL**                        |
| Wing animation                    | **PARTIAL**                     |
| Landing plausibility              | **PARTIAL**                     |
| Background quality                | **FAIL for premium comparison** |
| Image fidelity                    | **PASS**                        |
| Temporal consistency              | **PASS**                        |
| Production suitability            | **NOT READY**                   |

No artistic success is self-certified. The correct conclusion is: **the
pipeline works; the candidate artwork needs repair and higher resolution before
production use.**

## L. Gate Decision

| Decision               | Result                  |
| ---------------------- | ----------------------- |
| Import integrity       | **PASS**                |
| Rig compatibility      | **PASS**                |
| Animation rendering    | **PASS**                |
| Artwork quality        | **PENDING USER REVIEW** |
| Production suitability | **NOT READY**           |
| Phase 3 recommendation | **NO-GO**               |

**Why:**

- Nine parts import, validate, export, re-import, map, and render correctly.
- The rig is structurally sound and foot-locked.
- The 48-frame production renderer/MP4 works.
- BUT the candidate has critical/major matte, seam, halo, resolution, identity,
  and background limitations. It is not production illustration.
- Phase 3 should not begin until the artwork is repaired or a higher-resolution,
  artist-authored part set is supplied and Gate C is reviewed.

## Final Handoff

Run the benchmark:

```bash
pnpm benchmark:phase-02-7-gate2
# or
pnpm dev
# http://localhost:3000/benchmarks/phase-02-7-gate2
```

The selected frames, contact sheet, pivot-debug sheet, defect crops, MP4, pack
ZIP, validation JSON, and performance metrics are listed in section H.

No remote push was performed. No Phase 3 work was started.
