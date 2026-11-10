# Phase 5.1 Stage 2B.3 — Anatomical Calibration Report

**Date:** 2026-11-10  
**Starting HEAD:** `29da208`  
**Paid API calls:** **0**  
**New artwork generation:** **none**  
**Verdict:** connector solver PASS; master registration **ARTWORK-BLOCKED**

## 1. Executive summary

Stage 2B.3 added a master-referenced anatomical landmark contract and a reconstruction evaluator.
The reconstruction compares the independently assembled Stage 2B.2 character against the original
OpenAI and Gemini masters at a common silhouette scale.

The result is unambiguous:

- The socket solver remains mathematically correct.
- The existing generated parts do **not** reconstruct the masters without major anatomical
  deformation.
- The visible shoulder, wrist-band, shoe, Gemini arm and facial/clothing defects are primarily
  source-art limitations, not connector errors.

Rather than fabricate a calibration improvement, this phase records an explicit
**ARTWORK-BLOCKED** verdict for those areas.

## 2. Initial repository state

- HEAD verified at `29da208`.
- Working tree clean before work.
- Stage 2B, 2B.1 and 2B.2 reports inspected.
- Existing OpenAI and Gemini 31-part packs and connector rigs inspected.
- Original masters inspected at their real dimensions.
- Stage 2A/2B/2B.1/2B.2 assets, videos and ledgers preserved.

## 3. Confirmed root causes

| Defect                             | Root cause                                                           | Classification       |
| ---------------------------------- | -------------------------------------------------------------------- | -------------------- |
| OpenAI shoulder oval/disconnection | upper-arm sprite has no concealed shoulder socket geometry           | artwork-blocked      |
| OpenAI double wrist band           | hand and forearm sprites both contain gold bands                     | artwork-blocked      |
| OpenAI oversized curled shoes      | shoe silhouette proportion                                           | artwork-blocked      |
| OpenAI facial/accessory drift      | accessory pivots and baked facial construction differ from master    | partial code-fixable |
| Gemini tubular upper arm           | sleeve is a simple tube                                              | artwork-blocked      |
| Gemini shoulder/torso              | torso lacks a sleeve socket; arm is separate                         | artwork-blocked      |
| Gemini turban/eye overlap          | turban band and eye are separately generated with baked geometry     | partial              |
| Gemini dhoti/leg edges             | leg sheet merged cloth and limb                                      | partial              |
| Both neutral silhouette mismatch   | generated parts differ in construction/orientation/scale from master | artwork-blocked      |

## 4. Anatomical landmark schema

Added `packages/folk-motion/src/anatomy.ts`:

- semantic landmark IDs;
- observed/inferred/manual origin;
- confidence;
- near/far/center side;
- master silhouette bounds;
- normalized master coordinates;
- pixel conversion and round-trip error helpers;
- validation against duplicate IDs, nonfinite values, invalid confidence and out-of-bounds points.

Landmark sets:

- `docs/benchmarks/phase-05.1/stage-2b3/openai-landmarks.json`
- `docs/benchmarks/phase-05.1/stage-2b3/gemini-landmarks.json`

Observed: head center, eye, nose. Inferred: neck, shoulders, elbows, wrists, hips, knees, ankles and
soles, because the source views are side/three-quarter and far-side joints are occluded.

## 5. Coordinate-system specification

The full chain is documented in `REGISTRATION_METHODOLOGY.md`:

1. master image pixels;
2. master silhouette alpha bounds;
3. normalized master landmarks;
4. generated part source pixels;
5. registered sprite rectangle;
6. normalized sprite-local connectors;
7. rig-local connector positions;
8. character/world/screen transform.

Connector conversion and landmark conversion use pure domain functions, not React-component
arithmetic. Round-trip landmark tests pass.

## 6. Registration mathematics

The Stage 2B.2 socket invariant remains:

```text
Wchild · Cchild = Wparent · Cparent
```

Anatomical calibration adds an independent landmark objective:

```text
E_anatomy = Σ weight_i × distance(rendered_landmark_i, master_landmark_i)
```

The objective is reported separately from socket alignment and silhouette similarity. It is not
used to claim a pass because most master landmarks are inferred.

## 7. Master-pose reconstruction method

`scripts/stage2b3-reconstruct.ts`:

1. loads each provider pack and connector rig;
2. uses the calibrated Stage 2B.1 walk-entry pose as the neutral stance;
3. resolves independent sprites through the connector solver;
4. renders the assembly to a transparent canvas;
5. extracts the master silhouette (Gemini cream background removed by edge flood fill);
6. scales the master uniformly to the reconstruction height and centers it;
7. produces original / reconstruction / 50% overlay panels;
8. computes silhouette IoU.

No nonuniform stretching is used.

## 8. Editor functionality

The existing `/studio/folk/rigs/connectors` editor remains available for connector calibration:

- provider switching;
- part selection;
- normalized connector markers;
- drag and numeric editing;
- add/rename/remove;
- zoom;
- parent preview;
- joint rotation preview;
- debug toggle;
- save/reload/revert.

A master-overlay/landmark editor was **not** added in this phase. The existing editor is a
connector editor, not the full master-reference editor requested. This is a known gap, not a claim
of completion.

## 9. OpenAI initial defects

- bulky, disconnected shoulder;
- visible elbow seam;
- forearm/cuff registration creating an apparent double wrist band;
- oversized curled shoes;
- clothing seams and arm/torso overlap;
- neutral reconstruction facial/accessory mismatch.

## 10. OpenAI calibrated results

- Versioned rig: `artisan_openai_anatomical_v1`.
- 31 parts, 30 attachments.
- Registration geometry unchanged.
- Socket error retained: max 2.26 × 10⁻¹³ px rendered.
- Silhouette IoU: **0.5086**.
- No anatomical landmark improvement claimed.

The reconstructed OpenAI character remains visibly different from the master in shoulder,
wrist/hand, shoe and facial construction.

## 11. Gemini initial defects

- head/neck and turban/eye registration;
- tubular upper arm;
- shoulder/torso socket awkwardness;
- forearm/clothing overlap;
- dhoti and garment edges.

## 12. Gemini calibrated results

- Versioned rig: `artisan_gemini_anatomical_v1`.
- 31 parts, 30 attachments.
- Registration geometry unchanged.
- Socket error retained: max 2.23 × 10⁻¹³ px rendered.
- Silhouette IoU: **0.4620**.
- No anatomical landmark improvement claimed.

## 13. Before/after landmark measurements

| Criterion              | Before          | After           | Improvement                 |
| ---------------------- | --------------- | --------------- | --------------------------- |
| Socket error           | ~2.3 × 10⁻¹³ px | ~2.3 × 10⁻¹³ px | unchanged (already correct) |
| Head/neck landmark     | unavailable     | unavailable     | not claimed                 |
| Shoulder landmark      | unavailable     | unavailable     | not claimed                 |
| Elbow landmark         | unavailable     | unavailable     | not claimed                 |
| Wrist landmark         | unavailable     | unavailable     | not claimed                 |
| Hip landmark           | unavailable     | unavailable     | not claimed                 |
| Knee landmark          | unavailable     | unavailable     | not claimed                 |
| Ankle landmark         | unavailable     | unavailable     | not claimed                 |
| Silhouette IoU, OpenAI | 0.5086          | 0.5086          | none                        |
| Silhouette IoU, Gemini | 0.4620          | 0.4620          | none                        |
| Visible seams          | present         | present         | no visual improvement       |

Master landmarks are inferred, so numeric landmark error is deliberately marked unavailable.

## 14. Before/after visual evidence

- `master-reconstruction-openai.png`
- `master-reconstruction-gemini.png`
- `anatomy-overlay-openai.png`
- `anatomy-overlay-gemini.png`
- `before-after-openai.png`
- `before-after-gemini.png`
- `comparison-contact-sheet.png`
- `joint-stress-openai.png`
- `joint-stress-gemini.png`
- `studio-screenshots/connector-editor.png`

## 15. Joint and seam evaluation

- Sockets remain aligned through all 192 frames.
- Seams remain visually unchanged.
- The master reconstruction shows the neutral assembly is not a close silhouette match.
- The shoulder, wrist-band, shoe, Gemini arm and clothing defects cannot be repaired by moving
  sockets alone.

## 16. Full animation evaluation

No new animation geometry was rendered because registration did not change. The versioned
`openai-calibrated.mp4` and `gemini-calibrated.mp4` are the Stage 2B.2 calibrated-geometry outputs
under the Stage 2B.3 anatomical rig IDs. They are not presented as a visual improvement.

The required before/after Stage 2B.3 videos and provider side-by-side were **not produced** because
there is no registration change to compare. Producing them would imply a visual improvement that
the source artwork does not support.

## 17. Remaining artwork limitations

**ARTWORK-BLOCKED:**

- OpenAI shoulder socket art;
- OpenAI wrist-band duplication;
- OpenAI shoe proportion;
- Gemini upper-arm tube and shoulder construction;
- Gemini turban band/eye geometry;
- both characters' clothing continuity and neutral silhouette.

**Partial code-fixable:**

- facial/accessory pivots;
- dhoti edge cropping;
- occlusion order;
- editor-based landmark annotation.

## 18. Reusability verification

The versioned anatomical rigs preserve the Stage 2B.2 connector graph and the Stage 2B.1 motion
configuration. The same solver remains provider-independent. No API calls or per-frame offsets
were introduced.

## 19. API spending confirmation

**$0.00 spent. Zero paid API calls. Zero image-generation calls. Zero video-generation calls.**
No authorization was created or activated.

## 20. Automated test results

| Command             | Result                          |
| ------------------- | ------------------------------- |
| `pnpm format:check` | PASS                            |
| `pnpm lint`         | PASS                            |
| `pnpm typecheck`    | PASS                            |
| `pnpm test`         | PASS — **354 tests / 53 files** |
| `pnpm test:browser` | PASS — **59 tests**             |
| `pnpm build`        | PASS                            |
| Paid API calls      | **0**                           |

## 21. Actual MP4 and screenshot paths

- `outputs/folk-provider-benchmark/stage-2b3/openai-calibrated.mp4`
- `outputs/folk-provider-benchmark/stage-2b3/gemini-calibrated.mp4`

These are the Stage 2B.2 calibrated-geometry animations, versioned under the Stage 2B.3 rig IDs.
They are not a new visual improvement.

## 22. Performance

The reconstruction evaluator completed both packs and produced the master/reconstruction panels and
IoU values. Rendering performance is unchanged from the Stage 2B.1/2B.2 local canvas pipeline.

## 23. Full commit hashes

| Purpose                         | Commit                       |
| ------------------------------- | ---------------------------- |
| Starting point                  | `29da208`                    |
| Anatomical landmark contract    | `de8cf5b`                    |
| Master reconstruction evaluator | `7b75d26`                    |
| Stage 2B.3 calibration evidence | `259174d`                    |
| This report                     | final HEAD after this commit |

## 24. Final HEAD and working-tree status

The report commit is the final HEAD. Working tree is clean. No push was performed.

## 25. Final acceptance verdict

| Category                     | Verdict                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Connector solver             | **PASS**                                                                                |
| Master-image registration    | **FAIL / ARTWORK-BLOCKED**                                                              |
| Anatomical landmark accuracy | **PARTIAL** — inferred landmarks only; not validated for improvement                    |
| Neutral-pose reconstruction  | **PARTIAL** — evidence produced; silhouette not close                                   |
| Joint appearance             | **PARTIAL** — sockets correct, visible seams remain                                     |
| Studio calibration editor    | **FAIL** — existing connector editor retained; master-overlay/landmark editor not added |
| Animation reusability        | **PASS**                                                                                |
| Existing regressions         | **PASS**                                                                                |
| Artistic quality             | **PENDING USER REVIEW**                                                                 |

Recommended next action: stop adding calibration complexity to these sprites. Commission a
source-art repair pass for the shoulder socket, wrist-band, shoe, Gemini arm and facial/turban
geometry, then recalibrate against the new artwork. Do not begin a full film from the current packs.
