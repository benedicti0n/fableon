# Phase 4.1 — Reusability Experiment

**Question:** Can Fableon produce a meaningfully different animation from different
composition parameters, or is it only a hardcoded 30-second movie?

## Result

**PARTIAL.**

A different 7-second 720p variation was rendered with the same renderer, rig, camera, and
ambient systems. It is visibly different and technically valid. However, the parameters
were **not editable in Studio**; they required temporary source changes. The Studio exposes
only frame selection, preview resolution, export range, and export resolution. Camera
paths, bird trajectories, and wing-flap speed are code-level values.

## Changed parameters

The original demonstration was not modified. A temporary patch changed:

1. **Camera path/zoom** for shot 2:
   - start `(980,700, zoom 1.02)` → `(760,540, zoom 1.08)`;
   - middle `(1180,780, zoom 1.04)` → `(1180,520, zoom 1.12)`;
   - end `(1360,830, zoom 1.03)` → `(1540,660, zoom 1.16)`.
2. **Bird flight trajectory**:
   - start `(420,640)` → `(360,500)`;
   - end `(1150,760)` → `(1450,900)`.
3. **Wing-flap speed**:
   - `flightPose` flap multiplier `0.62` → `1.15`.

Exact patch: `variation.patch` in this directory.

## Variation render

```text
Command:
node scripts/render-phase-04.mjs \
  --start 144 --end 311 \
  --resolution 1280x720 \
  --output outputs/phase-04-acceptance/variation.mp4

Output: outputs/phase-04-acceptance/variation.mp4
Frames: 168
Duration: 7.000 s
Resolution: 1280×720
FPS: 24
Codec: H.264
SHA-256: 88d8920125864bafb400eb0062ddbd0021ff02999d23953746e382ec78596b93
Manifest: outputs/phase-04-acceptance/variation.manifest.json
Report: outputs/phase-04-acceptance/variation.report.json
```

The original final film remained unchanged:

```text
outputs/where-the-light-lands/final.mp4
SHA-256 before: 61ef10891b96d09eeb06d88bf8bcd9b2477b30514ff87b9d5e64a8e8ea88bf62
SHA-256 after:  61ef10891b96d09eeb06d88bf8bcd9b2477b30514ff87b9d5e64a8e8ea88bf62
```

The source files were restored immediately after rendering with
`git checkout -- apps/web/lib/film/where-the-light-lands.ts packages/character-motion/src/index.ts`.

## Visible difference

- Side-by-side video:
  `comparison/variation-vs-original.mp4`
- Four paired frames:
  `comparison/variation-vs-original-frames.png`
- Corresponding time ranges: original global 144–311 vs variation local 0–167.
- Structural SSIM between the two 7-second segments: **0.484** (low similarity, as expected
  for a different camera and flight path).

The variation uses the same `FilmRenderer`, `evaluateFilmFrame`, ambient system, and
character-motion package. It is not a prerecorded substitute or a fabricated edit.

## Provenance defect

The variation manifest still reports the **original** spec hash:

```text
filmSpecHash: ecacc59ab78d851fc4e332ea4ffe608724d3827ed7bbafe9d469c03f41ff61ba
```

That hash is calculated from `WHERE_THE_LIGHT_LANDS` only. It does not include the camera
tracks or the character motion function, so it did not change when the variation altered
them. This is an incomplete provenance hash, not a false video.

## Reproduce

```bash
# From the starting HEAD / clean source:
git apply docs/benchmarks/phase-04/acceptance-test/variation.patch
node scripts/render-phase-04.mjs \
  --start 144 --end 311 \
  --resolution 1280x720 \
  --output outputs/phase-04-acceptance/variation.mp4
git checkout -- apps/web/lib/film/where-the-light-lands.ts packages/character-motion/src/index.ts
```

## Decision

**Animation reusability: PARTIAL.**

The engine can produce different animations from changed data/logic, and the variation is
valid and visibly different. But the current Studio does not let a user change camera,
trajectory, timing, or wing behavior; those changes require source edits. The composition
is data-shaped but not yet a user-editable production system. The manifest hash also needs
to cover camera and motion parameters.
