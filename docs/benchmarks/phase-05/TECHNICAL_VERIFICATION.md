# Phase 5 — Technical Verification

**Video:** `outputs/folk-pilot/final.mp4`  
**SHA-256:** `1f99ec3e791d09b929f86bf204c61562c2cd599e580d8509f729efee0dfb908e`  
**Size:** 15,198,058 bytes

## Container and stream

| Property     | Result            | Expected   |
| ------------ | ----------------- | ---------- |
| Duration     | 30.000000 s       | 30.000 s   |
| Frames       | 720               | 720        |
| Frame rate   | 24/1              | 24 fps     |
| Resolution   | 1920×1080         | 1920×1080  |
| Codec        | H.264             | H.264      |
| Audio        | none              | none       |
| Pixel format | yuv420p           | compatible |
| Full decode  | exit 0, no errors | no errors  |

```
ffmpeg -v error -i outputs/folk-pilot/final.mp4 -f null -
# exit 0
```

## Frame-level diagnostics

Decoded every frame to 320×180 grayscale and compared consecutive frames.

| Metric                                   |       Result |
| ---------------------------------------- | -----------: |
| Frames evaluated                         |          720 |
| Mean luminance min / max                 | 16.0 / 146.1 |
| Consecutive-frame MAD mean               |        2.781 |
| MAD median                               |        2.506 |
| MAD p95                                  |        6.564 |
| MAD p99                                  |        7.945 |
| MAD max                                  |       15.905 |
| Jumps >20 or >1.5×p99                    |         none |
| Black frames (mean < 8)                  |         none |
| Near-frozen runs (MAD < 0.02, ≥3 frames) | 115–118 only |

The 115–118 run is the eased end of shot 1 (camera settle plus no actor), not a corrupt or
missing section. Frame 0 is a warm fade, not a pure black frame; the mean luminance is 16.

Per-shot MAD:

| Shot                   | Frames  |  Mean |   p95 |   Max |
| ---------------------- | ------- | ----: | ----: | ----: |
| Morning in the Village | 0–119   | 2.447 | 7.722 | 7.951 |
| The Artisan            | 120–263 | 2.964 | 6.116 | 7.454 |
| The Horse and Cart     | 264–431 | 2.337 | 3.104 | 4.559 |
| The Brass Bell         | 432–599 | 1.904 | 3.545 | 5.074 |
| The Journey Continues  | 600–719 | 4.610 | 7.432 | 9.939 |

Raw data: `motion-analysis.json`.

## Shot and transition checks

Extracted actual decoded frames at 0, 60, 119, 120, 200, 263, 264, 340, 431, 432, 470,
500, 520, 599, 600, 660, 719 in `diagnostic-frames/`.

| Check                                                     | Result |
| --------------------------------------------------------- | ------ |
| Five shots exist at 0/120/264/432/600                     | PASS   |
| Crossfade 2→3 (264+) has one artisan, one horse, one cart | PASS   |
| Crossfade 3→4 (432+) has one artisan, one horse, one cart | PASS   |
| Crossfade 4→5 (600+) has one artisan, one horse, one cart | PASS   |
| No duplicate eyes/beaks/heads/silhouettes                 | PASS   |
| Outgoing cast suppressed, incoming cast drawn once        | PASS   |
| Final fade to black at 719                                | PASS   |

The crossfade implementation is deliberately asymmetric: environment layers dissolve,
characters do not. This is the correction for the Phase 4 duplicate-character defect.

## Identity

- **Artisan:** same turban, moustache, earring, ochre coat, cream dhoti, indigo sleeves,
  and brown mojaris in all shots. No model re-generation between shots.
- **Horse:** same cream coat, terracotta mane/tail, indigo-and-gold harness, and saddle
  blanket in shots 3–5.
- **Cart:** same ochre body, indigo canopy, gold diamond, two spoked wheels, and shafts.
- **Bell:** same 180×230 master, rendered at 38% scale, transferred from hand to harness.

## Attachment, wheel, and prop checks

| Check                                                      | Result                           | Evidence                                                                         |
| ---------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| Horse–cart shaft alignment                                 | PASS                             | cart `offsetX = -275`; shaft tip meets the horse chest at sampled frames 340/600 |
| Wheel rotation                                             | PASS                             | both wheels rotate by `distance / (radius × scale)`; compare frames 340/600      |
| Bell in hand before attach                                 | PASS                             | frame 500                                                                        |
| Bell attached at harness after local frame 72 (global 504) | PASS                             | frame 520                                                                        |
| Bell remains attached in shot 5                            | PASS                             | frame 600/660                                                                    |
| Artisan blink                                              | PASS                             | eyelid window every 72 frames                                                    |
| Hand open → grip → release                                 | PASS                             | frames 470/500/520                                                               |
| Foot contact                                               | PASS visually at sampled stances | no floating foot observed; no quantitative ground solver                         |

## Cost and authorization checks

| Check                           | Result                                           |
| ------------------------------- | ------------------------------------------------ |
| Paid API calls                  | 0                                                |
| Remote generation authorization | none; gate blocks                                |
| Cost ledger events              | 9 final-benchmark events                         |
| Actual API spend                | $0.00                                            |
| Ledger path                     | `outputs/folk-pilot/cost-ledger.json`            |
| Copied audit path               | `docs/benchmarks/phase-05/cost-ledger.json`      |
| Generation attempt records      | 1 local asset pass                               |
| Render records                  | final, preview, two variations, two test exports |
| Electricity                     | unknown; no calibrated meter                     |

## Test suite

| Command             | Result                      |
| ------------------- | --------------------------- |
| `pnpm format:check` | PASS                        |
| `pnpm lint`         | PASS                        |
| `pnpm typecheck`    | PASS                        |
| `pnpm test`         | PASS — 273 tests / 38 files |
| `pnpm build`        | PASS                        |
| `pnpm test:browser` | PASS — 55 tests             |

## Decision

**Video integrity: PASS.**  
**Offline rendering: PASS.**  
**No unapproved spending: PASS.**  
**Artistic approval: PENDING USER REVIEW.**
