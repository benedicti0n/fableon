# Phase 2.8 — Input Asset Audit

**Status:** **BLOCKED — CLEAN PREMIUM START FRAME REQUIRED**  
**Date:** 2026-11-09  
**Selected provider:** Gemini Omni 1.2 Flash (provisional)

The experiment needs one clean 16:9 starting frame that can be used as the first
frame for image-to-video generation. The repository does **not** contain a
premium frame that satisfies that requirement.

## 1. Available artwork

| Asset                              | Path                                                                   | Dimensions           | Suitable as video start frame?                                                    |
| ---------------------------------- | ---------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| Approved master reference          | `assets/premium-bird-v1/references/approved-master-reference.png`      | 1536×1024            | **No** — labeled multi-pose character sheet, multiple birds, typography, diagrams |
| Reconstruction reference board     | `assets/premium-bird-v1/references/reconstruction-reference-board.png` | 1536×1024            | **No** — reference board, not cinematic scene                                     |
| Phase 2.7 Gate 2 frame 0           | `docs/benchmarks/phase-02-7-gate2/frames/frame-000.png`                | 1920×1080            | Diagnostic only — candidate bird, procedural forest                               |
| Phase 2.7 Gate 2 frame 16          | `docs/benchmarks/phase-02-7-gate2/frames/frame-016.png`                | 1920×1080            | Diagnostic only — single bird in flight, but low-res candidate art                |
| Phase 2.7 Gate 2 frame 24          | `docs/benchmarks/phase-02-7-gate2/frames/frame-024.png`                | 1920×1080            | Diagnostic only — braking pose, not premium                                       |
| Phase 2.7 Gate 2 frame 47          | `docs/benchmarks/phase-02-7-gate2/frames/frame-047.png`                | 1920×1080            | Diagnostic only — perched/landing endpoint candidate, not premium                 |
| Phase 2.5 poses/frames             | `docs/benchmarks/phase-02-5/`                                          | 1920×1080            | **No** — procedural character/environment                                         |
| Phase 2.6 diagnostic images        | `docs/benchmarks/phase-02-6/`                                          | 1920×1080            | **No** — diagnostic fixture                                                       |
| Phase 2.7 forest preview           | `docs/benchmarks/phase-02-7-gate2/forest-preview.png`                  | 1920×1080            | Background only; diagnostic                                                       |
| Phase 2.7 master/render comparison | `docs/benchmarks/phase-02-7-gate2/master-vs-render.png`                | 1600×900             | **No** — comparison sheet with panels                                             |
| Public Phase 2 assets              | `apps/web/public/assets/`                                              | 720×540 to 2048×1152 | **No** — procedural/flattened benchmark assets                                    |

### Why the character sheet is not usable

`approved-master-reference.png` contains:

- the large character portrait plus multiple pose thumbnails;
- front/side/back turnaround views;
- labels and typography;
- a palette panel and environment reference;
- more than one bird.

An image-to-video model may animate the sheet, pivot markers, or typography
instead of creating the intended cinematic shot. Cropping a single figure from
the sheet and compositing it onto a diagnostic background would be a fabricated
premium frame, which this phase must not do.

## 2. Diagnostic fallback

A Phase 2.7 Gate 2 frame is technically a clean 16:9 scene with one bird, a
branch, and no labels, but it is explicitly **diagnostic** artwork:

- the character is the low-resolution Gate 2 candidate;
- the background is the Phase 2.5 procedural forest;
- the character has known matte/seam defects.

It may be used only for a **zero-cost technical smoke test** of a provider
workflow, clearly labeled `DIAGNOSTIC INPUT — NOT ARTISTIC VALIDATION`. It
cannot answer whether AI video is better for Fableon's target illustration
quality. Recommended diagnostic path if a free/authorized test is later allowed:

```text
docs/benchmarks/phase-02-7-gate2/selected-frames/frame-016.png
```

Do not use it as the premium benchmark source.

## 3. Required premium start frame

**File to supply:** `assets/premium-video-v1/start-frame.png`  
**Optional endpoint:** `assets/premium-video-v1/end-frame.png`

The folder does not exist yet; do not create empty placeholder files.

### Start frame requirements

- 16:9, **1920×1080 minimum**; 2560×1440 or 3840×2160 preferred.
- One Little Bird, recognizable and consistent with the approved design.
- Bird begins in flight, in a natural wing pose, positioned so a landing can
  occur within 3–5 seconds.
- Painterly forest at dawn with layered depth and warm upper-right light.
- A clear, moss-covered landing branch with a readable contact area in the lower
  third.
- Static camera composition; no cut, zoom, or camera move baked into the still.
- No text, labels, watermark, border, UI, checkerboard, multiple birds, pivot
  markers, sheet panels, or visible rig construction.
- Cohesive chestnut/golden/cream/slate-blue palette and professional
  watercolor/gouache surface.
- Fine edge quality; no low-resolution upscaling.
- Source provenance and usage rights documented.

### Optional endpoint frame

- Same character, forest, camera, scale, and lighting.
- Bird perched calmly on the same branch, wings folded, feet gripping.
- No identity change, new objects, text, or camera shift.
- Use only if the selected provider supports last-frame conditioning (Omni
  supports first+last frames at 3–10 seconds).

## 4. Exact still-frame generation brief

Use the approved master reference as an image reference. Do not generate a new
character. The output is a **single cinematic still**, not a character sheet.

```text
Create a single 16:9 cinematic still from a premium traditionally illustrated
children's storybook. A small woodland songbird with a warm chestnut-brown head
and back, golden ochre body, cream breast, and slate-blue layered wings flies
through a sunlit enchanted forest at dawn. The bird is in mid-flight with a
graceful readable wing pose, positioned left of center, approaching a moss-covered
branch in the lower third of the frame. The branch has a clear landing area and
delicate leaves at its ends. The forest has deeply layered painted foliage,
organic tree silhouettes, soft distant mist, warm golden light from the upper
right, and subtle sage/teal shadows. Rich gouache and watercolor texture, soft
edge variation, professional picture-book composition, consistent character
identity, one bird only. Static camera, no cut, no zoom. No labels, no text, no
typography, no border, no UI, no checkerboard, no character sheet, no multiple
poses, no pivot markers, no watermark, no extra characters, no props.
```

Optional endpoint still:

```text
Using the approved master reference and the approved start frame as exact
references, create the matching ending frame: the same bird perched calmly on
the same moss-covered branch in the same forest and camera framing, wings
folded, feet naturally gripping the branch, same palette, lighting, anatomy,
feather markings, and painted surface. One bird only, static camera, no text,
labels, border, UI, watermark, or extra objects.
```

## 5. Source quality concerns

- The approved master is a reference sheet, not a shot.
- The existing candidate bird is low-resolution and has visible cutout/seam
  defects; it should not be used to claim premium video quality.
- The diagnostic forest is procedural and not the approved premium forest.
- No clean endpoint image exists.
- No source usage/licence metadata for a final production frame exists beyond
  the candidate review status.

## 6. Hardware check (local option)

Current machine:

- Apple M1, 7-core GPU;
- **8 GB unified memory**;
- macOS, no NVIDIA CUDA.

This is insufficient for the documented Wan2.2 local requirements:

- Wan2.2 I2V-A14B: 80 GB VRAM for the documented single-GPU command;
- Wan2.2 TI2V-5B: 24 GB VRAM for 720p;
- 5-second 720p generation is documented at under 9 minutes on a consumer GPU,
  but only with sufficient VRAM.

No model download or local generation was attempted.

## 7. Audit decision

**BLOCKED — PREMIUM START FRAME REQUIRED.**

The provider is selected, but the source image gate is unmet. Do not call a paid
provider using the diagnostic Gate 2 frames and do not claim an artistic result.
Supply or generate the clean start frame under an approved image workflow, then
re-run this audit.
