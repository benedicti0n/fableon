# Phase 2.8 Experiment 2 Report — First/Last-Frame Generation

- **Phase:** 2.8, Experiment 2
- **Date:** 2026-11-09
- **Branch:** `main`
- **Starting HEAD:** `67b46dc`
- **Blocker evidence HEAD:** `b0e0c7d`
- **Report commit:** the commit containing this report
- **Status:** **BLOCKED BEFORE PAID GENERATION — INCOMPATIBLE ENDPOINT FRAME**
- **Spend:** **$0.00**
- **Video generated:** **No**
- **Recommendation:** **HYBRID (provisional, unchanged)**

## A. Executive Summary

Experiment 2 was intended to test whether first/last-frame conditioning could
fix the two main defects from Experiment 1: the detached far wing and character
identity drift.

The endpoint frame was supplied and inspected. It is not a compatible endpoint.
It is a different scene:

- the dominant tree trunk moved from the right side to the left;
- the branch changed from a thin, curved limb to a thick, lower, horizontal
  limb;
- the lighting changed from upper-right beams to upper-center/left beams;
- the bird changed from a slender, long-tailed in-flight form to a rounder,
  shorter-tailed perched form with different eye, beak, and wing proportions;
- the camera framing and subject scale no longer match.

The mismatch is global, not just a pose change. The two source images have an
SSIM of **0.144777**, and **93.26%** of pixels differ by more than 25 levels.
Using them as first/last-frame conditions would force the model to morph or
replace the scene, which would invalidate the experiment.

**No paid API call was made. No video was generated. No cost was incurred.**

## B. Repository State

- **Starting HEAD:** `67b46dc54c9017cae81ad84283f8fe9df31ad925`
- **Branch:** `main`
- **Starting working tree:** clean
- **New endpoint asset:** `assets/premium-video-v1/end-frame.png`
- **Prior Experiment 1 artifacts:** preserved unchanged
- **Blocker evidence HEAD:** `b0e0c7d4aebb5a2a57ffa64841af45c6132063cf`

Commits completed:

```text
d1a627a docs(art): add experiment 2 endpoint frame
b0e0c7d docs(benchmark): record experiment 2 endpoint compatibility blocker
<this report> docs(report): record phase 2.8 experiment 2 blocker
```

No push was performed. No Phase 3 work was started.

## C. Input-Image Compatibility Findings

### Technical checks

| Check              | Start frame                                                        | End frame                                                          | Result   |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | -------- |
| Path               | `assets/premium-video-v1/start-frame.png`                          | `assets/premium-video-v1/end-frame.png`                            | Present  |
| Dimensions         | 1672×941                                                           | 1672×941                                                           | **PASS** |
| Aspect ratio       | 1.7768:1                                                           | 1.7768:1                                                           | **PASS** |
| Format             | PNG 8-bit RGB                                                      | PNG 8-bit RGB                                                      | **PASS** |
| Decodes            | Yes                                                                | Yes                                                                | **PASS** |
| One bird           | Yes                                                                | Yes                                                                | **PASS** |
| Text / labels      | None                                                               | None                                                               | **PASS** |
| Alpha transparency | None                                                               | None                                                               | **PASS** |
| SHA-256            | `3bd6ed479b7febc43c25fcb44b46f68d760d335ecfe9bdd7c4d6b8c725a0e9d1` | `e3bec87ff5f258ba0fd08639cc80fc18ff5aefcbb0895fd59b05928d5b15eed7` | Recorded |

### Visual / structural checks

| Check                                      | Result   | Observation                                                                       |
| ------------------------------------------ | -------- | --------------------------------------------------------------------------------- |
| Same camera framing                        | **FAIL** | Start bird is left-of-center in flight; end bird is center-right and larger.      |
| Same forest layout                         | **FAIL** | Trunk spacing, canopy density, and depth layers differ.                           |
| Same tree positions                        | **FAIL** | Dominant trunk is on the right in the start frame, left in the end frame.         |
| Same branch geometry                       | **FAIL** | Start branch is thinner and curved; end branch is thicker, lower, and horizontal. |
| Same landing area                          | **FAIL** | Moss distribution, contact point, and branch top surface differ.                  |
| Same lighting direction                    | **FAIL** | Start beams from upper right; end beams from upper center/left.                   |
| Same character proportions                 | **FAIL** | End bird is rounder, shorter-tailed, and larger-eyed.                             |
| Same facial identity                       | **FAIL** | Beak shape, eye size, and head/body ratio differ.                                 |
| Same wing structure                        | **FAIL** | Wing markings and feather layering are simplified/different.                      |
| Suitable for first/last-frame conditioning | **FAIL** | The pair describes a scene change, not a continuous landing.                      |

Both images are valid standalone illustrations. The failure is compatibility,
not file integrity.

## D. Quantitative Evidence

Native-resolution comparison:

| Metric                            |        Value |
| --------------------------------- | -----------: |
| SSIM, all channels                | **0.144777** |
| SSIM, R                           |     0.132816 |
| SSIM, G                           |     0.154829 |
| SSIM, B                           |     0.146687 |
| Mean absolute difference (0–255)  |     **62.7** |
| Pixels differing by more than 10  |   **99.16%** |
| Pixels differing by more than 25  |   **93.26%** |
| Pixels differing by more than 50  |   **76.97%** |
| Pixels differing by more than 100 |   **39.27%** |

Per-region mean absolute difference:

| Region       |   MAD |
| ------------ | ----: |
| Top left     | 65.76 |
| Top right    | 58.11 |
| Bottom left  | 65.85 |
| Bottom right | 61.10 |
| Center       | 54.42 |

The mismatch is present in every region. It is not explained by the bird’s pose
alone.

## E. Visual Comparison Evidence

- `docs/benchmarks/phase-02-8/experiment-02/start-end-comparison.png`
  - left: start frame;
  - middle: end frame;
  - right: amplified absolute difference.
- `docs/benchmarks/phase-02-8/experiment-02/start-end-bird-crops.png`
  - left: start bird crop;
  - right: end bird crop.

The difference panel is dominated by background structure, confirming that the
forest, branch, and lighting changed. The bird crops show the identity and
proportion differences separately.

## F. Provider and Model Verification

Current Gemini documentation was checked on 2026-11-09:

- `gemini-omni-1.2-flash` supports image-to-video and first/last-frame
  interpolation.
- First/last-frame interpolation supports **3–10 seconds**.
- Two images are provided in the input list, followed by a text prompt.
- 720p is native/default; 1080p and 4K are upscaled.
- Standard pricing: **$12.00 per 1M video tokens**; 720p consumes about
  **5,792 tokens/s**, or **~$0.07/s**.
- A 3-second 720p attempt is approximately **$0.21**, within the **$0.25**
  experiment cap.

The local `.env` contains `GEMINI_API_KEY`. Its value was not printed, logged,
or committed. No request was sent, so no account-access or billing behavior was
exercised.

## G. Generation Attempt and Parameters

**No generation attempt was made.**

The planned-but-not-executed request was:

| Parameter         | Value                                                          |
| ----------------- | -------------------------------------------------------------- |
| Provider          | Google Gemini                                                  |
| Model             | `gemini-omni-1.2-flash`                                        |
| Mode              | First/last-frame image-to-video                                |
| Duration          | 3 seconds                                                      |
| Resolution        | 720p native                                                    |
| Aspect ratio      | 16:9                                                           |
| Images            | Start frame + end frame                                        |
| Prompt            | Seamless painted landing, static camera, identity preservation |
| Attempts          | 1                                                              |
| Automatic retries | None                                                           |
| Interaction ID    | **None**                                                       |
| Provider status   | **Not called**                                                 |

The request was stopped at the input gate. No network generation request was
submitted.

## H. Actual Cost

| Item                        |     Value |
| --------------------------- | --------: |
| Paid API requests           |     **0** |
| Spend                       | **$0.00** |
| Estimated cost if unblocked |    ~$0.21 |
| Experiment cap              |     $0.25 |
| Remaining under cap         |     $0.25 |
| Invoice/usage record        |      None |

No `cost-report.json` was created because there is no actual generation cost to
report. The blocker document records the estimate and the zero spend.

## I. Video Artifact Paths

**None.** The following were deliberately not created:

- `experiment-02/original-video.mp4`
- `experiment-02/metadata.json`
- `experiment-02/contact-sheet.png`
- `experiment-02/selected-frames/`
- `experiment-02/comparison-with-experiment-01.mp4`
- `experiment-02/cost-report.json`
- `experiment-02/EVALUATION.md` with fabricated scores

Only the input comparison evidence and blocker documentation exist under
`docs/benchmarks/phase-02-8/experiment-02/`.

## J. Visual Evaluation

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

## K. Remaining Defects / Required Corrections

The endpoint frame must be replaced before Experiment 2 can proceed. It needs:

1. The same camera position, focal length, subject scale, and composition.
2. The same forest layout and trunk positions.
3. The same physical branch, thickness, curve, moss distribution, and contact
   area.
4. The same lighting direction and beam placement.
5. The same bird identity: head/body ratio, eye size, beak shape, tail length,
   wing markings, feather layers, and palette.
6. A perched pose reachable from the start frame within 3 seconds.

Recommended workflow: generate the endpoint from the start frame and approved
character reference, then re-run the compatibility check before any paid video
request. Do not use a separately composed scene, even if it looks attractive in
isolation.

## L. Test Results

All applicable checks were run on the final tree before this report:

| Check               | Result                         |
| ------------------- | ------------------------------ |
| `pnpm format:check` | PASS                           |
| `pnpm lint`         | PASS                           |
| `pnpm typecheck`    | PASS                           |
| `pnpm test`         | PASS — 24 files, **193 tests** |
| `pnpm build`        | PASS                           |
| `pnpm test:browser` | PASS — **45/45 tests**         |

No paid generation was run during tests or CI. All existing routes and
benchmarks remain present. No application code was changed.

## M. Recommendation

### **HYBRID (provisional, unchanged)**

Experiment 2 did not produce new evidence about endpoint conditioning because it
was blocked at the input gate. The Experiment 1 conclusion therefore remains:

- **Not AI-first:** one AI shot produced beautiful art but failed character
  consistency and wing anatomy; endpoint conditioning is still untested.
- **Not deterministic-first:** the deterministic baseline remains far below the
  storybook art target.
- **Hybrid:** use AI for painterly establishing shots, atmosphere, backgrounds,
  and tolerant action; keep deterministic rendering for close character acting,
  exact contact, repeatable motion, titles, and identity-critical work.

This recommendation should be revisited only after a compatible endpoint frame
is supplied and a real first/last-frame generation is evaluated.

## N. Next Smallest Action

1. Create a matching endpoint frame from the start frame, preserving the right
   trunk, branch geometry, lighting, camera, and bird identity.
2. Re-run `start-end-comparison.png` and the quantitative check.
3. If the endpoint passes, submit **one** 3-second, 720p, 16:9 first/last-frame
   request under the **$0.25** cap.
4. If it fails, stop again and report the specific mismatch. Do not spend.

No Phase 3 work was started. No push was performed.
