# Phase 5.1 Stage 2C.5 — Artwork Separation Report

**Date:** 2026-11-11  
**Starting HEAD:** `7d49448`  
**Scope:** precision mask editing, near-side paid-art separation, independent wrist/ankle validation  
**New paid API spend:** **$0.00**  
**Final verdict:** **PARTIAL** — technical separation succeeds; grip-pose artwork and some visual parity remain blocked

## 1. Starting Git HEAD

| Item                  | Value              |
| --------------------- | ------------------ |
| Starting commit       | `7d49448`          |
| Starting tree         | clean              |
| Stage 2C.2 paid usage | $0.189908 combined |
| Stage 2C.5 paid calls | **0**              |
| Stage 2C.5 new spend  | **$0.00**          |

## 2. Asset inventory

| Provider | Sheet | Real format | Dimensions | SHA-256                                                            |
| -------- | ----- | ----------- | ---------: | ------------------------------------------------------------------ |
| OpenAI   | arm   | PNG         |  1536×1024 | `9186a76dafa97379ad794fef70b44803474a77c150db9f7e352d32751e9a87bb` |
| OpenAI   | leg   | PNG         |  1536×1024 | `ac2a8e9d919f6b1d5bbc9aa9b082c8a047af184e6e7711b2ed4494b0e55a4404` |
| Gemini   | arm   | JPEG        |  2528×1696 | `838a950e309fe9f22c1530a5705dd933e1fb1d54413cae3f7b3a8fe1fe1455d8` |
| Gemini   | leg   | JPEG        |  2528×1696 | `66c2344e54bb2acd9c7fd41320da9af389b6736f17125038449743b823038156` |

The Gemini files are JPEG bytes behind historical `.png` names. Format detection uses file signatures.

The full source topology is documented in `docs/benchmarks/phase-05.1/stage-2c5/SOURCE_ART_TOPOLOGY_AUDIT.md`.

## 3. Existing baked-hand / baked-foot problem

Stage 2C.2 painted the hand into the forearm sheet and the foot/shoe into the shin sheet. Stage 2C.4 hid the independent `handOpen`, `handGrip` and `nearFoot` nodes to avoid duplicate art. Consequently:

- elbow motion worked, but wrist motion did not;
- knee motion worked, but ankle motion did not;
- the neutral hand remained wherever the baked forearm registration placed it.

Stage 2C.5 separates both regions at audited source Y positions.

## 4. Exact original source structure

| Provider | Part region    | Source cell |              Bounds |      Split |
| -------- | -------------- | ----------- | ------------------: | ---------: |
| OpenAI   | upper arm      | left arm    |    221,85 · 338×855 |          — |
| OpenAI   | forearm + hand | right arm   |   1029,84 · 279×862 |  y **612** |
| OpenAI   | thigh + dhoti  | left leg    |    104,19 · 432×981 |          — |
| OpenAI   | shin + foot    | right leg   |   968,110 · 430×879 |  y **825** |
| Gemini   | upper arm      | left arm    |   494,239 · 286×646 |          — |
| Gemini   | forearm + hand | right arm   |  1774,621 · 339×833 | y **1166** |
| Gemini   | thigh + dhoti  | left leg    |  341,211 · 638×1306 |          — |
| Gemini   | shin + foot    | right leg   | 1706,221 · 431×1266 | y **1341** |

The OpenAI wrist split was moved from the initial 578 estimate to **612**, below the gold band, so the band is owned only by the forearm and not duplicated on the hand. The Gemini bangle stack is owned by the forearm; the hand begins below the bangle region.

## 5. Mask editor features

Implemented at `/studio/folk/rigs/stage-2c`:

- provider and anatomical-part selectors;
- source sheet with provider/hash/dimensions;
- add/erase brush;
- source-pixel diameter and hardness/feather;
- zoom and pan;
- undo/redo;
- mask visibility and source-cell/split guides;
- numeric source coordinates;
- save revision, reload latest or selected revision, revert;
- import external mask with source-dimension validation;
- transparent extraction preview;
- review-status display.

Masks are stored in source-image coordinates. A stroke at high zoom maps back through the viewport, zoom and pan to the intended source pixels.

## 6. Browser validation

`tests/browser/stage-2c5.spec.ts` passed. It loaded the real OpenAI arm sheet, selected `handOpen`, painted, erased, undid/redid, saved revision 1, previewed the extraction, reloaded, and confirmed revision 1 persisted with review status pending.

Screenshot:

`docs/benchmarks/phase-05.1/stage-2c5/studio-screenshots/mask-editor.png`

The test uses the isolated Playwright `FABLEON_DATA_DIR`. Its revision is not production artwork approval.

## 7. Mask revisions

Twelve production seed revisions (six per provider) are stored under `outputs/folk-provider-benchmark/stage-2c5/<provider>/masks/` with source hash, mask hash, full dimensions and conservative statuses. The complete inventory is `MASK_REVISION_INVENTORY.md`; the raw metadata is `candidate-inventory.json`.

Status for all seed masks:

- technical validity: **PASS**
- extraction correctness: **NEEDS REVIEW**
- articulation compatibility: **PASS for wrist/ankle geometry, PARTIAL overall**
- artistic approval: **PENDING**

## 8. OpenAI arm results

- Upper arm: 338×855 source candidate.
- Forearm: 255×528, split at y 612.
- Hand: 241×334, starts at y 612.
- Forearm scale to master elbow–wrist: `0.28966`.
- Hand target height: 96.75 px.
- Source RGB mismatches: **0**.
- Green-dominant opaque pixels: **0**.
- Wrist rotation independently changes the hand matrix: **PASS**.
- Grip-pose hand: **ARTWORK-BLOCKED**.

## 9. OpenAI leg results

- Thigh: 432×981.
- Shin: 359×715, split at y 825.
- Foot/shoe: 430×164, starts at y 825.
- Shin scale to master knee–ankle: `0.23896`.
- Source RGB mismatches: **0**.
- Duplicate wrist band, dhoti border and shoe: avoided by ownership rules and hidden duplicate nodes.
- Ankle rotation independently changes the foot matrix: **PASS**.

## 10. Gemini arm results

- Upper arm: 286×646.
- Forearm: 258×545, split at y 1166.
- Hand: 223×288.
- Forearm scale: `0.27796`.
- Source RGB mismatches: **0**.
- Green-dominant opaque pixels: **0**.
- Wrist rotation: **PASS**.
- Visual quality: **PARTIAL** — the hand is source-correct but small, and the geometric sleeve language is not matched to the OpenAI art (correctly, because it is Gemini artwork).
- Grip-pose hand: **ARTWORK-BLOCKED**.

## 11. Gemini leg results

- Thigh: 638×1306.
- Shin: 431×1120, split at y 1341.
- Foot: 200×146.
- Shin scale: `0.15122`.
- Target foot size: about 30.24×22.08 master px.
- Source RGB mismatches: **0**.
- Ankle rotation: **PASS** technically.
- Visual quality: **PARTIAL** — the near foot is very small compared with the far-side Stage 2B foot and needs artistic review or provider-matched replacement.

## 12. Independent wrist / ankle validation

`apps/web/lib/providers/stage2c5-rig.test.ts` verifies:

- rotating `handOpen` leaves `nearForearm` matrix unchanged while the hand matrix changes;
- rotating `nearFoot` leaves `nearShin` matrix unchanged while the foot matrix changes;
- the existing master pivots and segment lengths are used.

The production pose and video renders exercise those separate nodes. The hand and foot are no longer baked.

**Grip pose remains blocked** because the paid sheets contain only an open hand.

## 13. Connector measurements

Target pivots are unchanged from the existing `ARTISAN_RIG`:

| Joint    | Master coordinate | Stage 2C.5 target | Separation |
| -------- | ----------------- | ----------------: | ---------: |
| shoulder | 508,470           |           508,470 |       0 px |
| elbow    | 532,610           |           532,610 |       0 px |
| wrist    | 548,742           |           548,742 |       0 px |
| hip      | 470,670           |           470,670 |       0 px |
| knee     | 476,824           |           476,824 |       0 px |
| ankle    | 480,978           |           480,978 |       0 px |

Master segment lengths remain:

- upper arm 142.04;
- forearm 132.97;
- thigh 154.12;
- shin 154.05.

The connector solver was not modified. Zero connector error is not used as a claim of visual quality.

## 14. Neutral reconstruction measurements

The matched Stage 2C.4/2C.5 neutral contact sheet is `before-after-comparison.png`. Both use the same 640×360 camera and film config.

- The Stage 2C.4 hand sat higher because it was baked into the forearm.
- Stage 2C.5 attaches the hand at the master wrist pivot and the foot at the master ankle pivot.
- Source RGB is preserved exactly in all visible candidate pixels: **0 mismatches**.
- A new full-master silhouette IoU was not computed. The historical Stage 2B.3 baseline remains **0.5086 OpenAI / 0.4620 Gemini**.
- No numerical improvement is claimed from zero connector error.

Full measurements: `measurements.json`.

## 15. Joint stress-test results

Arm poses: neutral, shoulder lift, elbow 30/60/90, wrist out, wrist in, open hand.  
Leg poses: neutral, hip flexion, knee flexion, knee extension, ankle up/down, heel, toe-off.

Evidence:

- `openai-arm-poses.png`
- `gemini-arm-poses.png`
- `openai-leg-poses.png`
- `gemini-leg-poses.png`

The wrist and ankle visibly move as separate sprites. The elbow and knee remain connected through the existing rig.

## 16. Before/after visual evidence

`before-after-comparison.png` shows Stage 2C.4 baked-hand neutral versus Stage 2C.5 separated-hand neutral for both providers.

Observations:

- OpenAI: the separated hand hangs from the wrist rather than the old forearm registration; the sleeve and cuff remain intact.
- Gemini: the hand drops to the wrist; the bangle remains on the forearm; green background is removed.
- The near-side paid parts still differ visually from the far-side Stage 2B parts.
- No artistic approval is claimed.

## 17. Valid MP4 outputs

Four production-rendered 1280×720, 24 FPS, 48-frame, 2-second H.264 videos:

| Provider | Arm                                                                        | Leg                                                                        |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| OpenAI   | `outputs/folk-provider-benchmark/stage-2c5/openai/arm-articulation-2s.mp4` | `outputs/folk-provider-benchmark/stage-2c5/openai/leg-articulation-2s.mp4` |
| Gemini   | `outputs/folk-provider-benchmark/stage-2c5/gemini/arm-articulation-2s.mp4` | `outputs/folk-provider-benchmark/stage-2c5/gemini/leg-articulation-2s.mp4` |

All four pass FFprobe (1280×720, 24/1, 48 frames, 2.000 s) and full FFmpeg decode. Hashes are in `video-report.json`.

## 18. Parts requiring further artwork generation

1. **Grip hand** — closed hand for each provider, wrist-top pivot, provider-matched palette and outline. **ARTWORK-BLOCKED** in this phase.
2. **Gemini foot** — source-matched foot/shoe with a scale consistent with the near leg and far foot.
3. **Far-side paid parity** — if the whole puppet is to use one provider source, the far arm/leg still need paid Stage 2C-style separation.
4. **Shoulder/elbow seam review** — no new artwork required until an artist reviews the current overlap.

## 19. Additional API spending

**$0.00.**

- OpenAI calls: 0
- Gemini calls: 0
- Authorization activations: 0
- Images generated: 0
- AI video generated: 0

Existing Stage 2C.2 usage records remain unchanged: $0.189908 combined usage-derived cost.

## 20. Full automated test results

| Command                 | Result                          |
| ----------------------- | ------------------------------- |
| `pnpm format:check`     | PASS                            |
| `pnpm lint`             | PASS, zero warnings             |
| `pnpm typecheck`        | PASS                            |
| `pnpm test`             | PASS — **376 tests / 58 files** |
| `pnpm build`            | PASS                            |
| `pnpm test:browser`     | PASS — **60 tests**             |
| Stage 2C.5 browser test | PASS — save, reload, preview    |
| Paid calls in tests     | **0**                           |

## 21. Full Git commits

| Purpose                                         | Commit                           |
| ----------------------------------------------- | -------------------------------- |
| Starting point                                  | `7d49448`                        |
| Multi-node production pose rendering            | `6f7fb7e`                        |
| Persistent Stage 2C.5 mask editor + tests       | `4e753e1`                        |
| Separated-part preparation/render/video harness | `0ea3772`                        |
| Stage 2C.5 benchmark evidence                   | `f9febbe`                        |
| This report                                     | final report commit (final HEAD) |

## 22. Final HEAD and working-tree status

The final HEAD is the commit containing this report. The working tree is clean after that commit. No push was performed.

## 23. Final GO / PARTIAL / ARTWORK-BLOCKED verdict

**PARTIAL.**

- Mask editor: **PASS**
- Source fidelity: **PASS**
- Independent wrist: **PASS**
- Independent ankle: **PASS**
- OpenAI separation: **PASS technically**, visual review pending
- Gemini separation: **PARTIAL**, mainly the tiny near foot and style mismatch
- Grip-pose hand: **ARTWORK-BLOCKED**
- Full-master neutral IoU: **not computed**; historical baseline remains
- Artistic approval: **PENDING**

The existing paid artwork can become a reusable articulated puppet for the near arm and near leg, with independent wrist and ankle nodes, without new generation. It is not yet a production-ready full character: grip-pose art, Gemini foot parity, far-side provider parity and artistic seam review remain outstanding. No additional paid generation is recommended until the user reviews this candidate and the exact missing-part specifications above.
