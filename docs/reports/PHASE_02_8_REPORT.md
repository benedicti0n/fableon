# Phase 2.8 Completion Report

- **Phase:** 2.8 — AI Image-to-Video Feasibility & Animation Quality Benchmark
- **Date:** 2026-11-09
- **Branch:** `main`
- **Starting baseline:** `c869d1c` (Phase 2.7 Gate 2)
- **Research/preflight head before this report:** `0af4c09`
- **Status:** **BLOCKED — PREMIUM SOURCE FRAME AND PAID-GENERATION AUTHORIZATION REQUIRED**
- **Next phase:** Not started

## A. Executive Summary

Phase 2.8 completed provider research, source-artwork audit, prompt engineering,
and a precise generation preflight. It did **not** generate an AI video and did
**not** perform a visual comparison, because two mandatory gates are unmet:

1. no clean, premium 16:9 starting frame exists;
2. the authorized paid-generation budget is **$0.00**, and no provider
   credentials are configured.

No provider was called. No fake video, selected frames, contact sheet, or
quality score was created.

What was genuinely completed:

- a dated, official-source provider evaluation;
- a provisional provider selection;
- an honest source artwork audit;
- complete primary and variant animation prompts;
- exact start/end-frame generation briefs;
- a clear cost/execution preflight.

The correct recommendation is **INSUFFICIENT EVIDENCE**: there is no real
generated footage to compare with the deterministic Fableon rig.

## B. Initial Repository State

- **Starting HEAD:** `c869d1c`
- **Branch:** `main`
- **Working tree:** clean
- **Previous capabilities preserved:** Phase 0–2.7 schema, renderer, paint engine,
  illustration pipeline, `/studio`, `/studio/assets`, all earlier benchmark
  routes, and the Phase 2.7 Gate 2 animation.
- **Current machine:** Apple M1, 7-core GPU, 8 GB unified memory, no NVIDIA CUDA.
- **Existing deterministic baseline:**
  `docs/benchmarks/phase-02-7-gate2/landing-preview.mp4` — 1920×1080, 48 frames,
  24 FPS, 2.000 s.

No code or previous benchmark artifact was modified.

## C. Provider Research

Full dated research: `docs/research/PHASE_02_8_VIDEO_PROVIDERS.md`.

| Provider/model                   | Current status                | Image-to-video                       | Duration / resolution                                              | Cost evidence                               | Assessment                           |
| -------------------------------- | ----------------------------- | ------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------ |
| **Google Gemini Omni 1.2 Flash** | GA, Gemini API paid tier      | Yes; first+last frames; up to 6 refs | 3–15 s; 16:9; 720p native, 1080p/4K upscaled                       | ~$0.07/s 720p; ~$0.104/s 1080p upscaled     | **Best overall / economical**        |
| **Kling 3.0 / 3.0 Omni**         | Available via Kling API       | Yes; start/end frames, elements      | 3–15 s; 720p/1080p/4K; native audio                                | 6–12 credits/s; USD/credit unverified       | Strong alternative                   |
| **Luma Ray 3.2**                 | Available via Luma Agents API | Yes; start/end/multi-keyframe        | 5/10 s; 720p/1080p                                                 | 100/400 credits per 5 s; USD plan-dependent | Best keyframe control                |
| **Runway Gen-4.5**               | Available via Runway Dev      | Yes                                  | 5/10 s per API input guide; exact output details account-dependent | $0.12/s                                     | Credible premium alternative         |
| **OpenAI Sora 2 / Pro**          | **Not available**             | Historical only                      | API shut down 2026-09-24                                           | Not purchasable                             | Not eligible                         |
| **Wan2.2 local**                 | Open source Apache-2.0        | Yes                                  | I2V-A14B 80 GB VRAM; TI2V-5B 24 GB / 720p 24 fps                   | No API fee; hardware/compute                | Best local, not feasible on this Mac |

Provider selection:

- **Best overall:** Gemini Omni 1.2 Flash, 720p, 3-second first test.
- **Best economical:** Gemini Omni 1.2 Flash 720p (~$0.21 for one 3 s attempt).
- **Best local:** Wan2.2 TI2V-5B, but 24 GB VRAM is unavailable on the current
  8 GB M1; no download/run attempted.
- **Best control alternative:** Luma Ray 3.2 (start/end/multi-keyframe) or Kling
  3.0 Omni (element/start-end consistency).

These are documented-capability rankings, not measured artistic-quality scores.
No generated provider footage exists.

## D. Input Artwork

Full audit: `docs/benchmarks/phase-02-8/INPUT_ASSET_AUDIT.md`.

Available:

- approved character reference sheet at
  `assets/premium-bird-v1/references/approved-master-reference.png` (1536×1024);
- reconstruction reference board (1536×1024);
- Phase 2.7 Gate 2 1920×1080 diagnostic frames;
- Phase 2.5/2.6 diagnostic frames and public procedural assets;
- Phase 2.7 forest preview (diagnostic).

Not suitable for video conditioning:

- the master reference is a multi-pose, labeled character sheet with typography,
  diagrams, and multiple birds;
- the Phase 2.7 frames are low-resolution candidate art with a procedural forest
  and visible matte/seam defects;
- cropping the sheet onto a background would fabricate a premium frame.

**Missing:** one clean premium 16:9 start frame and optional endpoint frame.

Required paths if supplied:

```text
assets/premium-video-v1/start-frame.png
assets/premium-video-v1/end-frame.png
```

No placeholder files or fake source art were created.

A diagnostic frame
(`docs/benchmarks/phase-02-7-gate2/selected-frames/frame-016.png`) may be used only
for a zero-cost technical smoke test, explicitly labeled
**DIAGNOSTIC INPUT — NOT ARTISTIC VALIDATION**. It cannot answer the artistic
question.

## E. Prompt Engineering

Full prompt set: `docs/benchmarks/phase-02-8/ANIMATION_PROMPTS.md`.

- Primary balanced prompt: flight → braking → leg extension → branch contact →
  wing fold → tail follow-through → perched settle.
- Variant A: minimal motion, identity/background stability first.
- Variant B: balanced motion (primary).
- Variant C: expressive motion, only after A/B prove consistency.
- Optional first/last-frame interpolation prompt.
- Negative constraints: no extra wings/legs/eyes, no identity/species change,
  no morphing, no teleporting, no foot sliding, no text, no camera cuts/zooms,
  no background morphing, no exaggerated physics.
- The prompt explicitly requests a static camera, one bird, preserved painted
  texture, and no audio performance.

Provider note: Omni supports 3–15 s, so the original 3 s generation would be
retained and a **derived** 2 s evaluation clip labeled. A native 2-second output
cannot be claimed.

## F. Generation Preflight

Full preflight: `docs/benchmarks/phase-02-8/GENERATION_PREFLIGHT.md`.

| Item              | Value                                                 |
| ----------------- | ----------------------------------------------------- |
| Provider          | Google                                                |
| Model             | `gemini-omni-1.2-flash`                               |
| Mode              | Image-to-video                                        |
| Aspect            | 16:9                                                  |
| Resolution        | 720p native (1080p is upscaled)                       |
| Duration          | 3 s (minimum)                                         |
| Planned attempts  | 2 maximum, no automatic retries                       |
| One 3 s attempt   | ~$0.21                                                |
| Two 3 s attempts  | ~$0.42                                                |
| Authorized budget | **$0.00**                                             |
| Source image      | **MISSING**                                           |
| Credentials       | **ABSENT** (`GEMINI_API_KEY`, `GOOGLE_API_KEY`, etc.) |
| Execution status  | **NOT AUTHORIZED**                                    |

The provider request example is documented but was **not executed**. No external
network call was made. The proposed $0.42 cap is a request for future approval,
not authorization.

## G. Generated Footage

**BLOCKED — NO VIDEO EXISTS.**

The following were deliberately not created:

- `docs/benchmarks/phase-02-8/generated/original-video.mp4`
- `docs/benchmarks/phase-02-8/generated/evaluation-clip.mp4`
- `docs/benchmarks/phase-02-8/generated/metadata.json`
- selected frames
- contact sheet
- comparison video

No provider output was upscaled, interpolated, or passed off as Fableon output.
The Python/Pillow preview from Phase 2.7 was not used.

## H. Visual Evaluation

**NOT RUN — INSUFFICIENT EVIDENCE.**

No artistic-quality, character-consistency, motion, temporal-stability,
directability, or storybook-suitability scores are assigned because no real AI
video exists.

The only valid comparison baseline remains
`docs/benchmarks/phase-02-7-gate2/landing-preview.mp4` — Fableon's deterministic
Gate 2 render, which is itself a candidate, not approved production art.

## I. Cost Analysis

- **Actual AI-video spend:** **$0.00**
- **Provider calls:** **0**
- **Estimated first attempt:** ~$0.21 (3 s, 720p, Omni)
- **Estimated two attempts:** ~$0.42
- **Unknown:** start-frame generation cost, retries, failed-generation charges,
  human editing time, and provider price changes.
- No paid request, bulk generation, scheduler, or automatic retry was created.
- No provider account, billing integration, or credentials were added.

## J. Engineering Verification

Documentation-only phase; no application code changed. Existing repository
health was verified:

| Check               | Result                         |
| ------------------- | ------------------------------ |
| `pnpm install`      | PASS — already up to date      |
| `pnpm format:check` | PASS                           |
| `pnpm lint`         | PASS                           |
| `pnpm typecheck`    | PASS                           |
| `pnpm test`         | PASS — 24 files, **193 tests** |
| `pnpm build`        | PASS                           |
| `pnpm test:browser` | PASS — **45/45 tests**         |

Preserved routes include `/`, `/studio`, `/studio/assets`,
`/benchmarks/phase-02`, `/benchmarks/phase-02-5`, `/benchmarks/phase-02-6`, and
`/benchmarks/phase-02-7-gate2`.

No AI generation was run during tests or CI.

## K. Recommendation

**INSUFFICIENT EVIDENCE.**

None of the three architecture directions can be recommended on the current
evidence:

- **AI-first** — no generated footage exists.
- **Hybrid** — plausible, but unproven without one real AI shot.
- **Deterministic-first** — the existing rig works and is deterministic, but the
  Phase 2.7 artwork still has serious seams/halos and low resolution; it is not
  a satisfactory artistic reference.

The provider research supports Omni as the best first experiment, but selecting
a provider is not the same as validating quality. The correct next step is one
real, controlled shot — not more infrastructure.

## L. Next Action

Smallest next action required to advance:

1. **Supply or generate a clean 16:9 premium start frame** at
   `assets/premium-video-v1/start-frame.png` using the brief in
   `INPUT_ASSET_AUDIT.md`. Optional endpoint:
   `assets/premium-video-v1/end-frame.png`.
2. **User approves** Gemini Omni 1.2 Flash at 720p with a **$0.42 maximum** for
   up to two 3-second attempts (or a **$0.21** one-attempt cap).
3. Configure `GEMINI_API_KEY` outside the repository and re-run the preflight.
4. Execute **one** balanced 3-second image-to-video attempt.
5. Preserve the original MP4; evaluate it against the Phase 2.7 Gate 2 baseline;
   derive a labeled 2-second clip only if needed.
6. Only after real footage is reviewed, choose AI-first, hybrid, or
   deterministic-first.

Until those gates are met, Phase 2.8 remains blocked. No push occurred. No Phase 3
work was started.

## Final Repository State

Phase 2.8 documentation commits:

```text
1c0d9ea docs(research): evaluate ai video providers for fableon
c27490b docs(art): prepare image-to-video source requirements
0af4c09 docs(benchmark): define bird landing generation prompts and preflight
this report docs(report): record phase 2.8 feasibility findings
```

Working tree is clean after this report commit. `incoming/` and provider
credentials are not committed. No generated video or fake evaluation artifact
was added.
