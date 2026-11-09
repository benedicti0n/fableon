# Phase 2.8 Execution Report

- **Phase:** 2.8 — AI Image-to-Video Feasibility & Animation Quality Benchmark
- **Execution date:** 2026-11-09
- **Branch:** `main`
- **Starting HEAD:** `99652a7`
- **Artifact HEAD before this report:** `639e8e2`
- **Report commit:** the commit containing this report
- **Status:** **EXECUTED — ONE REAL GENERATION COMPLETED AND EVALUATED**
- **Recommendation:** **HYBRID (provisional)**
- **Next phase:** Not started

## A. Executive Summary

Phase 2.8 moved from research to a real image-to-video execution.

What actually happened:

1. Located and verified the supplied start frame at
   `assets/premium-video-v1/start-frame.png` — 1672×941 PNG, one bird, one
   painted forest, one branch, no text or labels.
2. Found only `OPENAI_API_KEY` in `.env`. It was rejected by OpenAI with HTTP
   401, and OpenAI’s Sora/Videos API is shut down. The same credential
   authenticated successfully against Google Gemini.
3. Selected **Gemini Omni 1.2 Flash** (`gemini-omni-1.2-flash`) at 720p,
   3 seconds, 16:9.
4. Executed **one** generation attempt. It completed in **38.587 seconds** for
   a usage-derived **$0.217147**, well under the **$1.00** cap.
5. Preserved the original **3.029-second, 1280×720, 24 fps** MP4, created a
   labeled derived 2-second evaluation clip, extracted selected frames,
   produced a contact sheet, and built a side-by-side comparison against the
   Phase 2.7 Gate 2 baseline.
6. Evaluated the real footage. The AI shot is dramatically more beautiful and
   storybook-like than the deterministic baseline, but it has a **major
   detached far-wing artifact** during braking and **visible character identity
   drift**.

No second attempt was made. The first attempt was not a technical failure; it
was a valid MP4 with an anatomical/artistic defect. The retry policy permits a
second attempt only for a clear technical failure, not for aesthetic
optimization.

## B. Repository State

- **Starting HEAD:** `99652a721b2cc84f0837eacca32556a7ae4b8a4e`
- **Starting branch:** `main`
- **Starting working tree:** clean
- **Discovered asset:** `assets/premium-video-v1/start-frame.png`
- **Asset SHA-256:**
  `3bd6ed479b7febc43c25fcb44b46f68d760d335ecfe9bdd7c4d6b8c725a0e9d1`
- **Artifact HEAD:** `639e8e215fbeccb4aad6b202b2b91cc35e573a72`

Commits created during this continuation:

```text
148ee6e docs(benchmark): verify real image-to-video input asset
d86609b docs(benchmark): select active ai video provider from configured environment
2add801 feat(benchmark): generate first real ai bird landing shot
6949633 feat(benchmark): ingest and inspect generated ai video artifact
639e8e2 test(benchmark): compare first ai video shot against fableon baseline
<this report> docs(report): record phase 2.8 execution results
```

No push was performed. No Phase 3 work was started. All previous routes,
benchmarks, and application code were preserved.

## C. Input Asset

| Property       | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Path           | `assets/premium-video-v1/start-frame.png`                          |
| Dimensions     | 1672×941                                                           |
| Aspect ratio   | 1.7768:1, effectively 16:9                                         |
| Format         | PNG, 8-bit RGB, non-interlaced                                     |
| Size           | 2,970,254 bytes                                                    |
| SHA-256        | `3bd6ed479b7febc43c25fcb44b46f68d760d335ecfe9bdd7c4d6b8c725a0e9d1` |
| Endpoint frame | None supplied                                                      |

The image is a clean single-scene storybook illustration: one chestnut-and-golden
songbird with cream breast and layered slate-blue wings, flying left of center;
one painterly sunlit forest; one moss-covered branch in the lower right; warm
upper-right light; no text, labels, diagrams, panels, checkerboards, watermarks,
multiple birds, or rigging markers. The bird’s legs are extended toward the
branch, so a landing can occur within the 3-second generation.

**Provenance:** user-supplied. macOS metadata records a download source of
`https://chatgpt.com/`, indicating generation through ChatGPT. No embedded
license or authorship metadata was found. This is sufficient for an internal
benchmark, but it is not a cleared production asset.

**Limitations:** 1672×941 is below the earlier preferred 1920×1080 source size,
though it exceeds the 1280×720 output. It has no matching endpoint frame. It was
suitable for this 720p experiment but cannot support a native-1080p claim.

Full verification: `docs/benchmarks/phase-02-8/REAL_INPUT_VERIFICATION.md`.

## D. Provider Selection

Environment check (presence only; no secret values printed):

| Variable              | Status      |
| --------------------- | ----------- |
| `OPENAI_API_KEY`      | **Present** |
| `GEMINI_API_KEY`      | Absent      |
| `GOOGLE_API_KEY`      | Absent      |
| `LUMA_API_KEY`        | Absent      |
| `RUNWAYML_API_SECRET` | Absent      |

### OpenAI — not usable

- `GET https://api.openai.com/v1/models` returned **HTTP 401 invalid API key**.
- OpenAI’s current documentation states the Sora 2 models and Videos API were
  **shut down on 2026-09-24** and no one-to-one replacement API exists.

### Google Gemini — selected

The configured value returned:

- **HTTP 200** from `GET /v1beta/models` with 50 models;
- `gemini-omni-1.2-flash` present;
- **HTTP 200** from the model’s `countTokens` endpoint.

The credential is therefore a valid Google Gemini API key stored under the
misleading variable name `OPENAI_API_KEY`. No key value was logged, committed,
or written to a report.

### Selected request

| Property            | Value                                  |
| ------------------- | -------------------------------------- |
| Provider            | Google                                 |
| API                 | Gemini Interactions API                |
| Model               | `gemini-omni-1.2-flash`                |
| Mode                | Image-to-video                         |
| Aspect ratio        | 16:9                                   |
| Resolution          | 720p native                            |
| Duration            | 3 seconds (provider minimum)           |
| Input               | Verified start frame + balanced prompt |
| Attempts authorized | 2 maximum                              |
| Attempts used       | **1**                                  |
| Provider latency    | **38.587 s**                           |

Why selected: it was the only configured provider that actually authenticated,
the only configured provider with a current image-to-video offering, it supports
the needed aspect ratio and duration, and it has the lowest verified per-second
price among the researched paid options.

Full selection record: `docs/benchmarks/phase-02-8/EXECUTION_SELECTION.md`.

## E. Generation Execution

| Item              | Value                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| Attempts          | **1**                                                                    |
| Prompt variant    | **B — Balanced motion**                                                  |
| Prompt source     | `docs/benchmarks/phase-02-8/ANIMATION_PROMPTS.md`                        |
| Exact prompt      | Recorded in `generated/metadata.json`                                    |
| Model             | `gemini-omni-1.2-flash`                                                  |
| Interaction ID    | `v1_Chd0cGZ4YXAzNEV2UE00dDRQaFBDVGdBOBIXdHBmeGFwMzRFdlBNNHQ0UGhQQ1RnQTg` |
| Provider status   | `completed`                                                              |
| Service tier      | `standard`                                                               |
| Created           | 2026-11-09T09:51:50Z                                                     |
| Updated           | 2026-11-09T09:51:50Z                                                     |
| Request latency   | 38.587 s                                                                 |
| Automatic retries | None                                                                     |
| Second attempt    | **Not used**                                                             |

### Usage record

| Token type     |  Count |
| -------------- | -----: |
| Input text     |    463 |
| Input image    |  1,100 |
| Total input    |  1,563 |
| Video output   | 17,376 |
| Thought output |    699 |
| Total          | 19,638 |

### Why no retry

The first attempt returned a valid, playable MP4, not a technical failure. It
has a visible anatomical defect during braking and identity drift, but the
authorized retry rule permits a second attempt only for a clear technical
failure or corruption. Retrying for aesthetic improvement would violate the
“no optimization through paid retries” instruction.

## F. Output Artifacts

| Artifact                | Path                                                                 | Details                                                            |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Original AI video       | `docs/benchmarks/phase-02-8/generated/original-video.mp4`            | 3.029 s, 1280×720, 24 fps, H.264 + AAC, 2,911,778 bytes            |
| Original SHA-256        | —                                                                    | `76fc11f30d36732b0149fe00624a4dfcdc88e5a6f22388ddde2971faf7e738bf` |
| Derived evaluation clip | `docs/benchmarks/phase-02-8/generated/evaluation-clip.mp4`           | **Derived** first 2.0 s, 1280×720, 24 fps, 48 frames, muted        |
| Metadata                | `docs/benchmarks/phase-02-8/generated/metadata.json`                 | Prompt, provider, usage, cost, hashes, request data                |
| Provider response       | `docs/benchmarks/phase-02-8/generated/provider-response.json`        | Sanitized; base64 video omitted                                    |
| Contact sheet           | `docs/benchmarks/phase-02-8/contact-sheet.png`                       | 12 frames at 4 fps across 3.029 s                                  |
| Selected frames         | `docs/benchmarks/phase-02-8/selected-frames/`                        | 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 2.9 s                                |
| Side-by-side video      | `docs/benchmarks/phase-02-8/comparison-side-by-side.mp4`             | 2.0 s, 1920×540; left baseline, right AI                           |
| Synchronized frames     | `docs/benchmarks/phase-02-8/comparison-frames.png`                   | Six rows at 0.0, 0.4, 0.8, 1.2, 1.6, 1.958 s                       |
| Wing defect evidence    | `docs/benchmarks/phase-02-8/defects/01-detached-far-wing-0.8s.png`   | Far wing attached near head/neck                                   |
| Wing defect evidence    | `docs/benchmarks/phase-02-8/defects/02-detached-far-wing-1.4s.png`   | Detached white wing near beak                                      |
| Identity evidence       | `docs/benchmarks/phase-02-8/defects/03-source-vs-final-identity.png` | Source vs final frame                                              |
| Evaluation              | `docs/benchmarks/phase-02-8/EVALUATION.md`                           | Full criterion-by-criterion assessment                             |

The original MP4 was never overwritten. The 2-second clip is explicitly derived
and does not replace it. No frame interpolation was used.

Technical facts: 72 video frames at 24 fps, 3.029 s container duration,
1280×720, H.264, AAC stereo 48 kHz. Native audio is present but was not
evaluated; the derived clip is muted.

## G. Evaluation

Full evidence and reasoning: `docs/benchmarks/phase-02-8/EVALUATION.md`.

### Scores

| Criterion              | AI video | Fableon baseline |
| ---------------------- | -------: | ---------------: |
| Artistic quality       | **8/10** |             3/10 |
| Character consistency  | **4/10** |             6/10 |
| Motion naturalness     | **5/10** |             2/10 |
| Temporal stability     | **5/10** |             8/10 |
| Directability          | **4/10** |             9/10 |
| Storybook suitability  | **8/10** |             3/10 |
| Production suitability | **4/10** |             3/10 |

These are qualitative evaluator judgments supported by the actual artifacts,
not a certified artistic rating.

### What the AI shot does well

- Rich, layered painterly forest with convincing golden light and atmospheric
  depth.
- Strong storybook composition and a clear focal bird.
- Static camera preserved; no cuts, zooms, or camera shake.
- Real flight → approach → braking → branch contact → wing fold → perch beat
  structure.
- Background layout, branch geometry, and lighting direction remain broadly
  stable.
- Final foot contact and grip are plausible; no duplicate legs or feet observed.
- No text, extra birds, or new objects observed.

### What fails

- **Detached far wing:** at approximately 0.8–1.4 s, the far wing reads as a
  wing emerging from the head/neck area or as a detached white shape near the
  beak. This is visible in `defects/01-detached-far-wing-0.8s.png` and
  `defects/02-detached-far-wing-1.4s.png`.
- **Identity drift:** the final bird is rounder, with a shorter beak, larger
  eye, shorter tail, and simplified wing markings compared with the supplied
  frame. See `defects/03-source-vs-final-identity.png`.
- **Landing pop:** the largest consecutive-frame difference occurs at frame 28
  (~1.17 s), consistent with a small pose/scale discontinuity at the landing
  transition.
- The first frame is a re-rendered interpretation, not a pixel-identical copy
  of the source. SSIM against the supplied frame is 0.7695 overall (R 0.8102,
  G 0.8169, B 0.6814).

### Baseline comparison

The Fableon baseline is deterministic and controllable, but its artwork is
still Gate 2 candidate art: flat procedural forest, low-resolution cutout
character, visible head/neck seams, wing-root halos, rigid wing rotation, and
flat foot contact. Its artistic quality is far below the AI shot, while its
temporal stability and directability are much higher.

The AI shot is **not production-clean**. The baseline is **not artistically
sufficient**. The strengths are complementary.

## H. Cost Summary

Official Gemini Omni 1.2 Flash standard-tier pricing applied to the returned
usage record:

| Component               | Tokens |        Rate |          Cost |
| ----------------------- | -----: | ----------: | ------------: |
| Input (text/image)      |  1,563 |  $1.50 / 1M |     $0.002344 |
| Video output            | 17,376 | $12.00 / 1M |     $0.208512 |
| Thought output          |    699 |  $9.00 / 1M |     $0.006291 |
| **Total usage-derived** |      — |           — | **$0.217147** |

- **Authorized cap:** $1.00
- **Spent (usage-derived):** **$0.217147**
- **Remaining under cap:** **$0.782853**
- **Attempts:** 1
- **Failed attempts:** 0
- **Retake estimate:** ~$0.217 per 3-second 720p attempt
- **Provider invoice:** not returned via the API; the figure is calculated from
  the provider’s returned usage and official rates.

The preflight estimate of ~$0.2085 was close; the small difference comes from
input and thought tokens. The actual spend is well under the cap.

No paid generation was run in tests or CI.

## I. Verification

All checks were run after the generation and artifact work:

| Check               | Result                         |
| ------------------- | ------------------------------ |
| `pnpm install`      | PASS — already up to date      |
| `pnpm format:check` | PASS                           |
| `pnpm lint`         | PASS                           |
| `pnpm typecheck`    | PASS                           |
| `pnpm test`         | PASS — 24 files, **193 tests** |
| `pnpm build`        | PASS                           |
| `pnpm test:browser` | PASS — **45/45 tests**         |

One intermediate full-suite run hit a pre-existing timing-sensitive assertion in
`tests/browser/routes.spec.ts` for `/benchmarks/phase-02`: the test expects
`/Phase 2/`, which matches the page's temporary “Painting Phase 2 benchmark…”
loading state but not the final “Where the Light Lands” body. The isolated test
passed **5/5**, and the final full-suite rerun passed **45/45**. The route
returns HTTP 200 and remains functional; this is a test-race fragility, not a
regression from this phase.

Additional integrity checks:

- The original MP4 hash is recorded in metadata and matches the committed file.
- The derived clip is exactly 2.000 s, 48 frames, 1280×720, 24 fps, no audio.
- The comparison video is 2.000 s, 1920×540, 24 fps, 48 frames.
- No API key pattern was found in the new documentation or generated JSON.
- `.env` remains ignored by git and was not committed.
- Existing routes remain present: `/`, `/studio`, `/studio/assets`,
  `/benchmarks/phase-02`, `/benchmarks/phase-02-5`, `/benchmarks/phase-02-6`,
  `/benchmarks/phase-02-7-gate2`.

No application code was changed. No paid generation occurred during the test
suite.

## J. Recommendation

### **HYBRID (provisional)**

The evidence supports a hybrid animation architecture, not AI-first and not
deterministic-first.

**Why not AI-first:** one generation produced a beautiful shot but failed
character consistency and wing anatomy. There is no evidence of reliable
retakes or exact identity preservation. Adopting AI as the primary animation
method on this evidence would be premature.

**Why not deterministic-first:** the existing deterministic shot is technically
controllable, but its artwork and background are far below the storybook target.
The AI result demonstrates a large, real quality jump that the current rig does
not provide.

**Why hybrid:** the two methods have complementary strengths:

- Use **AI image-to-video** for painterly establishing shots, distant action,
  atmosphere, background plates, and shots where slight identity drift is
  acceptable.
- Use **Fableon’s deterministic renderer** for close character acting, exact
  foot contact, repeatable motion, titles, diagrams, overlays, and shots that
  require exact identity and coordinates.
- Before treating an AI shot as production-ready, require:
  - a matching endpoint frame and first/last-frame conditioning;
  - reference images for identity;
  - controlled retakes and manual repair of anatomy defects;
  - a higher-resolution source frame;
  - a rights review for the generated asset.

This is a provisional direction based on one real shot. It should be validated
with a small controlled retake set before adoption.

## K. Next Smallest Action

1. **Rename the local `.env` variable** from `OPENAI_API_KEY` to
   `GEMINI_API_KEY`. Do not change the secret value. This prevents future
   provider-selection ambiguity.
2. **Create a matching endpoint frame** showing the same bird calmly perched on
   the same branch, with folded wings and feet gripping, using the brief in
   `INPUT_ASSET_AUDIT.md`.
3. With separate spending approval, run **one** 3-second, 720p first/last-frame
   generation using Variant A (minimal motion) or the endpoint prompt. This is
   the smallest test that directly addresses the two observed failures:
   detached far wing and identity drift.
4. Compare that retake against this shot and the baseline. Do not run a batch of
   paid retries.
5. If endpoint conditioning removes the wing artifact and holds identity,
   promote the hybrid direction to a small shot-type pilot. If it does not,
   keep AI video limited to backgrounds/atmospherics and continue deterministic
   character work.

Until new approval is granted, the experiment stops here. No push occurred. No
Phase 3 work was started.
