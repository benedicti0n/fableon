# Phase 2.5 Completion Report

- **Phase:** 2.5 — Hybrid Illustration, Character Art & Two-Second Animation Proof
- **Date:** 2026-11-09
- **Branch:** `main`
- **Starting commit:** `afec18d` (`docs(report): record phase 2 completion`)
- **Implementation head before this report:** `cfb6bac`
- **Status:** Engineering complete; artistic quality pending user review
- **Next phase:** Not started

## A. Executive Summary

Phase 2.5 produced a real two-second, 48-frame bird-landing animation from a
benchmark-local layered character rig. All frames are 1920×1080 Canvas 2D
renders generated from the same nine transparent character parts, the same
painted environment, and deterministic scalar motion tracks.

What the animation demonstrates:

- A bird character with independent body, head, beak, eye, near wing, far wing,
  tail, left leg, and right leg artwork.
- Shoulder-pivoted wing articulation, head/beak/eye hierarchy, tail follow-through,
  and leg extension rather than a single flattened image being translated.
- A readable landing progression: flight, braking approach, branch contact,
  body compression, wing fold, head adjustment, tail damping, and rest.
- Feet that remain mathematically fixed to the branch after contact (frames
  30–47), with no post-contact sliding.
- Deterministic frame evaluation: repeated evaluation of any frame produces
  identical transforms and pixels.
- A live `/benchmarks/phase-02-5` route with playback, pause, frame stepping,
  scrubbing, phase labels, part visibility inspection, and native PNG export.
- Reproducible evidence: five character poses, seven selected full-resolution
  frames, a contact sheet, a GIF, an optional exact-24-FPS MP4, and measured
  performance data.

What it does **not** demonstrate:

- Production-quality storybook illustration.
- Skeletal mesh deformation, hidden-side anatomy, or a complete bird rig.
- IK, toe grip, soft-body settling, or physical branch interaction.
- Final film quality, narration, subtitles, or video composition.
- Approval of the artistic-quality gate. That decision remains with the user
  and ChatGPT after reviewing the actual animation.

The result is a feasibility prototype with a viable engineering direction and
an honest artistic ceiling.

## B. Repository State

- **Starting commit:** `afec18df971beb85851f5931716d27c5fb6bf08b`
- **Branch:** `main`
- **Persisted scene schema:** unchanged. No schema-version or top-left transform
  semantics were altered. The hierarchical rig is benchmark-local.
- **Preserved functionality:** `/studio` and `/benchmarks/phase-02` still render,
  pass their tests, and return HTTP 200.
- **Remote state:** no `git push` was executed during this implementation.
  `origin/main` (remote-tracking) currently points at `3e6c6c6`; the evidence,
  refreshed-metrics, and report commits are local-only.
- **Working tree:** clean after the report commit.
- **Phase 3:** no Phase 3 rigging framework, IK engine, physics, AI generation,
  database, Remotion, narration, or subtitle work was started.

## C. Completed Features

| Feature                                    | Commit    | Result                        |
| ------------------------------------------ | --------- | ----------------------------- |
| 2.5.1 Art direction and feasibility audit  | `ef11e5b` | Complete                      |
| 2.5.2 Layered painterly bird character     | `eb56c9c` | Complete; art quality PARTIAL |
| 2.5.3 Hierarchical sprite-motion prototype | `3b938b0` | Complete                      |
| 2.5.4 48-frame landing animation           | `f1d7cbf` | Complete                      |
| 2.5.5 Live animation preview route         | `3e6c6c6` | Complete                      |
| 2.5.6 Capture, evidence, and verification  | `7ac7b06` | Complete                      |
| Corrective metrics refresh                 | `cfb6bac` | Complete                      |

### 2.5.1 — Art Direction & Feasibility Audit

- **Commit:** `ef11e5b0f68e850197fc06baf0c1409f1efc42fe`
- **Files:** `docs/benchmarks/phase-02-5/ART_DIRECTION.md`
- **Implementation:** Audited the Phase 2 forest and flattened bird, established
  that the existing PNG cannot become a credible rig, chose a hybrid
  authored-shape plus procedural-texture direction, defined palette, nine-part
  layering, pivots, motion phases, and explicit quality risks.
- **Tests:** Documentation-only feature; no runtime tests.
- **Acceptance:** PASS. Deliverable exists and records reusable assets,
  replacement decisions, renderer/schema constraints, local-tool feasibility,
  and remaining external-art dependency.

### 2.5.2 — Layered Painterly Bird Character

- **Commit:** `eb56c9c620360a299a46004f964af6150c708dca`
- **Files:**
  - `packages/paint-engine/src/benchmark/phase-02-5/bird-art.ts`
  - `packages/paint-engine/src/benchmark/phase-02-5/bird-art.test.ts`
  - `packages/paint-engine/src/index.ts`
  - `docs/benchmarks/phase-02-5/character-poses.png`
  - `docs/benchmarks/phase-02-5/character-poses/pose-01…05.png`
- **Implementation:** Nine transparent part canvases painted from code:
  body, head, beak, eye, near wing, far wing, tail, left leg, right leg.
  Gradient form modelling, feather-group overlays, wing primary feathers, eye
  ring/iris/highlight, leg and toe strokes, seeded dry-brush marks, and paper
  grain. Exported `BIRD_PART_IDS` and `BIRD_PART_PIVOTS`.
- **Tests:** 2 unit tests — required part inventory, unique IDs, finite pivots,
  and expected pivot relationships.
- **Acceptance:** PASS technically; PARTIAL artistically. The character is
  consistent and more coherent than Phase 2, but still reads as constructed
  painterly vector art rather than professional storybook illustration.
- **Pose evidence:** Five full-resolution poses (wings raised, wings lowered,
  braking approach, settling, perched) plus a pose sheet. The same master parts
  appear in every pose.

### 2.5.3 — Hierarchical Sprite-Motion Prototype

- **Commit:** `3b938b06800e4ec27ad570a642908b2175b65289`
- **Files:** `packages/sprite-motion/{package.json,tsconfig.json,src/index.ts,src/sprite-motion.test.ts}`,
  `pnpm-lock.yaml`
- **Implementation:** Benchmark-local `@fableon/sprite-motion` package with 2D
  affine matrix composition, explicit parent/child hierarchy, per-node pivot,
  translation/rotation/scale, draw order, local-to-world resolution, exact-frame
  evaluation, and reuse of `@fableon/animation-core` keyframe evaluation.
- **Tests:** 8 unit tests — matrix order, pivot placement, parent attachment,
  shoulder-pivot stability, draw-order independence, exact-frame sampling,
  repeat equality, frozen-rig immutability, duplicate IDs, missing parents,
  cycles, and invalid frames.
- **Acceptance:** PASS.

### 2.5.4 — 48-Frame Landing Animation

- **Commit:** `f1d7cbf5ceba88153c3999bf41697cc0f437b4da`
- **Files:**
  - `packages/paint-engine/src/benchmark/phase-02-5/scene-art.ts`
  - `packages/paint-engine/src/benchmark/phase-02-5/landing-rig.ts`
  - `packages/paint-engine/src/benchmark/phase-02-5/landing-rig.test.ts`
  - `packages/paint-engine/src/benchmark/phase-02-5/landing-render.ts`
  - `packages/paint-engine/src/index.ts`
  - `packages/paint-engine/package.json`
- **Implementation:** Dedicated close-up forest plate with soft canopy masses,
  blurred atmospheric depth, trunks, a curved tapered branch, twigs/leaf groups,
  light shafts, contact shadow, and restrained grain. The benchmark-local rig
  defines all nine nodes, pivots, draw order, and per-property tracks across
  48 frames. `renderLandingFrame` evaluates the rig and composites the parts.
- **Tests:** 6 unit tests — all 48 frames independently/deterministically,
  draw-order stability, forward body progress with constant character scale,
  genuine wing-pose differences, both feet planted after contact, phase labels,
  and generic-evaluator agreement.
- **Acceptance:** PASS. Frame 0 and frame 47 render; repeated evaluation is
  identical; feet remain fixed within a 1e-5 tolerance after contact.

### 2.5.5 — Live Animation Preview

- **Commit:** `3e6c6c6a6a0e2531104a033380acc60e9b98c248`
- **Files:**
  - `apps/web/app/benchmarks/phase-02-5/page.tsx`
  - `apps/web/app/benchmarks/phase-02-5/landing-preview.tsx`
  - `apps/web/next.config.ts`
- **Implementation:** Dedicated route with a responsive 1920×1080 logical
  canvas, elapsed-time playback at a 24 FPS target, pause, previous/next frame,
  scrubber, frame/timestamp/phase readouts, nine part-visibility toggles, PNG
  export, render-time display, and a capture API for benchmark evidence.
  Playback stops at frame 47 and replays from frame 0.
- **Tests:** Covered by the 8 browser tests added in 2.5.6.
- **Acceptance:** PASS. Existing routes were not replaced; `/studio` still uses
  the canonical Phase 2 project.

### 2.5.6 — Animation Capture & Quality Verification

- **Commit:** `7ac7b06147c4551d742ef4569beac6adcb2fb168`
- **Corrective metrics refresh:** `cfb6bacd4d7fcc4486ec4cd0253c6780bb0dfd52`
- **Files:**
  - `scripts/capture-phase-02-5.mjs`
  - `tests/browser/landing.spec.ts`
  - `docs/benchmarks/phase-02-5/{PROVENANCE.md,QUALITY_ASSESSMENT.md,performance.json}`
  - `docs/benchmarks/phase-02-5/{contact-sheet.png,landing-preview.gif,landing-preview.mp4}`
  - `docs/benchmarks/phase-02-5/selected-frames/*.png`
  - `package.json`, `.gitignore`, `README.md`
- **Implementation:** Reproducible command `pnpm benchmark:phase-02-5` starts a
  local server if needed, renders all 48 frames through Playwright Chromium,
  writes the ignored full sequence, copies the seven selected frames, creates
  the contact and pose sheets, measures capture/playback timing, and invokes
  local ffmpeg for GIF and optional H.264 MP4 encoding. The capture API only
  calls the real renderer.
- **Tests:** 8 new Playwright tests — first-frame pixels, scrubbing and wing
  pose differences, frame stepping/phase boundaries, elapsed-time playback and
  stop at 47, replay, 1920×1080 PNG export, part visibility, mobile layout,
  and real performance measurement.
- **Acceptance:** PASS. Full sequence is exactly 48 PNGs; GIF contains 48
  frames; MP4 contains 48 frames at 24 FPS and 2.000 s; no page errors.

## D. Artwork & Character Design

### Approach

The bird was authored as layered raster canvases drawn programmatically with
Canvas 2D paths, gradients, ellipses, alpha compositing, Fableon Paint dry
brushes/organic strokes/washes, and seeded paper grain. It was **not** produced
by cutting up the Phase 2 flattened PNG. The new design deliberately separates
anatomy that must articulate.

### Required and additional parts

| Part      | Canvas  | Pivot      | Role                               |
| --------- | ------- | ---------- | ---------------------------------- |
| Body      | 760×520 | (380, 300) | Root; breast/back/feather masses   |
| Head      | 360×300 | (120, 245) | Neck-attached skull and cheek      |
| Beak      | 140×78  | (8, 38)    | Face-attached upper/lower beak     |
| Eye       | 48×48   | (24, 24)   | Iris, pupil, highlight, blink      |
| Near wing | 500×480 | (418, 394) | Shoulder-pivoted layered primaries |
| Far wing  | 500×480 | (418, 394) | Recessed shoulder-pivoted wing     |
| Tail      | 500×240 | (440, 108) | Rump-attached feather fan          |
| Left leg  | 120×250 | (60, 20)   | Hip-attached leg and toes          |
| Right leg | 120×250 | (60, 20)   | Hip-attached leg and toes          |

Pivots are exported as `BIRD_PART_PIVOTS` and used by both the pose preview and
the landing rig. Part canvases have transparent backgrounds and overlap at
joints. The character shares one ochre/cream/chestnut/blue-slate palette across
all parts and frames.

### Authored vs procedural

- **Authored shapes:** all character silhouettes, feather groups, wing plates,
  eye/beak construction, tail fan, legs/toes; forest masses, trunks, branch,
  twigs, leaf clusters, light shafts, contact shadow.
- **Procedural texture:** seeded dry-brush marks, organic contour strokes,
  washes, grain, and color variation.
- **External assets:** none. No photograph, illustration, AI image, GIF, model
  output, font asset, or paid service was imported. No credentials were added.
- **Rasterization:** parts are generated directly as Canvas 2D canvases at
  runtime from the same TypeScript source; no per-frame regeneration occurs.

### Storage and reconstruction

`createStorybookBirdArt(seed = 20261109)` paints the nine parts and their
pivots. `createLandingBenchmark(seed)` caches the scene, bird, and rig, and
`renderLandingFrame` reuses those canvases for every frame. The full sequence is
therefore reconstructible from source with a single command. The ignored
`frames/` directory is output, not an input.

### Character consistency and defects

All five documented poses and all 48 frames use the same master parts. The
character remains recognizable throughout. Current defects are documented
honestly in `QUALITY_ASSESSMENT.md`: the head/face still leans toward a mascot
look, wing plates read as painted rigid shapes, some layered joints show
construction at extreme poses, and the painted surface lacks professional
gouache/watercolor depth.

## E. Motion Architecture

### Hierarchy and draw order

```text
body (root, draw 50)
├── tail        (draw 10)
├── wingFar     (draw 20)
├── legLeft     (draw 30)
├── legRight    (draw 31)
├── wingNear    (draw 60)
└── head        (draw 70)
    ├── beak    (draw 80)
    └── eye     (draw 85)
```

Draw order is explicit and validated as unique. Input order does not affect the
resolved draw sequence.

### Transform composition

Each node resolves:

```text
M_local = T(x, y) · R(rotation) · S(scaleX, scaleY) · T(-pivotX, -pivotY)
M_world = M_parent · M_local
```

This is the same affine convention as Canvas 2D
(`a, b, c, d, e, f`). Translation is in the parent's image coordinate space;
rotation and scale occur around the node's pivot. A wing therefore rotates
around its shoulder, a head around its neck attachment, and legs around their
hips.

### Tracks and key poses

| Node            | Animated properties     | Key observations                                                                                                  |
| --------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Body            | x, y, rotation          | (470, 300, −12°) at frame 0 → (960, 647, 0°) at frame 30; x/y held after contact; slight y dip to 655 at frame 33 |
| Tail            | rotation                | −6° → 18° follow-through at frame 34 → damped to 0° by frame 47                                                   |
| wingFar         | rotation                | Up/down strokes through the flight, braking spread by frame 30, folded by frame 38, held                          |
| wingNear        | rotation                | Offset timing from the far wing; −85° to −15° flight range; braking at frame 30; fold by frame 38                 |
| Left/right legs | y, rotation             | Extended toward the branch before contact; rotation 25° → 0° by frame 30; y compensated during body compression   |
| Head            | rotation, scale         | Counter-rotates against body pitch; small settle adjustment frames 38–42; constant 0.94 scale                     |
| Beak            | static relative to head | Attached at face pivot                                                                                            |
| Eye             | scaleY                  | Hold, then blink 40–44 (scaleY 1 → 0.12 → 1)                                                                      |

Interpolation uses `@fableon/animation-core` keyframe evaluation with
per-property/per-key choices. Flight and approach transitions use
`easeInOutCubic`; final states use `hold` so the perched pose does not drift.
The same easing is not applied blindly to every property. The body path is a
curved approach in position and rotation, not a straight translation.

### Wing articulation

Wings are independent parts with shoulder pivots, distinct near/far timing, and
multiple flight keys rather than one repeated rotation. They show raised,
lowered, braking, and folded states. The motion is rigid-part rotation; the wing
surface does not deform.

### Foot contact and locking

`BIRD_FOOT_LOCAL = (60, 228)` identifies the foot point in each leg canvas.
World foot positions at contact are:

- Left foot: `(910, 930)`
- Right foot: `(1020, 930)`

After frame 30 the body rotation is held at 0° and body-Y compression is
compensated through the leg-Y tracks. A test samples every frame from 30–47 and
asserts both foot world positions remain unchanged within `1e-5`. There is no
IK solver; the lock is authored and verified, not physical.

### Determinism

- Sampling accepts only integer frames in `[0, 47]`.
- Artwork is created once and cached; no per-frame random generation.
- Rig data is immutable; evaluation does not mutate a frozen rig.
- Repeated evaluation is structurally equal and produces identical captured
  pixels.
- Draw order is explicit and independent of evaluation input order.
- The preview uses elapsed-time frame selection, not frame-count-dependent
  randomness.

## F. 48-Frame Animation Breakdown

| Frames | Phase           | What happens                                                                                                                                                                                           |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0–15   | Flight          | Bird enters from the upper left, body follows a curved descending path, wings alternate through up/down strokes, tail and head provide offset motion, speed begins to change near the end              |
| 16–29  | Approach        | Forward speed decreases; body pitches through the approach; wings open progressively to brake; legs extend toward the branch; tail adjusts; head counterbalances                                       |
| 30–37  | Contact         | Feet accept the branch at frame 30; body compresses to its lowest point at frame 33; legs shorten relative to the body to keep feet planted; wings fold; tail follows with delay; head counter-rotates |
| 38–47  | Settling / rest | Wings finish folding by frame 38; tail damps; head makes a small adjustment; body recovers by frame 40; a brief eye blink occurs around frames 40–44; hold calm perched pose to frame 47               |

Important poses:

- **Frame 0:** entry pose, wings raised, body at the upper-left approach.
- **Frame 4:** opposite wing stroke, proving articulation rather than a
  translated still.
- **Frame 8:** flight midpoint with the body lower and more upright.
- **Frame 16:** approach starts; braking begins.
- **Frame 24:** braking/spread-wing pose; legs anticipate the branch.
- **Frame 30:** first contact; body rotation is exactly 0°.
- **Frame 33:** maximum body compression; feet remain at the same world points.
- **Frame 38:** contact phase ends; wings folded; settling begins.
- **Frame 42:** eye blink / small head adjustment.
- **Frame 47:** final perched pose, held and stable.

The contact sheet contains frames 0, 8, 16, 24, 30, 38, and 47. All frames come
from the same deterministic rig and artwork pipeline; no unrelated stills were
combined into a fake animation.

## G. Visual Artifacts

| Artifact               | Path                                                       | Details                                                                |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| Playable GIF           | `docs/benchmarks/phase-02-5/landing-preview.gif`           | 960×540, 48 frames, 2.0 s, ~25 FPS average from GIF delay quantization |
| Contact sheet          | `docs/benchmarks/phase-02-5/contact-sheet.png`             | 1944×1337; seven selected frames and labels                            |
| Selected frame 0       | `docs/benchmarks/phase-02-5/selected-frames/frame-000.png` | 1920×1080                                                              |
| Selected frame 8       | `docs/benchmarks/phase-02-5/selected-frames/frame-008.png` | 1920×1080                                                              |
| Selected frame 16      | `docs/benchmarks/phase-02-5/selected-frames/frame-016.png` | 1920×1080                                                              |
| Selected frame 24      | `docs/benchmarks/phase-02-5/selected-frames/frame-024.png` | 1920×1080                                                              |
| Selected frame 30      | `docs/benchmarks/phase-02-5/selected-frames/frame-030.png` | 1920×1080                                                              |
| Selected frame 38      | `docs/benchmarks/phase-02-5/selected-frames/frame-038.png` | 1920×1080                                                              |
| Selected frame 47      | `docs/benchmarks/phase-02-5/selected-frames/frame-047.png` | 1920×1080                                                              |
| Character pose sheet   | `docs/benchmarks/phase-02-5/character-poses.png`           | 1944×930; five poses                                                   |
| Full-resolution poses  | `docs/benchmarks/phase-02-5/character-poses/`              | Five 1920×1080 PNGs                                                    |
| Optional MP4           | `docs/benchmarks/phase-02-5/landing-preview.mp4`           | 1920×1080, 48 frames, H.264, exactly 2.000 s at 24 FPS                 |
| Performance metrics    | `docs/benchmarks/phase-02-5/performance.json`              | Capture, playback, memory, encoder details                             |
| Full 48-frame sequence | `docs/benchmarks/phase-02-5/frames/`                       | Ignored generation directory, 48 PNGs, 1920×1080                       |
| Provenance             | `docs/benchmarks/phase-02-5/PROVENANCE.md`                 | Sources, pipeline, licensing, limits                                   |
| Quality assessment     | `docs/benchmarks/phase-02-5/QUALITY_ASSESSMENT.md`         | Honest PASS/PARTIAL/FAIL table                                         |

### Reproduce and view

```bash
# One-time browser binary setup if needed
pnpm exec playwright install chromium

# Requires ffmpeg on PATH for GIF encoding.
pnpm benchmark:phase-02-5

# Live preview
pnpm dev
# open http://localhost:3000/benchmarks/phase-02-5
```

The capture command starts a local server on port 3100 if one is not already
running, renders the 48 frames through the real preview renderer, writes the
ignored frame sequence, regenerates selected frames/contact sheet/pose previews,
records metrics, and encodes the GIF. The MP4 is written when the local ffmpeg
build supports H.264; a failed MP4 encode is recorded as `videoError` and does
not invalidate the required GIF.

## H. Verification & Performance

### Commands executed

| Command                     | Result                                                    |
| --------------------------- | --------------------------------------------------------- |
| `pnpm install`              | PASS — already up to date, pnpm 11.1.3, Node v25.9.0      |
| `pnpm format:check`         | PASS — Prettier clean                                     |
| `pnpm lint`                 | PASS — ESLint, zero warnings                              |
| `pnpm typecheck`            | PASS — root Playwright config plus all 7 package projects |
| `pnpm test`                 | PASS — 15 files, 128 tests                                |
| `pnpm build`                | PASS — Next.js production build                           |
| `pnpm test:browser`         | PASS — 17/17 tests in 30.5 s                              |
| `pnpm benchmark:phase-02-5` | PASS — 48 frames, GIF and MP4 created, no page errors     |

Production route verification on the built app:

| Route                    | HTTP | Content check                        |
| ------------------------ | ---- | ------------------------------------ |
| `/`                      | 200  | Fableon homepage present             |
| `/studio`                | 200  | Studio preview present               |
| `/benchmarks/phase-02`   | 200  | Phase 2 benchmark present            |
| `/benchmarks/phase-02-5` | 200  | “The Little Bird Comes Home” present |

### Animation capture measurements

From the final `performance.json` run:

- Frames: 48 at 1920×1080
- Ready time: 1629 ms (page load plus painting the scene/character)
- First-frame render: 1.2 ms
- Median frame render: 0.9 ms
- 95th-percentile frame render: 1.2 ms
- Total render time for 48 frames: 46.0 ms
- Observed playback: 23 frames in 1032 ms ≈ **22.29 FPS** (target 24 FPS)
- JS heap used before/after: 19.3 MB / 19.3 MB; total heap 24.5 MB; limit 3.76 GB
- Page errors: none

Browser-suite landing measurement:

- Cached-frame median: 0.2 ms
- Maximum sampled frame: 1.7 ms
- Observed playback: 23 frames in 1043 ms ≈ **22.05 FPS**

Phase 2 browser regression measurement:

- First frame ready: 433 ms
- First frame render: 47.1 ms
- Cached median: 0 ms; p95: 47.1 ms
- Playback: 23 frames in 1040 ms ≈ 22.12 FPS
- JS heap used before/after: 20.5 MB / 20.5 MB

### Encoder measurements

- GIF: 960×540, 48 frames, 2.000 s duration; ffprobe reports nominal 24/1 but
  average 25/1 due to GIF centisecond delay quantization.
- MP4: 1920×1080, 48 frames, 24/1, H.264, exactly 2.000 s.

### Known limitations

- Observed Canvas playback is ~22.1–22.3 FPS, not the 24 FPS target. Frame
  rendering itself is under 2 ms; the gap is browser `requestAnimationFrame`
  scheduling and headless-environment cadence, not renderer throughput.
- GIF color quantization reduces subtle gradients, and its delay quantization
  changes the effective rate. The native PNG sequence, MP4, and live Canvas are
  authoritative.
- Parts are rigid. There is no mesh deformation, soft-body motion, IK, toe grip,
  or branch physics.
- Foot locking is authored and tested, not solved physically.
- Joint overlap hides most seams in the selected poses, but some construction is
  visible at extreme wing/tail poses.
- The environment is calmer than Phase 2 but still relies on procedural leaf
  clusters and simple trunks; it is not equivalent to an authored background
  painting.
- The artwork remains a local feasibility prototype. It is not production-ready
  storybook art.

## I. Honest Artistic Assessment

This assessment is based on the actual GIF, contact sheet, selected frames, and
pose previews, not on passing tests.

| Criterion              | Rating      | Explanation                                                                                                                                                                                                                                                  |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Illustration quality   | **PARTIAL** | Clearer silhouette, warmer palette, larger eye, layered wings, and a curved branch improve on Phase 2. The bird still reads as a constructed painterly/vector hybrid, with flat feather fields and a generic head/face.                                      |
| Character consistency  | **PASS**    | All 48 frames and five poses use the same nine master parts, palette, and rig. No part disappears or changes identity.                                                                                                                                       |
| Motion quality         | **PARTIAL** | The sequence has readable flight, braking, contact, compression, fold, head adjustment, and tail follow-through. Wings are rigid plates; body compression is mechanically compensated rather than weight-driven; there is no IK or secondary feather motion. |
| Painting quality       | **PARTIAL** | Seeded brush marks, gradients, grain, washes, and soft edges are present. At normal size the bird still has broad flat fields, and the background has repeated procedural leaf marks.                                                                        |
| Production suitability | **FAIL**    | This is a feasibility prototype, not finished children's-storybook animation. It does not meet the target artistic bar and should not be presented as production-ready.                                                                                      |

Additional findings:

- **Wing articulation:** PARTIAL. Shoulder pivots and distinct near/far timing
  produce genuine pose changes, but the wing shape does not deform.
- **Landing clarity:** PARTIAL. Deceleration, contact, body compression, fold,
  and settle are readable; the contact is mathematically stable. Weight and toe
  grip are not physically convincing.
- **Edge quality:** PARTIAL. Overlap hides most joint gaps in selected poses;
  some wing/tail/body layering remains visibly constructed.
- **Frame consistency:** PASS. Stable texture, no missing parts, no unintended
  flicker, deterministic repeats.
- **Composition:** PARTIAL. The close-up bird and branch are readable; the
  environment is sparse and procedural.

Weakest areas, in order:

1. Character face and feather construction remain below the target illustration
   quality.
2. Background foliage and trunks still read as procedural rather than authored.
3. Rigid sprite motion lacks deformation, IK, and soft-body weight.
4. Material richness is below professional gouache/watercolor illustration.
5. GIF color/timing fidelity is limited, although the MP4 and PNG sequence are
   exact.

No artistic PASS is claimed. The artistic gate remains pending user/ChatGPT
review.

## J. Architectural Recommendation

The evidence favors **option 2: improve the hybrid asset pipeline further**,
with **option 3 as the asset-quality dependency**.

- **Option 1 — proceed directly to the full Phase 3 character animation
  architecture:** Not yet. The hierarchical rig and deterministic renderer work,
  but building a larger rigging framework around artwork that has not passed the
  artistic gate would industrialize the current quality ceiling.
- **Option 2 — improve the hybrid asset pipeline further:** Strongest evidence.
  The layered-part architecture, pivot rig, deterministic tracks, live preview,
  PNG export, and 48-frame capture are all proven. The limiting factor is the
  authored asset quality, not the runtime. The next investment should be better
  master artwork (especially head, feather groups, and environment) and
  deformation-friendly layered geometry, while retaining the existing motion
  and rendering contracts.
- **Option 3 — depend on higher-quality externally generated or
  artist-authored illustrations:** Required for a true quality jump. An approved
  illustrator or approved image-generation workflow should produce the master
  character sheet and key environment plates. The deterministic rig can still
  animate those assets. This phase did not use any external provider or
  credentials and makes no claim that procedural art alone can reach the target.

Recommended sequence: continue the hybrid pipeline, source/author a stronger
character and environment asset layer, add deformation and an IK/contact
solution, then revisit the Phase 3 architecture. Do not begin Phase 3 from this
report.

## K. Readiness Decision

**Engineering: GO**

The layered rig, deterministic 48-frame animation, preview route, playback,
scrubbing, part inspection, PNG export, reproducible capture, GIF/MP4 encoding,
tests, build, and preserved Phase 2 routes all work.

**Artistic: PENDING USER REVIEW**

The animation is a genuine feasibility improvement, not a production-quality
storybook result. The user and ChatGPT must review the actual GIF/MP4/frames and
decide whether the direction is acceptable. No artistic GO is self-certified.

**Phase 3: NOT STARTED**

No push was performed. No Phase 3 work was begun.
