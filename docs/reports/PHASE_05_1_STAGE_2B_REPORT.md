# Phase 5.1 Stage 2B — Execution Report

**Date:** 2026-11-10  
**Starting HEAD:** `ad9d0b4`  
**Experiment:** `phase-05.1-stage-2b`  
**Paid Stage 2B calls:** **9** (4 OpenAI, 5 Gemini)  
**Stage 2B completed-usage cost:** **$0.676329**  
**Outcome:** both providers produced validated 31-part packs and eight-second walk–reach–grip tests. OpenAI is the stronger candidate; Gemini remains conditional and needs further repair. Neither is approved for a full film.

## 1. Executive summary

Stage 2B moved beyond the four-part Stage 2A diagnostic to a complete 31-part artisan rig per
provider, with explicit joint metadata, seam-aware draw order, elbow/joint covers, pack
validation, deterministic animation and local video rendering.

The experiment executed nine paid requests inside the approved **$7.00** Stage 2B ceiling:

- OpenAI: 4 sheet requests, 4 images, 31-part pack, **$0.403720**.
- Gemini: 5 sheet requests, 5 images, one rejected arm sheet and one counted repair, 31-part pack,
  **$0.272609**.

Both packs validate and both render at 1280×720, 24 fps, 192 frames, **8.000 seconds**, with the
same background, camera, prop, motion configuration and renderer. Both reuse the rig for a second
motion configuration with **zero additional provider calls**.

OpenAI is the stronger, more coherent character. Gemini is cheaper and technically complete, but
its arms, face and clothing required substantially more local repair and still read as more
assembled. Neither pack is production-ready for a full film.

## 2. Starting and final Git HEAD

| Purpose                                             | Commit                       |
| --------------------------------------------------- | ---------------------------- |
| Starting point                                      | `ad9d0b4`                    |
| Joint overlap and seam concealment                  | `ec1329f`                    |
| Prepare-only authorization and Stage 2B sheet plans | `b936f9a`                    |
| Renderer, comparison and rig workspace              | `c29da67`                    |
| Stage 2B pack repair and animation completion       | `5e9e402`                    |
| Landing-preview frame clamp                         | `7afd7a4`                    |
| Provider packs, renders and quality evidence        | `69f442f`                    |
| This execution report                               | final HEAD after this commit |

No push was performed.

## 3. Initial Stage 2A asset inventory

| Asset                         | OpenAI                                    | Gemini                                    |
| ----------------------------- | ----------------------------------------- | ----------------------------------------- |
| Master                        | transparent PNG 1536×1024                 | opaque JPEG 2528×1696                     |
| Preserved Stage 2A parts      | head, torso, near upper arm, near forearm | head, torso, near upper arm, near forearm |
| Stage 2A images returned      | 5                                         | 2                                         |
| Stage 2A requests used        | 5 / 6                                     | 4 / 6                                     |
| Stage 2A conservative spend   | $0.244610                                 | $0.205989                                 |
| Stage 2A completed-usage cost | $0.244610                                 | $0.103410                                 |
| Stage 2A failed-attempt hold  | $0.000000                                 | $0.102579                                 |

The Stage 2A masters, parts, ledgers, requests, failures and videos remain preserved.

## 4. Engineering changes

- Extended `@fableon/folk-motion` with joint metadata: kind, parent, hidden-overlap rectangle,
  occlusion ownership, optional cover node, rotation limits and diagnostics.
- Added `ARTISAN_V2_RIG`: 31 parts, 15 joints, near/far elbow covers, seam-aware draw order.
- Added pack validation: required slots, hashes, hierarchy, overlap bounds, occlusion order, cover
  order and limits.
- Added a four-sheet-per-provider generation plan covering every rig slot exactly once.
- Added a prepare-only authorization CLI; activation requires an explicit `--activate` flag.
- Added deterministic, configuration-driven 192-frame animation with a reusable variation config.
- Added a local canvas/FFmpeg renderer that refuses incomplete packs and makes no provider calls.
- Added Stage 2B Studio status and local video-serving routes.
- Added comparison scripts for side-by-side MP4s and contact sheets.
- Fixed the landing-preview playback frame clamp discovered during the browser suite.

## 5. Joint-concealment improvements

The Stage 2A oval shoulder and visible elbow hinge were addressed with:

- torso-over-upper-arm layering for the shoulder;
- expanded hidden overlap around the elbow pivot;
- real elbow-cover sprites in both packs;
- forearm/hand above upper arm; dhoti above thigh; necklace above neck;
- joint validation before rendering.

The `before-after-elbow.png` diagnostic used only Stage 2A artwork and showed the mechanism before
paid generation. The final packs then used the real cover sprites.

Residual defects remain: the shoulder and elbow seams are still visible, and the characters read
as cutout puppets. The seam system works technically; it does not fully solve artistic cohesion.

## 6. Provider-generation attempts

| #   | Provider | Request     | Result                              | Reconciled |
| --- | -------- | ----------- | ----------------------------------- | ---------: |
| 1   | OpenAI   | head sheet  | success                             |  $0.101935 |
| 2   | OpenAI   | body sheet  | success                             |  $0.101250 |
| 3   | OpenAI   | arms sheet  | success                             |  $0.103245 |
| 4   | OpenAI   | legs sheet  | success                             |  $0.097290 |
| 5   | Gemini   | head sheet  | success                             |  $0.054162 |
| 6   | Gemini   | body sheet  | success                             |  $0.054159 |
| 7   | Gemini   | arms sheet  | HTTP success, artistically rejected |  $0.055848 |
| 8   | Gemini   | legs sheet  | success                             |  $0.052458 |
| 9   | Gemini   | arms repair | success, accepted                   |  $0.055982 |

No automatic retries. The Gemini repair was a manual decision after the original arms sheet
merged upper arms and bent forearms into the forearm cells.

## 7. Final part inventory per provider

| Provider |   Parts | Pack                | Rejected sheets | Repair sheets |
| -------- | ------: | ------------------- | --------------: | ------------: |
| OpenAI   | 31 / 31 | `artisan_openai_v2` |               0 |             0 |
| Gemini   | 31 / 31 | `artisan_gemini_v2` |               1 |             1 |

Both packs include head, face and turban, torso/sash/pelvis, both arms and hands, elbow covers,
both legs, feet, dhoti panels and neck. The full inventory is in `CHARACTER_PART_INVENTORY.md`.

## 8. Missing or rejected components

- Missing slots: **none** in either pack.
- Rejected output: Gemini original arms sheet (`stage2b-gemini-arms`) — complete bent arms instead
  of separate straight forearms. Preserved, not deleted.
- Accepted repair: `stage2b-gemini-arms-repair1`.
- Local rejections/repairs: Gemini torso shoulder blob filled; Gemini legs split at knee/shin;
  Gemini thighs recolored to cloth; Gemini shin edges cropped; Gemini turban lifted, brow reduced,
  facial pivots moved; OpenAI facial pivots moved; both packs re-registered.
- No silent regeneration occurred.

## 9. Rig compatibility

| Check                   | OpenAI | Gemini |
| ----------------------- | ------ | ------ |
| 31 required slots       | PASS   | PASS   |
| Hashes                  | PASS   | PASS   |
| 15 joint contracts      | PASS   | PASS   |
| Hierarchy / draw order  | PASS   | PASS   |
| Rotation limits         | PASS   | PASS   |
| Hand swap               | PASS   | PASS   |
| Hip/knee/ankle          | PASS   | PASS   |
| Bell attach/detach      | PASS   | PASS   |
| Renderer pack rejection | PASS   | PASS   |

The technical contract is complete. Artistic seam quality is covered separately in section 12.

## 10. Eight-second animation results

| Property             | Value                         |
| -------------------- | ----------------------------- |
| Duration             | 8.000 seconds                 |
| FPS                  | 24                            |
| Frames               | 192                           |
| Resolution           | 1280×720                      |
| Codec                | H.264 MP4                     |
| Renderer             | local Fableon canvas pipeline |
| Provider video calls | 0                             |

Both providers follow walk → reach → grip → release → idle, use the same bell prop and pedestal,
and attach/detach the bell at the same timeline points. Both pass ffprobe and full decode.

## 11. Reusability test results

Both packs render a second variation with:

- different walk start and speed;
- different cycle and bob;
- different reach target and timing;
- different head orientation and blink cadence.

The variation is configuration-only; no TypeScript animation code was edited to create it. Both
variations pass determinism checks. **Incremental provider API cost: $0.00.**

## 12. OpenAI vs Gemini quality comparison

| Criterion             | OpenAI                       | Gemini                         |
| --------------------- | ---------------------------- | ------------------------------ |
| Master illustration   | Strong, detailed, expressive | Clean but simpler              |
| Identity preservation | Strong                       | Moderate; face/turban repaired |
| Rig-part consistency  | Good                         | Moderate; arms read as tubes   |
| Shoulder              | Acceptable, visible seam     | Weak-to-moderate               |
| Elbow                 | Acceptable, cuff seam        | Moderate, tubular forearm      |
| Wrist/hand            | Good                         | Good                           |
| Hip/knee              | Good, cloth thigh compromise | Moderate after repair          |
| Walking               | More believable              | Stiffer; arms often hidden     |
| Reach/grip            | Clear                        | Clear but tubular              |
| Alpha/edges           | Native alpha, clean          | Chroma/despill, some fringe    |
| Manual repair burden  | Moderate                     | High                           |
| Actual usage          | 4 requests / 4 images        | 5 requests / 5 images          |

**Artistic decision:** OpenAI **conditional pass**; Gemini **conditional / needs repair**. Neither
is approved for a full film. OpenAI is the better candidate for the next small gate; Gemini
remains a valid, cheaper comparison but needs another targeted arm/face/clothing pass.

## 13. Actual cost breakdown

| Metric                            |    OpenAI |    Gemini |  Combined |
| --------------------------------- | --------: | --------: | --------: |
| Stage 2B cap                      | $4.000000 | $3.000000 | $7.000000 |
| Requests used                     |    4 / 10 |    5 / 10 |         9 |
| Images returned                   |         4 |         5 |         9 |
| Completed-usage cost              | $0.403720 | $0.272609 | $0.676329 |
| Remaining cap                     | $3.596280 | $2.727391 | $6.323671 |
| Cost per part                     | $0.013023 | $0.008794 | $0.010909 |
| Cost per completed rig            | $0.403720 | $0.272609 | $0.676329 |
| Cost per first 8-second animation | $0.403720 | $0.272609 | $0.676329 |
| Incremental reuse API cost        | $0.000000 | $0.000000 | $0.000000 |

No provider-reported billed amount is available; figures are reconciled token-usage estimates.

## 14. Stage 2A + 2B cumulative cost

| Metric                              |    OpenAI |              Gemini |  Combined |
| ----------------------------------- | --------: | ------------------: | --------: |
| Stage 2A conservative               | $0.244610 |           $0.205989 | $0.450599 |
| Stage 2A completed usage            | $0.244610 |           $0.103410 | $0.348020 |
| Stage 2B completed usage            | $0.403720 |           $0.272609 | $0.676329 |
| Cumulative conservative             | $0.648330 |           $0.478598 | $1.126928 |
| Cumulative completed usage          | $0.648330 |           $0.376019 | $1.024349 |
| Cumulative cost per part            | $0.020914 | $0.012130–$0.015439 |         — |
| Cumulative cost per first animation | $0.648330 | $0.376019–$0.478598 |         — |

Gemini’s range is completed usage versus conservative Stage 2A holds. No ledger event was altered.

### Production time

- Provider generation wall time: 13:39:28–13:48:59 UTC ≈ **9.5 minutes** for 9 requests.
- Local render: ≈ **20.7 seconds** per 8-second clip (`/usr/bin/time`, 192 frames).
- Four provider clips: ≈ **83 seconds** local compute.
- Manual repair time: not separately instrumented; local scripts plus repeated visual registration.
- Local compute/electricity/human time are excluded from provider spend.

## 15. Full test results

| Command                 | Result                      |
| ----------------------- | --------------------------- |
| `pnpm format:check`     | PASS                        |
| `pnpm lint`             | PASS                        |
| `pnpm typecheck`        | PASS                        |
| `pnpm test`             | PASS — 331 tests / 49 files |
| `pnpm test:browser`     | PASS — 58 tests             |
| `pnpm build`            | PASS                        |
| Paid calls during tests | 0                           |

## 16. Screenshots and video paths

Primary artifacts:

- `docs/benchmarks/phase-05.1/stage-2b/before-after-elbow.png`
- `docs/benchmarks/phase-05.1/stage-2b/full-character-pose-comparison.png`
- `docs/benchmarks/phase-05.1/stage-2b/walk-reach-grip-contact-sheet.png`
- `docs/benchmarks/phase-05.1/stage-2b/openai-character-test.mp4`
- `docs/benchmarks/phase-05.1/stage-2b/gemini-character-test.mp4`
- `docs/benchmarks/phase-05.1/stage-2b/side-by-side.mp4`
- `docs/benchmarks/phase-05.1/stage-2b/openai-variation.mp4`
- `docs/benchmarks/phase-05.1/stage-2b/gemini-variation.mp4`
- `docs/benchmarks/phase-05.1/stage-2b/variation-side-by-side.mp4`
- `docs/benchmarks/phase-05.1/stage-2b/cost-summary.json`
- `docs/benchmarks/phase-05.1/stage-2b/openai-cost-report.json`
- `docs/benchmarks/phase-05.1/stage-2b/gemini-cost-report.json`
- `docs/benchmarks/phase-05.1/stage-2b/authorizations-final.json`
- `docs/benchmarks/phase-05.1/stage-2b/evidence/`

Raw pack/output structure is preserved under
`outputs/folk-provider-benchmark/stage-2b/` with `generated/`, `derived-parts/`, `pack/`,
`rig-manifest.json`, `character-test.mp4`, `variation.mp4` and `cost-report.json` per provider.

## 17. Remaining problems

1. Shoulder and elbow seams remain visible in both packs.
2. OpenAI’s upper arm is a separate sleeve and the wrist bands double.
3. Gemini’s turban band reads heavily over the eye; its upper arm is tubular.
4. Gemini required a rejected sheet, a repair call, torso painting, leg segmentation, thigh
   recoloring, shin cropping and facial/turban pivots.
5. The characters still read as assembled cutouts rather than fully cohesive illustrations.
6. No full-film or full-library animation has been produced.
7. No provider invoice is available.
8. Manual repair time was not separately instrumented.

## 18. Full Git commit hashes

| Purpose                                       | Commit                       |
| --------------------------------------------- | ---------------------------- |
| Starting point                                | `ad9d0b4`                    |
| Joint overlap and seam concealment            | `ec1329f`                    |
| Prepare-only authorization and sheet plans    | `b936f9a`                    |
| Renderer, comparison and rig workspace        | `c29da67`                    |
| Stage 2B pack repair and animation completion | `5e9e402`                    |
| Landing-preview frame clamp                   | `7afd7a4`                    |
| Provider packs, renders and quality evidence  | `69f442f`                    |
| Final report                                  | final HEAD after this commit |

## 19. Recommendation for full-film production

**Do not begin full-film production yet.**

OpenAI is the better candidate for the next small gate. Gemini is cheaper and technically valid
but needs another targeted arm/face/clothing pass before it can be considered for production.
The next gate should focus on:

1. shoulder integration and elbow-cover concealment at 0–90°;
2. facial identity and turban/eye registration;
3. hand/prop contact at reach and grip;
4. clothing stability through a longer walk and turn;
5. a complete 10-second or longer test before any library budget.

No full library, provider film, push or Phase 6 work was started.

## 20. Final authorization state

| Provider | Authorization                 |       Cap | Requests used |         Spend |     Remaining | Status     |
| -------- | ----------------------------- | --------: | ------------: | ------------: | ------------: | ---------- |
| OpenAI   | `auth_1794315751164_678c8d79` |     $4.00 |        4 / 10 |     $0.403720 |     $3.596280 | **active** |
| Gemini   | `auth_1794315751766_c1eef16a` |     $3.00 |        5 / 10 |     $0.272609 |     $2.727391 | **active** |
| Combined | —                             | **$7.00** |             9 | **$0.676329** | **$6.323671** | —          |

Both were explicitly approved by `delegated-local-operator` at 2026-11-10T13:39:21Z and expire
2026-11-13T13:02:30.000Z. The Stage 2A authorizations are a separate experiment and were not used.
No additional authorization was created for a full library.
