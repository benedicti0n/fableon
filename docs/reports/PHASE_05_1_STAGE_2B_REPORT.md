# Phase 5.1 Stage 2B — Execution Report

**Date:** 2026-11-10  
**Starting HEAD:** `ad9d0b4`  
**Experiment:** `phase-05.1-stage-2b`  
**Paid Stage 2B calls:** **0**  
**Status:** offline engineering complete; **provider generation blocked by pending authorization**

## 1. Executive summary

Stage 2B successfully replaced the Stage 2A four-part diagnostic with a real 31-part rig contract,
joint-overlap metadata, seam-aware draw order, pack validation and a configuration-driven
eight-second animation renderer.

No Stage 2B provider artwork was requested. The two Stage 2B authorizations exist only as
**pending** records with `approvedBy: null`; therefore no paid call, no Stage 2B pack and no
provider video can be claimed. The Stage 2A artwork and ledgers remain intact.

The offline deliverable is ready to resume from the pending approval without repeating the joint,
animation or renderer work.

## 2. Git

| Purpose                                                | Commit                       |
| ------------------------------------------------------ | ---------------------------- |
| Starting point                                         | `ad9d0b4`                    |
| Joint overlap and seam concealment                     | `ec1329f`                    |
| Prepare-only authorization and Stage 2B sheet plans    | `b936f9a`                    |
| Renderer, comparison and rig workspace                 | `c29da67`                    |
| Preparation reports and pending-authorization evidence | this docs commit             |
| This final report                                      | final HEAD after this commit |

No push was performed.

## 3. Initial Stage 2A asset inventory

| Asset                         | OpenAI                                    | Gemini                                    |
| ----------------------------- | ----------------------------------------- | ----------------------------------------- |
| Master                        | original transparent PNG, 1536×1024       | opaque JPEG, 2528×1696                    |
| Extracted parts               | head, torso, near upper arm, near forearm | head, torso, near upper arm, near forearm |
| Images returned               | 5                                         | 2 (master + four-part sheet)              |
| Usable assets                 | 5                                         | 5                                         |
| Stage 2A requests used        | 5 / 6                                     | 4 / 6                                     |
| Stage 2A conservative spend   | $0.244610                                 | $0.205989                                 |
| Stage 2A completed-usage cost | $0.244610                                 | $0.103410                                 |
| Failed-attempt hold           | $0.000000                                 | $0.102579                                 |

Stage 2A combined conservative spend: **$0.450599**. Completed successful usage:
**$0.348020**. All original files, requests, responses, ledgers and failed-attempt evidence are
preserved.

## 4. Engineering changes

- Added `FolkJoint` metadata to `@fableon/folk-motion`.
- Added joint kinds, parent binding, hidden-overlap rectangles, occlusion ownership, optional
  cover nodes, rotation limits and diagnostics.
- Added `ARTISAN_V2_RIG` with 31 parts and 15 joints.
- Added near/far elbow cover nodes.
- Added seam-aware draw order for shoulders, elbows, wrists, hips, knees, ankles and neck.
- Added pack validation for required slots, hashes, hierarchy, occlusion order, cover order and
  overlap bounds.
- Added a 31-slot provider generation plan: four sheets per provider.
- Added a prepare-only authorization CLI. Activation now requires an explicit `--activate` flag.
- Added a deterministic, configuration-driven 192-frame animation module.
- Added a local canvas/FFmpeg renderer that refuses incomplete packs and makes no provider calls.
- Added a Stage 2B Studio status page and local video-serving route.
- Added Stage 2B comparison and render scripts.
- Updated browser tests for real Stage 2A costs and Stage 2B UI state.

## 5. Joint-concealment improvements

The old rig drew the upper arm above the torso, producing the Stage 2A oval shoulder. The v2 rig
draws the torso above the upper-arm top, shifts the arm outward for registration, expands hidden
overlap around the elbow pivot, and adds real elbow-cover nodes to the final pack contract.

`before-after-elbow.png` compares old and new layering using only the preserved Stage 2A artwork at
0°, 15°, 30°, 45°, 60°, 75° and 90° for both providers.

Observed:

- The shoulder oval is removed in both providers.
- OpenAI’s forearm connects through the expanded overlap without a transparent elbow gap through
  90°, though the sleeve is thinner and still visibly assembled.
- Gemini retains the cleaner sheet-derived elbow seam; its upper arm is still small relative to
  the torso.
- The final cover artwork is part of the generation contract; no vector circle was fabricated.

This is an engineering diagnostic, not artistic approval.

## 6. Provider-generation attempts

**Stage 2B paid attempts: 0.**

Eight free estimate requests were made through the server estimate endpoint:

| Sheet     |        OpenAI |        Gemini |
| --------- | ------------: | ------------: |
| Head      |     $0.327565 |    $0.0545025 |
| Body      |     $0.327555 |    $0.0544980 |
| Arms      |     $0.363425 |    $0.0561885 |
| Legs      |     $0.291620 |    $0.0527910 |
| **Total** | **$1.310165** | **$0.217980** |

Combined estimate: **$1.528145**. No image was returned and no provider request was submitted.

## 7. Final part inventory per provider

| Provider | Master | Stage 2A parts preserved | Stage 2B parts | 31-part pack  |
| -------- | ------ | -----------------------: | -------------: | ------------- |
| OpenAI   | yes    |                        4 |              0 | not generated |
| Gemini   | yes    |                        4 |              0 | not generated |

The complete 31-slot contract is documented in `CHARACTER_PART_INVENTORY.md`. The four Stage 2A
parts per provider remain available as identity references and fallbacks; they are not a complete
Stage 2B pack.

## 8. Missing or rejected components

Every Stage 2B contract part is currently missing because generation is not authorized:

- head, turban, turban tail, moustache, earring, eye, eyelid, brow, neck;
- torso, sash, necklace, shoulder sash, pelvis;
- near/far upper arms, forearms, elbow covers, open/grip/far hands;
- near/far thighs, shins, feet, dhoti panels.

No Stage 2B output has been rejected, because no Stage 2B output exists. Stage 2A’s two failed
Gemini attempts remain preserved and are not reclassified.

## 9. Rig compatibility

| Check                                    | Result |
| ---------------------------------------- | ------ |
| 31 required slots resolve                | PASS   |
| 15 joint contracts validate              | PASS   |
| Parent/child hierarchy and draw order    | PASS   |
| Rotation limits                          | PASS   |
| Hand open/grip exclusivity               | PASS   |
| Hip/knee/ankle chain                     | PASS   |
| Neck/head blink and rotation             | PASS   |
| Pack validator rejects invalid manifests | PASS   |
| Renderer rejects incomplete packs        | PASS   |
| Existing horse/cart rigs unchanged       | PASS   |

Provider compatibility cannot be certified until the real sheets are generated and registered.
The Stage 2A four-part diagnostic is not a complete pack.

## 10. Eight-second animation results

**No provider video exists.** The renderer was verified with a synthetic engineering fixture only:

- 1280×720;
- 24 fps;
- 192 frames;
- 8.000 seconds;
- H.264 MP4;
- deterministic frame hashes;
- ffprobe and full decode pass;
- zero provider calls.

The fixture is excluded from the provider comparison. Configuration phases are implemented:
walk 0–2.5 s, reach 2.5–4.5 s, grip 4.5–6.0 s, release/idle 6.0–8.0 s.

## 11. Reusability test results

The same rig and engine accept `STAGE2B_VARIATION_CONFIG`, which changes:

- walk start and speed;
- cycle timing and bob;
- reach target and timing;
- arm return timing;
- head orientation;
- blink cadence.

Automated tests confirm the variation changes motion without editing TypeScript animation code and
without provider calls. A real reused-rig video cannot be rendered until a provider pack exists.
Incremental provider API cost for reuse is designed to be **$0**.

## 12. OpenAI vs Gemini quality comparison

**Not executed for Stage 2B artwork.** No Stage 2B image exists.

Stage 2A evidence remains the only quality reference:

| Criterion             | OpenAI Stage 2A                                         | Gemini Stage 2A                              |
| --------------------- | ------------------------------------------------------- | -------------------------------------------- |
| Master                | strong front three-quarter folk figure                  | strong side-profile folk figure              |
| Native alpha          | yes                                                     | no; chroma repair required                   |
| Identity across parts | coherent palette/motifs, torso lacked connected sleeves | coherent palette, small extracted arm pieces |
| Elbow seam            | required pivot repair; visible cuff seam                | cleaner sheet-derived seam                   |
| Cost                  | $0.048922 per usable asset                              | $0.041198 ledger / $0.020682 usage           |
| Main risk             | per-part construction mismatch                          | chroma/despill and small crops               |

No artistic winner is declared before real Stage 2B sheets exist.

## 13. Actual cost breakdown

| Metric                               |    OpenAI |    Gemini |  Combined |
| ------------------------------------ | --------: | --------: | --------: |
| Stage 2A conservative spend          | $0.244610 | $0.205989 | $0.450599 |
| Stage 2B spend to date               | $0.000000 | $0.000000 | $0.000000 |
| Active remaining Stage 2A budget     | $1.255390 | $0.794011 | $2.049401 |
| Stage 2B pending ceiling             | $4.000000 | $3.000000 | $7.000000 |
| Projected if 2B executes at estimate |         — |         — | $1.978744 |

No provider-reported billed amount is available. Stage 2A uses conservative holds for the two
Gemini failures; the $0.102579 difference is not treated as refunded money.

## 14. Stage 2A + 2B cumulative cost

| Metric                                 |     Value |
| -------------------------------------- | --------: |
| Stage 2A completed-usage cost          | $0.348020 |
| Stage 2A conservative spend            | $0.450599 |
| Stage 2B completed-usage cost          | $0.000000 |
| Stage 2B conservative spend            | $0.000000 |
| Cumulative completed-usage cost        | $0.348020 |
| Cumulative conservative spend          | $0.450599 |
| Pending Stage 2B ceiling (not granted) | $7.000000 |

Projected unit costs if Stage 2B executes at estimate:

- OpenAI: $1.554775 total / 31 parts = **$0.050154 per part**.
- Gemini: $0.423969 total / 31 parts = **$0.013676 per part**.

These are projections, not achieved costs.

## 15. Full test results

| Command                          | Result                      |
| -------------------------------- | --------------------------- |
| `pnpm format:check`              | PASS                        |
| `pnpm lint`                      | PASS                        |
| `pnpm typecheck`                 | PASS                        |
| `pnpm test`                      | PASS — 331 tests / 49 files |
| `pnpm test:browser`              | PASS — 58 tests             |
| `pnpm build`                     | PASS                        |
| Paid provider calls during tests | 0                           |

The new coverage includes joint metadata, overlap bounds, parent hierarchy, rotation limits,
hand swaps, config-driven motion, deterministic frames, two-provider pack contracts, incomplete
pack rejection, renderer validation and authorization boundaries.

## 16. Screenshots and video paths

Existing Stage 2B preparation artifacts:

- `docs/benchmarks/phase-05.1/stage-2b/before-after-elbow.png`
- `docs/benchmarks/phase-05.1/stage-2b/before-after-elbow.json`
- `docs/benchmarks/phase-05.1/stage-2b/PREPARATION_REPORT.md`
- `docs/benchmarks/phase-05.1/stage-2b/CHARACTER_PART_INVENTORY.md`
- `docs/benchmarks/phase-05.1/stage-2b/JOINT_REPAIR_REPORT.md`
- `docs/benchmarks/phase-05.1/stage-2b/RIGGING_EVALUATION.md`
- `docs/benchmarks/phase-05.1/stage-2b/QUALITY_REVIEW.md`
- `docs/benchmarks/phase-05.1/stage-2b/PROVIDER_COST_COMPARISON.md`
- `docs/benchmarks/phase-05.1/stage-2b/cost-summary.json`
- `docs/benchmarks/phase-05.1/stage-2b/authorizations-pending.json`

No Stage 2B provider video, pose comparison or contact sheet exists yet. No synthetic provider
placeholder is claimed.

## 17. Remaining problems

1. **No Stage 2B approval.** Both records are pending; no generation is permitted.
2. **No provider parts.** The 31-part packs are contracts, not artwork.
3. **Unvalidated sheet extraction.** The grid/pivot heuristic has not been run on provider output.
4. **No production calibration.** Real scale, pivot and clothing-overlap repair remain.
5. **No artistic review.** Shoulder, elbow, wrist, hip, knee, face and clothing continuity are
   unmeasured for Stage 2B.
6. **No provider video.** The eight-second tests exist only as renderer/fixture verification.
7. **No invoice.** Stage 2A Gemini holds remain conservative; Stage 2B spend is zero.

## 18. Full Git commit hashes

| Purpose                                    | Commit                       |
| ------------------------------------------ | ---------------------------- |
| Starting point                             | `ad9d0b4`                    |
| Joint overlap and seam concealment         | `ec1329f`                    |
| Prepare-only authorization and sheet plans | `b936f9a`                    |
| Renderer, comparison and rig workspace     | `c29da67`                    |
| Preparation reports and pending evidence   | this docs commit             |
| Final report                               | final HEAD after this commit |

## 19. Recommendation for full-film production

**Do not begin full-film production.** The 31-part contract and renderer are ready, but no Stage 2B
artwork has been generated or artistically reviewed.

Recommendation:

1. Approve the two Stage 2B pending records with the exact caps and request counts below.
2. Generate the four sheets per provider, with no automatic retries.
3. Register and validate the 31-part packs.
4. Render both eight-second tests and the variation.
5. Review shoulder, elbow, wrist, hip/knee and grip contact at the specified poses.
6. Only then decide whether either provider earns a full-film budget.

Do not approve a full library or film from the Stage 2A/2B preparation evidence alone.

## 20. Final authorization state

| Provider | Authorization                 |       Cap | Requests | Outputs | Status          |
| -------- | ----------------------------- | --------: | -------: | ------: | --------------- |
| OpenAI   | `auth_1794315751164_678c8d79` |     $4.00 |       10 |       1 | **pending**     |
| Gemini   | `auth_1794315751766_c1eef16a` |     $3.00 |       10 |       1 | **pending**     |
| Combined | —                             | **$7.00** |        — |       — | **not granted** |

Approval actor: none. Expiration: `2026-11-13T13:02:30.000Z` for both. Rerunning the CLI with the
same limits returns `pending-existing`; it does not duplicate or activate anything.

The Stage 2A authorizations are a different experiment and must not be used for Stage 2B.
