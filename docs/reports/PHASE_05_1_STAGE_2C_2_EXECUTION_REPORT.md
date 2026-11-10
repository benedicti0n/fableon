# Phase 5.1 Stage 2C.2 — Execution Report

**Date:** 2026-11-11  
**Starting HEAD:** `2de6d56`  
**Authorized ceiling:** $3.50  
**Actual Stage 2C.2 spend:** **$0.189908**  
**Status:** paid artwork sheets generated; rig/render validation **BLOCKED**

## 1. Initial and final HEAD

| Purpose                          | Commit                       |
| -------------------------------- | ---------------------------- |
| Starting point                   | `2de6d56`                    |
| Stage 2C.2 paid repair generator | `TBD`                        |
| Stage 2C.2 repair evidence       | `TBD`                        |
| This report                      | final HEAD after this commit |

## 2. Delegated authorization records

The instruction explicitly delegated activation of:

- OpenAI `auth_1794337129045_16948671` — $2.00, 4 requests, 1 output.
- Gemini `auth_1794337129377_7e5ac5a0` — $1.50, 4 requests, 1 output.

Both were approved through the existing authorization service, actor `delegated-local-operator`,
not by editing JSON.

## 3. Authorization activation evidence

| Provider | Status before | Status after | Approved at        | Requests used |
| -------- | ------------- | ------------ | ------------------ | ------------: |
| OpenAI   | pending       | **active**   | delegated operator |         2 / 4 |
| Gemini   | pending       | **active**   | delegated operator |         2 / 4 |

No duplicate authorization was created. The Stage 2A/2B balances were not reused.

## 4. Actual spending

| Provider | Conservative request sum | Completed-usage cost |     Remaining |
| -------- | -----------------------: | -------------------: | ------------: |
| OpenAI   |                $0.221100 |        **$0.085175** |     $1.914825 |
| Gemini   |                $0.105419 |        **$0.104733** |     $1.395267 |
| Combined |                $0.326519 |        **$0.189908** | **$3.310092** |

No failed requests, no rejected paid images, no provider-reported invoice.

## 5. Mask editor implementation

**Not implemented.** The Stage 2C.1 masks and Stage 2C blueprint inspector remain the available
surface. A paint/erase mask editor was not delivered in this execution. This is a failed gate.

## 6. Corrected masks

The Stage 2C.1 masks remain preserved. No new mask revision was approved in Stage 2C.2. The paid
repair sheets were generated from the master reference rather than from a saved precise mask.

## 7. Source-preserving extracts

The paid sheets preserve the master's visible design language:

- blue sleeve with flower motif and diamond cuff;
- ochre/skin forearm and hand;
- ochre/blue thigh/shin with dhoti borders;
- original dark outlines.

Extracted sprites:

- `openai/upperArm.png`, `forearm.png`, `thigh.png`, `shin.png`;
- `gemini/upperArm.png`, `forearm.png`, `thigh.png`, `shin.png`.

They are not yet registered through the full connector pack.

## 8. OpenAI image-generation results

Two requests:

1. `stage2c2-openai-arm` — arm sheet with shoulder cap, sleeve, elbow cuff, forearm and hand.
2. `stage2c2-openai-leg` — thigh/dhoti, shin and shoe sheet.

Both returned usable transparent PNGs. Est. $0.11056 / $0.11054; reconciled $0.042595 / $0.04258.

## 9. Gemini image-generation results

Two requests:

1. `stage2c2-gemini-arm` — green-screen arm sheet.
2. `stage2c2-gemini-leg` — green-screen leg sheet.

Both returned usable images. Est. $0.0527115 / $0.052707; reconciled $0.052368 / $0.052365.

## 10. Accepted and rejected candidates

Accepted for extraction/evaluation: both arm and leg sheets per provider.  
Rejected: none.  
No paid candidate was artistically approved or integrated into a production pack.

## 11. Actual rig integration

**Blocked.** The extracted parts were prepared with pivots and scaling, but the combined local
prepare/render script stalled during frame extraction before producing an articulation video.
No rig animation is claimed.

## 12. Joint-motion evaluation

**Not completed.** No new Stage 2C.2 MP4 exists. Existing Stage 2B.2 joint stress evidence remains
historical reference only.

## 13. Neutral reconstruction comparison

**Not completed for Stage 2C.2.** The Stage 2B.3 master reconstruction baseline (IoU 0.5086/0.4620)
is unchanged and is not evidence of improvement.

## 14. Remaining artwork defects

- Paid sheets are still full-segment regenerations, not strict visible-pixel + missing-geometry
  composites.
- Hand/foot are baked into forearm/shin sheets.
- No precise mask editor or missing-geometry merge was completed.
- Provider identity is close but not verified through full-pack reconstruction.
- No articulation test proves hidden overlap.

## 15. Cost per usable assembly

No usable articulated assembly was completed. Cost per usable assembly is **not calculable**.
Paid image cost so far: $0.189908.

## 16. Cumulative provider spending

Stage 2A–2C.2 historical costs remain separate. Stage 2C.2 adds $0.085175 OpenAI and $0.104733
Gemini. No historical cost was rewritten.

## 17. Full test results

| Command             | Result                      |
| ------------------- | --------------------------- |
| `pnpm format:check` | PASS (before final report)  |
| `pnpm lint`         | PASS (before final report)  |
| `pnpm typecheck`    | PASS                        |
| `pnpm test`         | PASS — 358 tests / 54 files |
| `pnpm build`        | PASS                        |
| `pnpm test:browser` | PASS — 59 tests             |
| Paid calls in tests | 0                           |

The Stage 2C.2 paid generator/render scripts do not add automated provider tests.

## 18. Generated artifact paths

- `docs/benchmarks/phase-05.1/stage-2c2/openai/arm-sheet.png`
- `openai/leg-sheet.png`
- `gemini/arm-sheet.png`
- `gemini/leg-sheet.png`
- extracted parts under each provider directory
- `cost-summary.json`
- `candidate-inventory.json`

No Stage 2C.2 video was produced.

## 19. Full commit hashes

| Purpose                          | Commit                       |
| -------------------------------- | ---------------------------- |
| Starting point                   | `2de6d56`                    |
| Stage 2C.2 paid repair generator | `TBD`                        |
| Stage 2C.2 repair evidence       | `TBD`                        |
| Final report                     | final HEAD after this commit |

## 20. Final recommendation

**BLOCKED.** The paid repair sheets are real and within budget, but the precision mask editor,
full connector registration, neutral reconstruction and local articulation video were not
completed. Do not proceed to a full character or paid retry from this state.

Next action: fix the local articulation/prepare renderer and implement the mask editor before any
further generation. No additional provider spend is recommended.
