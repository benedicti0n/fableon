# Stage 2C.5 — Neutral Reconstruction

## Comparison images

- `before-after-comparison.png` — same camera, same frame, Stage 2C.4 technical pack vs Stage 2C.5 separated pack.
- `neutral-openai.png`, `neutral-gemini.png` — Stage 2C.5 neutral production frames.
- `docs/benchmarks/phase-05.1/stage-2b3/master-reconstruction-openai.png` and `...-gemini.png` — historical Stage 2B.3 master comparison.
- `docs/benchmarks/phase-05.1/stage-2a/{provider}-master.png` — original paid masters.

## What changed visually

Stage 2C.4 hid the independent hand and foot and rendered them baked into the forearm/shin. Stage 2C.5 keeps the same body/camera and separates the near hand and near foot at the wrist/ankle.

The neutral stage shows a real difference: the 2C.4 baked hand sat higher because the entire forearm+hand sprite had one registration. The 2C.5 hand hangs from the master wrist pivot at `(548,742)`. The Gemini hand also drops to the wrist instead of sitting near the chest.

This is a placement improvement, not a claim of full artistic approval.

## Joint placement

| Joint    | Master coordinate | Target used by 2C.5 | Connector separation |
| -------- | ----------------- | ------------------: | -------------------: |
| shoulder | 508,470           |             508,470 |                 0 px |
| elbow    | 532,610           |             532,610 |                 0 px |
| wrist    | 548,742           |             548,742 |                 0 px |
| hip      | 470,670           |             470,670 |                 0 px |
| knee     | 476,824           |             476,824 |                 0 px |
| ankle    | 480,978           |             480,978 |                 0 px |

Connector coincidence is exact by construction; it is not used as a visual quality score.

## Segment measurements

| Segment   |         Master length |                           OpenAI registration |                           Gemini registration |
| --------- | --------------------: | --------------------------------------------: | --------------------------------------------: |
| upper arm |                142.04 |    221 px sprite, scale 0.25848, 6% top pivot |    221 px sprite, scale 0.34211, 6% top pivot |
| forearm   |                132.97 | 152.94 px sprite, scale 0.28966, 8% top pivot | 151.49 px sprite, scale 0.27796, 8% top pivot |
| hand      | not fixed in contract |                     96.75 px, wrist-top pivot |                     80.05 px, wrist-top pivot |
| thigh     |                154.12 |    235 px sprite, scale 0.23955, 6% top pivot |    235 px sprite, scale 0.17994, 6% top pivot |
| shin      |                154.05 | 170.86 px sprite, scale 0.23896, 8% top pivot | 169.37 px sprite, scale 0.15122, 8% top pivot |
| foot      | not fixed in contract |              102.75×39.19 px, ankle-top pivot |               30.24×22.08 px, ankle-top pivot |

Full offsets and target widths: `measurements.json` and `pose-report.json`.

## Source fidelity

All visible candidate RGB values match the source pixels exactly: **0 mismatches** across every part and provider. Gemini green-dominant opaque pixels after extraction: **0**.

The extraction preserves the source's antialiased alpha for OpenAI and uses a soft chroma edge plus despill for Gemini. Fully transparent RGB is zeroed; visible RGB is never repainted.

## What is not measured

A new full-master silhouette IoU was **not** computed in Stage 2C.5. The historical Stage 2B.3 baseline remains:

- OpenAI IoU: **0.5086**
- Gemini IoU: **0.4620**

No numerical improvement is claimed from zero connector error or from the neutral visual comparison. The historical Stage 2B.3 judgement was ARTWORK-BLOCKED for several master reconstruction regions; Stage 2C.5 is a near-limb separation test, not a full-master reconstruction claim.
