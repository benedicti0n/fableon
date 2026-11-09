# Phase 2.8 — AI Video vs Fableon Baseline Evaluation

**Evaluated:** 2026-11-09  
**AI artifact:** `docs/benchmarks/phase-02-8/generated/original-video.mp4`  
**Baseline:** `docs/benchmarks/phase-02-7-gate2/landing-preview.mp4`  
**Status:** Real generated footage evaluated. Scores are qualitative and
evidence-based; artistic approval remains with the user.

> The AI shot is visually far richer than the baseline, but it is **not
> production-clean**. A detached far-wing artifact appears during braking, and
> the bird’s identity drifts between the first and final frames. These are
> observed defects, not speculative risks.

## 1. Artifacts and viewing order

| Artifact             | Path                                                      | Notes                                                                         |
| -------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Original AI video    | `generated/original-video.mp4`                            | 3.029 s, 1280×720, 24 fps, H.264 + AAC, unchanged                             |
| Derived 2 s clip     | `generated/evaluation-clip.mp4`                           | First 2.0 s, re-encoded, audio removed; **derived**                           |
| AI contact sheet     | `contact-sheet.png`                                       | 12 frames at 4 fps across the full 3.029 s                                    |
| Selected AI frames   | `selected-frames/frame-{0.0,0.5,1.0,1.5,2.0,2.5,2.9}.png` | Full-resolution evidence                                                      |
| Side-by-side video   | `comparison-side-by-side.mp4`                             | Left: Fableon (gray border); right: AI first 2 s (gold border)                |
| Synchronized frames  | `comparison-frames.png`                                   | Rows top-to-bottom: 0.0, 0.4, 0.8, 1.2, 1.6, 1.958 s; left baseline, right AI |
| Wing defect at 0.8 s | `defects/01-detached-far-wing-0.8s.png`                   | Far wing reads as attached to the head/neck                                   |
| Wing defect at 1.4 s | `defects/02-detached-far-wing-1.4s.png`                   | Detached white wing/feather shape near the beak                               |
| Identity comparison  | `defects/03-source-vs-final-identity.png`                 | Left: supplied source; right: final AI frame                                  |
| Metadata             | `generated/metadata.json`                                 | Provider, model, prompt, usage, cost, hashes                                  |

The side-by-side video and synchronized-frame sheet are comparison aids. The
original AI MP4 remains the authoritative artifact.

## 2. Technical facts

### AI output

| Property           | Value                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| Provider / model   | Google / `gemini-omni-1.2-flash`                                         |
| Interaction ID     | `v1_Chd0cGZ4YXAzNEV2UE00dDRQaFBDVGdBOBIXdHBmeGFwMzRFdlBNNHQ0UGhQQ1RnQTg` |
| Duration           | 3.029 s (72 video frames at 24 fps)                                      |
| Resolution         | 1280×720                                                                 |
| Frame rate         | 24 fps                                                                   |
| Codec              | H.264 video; AAC stereo audio, 48 kHz                                    |
| Native/upscaled    | 720p native                                                              |
| Attempts           | 1                                                                        |
| Latency            | 38.587 s                                                                 |
| Usage-derived cost | **$0.217147**                                                            |
| Original SHA-256   | `76fc11f30d36732b0149fe00624a4dfcdc88e5a6f22388ddde2971faf7e738bf`       |

The 3-second minimum is a provider constraint. The original is retained; the
2-second evaluation clip is derived and labeled. No frame interpolation was
used.

### Baseline

| Property       | Value                                         |
| -------------- | --------------------------------------------- |
| Duration       | 2.000 s                                       |
| Resolution     | 1920×1080                                     |
| Frame rate     | 24 fps                                        |
| Codec          | H.264                                         |
| Artwork status | Gate 2 candidate, not approved production art |
| Background     | Diagnostic Phase 2.5 procedural forest        |

Baseline limitations are already documented in
`docs/benchmarks/phase-02-7-gate2/QUALITY_ASSESSMENT.md`: visible matte seams,
halos, low-resolution parts, rigid wing rotation, flat foot contact, and a
diagnostic background. Those limitations are not re-scored as new discoveries.

## 3. Observed sequence

The AI shot follows the requested beat structure:

1. **0.0–0.5 s:** the bird is in flight, wings raised, matching the source
   composition closely.
2. **0.5–1.0 s:** the bird approaches the branch, extends its legs, and begins
   braking. The far wing becomes anatomically ambiguous.
3. **1.0–1.5 s:** the feet contact the branch; the wings remain spread. A
   detached white wing-like shape appears behind the head/beak.
4. **1.5–2.0 s:** the wings fold and the body settles.
5. **2.0–3.0 s:** the bird remains perched; the forest and branch stay broadly
   stable.

The camera remains static. No cut, zoom, or camera shake was observed. No text,
labels, extra birds, or new objects were observed.

## 4. Criterion-by-criterion evaluation

### A. Artistic quality

**AI: 8/10.** The forest is richly layered, the sunlight and atmospheric depth
are convincing, and the painted surface reads as a premium storybook
illustration. The composition is strong and the bird remains the focal point.
The look is slightly smoother and more “AI-polished” than a hand-painted
original, but it is far beyond the baseline.

**Baseline: 3/10.** The flat green background, repeated leaf dashes, simple
trunks, low-resolution cutout character, and visible matte seams do not read as
premium storybook art.

### B. Character consistency

**AI: 4/10.** The palette and general species remain recognizable, but the
final bird is rounder, with a shorter beak, larger eye, shorter tail, and
simplified wing markings. The wing attachment fails during braking: at
approximately 0.8–1.4 s the far wing reads as a detached shape emerging from
the head/neck area. This is the most serious defect.

**Baseline: 6/10.** The same nine-part character is used throughout, so identity
does not morph. However, the character is a low-resolution candidate with
head/neck seams, wing-root halos, and inferred anatomy. Consistency is achieved
partly by keeping the character simple.

### C. Motion naturalness

**AI: 5/10.** The shot includes flight, braking, leg extension, branch contact,
wing fold, and a settle. The wing beats have some weight, and the final foot grip
is plausible. The braking phase is where it fails: the far wing is incorrectly
attached, and the landing transition has a small pose/scale pop around 1.17 s.

**Baseline: 2/10.** Wings rotate as rigid plates; there is no true braking
deformation, soft-body settling, or toe grip. Foot contact is registered but
flat.

### D. Temporal stability

**AI: 5/10.** The background is broadly stable, with no obvious flicker or
morphing trunks. The main temporal failure is the detached far-wing artifact
and the identity change across the landing. Consecutive-frame difference peaks
at frame 28 (~1.17 s), consistent with the landing transition.

**Baseline: 8/10.** Deterministic rendering produces stable frames with no
flicker or warping. The trade-off is rigid, limited motion.

### E. Background stability

**AI: 8/10.** The forest layout, branch geometry, sunlight direction, and
flower positions remain coherent across the shot. A first/last background probe
showed a small mean absolute difference (2.242 on a 320×180 grayscale probe),
consistent with subtle atmospheric movement/compression rather than gross
morphing. No disappearing trunks or branch teleportation were observed.

**Baseline: 3/10 for artistic quality, 9/10 for stability.** The background is
essentially static, but it is a diagnostic procedural forest, not premium art.

### F. Controllability

**AI: 4/10 based on demonstrated behavior.** The prompt controlled the shot
type, static camera, landing sequence, and forest stability. The model did not
preserve exact character identity or wing anatomy. The provider documents
reference images, first/last-frame interpolation, and conversational editing,
but those controls were **not tested** in this experiment. Do not claim
demonstrated repeatability.

**Baseline: 9/10.** Deterministic coordinates, exact character pack, repeatable
renders, and precise retakes. This is the baseline’s strongest advantage.

### G. Economics

| Metric                |                                    Value |
| --------------------- | ---------------------------------------: |
| Attempts              |                                        1 |
| Failed attempts       |                                        0 |
| Provider latency      |                                 38.587 s |
| Usage-derived cost    |                            **$0.217147** |
| Authorized cap        |                                    $1.00 |
| Remaining under cap   |                            **$0.782853** |
| Estimated retake cost |             ~$0.217 per 3 s 720p attempt |
| Human editing time    | None performed; repair time not measured |

The shot is visually strong but not production-clean. If accepted as an
animatic, background plate, or stylized shot requiring minor repair, the cost
per usable shot is $0.217. If a clean hero shot is required, **no fully usable
shot has yet been obtained**, and the cost per clean shot is not established.

## 5. Scores

Scores are 1–10 qualitative judgments supported by the observations above.
They are not a certified artistic rating.

| Criterion              | AI video | Fableon baseline | Evidence summary                                                               |
| ---------------------- | -------: | ---------------: | ------------------------------------------------------------------------------ |
| Artistic quality       |    **8** |                3 | AI has premium painterly forest/light; baseline is flat and low-resolution     |
| Character consistency  |    **4** |                6 | AI drifts and detaches a wing; baseline keeps one simple rig                   |
| Motion naturalness     |    **5** |                2 | AI has real flight/braking/fold beats but a broken far wing; baseline is rigid |
| Temporal stability     |    **5** |                8 | AI background stable but anatomical pop; baseline deterministic                |
| Directability          |    **4** |                9 | AI prompt-controlled only; baseline exact and repeatable                       |
| Storybook suitability  |    **8** |                3 | AI strongly evokes a painted picture book; baseline does not                   |
| Production suitability |    **4** |                3 | AI needs wing/identity repair; baseline needs new artwork and deformation      |

The AI wins the artistic and storybook criteria decisively. The baseline wins
consistency, temporal stability, and directability. Neither is production-ready
as-is.

## 6. Quantitative diagnostics

These are rough diagnostics, not artistic scores.

| Metric                          |                          AI |                    Baseline |
| ------------------------------- | --------------------------: | --------------------------: |
| Consecutive-frame MAD, mean     |                       1.945 |                       2.349 |
| Consecutive-frame MAD, median   |                       1.701 |                       1.906 |
| Consecutive-frame MAD, p95      |                       4.213 |                       5.225 |
| Consecutive-frame MAD, max      | 4.817 at frame 28 (~1.17 s) | 6.418 at frame 12 (~0.50 s) |
| First/last background-probe MAD |                       2.242 |                       0.013 |

First-frame fidelity to the supplied source:

| Metric             |  Value |
| ------------------ | -----: |
| SSIM, all channels | 0.7695 |
| SSIM, R            | 0.8102 |
| SSIM, G            | 0.8169 |
| SSIM, B            | 0.6814 |

The first frame preserves composition and most structure but is a re-rendered
interpretation, not a pixel-identical copy of the source. The lower blue-channel
SSIM is consistent with the visible palette/wing-detail shift.

## 7. Defect summary

| ID     | Severity         | Observation                                                                                                      | Evidence                                                                         |
| ------ | ---------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| AI-D01 | **Major**        | Far wing detaches/reads as emerging from the head/neck during braking, ~0.8–1.4 s                                | `defects/01-detached-far-wing-0.8s.png`, `defects/02-detached-far-wing-1.4s.png` |
| AI-D02 | **Major**        | Character identity drifts: rounder body, shorter beak, larger eye, shorter tail, simplified markings             | `defects/03-source-vs-final-identity.png`                                        |
| AI-D03 | **Minor–Major**  | Small pose/scale pop at the landing transition (~1.17 s)                                                         | `generated/metadata.json` diagnostic, frame 28                                   |
| AI-D04 | **Minor**        | First frame is a re-render; blue-channel detail/palette shifts from source                                       | SSIM table; `selected-frames/frame-0.0.png`                                      |
| —      | **Not observed** | No duplicate legs/feet; final grip is plausible; no text, extra birds, cuts, zooms, or gross background morphing | Selected frames, contact sheet                                                   |

## 8. What this proves and does not prove

**Proved by this execution:**

- Gemini Omni 1.2 Flash can generate a real 3.029 s, 1280×720, 24 fps
  image-to-video shot from the supplied frame.
- The provider completed the request in 38.587 s at a usage-derived cost of
  **$0.217147**.
- The model can produce a convincing painterly forest, static camera, landing
  approach, branch contact, wing fold, and perched settle.
- The background can remain broadly stable over the shot.

**Not proved:**

- Reliable character identity across the full shot or across retakes.
- Production-clean wing anatomy.
- Repeatability of a satisfactory result.
- 1080p native quality (the output is 720p native).
- First/last-frame or reference-image control (not tested).
- Commercial rights or suitability of the AI-generated frame.
- Long-term cost per usable shot.

## 9. Evaluation conclusion

The result is **artistically promising but anatomically flawed**. It is strong
evidence that AI image-to-video can produce a more beautiful storybook image
than the current deterministic rig, but it is also evidence that character
consistency and precise anatomy remain weak points.

The appropriate provisional architecture is **Hybrid**, not AI-first:

- use AI video for painterly establishing shots, distant action, atmosphere,
  backgrounds, and shots where slight identity drift is acceptable;
- keep Fableon’s deterministic renderer for close character acting, exact
  contact, repeatable motion, titles, diagrams, and shots requiring exact
  identity;
- require endpoint conditioning, reference images, retakes, and manual repair
  before an AI shot is treated as production-ready.

This conclusion is based on one shot and must be validated with controlled
retakes before adoption.
