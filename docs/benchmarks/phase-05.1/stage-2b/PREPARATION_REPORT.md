# Phase 5.1 Stage 2B — Preparation Report

**Date:** 2026-11-10  
**Baseline HEAD:** `ad9d0b4`  
**Experiment:** `phase-05.1-stage-2b`  
**Paid Stage 2B calls:** **0**  
**Authorization state:** two records created, both **pending**, neither approved

## 1. What was preserved

The complete Stage 2A evidence remains in place and was not replaced:

- `docs/reports/PHASE_05_1_STAGE_2A_EXECUTION_REPORT.md`
- `docs/benchmarks/phase-05.1/stage-2a/`
- `outputs/folk-provider-benchmark/stage-2a/`
- `outputs/folk-provider-benchmark/openai/attempts/`
- `outputs/folk-provider-benchmark/gemini/attempts/`
- all Stage 2A usage ledgers and authorizations

The original OpenAI and Gemini masters, the four extracted parts per provider, the elbow
videos, request/response JSON and cost ledgers are unchanged.

## 2. Stage 2A baseline

| Metric                        |    OpenAI |    Gemini |
| ----------------------------- | --------: | --------: |
| Stage 2A requests used        |     5 / 6 |     4 / 6 |
| Stage 2A images returned      |         5 |         2 |
| Stage 2A usable assets        |         5 |         5 |
| Stage 2A conservative spend   | $0.244610 | $0.205989 |
| Stage 2A completed-usage cost | $0.244610 | $0.103410 |
| Stage 2A failed-attempt hold  | $0.000000 | $0.102579 |
| Stage 2A remaining budget     | $1.255390 | $0.794011 |

Stage 2A combined conservative spend was **$0.450599**; completed successful usage was
**$0.348020**. No Stage 2A authorization is being reused for Stage 2B.

### Gemini reconciliation

The $0.102579 difference between Gemini’s conservative ledger ($0.205989) and completed usage
($0.103410) is exactly two failed attempts at $0.0512895 each:

1. `stage2a-gemini-master` — HTTP 400, PNG `response_format.mime_type` rejected. Likely unbilled,
   but retained as a conservative hold because no invoice exists.
2. `stage2a-gemini-master-retry1` — HTTP 502, the image was present in `steps[].content[]` but
   the adapter had not yet parsed that shape. This request may have been billed.

No ledger event was edited to improve the Stage 2B totals. The two holds remain part of Stage 2A.

## 3. Offline engineering completed before paid generation

### Joint contract

`@fableon/folk-motion` now supports explicit joint metadata on rig nodes:

- joint kind: shoulder, elbow, wrist, hip, knee, ankle, neck;
- parent node;
- hidden-overlap rectangle in child pivot-local pixels;
- occlusion rule: parent-over-child, child-over-parent, cover-over;
- optional cover node;
- rotation limits;
- joint diagnostics and overlap-corner mapping.

The existing resolver and pose evaluator remain the only rigging engine. No second engine was
introduced.

### Complete 31-part artisan rig

`ARTISAN_V2_RIG` keeps the existing node IDs, pivots and part IDs used by `artisanPose`, and adds:

- improved draw order for shoulder, elbow, hip and neck concealment;
- explicit near/far elbow cover nodes;
- 15 joint contracts covering shoulders, elbows, wrists, hips, knees, ankles and neck.

The 31-part inventory is in `CHARACTER_PART_INVENTORY.md`.

### Pack validation

A pack is not accepted merely because filenames exist. `validateProviderPack` checks:

- all 31 required slots;
- duplicate/unexpected parts;
- part file hashes;
- scale and size sanity;
- joint parent presence;
- occlusion draw order;
- cover draw order;
- hidden overlap inside registered artwork bounds;
- joint limits.

The renderer refuses to render an incomplete or invalid pack.

### Config-driven animation

`stage2b-animation.ts` defines the 192-frame, 24 fps, 8.000-second walk → reach → grip → release
→ idle sequence. The motion is configuration-driven and deterministic. A variation config
changes walk speed, start position, reach target, arm timing, head orientation and blink cadence
without changing engine code.

### Local renderer

`scripts/stage2b-render.ts` renders 1280×720, 24 fps, 192 frames, H.264 MP4, with the existing
Fableon canvas pipeline and `@fableon/folk-motion`. It:

- refuses incomplete packs;
- loads all sprites locally;
- makes zero provider calls;
- verifies deterministic frames when `--verify` is used;
- runs ffprobe and a full decode check;
- writes a contact sheet and render report.

A synthetic engineering fixture was used only to verify the renderer; it is not provider artwork
and is not part of the deliverable comparison.

## 4. Joint-concealment diagnostic

`before-after-elbow.png` compares the old Stage 2A layering/registration with the Stage 2B v2
draw order and overlap expansion, using the original Stage 2A OpenAI and Gemini artwork.

Changes demonstrated:

- torso now draws above the upper arm so the shoulder no longer reads as a separate oval;
- the upper arm is shifted outward so the sleeve emerges from under the torso;
- the forearm is expanded 6% around its pivot and the upper arm 3%, creating a hidden overlap;
- elbow cover nodes and hip/neck covers are part of the final 31-part contract.

Observed result:

- The shoulder oval is removed in both providers.
- The OpenAI forearm now connects through the expanded overlap; the sleeve is thinner than the
  Stage 2A version and remains visibly separate art.
- Gemini’s sheet-derived arm keeps the cleaner seam, but its upper arm is still small relative to
  the torso.
- The elbow cover is part of the generation contract; it is not fabricated from vector shapes.

This diagnostic is not a full character test. It proves the layering/overlap mechanism, not final
artistic acceptance.

## 5. Stage 2B generation plan

Four coherent sheets per provider:

| Sheet | Grid | Slots                                                                  |
| ----- | ---- | ---------------------------------------------------------------------- |
| head  | 3×3  | head, turban, turban tail, moustache, earring, eye, eyelid, brow, neck |
| body  | 3×2  | torso, sash, necklace, shoulder sash, pelvis, empty cell               |
| arms  | 3×3  | near/far upper arms, forearms, elbow covers, open/grip/far hands       |
| legs  | 4×2  | near/far thighs, shins, feet, dhoti panels                             |

References:

- the provider’s Stage 2A master;
- the relevant Stage 2A head, torso, or near-arm part where available.

The Stage 2A parts are preserved as identity references and fallbacks. They are not silently
reused if the new sheet produces a better complete rig.

## 6. Stage 2B cost estimate

All eight sheet estimates were produced through the free server estimate endpoint.

| Sheet     |        OpenAI |        Gemini |
| --------- | ------------: | ------------: |
| Head      |     $0.327565 |    $0.0545025 |
| Body      |     $0.327555 |     $0.054498 |
| Arms      |     $0.363425 |    $0.0561885 |
| Legs      |     $0.291620 |     $0.052791 |
| **Total** | **$1.310165** | **$0.217980** |

Combined estimate: **$1.528145**, before any manual repair attempts. The proposed caps leave
substantial headroom for one repair per sheet and for a failed attempt that must not be retried
automatically.

No Stage 2B paid request has been made.

## 7. Pending authorizations

| Provider | Authorization ID              |       Cap | Requests | Outputs | Status          |
| -------- | ----------------------------- | --------: | -------: | ------: | --------------- |
| OpenAI   | `auth_1794315751164_678c8d79` |     $4.00 |       10 |       1 | **pending**     |
| Gemini   | `auth_1794315751766_c1eef16a` |     $3.00 |       10 |       1 | **pending**     |
| Combined | —                             | **$7.00** |        — |       — | **not granted** |

Both expire at `2026-11-13T13:02:30.000Z`. Both have `approvedBy: null`, `spentCostUsd: 0`,
`reservedCostUsd: 0` and `requestCount: 0`.

Rerunning the operator CLI with the same limits returns `pending-existing`; it does not create a
duplicate or activate anything.

## 8. What remains blocked

The following require explicit approval of the two pending records:

- any OpenAI or Gemini generation call;
- provider pack preparation from generated sheets;
- the OpenAI/Gemini eight-second videos;
- the provider comparison videos and final quality review;
- the final Stage 2B execution report with actual spend and visual approval.

Offline work that can continue without approval is limited to test and documentation refinement.
No provider request may be submitted from this state.
