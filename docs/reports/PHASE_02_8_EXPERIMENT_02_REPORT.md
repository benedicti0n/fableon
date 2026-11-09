# Phase 2.8 Experiment 2 Report — Revised Endpoint Recheck

- **Phase:** 2.8, Experiment 2
- **Date:** 2026-11-09
- **Branch:** `main`
- **Starting HEAD:** `6db440e`
- **Evidence HEAD:** `7da9d3c`
- **Report commit:** the commit containing this report
- **Status:** **BLOCKED BEFORE PAID GENERATION — REVISED ENDPOINT IMPROVES SCENE ALIGNMENT BUT STILL FAILS CHARACTER IDENTITY**
- **Spend:** **$0.00**
- **Video generated:** **No**
- **Recommendation:** **HYBRID (provisional, unchanged)**

## A. Executive Summary

The endpoint frame was replaced with a revision generated from the original
start frame. The revision is a large improvement:

- the right-side trunk, branch curve, moss, flowers, and lighting now align;
- the pair reads as the same forest at the same camera angle;
- global SSIM improved from **0.144777** to **0.761365**;
- global mean absolute difference dropped from **62.7** to **13.32**.

However, the pair still fails the character-identity gate:

- the revised endpoint adds a **large left-side tree trunk** that is absent from
  the start frame;
- the perched bird has a **much larger eye**, **shorter/thicker beak**,
  **rounder head and body**, **shorter tail**, and **simplified wing markings**
  compared with the start bird.

Those are not pose-only differences. A first/last-frame generation would have
to morph the character and add a tree, so the result would not be a clean test
of endpoint conditioning. The experiment stops at the input gate.

**No paid API call was made. No video was generated. No cost was incurred.**

## B. Repository State

- **Starting HEAD:** `6db440e1c1f6af39b4b4815dad6ee89e86bbc986`
- **Branch:** `main`
- **Working tree at start:** clean except the replaced endpoint asset
- **Revised endpoint SHA-256:**
  `e0d3a948382e9b93d52dfa969108b52ab78737927293b64dfaab6bbb5a87d106`
- **Start frame SHA-256:**
  `3bd6ed479b7febc43c25fcb44b46f68d760d335ecfe9bdd7c4d6b8c725a0e9d1`
- **Evidence HEAD:** `7da9d3ce0fd4bba77ee556c1cbd6823ee6a8fc52`

Commits completed for this recheck:

```text
0f5f535 docs(art): revise experiment 2 endpoint frame
7da9d3c docs(benchmark): recheck revised experiment 2 endpoint
<this report> docs(report): update phase 2.8 experiment 2 blocker
```

No push was performed. No Phase 3 work was started. Prior Experiment 1 and
Experiment 2 revision-1 evidence remain in git history and are preserved.

## C. Input-Image Compatibility Findings

### Technical checks

| Check         | Start frame                               | Revised end frame                       | Result   |
| ------------- | ----------------------------------------- | --------------------------------------- | -------- |
| Path          | `assets/premium-video-v1/start-frame.png` | `assets/premium-video-v1/end-frame.png` | Present  |
| Dimensions    | 1672×941                                  | 1672×941                                | **PASS** |
| Aspect ratio  | 1.7768:1                                  | 1.7768:1                                | **PASS** |
| Format        | PNG 8-bit RGB                             | PNG 8-bit RGB                           | **PASS** |
| Decodes       | Yes                                       | Yes                                     | **PASS** |
| One bird      | Yes                                       | Yes                                     | **PASS** |
| Text / labels | None                                      | None                                    | **PASS** |
| Alpha         | None                                      | None                                    | **PASS** |
| SHA-256       | `3bd6ed47…e9d1`                           | `e0d3a948…d106`                         | Recorded |

Both files pass the file-level and content-level checks. The remaining problems
are visual/identity compatibility, not corruption or dimensions.

### Scene-level checks

| Check                          | Result           | Observation                                                                                                |
| ------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Same branch geometry           | **PASS (close)** | Same curved mossy branch and contact area                                                                  |
| Same right-side trunk          | **PASS (close)** | Same dominant trunk and foliage                                                                            |
| Same lower-left flowers        | **PASS (close)** | Same cluster and placement                                                                                 |
| Same lighting direction        | **PASS (close)** | Warm beams from the upper right                                                                            |
| Same camera framing            | **PASS (close)** | Same 16:9 composition and branch placement                                                                 |
| Same left-side forest geometry | **FAIL**         | The revised endpoint adds a large left tree trunk absent from the start                                    |
| Same character identity        | **FAIL**         | Eye, beak, head/body ratio, tail, and wing markings differ                                                 |
| Clean compositing              | **PARTIAL**      | Feet grip the branch and no hard matte halo is obvious, but the bird reads as a different character design |

## D. Quantitative Evidence

### Revised pair vs start frame

| Metric                            |        Value |
| --------------------------------- | -----------: |
| SSIM, all channels                | **0.761365** |
| SSIM, R                           |     0.757769 |
| SSIM, G                           |     0.767817 |
| SSIM, B                           |     0.758508 |
| Mean absolute difference (0–255)  |    **13.32** |
| Pixels differing by more than 10  |       28.81% |
| Pixels differing by more than 25  |       24.46% |
| Pixels differing by more than 50  |       16.91% |
| Pixels differing by more than 100 |        6.14% |

Per-region mean absolute difference:

| Region       |       MAD | Interpretation                                  |
| ------------ | --------: | ----------------------------------------------- |
| Top left     | **34.42** | Added left tree trunk and denser foliage        |
| Top right    |      8.14 | Right trunk/canopy aligns well                  |
| Bottom left  |      6.31 | Branch/flowers align well                       |
| Bottom right |      4.43 | Branch/trunk/flowers align well                 |
| Center       | **27.97** | Bird identity/pose and midground foliage differ |

### Revision comparison

| Pair                                  |         SSIM | Global MAD |
| ------------------------------------- | -----------: | ---------: |
| Original start vs revision 1 endpoint |     0.144777 |       62.7 |
| Original start vs revision 2 endpoint | **0.761365** |  **13.32** |

The revised endpoint is a major improvement over revision 1. It is still not a
clean character match.

### Region diagnostics

| Region                     |            Metric | Interpretation                                                                                      |
| -------------------------- | ----------------: | --------------------------------------------------------------------------------------------------- |
| Upper-left background crop | SSIM **0.355067** | The added left trunk is a real geometry change                                                      |
| Bird head crop             | SSIM **0.184237** | Diagnostic only; crop alignment is approximate, but confirms a substantial facial-design difference |

The head-crop SSIM is not a formal identity score because the two heads are not
pixel-aligned and the birds are in different poses. The direct head comparison
and visual inspection are the stronger evidence.

## E. Visual Comparison Evidence

- `docs/benchmarks/phase-02-8/experiment-02/start-end-comparison.png`
  - left: start frame;
  - middle: revised end frame;
  - right: amplified absolute difference.
- `docs/benchmarks/phase-02-8/experiment-02/start-end-bird-crops.png`
  - left: start bird;
  - right: revised end bird.
- `docs/benchmarks/phase-02-8/experiment-02/start-end-head-crops.png`
  - left: start head close-up;
  - right: revised end head close-up.
- `docs/benchmarks/phase-02-8/experiment-02/start-end-left-trunk-crops.png`
  - left: start upper-left background;
  - right: revised end upper-left background.
- `docs/benchmarks/phase-02-8/experiment-02/end-frame-revision-comparison.png`
  - left: rejected revision 1 endpoint;
  - right: revised revision 2 endpoint.

The difference panel is now mostly dark/green over the branch, right trunk,
flowers, and lower composition, confirming strong scene alignment. The bright
difference areas are the added left trunk and the bird.

## F. Remaining Visual Defects

### D1 — Added left-side tree trunk

The start frame’s upper-left is open forest with thin trunks and foliage. The
revised endpoint introduces a large, detailed tree trunk and branch structure
in that region. A model interpolating the pair would have to grow a tree during
the landing or ignore the endpoint’s left side.

### D2 — Character identity drift

The revised bird is still a different construction:

- eye is substantially larger relative to the head;
- beak is shorter and thicker;
- head is rounder and the body is plumper;
- tail is shorter;
- wing markings are broader and less layered;
- facial feather markings and cream/chestnut transitions differ.

The palette family is correct, but the character is not the same design. This
is the same class of defect Experiment 1 exposed.

### D3 — Compositing assessment

No hard white matte halo or floating feet are obvious at normal viewing. The
visible foot grips the moss, and the branch contact is plausible. The remaining
issue is not a crude cutout edge; it is that the perched bird is a different
character design composited into the scene.

## G. Provider and Model Verification

Current Gemini documentation was checked on 2026-11-09:

- `gemini-omni-1.2-flash` supports first/last-frame interpolation.
- First/last-frame interpolation supports **3–10 seconds**.
- Two images are supplied in the input list, followed by a text prompt.
- 720p is native/default; 1080p and 4K are upscaled.
- Standard pricing: **$12.00 per 1M video tokens**; 720p uses about
  **5,792 tokens/s**, or **~$0.07/s**.
- A 3-second 720p attempt is approximately **$0.21**, within the **$0.25**
  experiment cap.

The local `.env` contains `GEMINI_API_KEY`. Its value was not printed, logged,
or committed. No request was sent.

## H. Generation Attempt and Parameters

**No generation attempt was made.**

The planned-but-not-executed request was:

| Parameter         | Value                           |
| ----------------- | ------------------------------- |
| Provider          | Google Gemini                   |
| Model             | `gemini-omni-1.2-flash`         |
| Mode              | First/last-frame image-to-video |
| Duration          | 3 seconds                       |
| Resolution        | 720p native                     |
| Aspect ratio      | 16:9                            |
| Images            | Start frame + revised end frame |
| Prompt            | Balanced-motion landing prompt  |
| Attempts          | 1                               |
| Automatic retries | None                            |
| Interaction ID    | **None**                        |
| Provider status   | **Not called**                  |

The request was stopped at the input gate. No network generation request was
submitted.

## I. Actual Cost

| Item                        |     Value |
| --------------------------- | --------: |
| Paid API requests           |     **0** |
| Spend                       | **$0.00** |
| Estimated cost if unblocked |    ~$0.21 |
| Experiment cap              |     $0.25 |
| Remaining under cap         |     $0.25 |
| Invoice/usage record        |      None |

No `cost-report.json` was created because there is no actual generation cost to
report.

## J. Video Artifact Paths

**None.** The following were deliberately not created:

- `experiment-02/original-video.mp4`
- `experiment-02/metadata.json`
- `experiment-02/contact-sheet.png`
- `experiment-02/selected-frames/`
- `experiment-02/comparison-with-experiment-01.mp4`
- `experiment-02/cost-report.json`
- `experiment-02/EVALUATION.md` with fabricated scores

Only updated input-comparison evidence and blocker documentation exist.

## K. Visual Evaluation

**Not scored.** No Experiment 2 video exists.

The Experiment 1 scores remain the only real AI-video scores:

| Criterion              | Experiment 1 | Experiment 2             |
| ---------------------- | -----------: | ------------------------ |
| Artistic quality       |         8/10 | **Not scored — blocked** |
| Character consistency  |         4/10 | **Not scored — blocked** |
| Motion naturalness     |         5/10 | **Not scored — blocked** |
| Temporal stability     |         5/10 | **Not scored — blocked** |
| Directability          |         4/10 | **Not scored — blocked** |
| Storybook suitability  |         8/10 | **Not scored — blocked** |
| Production suitability |         4/10 | **Not scored — blocked** |

No comparison with Experiment 1 or the Phase 2.7 Gate 2 baseline was possible,
because Experiment 2 produced no footage.

## L. Required Corrections

The endpoint must preserve both the scene and the character:

1. **Keep the start frame’s left-side forest geometry.** Do not add a large left
   trunk that is not in the start frame. Use the start background as the scene
   base.
2. **Preserve the start bird’s facial construction:** eye size, beak shape,
   head/body ratio, cheek/feather markings, and cream/chestnut transitions.
3. **Preserve the start bird’s body and wing design:** slender body, long tail,
   layered slate-blue wing feathers, and golden accents.
4. **Use a perched pose derived from the start character**, not a newly designed
   rounder bird.
5. **Keep the existing branch, right trunk, flowers, and lighting** that already
   match.
6. **Check feet and branch contact** at high resolution; the current contact is
   plausible but should be preserved.
7. Re-run the compatibility check before any paid request.

Recommended workflow: use the start frame as the scene base and inpaint/compose
a perched version of the **same** bird onto the existing branch, rather than
generating a new scene or a new character. A matching endpoint should differ
from the start primarily in the bird’s pose and wing position, not in the forest
or facial design.

## M. Test Results

All applicable checks passed on the exact tree before this report:

| Check               | Result                         |
| ------------------- | ------------------------------ |
| `pnpm install`      | PASS — already up to date      |
| `pnpm format:check` | PASS                           |
| `pnpm lint`         | PASS                           |
| `pnpm typecheck`    | PASS                           |
| `pnpm test`         | PASS — 24 files, **193 tests** |
| `pnpm build`        | PASS                           |
| `pnpm test:browser` | PASS — **45/45 tests**         |

No paid generation was run during tests or CI. All existing routes and
benchmarks remain present. No application code was changed.

## N. Recommendation

### **HYBRID (provisional, unchanged)**

Experiment 2 still did not produce a clean endpoint-conditioning test. The
revised endpoint improved scene alignment but did not preserve character
identity, so it cannot supply new evidence for or against first/last-frame
conditioning.

The Experiment 1 conclusion remains:

- **Not AI-first:** one AI shot produced beautiful art but failed character
  consistency and wing anatomy; endpoint conditioning is still untested.
- **Not deterministic-first:** the deterministic baseline remains far below the
  storybook art target.
- **Hybrid:** use AI for painterly establishing shots, atmosphere, backgrounds,
  and tolerant action; keep deterministic rendering for close character acting,
  exact contact, repeatable motion, titles, and identity-critical work.

This recommendation should be revisited only after a compatible endpoint frame
is supplied and a real first/last-frame generation is evaluated.

## O. Next Smallest Action

1. Create a revision 3 endpoint from the start frame that preserves the left
   background and the start bird’s facial/body identity.
2. Re-run the head, tail, wing, left-background, and foot-contact checks.
3. If the pair passes, submit **one** 3-second, 720p, 16:9 first/last-frame
   request under the **$0.25** cap.
4. If it fails, stop again and report the specific mismatch. Do not spend.

No Phase 3 work was started. No push was performed.
