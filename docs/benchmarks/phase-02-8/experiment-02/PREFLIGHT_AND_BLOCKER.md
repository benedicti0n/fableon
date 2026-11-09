# Phase 2.8 Experiment 2 — First/Last-Frame Preflight and Blocker

**Date:** 2026-11-09  
**Status:** **BLOCKED BEFORE PAID GENERATION — ENDPOINT FRAME IS NOT COMPATIBLE WITH THE START FRAME**  
**Provider:** Google Gemini  
**Model:** `gemini-omni-1.2-flash`  
**Planned request:** 3 seconds, 720p native, 16:9, start + end frame conditioning  
**Spend:** **$0.00** — no API request was made  
**Video artifacts:** None created

## 1. Decision

The supplied endpoint frame is a different scene from the start frame. It is not
a continuation of the same camera, forest, branch, lighting, or character
proportions. Using it as a last-frame condition would ask the model to
interpolate between two incompatible compositions, which is exactly the failure
mode this experiment was meant to avoid.

**Stop before any paid call.** Do not submit the request until a matching
endpoint frame is supplied or generated from the start frame.

## 2. Repository state

- **Starting HEAD:** `67b46dc`
- **Branch:** `main`
- **Working tree before this check:** clean
- **New untracked input:** `assets/premium-video-v1/end-frame.png`
- **Prior Experiment 1 artifacts:** preserved unchanged
- **No push performed**

## 3. Credentials and provider capability

The local `.env` now contains `GEMINI_API_KEY`. Presence was verified; the
value was not printed, logged, copied into documentation, or committed.

Current Gemini documentation (accessed 2026-11-09) confirms:

- `gemini-omni-1.2-flash` supports image-to-video and first/last-frame
  interpolation.
- First/last-frame interpolation supports **3 to 10 seconds**.
- Two images are supplied in the request input list, followed by a text prompt.
- 720p is the native/default output tier; 1080p and 4K are upscaled.
- Standard pricing is **$12.00 per 1M video tokens**; 720p uses approximately
  **5,792 tokens per second**, or about **$0.07/s**.
- A 3-second 720p attempt is approximately **$0.21**, within the **$0.25**
  experiment cap.

The provider and budget are viable. The **input gate** is the blocker.

## 4. Input assets

| Property            | Start frame                                                        | End frame                                                          |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Path                | `assets/premium-video-v1/start-frame.png`                          | `assets/premium-video-v1/end-frame.png`                            |
| Dimensions          | 1672×941                                                           | 1672×941                                                           |
| Aspect ratio        | 1.7768:1                                                           | 1.7768:1                                                           |
| Format              | PNG, 8-bit RGB, non-interlaced                                     | PNG, 8-bit RGB, non-interlaced                                     |
| Size                | 2,970,254 bytes                                                    | 2,932,950 bytes                                                    |
| SHA-256             | `3bd6ed479b7febc43c25fcb44b46f68d760d335ecfe9bdd7c4d6b8c725a0e9d1` | `e3bec87ff5f258ba0fd08639cc80fc18ff5aefcbb0895fd59b05928d5b15eed7` |
| One bird            | Yes                                                                | Yes                                                                |
| Typography / labels | None                                                               | None                                                               |
| Multiple birds      | No                                                                 | No                                                                 |
| Alpha channel       | None                                                               | None                                                               |

Both files decode correctly and pass the basic technical checks: same
dimensions, same aspect ratio, one bird, no text, no labels, no checkerboard,
no multiple character copies.

Provenance for both: user-supplied; macOS metadata records a download source of
`https://chatgpt.com/`. No embedded license or authorship metadata was found.
Neither image is a cleared production asset.

## 5. Compatibility findings

| Check                                               | Result                                                                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Same dimensions                                     | **PASS** — 1672×941                                                                           |
| Same aspect ratio                                   | **PASS** — 1.7768:1                                                                           |
| Both decode                                         | **PASS**                                                                                      |
| One bird / no text                                  | **PASS**                                                                                      |
| Same camera framing                                 | **FAIL**                                                                                      |
| Same forest layout                                  | **FAIL**                                                                                      |
| Same tree positions                                 | **FAIL** — dominant trunk is on the right in the start frame and on the left in the end frame |
| Same branch geometry                                | **FAIL** — thin curved branch vs thick lower branch with different contact area               |
| Same lighting direction                             | **FAIL** — warm beams from upper right vs upper center/left                                   |
| Same character proportions                          | **FAIL** — slender, long-tailed bird vs rounder, shorter-tailed bird                          |
| Same facial identity                                | **FAIL** — eye size, beak shape, head/body ratio, and wing markings differ                    |
| Suitable for reliable first/last-frame conditioning | **FAIL**                                                                                      |

## 6. Visual mismatch detail

### Background and tree placement

- **Start frame:** a large textured tree trunk occupies the right edge. The
  forest opens toward the center with vertical trunks and a bright sunlit gap.
  The branch emerges from the lower left and curves up toward the right trunk.
- **End frame:** a large tree trunk occupies the left side. The branch is much
  thicker, lower, and more horizontal, with a broad mossy top. The forest
  layout, trunk spacing, and depth cues do not match the start frame.

### Branch geometry and landing area

- The start branch is comparatively thin, curved, and moss-covered, with a
  readable contact area in the lower-right third.
- The end branch is a thick, broad, nearly horizontal limb with different moss
  distribution and a different perch location.
- These are not the same physical branch. A model conditioned on both would
  have to morph or replace the branch during the landing.

### Lighting

- Start: strong warm sunbeams from the **upper right**, with the brightest
  patch near the right trunk and a cooler, misty center.
- End: bright sunbeams from the **upper center/left**, with a warmer, more
  evenly lit canopy and different shadow direction.
- Relighting the forest mid-shot would be a visible continuity failure.

### Camera and composition

- Start: bird in flight at the left of center, wings raised, body angled toward
  the branch; the branch occupies the lower-right third.
- End: bird perched at center-right, wings folded, body larger in frame; the
  branch fills the lower third.
- The subject scale and placement are not a continuation of the same static
  camera setup.

### Character identity

- Start bird: slender body, long blue tail, longer wings, smaller eye, finer
  beak, more articulated feather layers.
- End bird: rounder body, shorter tail, larger eye, shorter/thicker beak,
  simplified wing markings, different head-to-body ratio.
- The palette family is similar (chestnut, cream, golden ochre, slate blue), but
  the character is not the same construction or proportion.

## 7. Quantitative diagnostics

Global comparison of the two source PNGs at native resolution:

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

The mismatch is global, not limited to the bird’s pose. This is not a compatible
start/end pair.

## 8. Side-by-side evidence

- `docs/benchmarks/phase-02-8/experiment-02/start-end-comparison.png` —
  left: start frame; middle: end frame; right: amplified absolute difference.
- `docs/benchmarks/phase-02-8/experiment-02/start-end-bird-crops.png` —
  left: start bird crop; right: end bird crop.

The difference panel is dominated by background structure, confirming that the
forest, branch, and lighting changed, not just the bird pose.

## 9. Why this blocks generation

Gemini’s first/last-frame mode is designed to interpolate a continuous
transition between two images. When the images disagree on scene geometry, the
model has three bad options:

1. morph the background and branch to reconcile them;
2. snap or cut between compositions;
3. ignore one endpoint and animate only one image.

All three would invalidate the experiment. The correct action is to fix the
endpoint asset, not to spend money and hope the model resolves an impossible
transition.

## 10. Required corrections

The endpoint must be generated from the **same start frame and camera setup**,
or authored to match it. It should preserve:

1. **Camera:** identical framing, focal length, subject scale, and composition.
2. **Forest:** same trunk positions, canopy density, depth layers, and color
   temperature.
3. **Branch:** same physical branch, same curve, thickness, moss distribution,
   and landing contact area.
4. **Lighting:** same sun direction, beam pattern, highlight placement, and
   shadow direction.
5. **Character:** same head/body ratio, eye size, beak shape, tail length,
   wing markings, feather layers, and palette.
6. **Pose:** the bird perched on the same branch, wings folded, feet gripping,
   in a pose that can be reached from the start frame within 3 seconds.

Recommended workflow: use the start frame plus the approved character
reference to generate a matching endpoint, then re-run this compatibility check
before any paid video request. Do not use a separately composed scene.

A useful screening gate is:

- identical dimensions and aspect ratio;
- matching trunk/branch landmarks;
- matching lighting direction;
- visually consistent character construction;
- no typography or multiple birds.

SSIM alone is not a sufficient gate because the bird pose legitimately changes
between start and end. The background and branch must be inspected directly.
For reference, the current pair’s SSIM of **0.145** is far below what a genuine
same-camera continuation would produce.

## 11. Cost and spend

| Item                                 |                      Value |
| ------------------------------------ | -------------------------: |
| Paid API requests                    |                      **0** |
| Spend                                |                  **$0.00** |
| Estimated 3 s 720p cost if unblocked |                     ~$0.21 |
| Experiment cap                       |                      $0.25 |
| Interaction ID                       | None — no request was made |
| Video artifacts                      |                       None |

No request was submitted, so there is no usage record, no interaction ID, no
generated MP4, and no billable charge from this experiment.

## 12. What was deliberately not created

- `original-video.mp4`
- `metadata.json`
- `contact-sheet.png`
- `selected-frames/`
- `comparison-with-experiment-01.mp4`
- `cost-report.json`
- `EVALUATION.md` with fabricated scores

Only the input-comparison evidence and this blocker document were created.

## 13. Next action

1. Generate or author a matching endpoint frame from the start frame.
2. Re-run the side-by-side and quantitative compatibility check.
3. If the endpoint passes, submit **one** 3-second, 720p, 16:9 first/last-frame
   request under the $0.25 cap.
4. If it fails again, stop and report the specific mismatch; do not spend.

No Phase 3 work was started. No push was performed.
