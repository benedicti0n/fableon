# Phase 4.1 — Visual Quality Review

**Film:** `outputs/where-the-light-lands/final.mp4`  
**SHA-256:** `61ef10891b96d09eeb06d88bf8bcd9b2477b30514ff87b9d5e64a8e8ea88bf62`  
**Method:** decoded MP4 frames only; no expected illustrations were used for judgment.  
**Reviewer:** automated agent visual inspection, pending human sign-off.

The scores below are informed estimates grounded in specific decoded frames and defect
crops. They are not measurements. Objective measurements are in
`VIDEO_INTEGRITY.md`, `motion-analysis.json`, and `PREVIEW_EXPORT_COMPARISON.md`.
Artistic acceptance remains **PENDING USER REVIEW**.

## What the film actually shows

The 30-second film has a clear four-beat structure:

1. **0.0–6.0 s — Awakening Forest.** A dark fade opens on a golden, misty forest with
   a painted branch and trunk. The camera drifts right and pushes in slightly. The
   title “Where the Light Lands” appears at 3.0 s. The bird enters late in the shot.
2. **6.0–15.0 s — Little Bird in Flight.** The bird crosses the forest left to right
   with a repeating wing beat. The camera tracks the flight. The bird remains a
   side-on cutout; its body does not bank or pitch with the flight path.
3. **15.0–22.0 s — The Landing.** The bird descends toward the branch, makes contact,
   and settles. The approach and settle read, though the crossfade into this shot
   briefly shows two birds.
4. **22.0–30.0 s — A Place to Rest.** The bird stands on the branch, wings folded,
   with a small idle. The ending line appears at 28.0 s and the film fades out.

The story is legible without narration: forest → flight → landing → rest, framed by two
title cards. The palette, lighting direction, and branch/trunk composition stay
consistent across shots.

## Scorecard

| Criterion                  | Score /10 | Evidence                                                                                                                                                                                                                  | Confidence |
| -------------------------- | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Illustration quality       |     **4** | Painted forest has a pleasant mood but is a single 852×479 crop upscaled to 2400×1350 (documented in `ASSET_PROVENANCE.md`); at 1080p it reads soft. Character parts are low-resolution candidate art with visible seams. | High       |
| Character design           |     **4** | The bird is appealing in silhouette and color, but the head/body join, wing-root edge, and belly cutout are visibly assembled from separate raster parts. Pack manifest marks the art “not approved for production”.      | High       |
| Wing animation             |     **5** | Flap cycles are visible and readable at 6.5–14.5 s, but wings rotate as rigid cutouts with no feather overlap, bend, or body-volume change.                                                                               | Medium     |
| Flight naturalness         |     **5** | Trajectory is smooth and eased, but the bird glides side-on with dangling feet and no banking, pitch, or vertical body bob. It reads as a sprite moved along a path, not a flying animal.                                 | Medium     |
| Landing quality            |     **5** | Approach, contact, and settle are staged and timed. Feet are partly obscured by moss, and the landing is preceded by the ghosted 2→3 transition.                                                                          | Medium     |
| Environment quality        |     **4** | Attractive golden palette and atmospheric overlay, but only two painted parallax planes; the distant plane is a blurred duplicate of the same plate. No fine 1080p foliage detail.                                        | High       |
| Camera movement            |     **6** | Camera moves are smooth, eased, and free of jitter. Zooms stay conservative (1.00–1.16), and framing keeps the bird readable.                                                                                             | High       |
| Temporal consistency       |     **6** | No position jumps or corrupt frames; motion is continuous. Deductions for ghosted shot transitions and near-frozen tails at 5.79–5.96 s and 21.83–21.96 s.                                                                | High       |
| Shot transitions           |     **4** | Two crossfades overlay two full character states. Frames 364/368 show two birds; frames 532/536 show two eyes and two beaks. This is the most conspicuous visual defect.                                                  | High       |
| Story clarity              |     **7** | Four shots and two titles communicate a simple journey-and-rest arc. No dialogue or complex motivation is needed.                                                                                                         | Medium     |
| **Overall visual quality** |     **4** | Coherent as a technical demo, but not professional storybook quality because the artwork and cutout rig are visibly provisional.                                                                                          | Medium     |

**Technical correctness: 9/10.** The file is valid, complete, decodable, correctly sized,
correctly timed, silent as intended, and free of corrupt frames. This score does not raise
the artistic score.

## Confirmed visual defects

| ID   | Shot           | Frames / time                                        | Defect                                                                                                                  | Severity | Evidence                                                                                                  | Likely root cause                                                                                                                                                    | Recommended fix                                                                                                                                             |
| ---- | -------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V-01 | 2→3 transition | ≈360–370 / 15.00–15.42 s (representative 364, 368)   | Two birds visible at once: duplicate body, wing, and feet during crossfade.                                             | **P1**   | `defect-frames/transition-double-bird-frame-364-crop.png`, `...368-crop.png`                              | Crossfade blends two opaque character renders with mismatched positions instead of holding/matching the character.                                                   | Hold the outgoing or incoming character through the dissolve; crossfade only the environment; or match end/start poses before blending.                     |
| V-02 | 3→4 transition | ≈529–539 / 22.04–22.46 s (representative 532, 536)   | Double eye and double beak ghosting; face appears to split.                                                             | **P1**   | `defect-frames/transition-double-eye-frame-532-crop.png`, `...536-crop.png`                               | Same crossfade compositing issue; two head poses are alpha-blended at different scales/positions.                                                                    | Same fix as V-01; add a transition regression check that counts eye/beak features or measures character-pose delta.                                         |
| V-03 | 2, 3, 4        | 216 / 9.0 s; 492 / 20.5 s; 528 / 22.0 s              | White fringe and hard rectangular/alpha edges along belly, neck, and wing root; head/body seam visible as a sharp line. | **P2**   | `defect-frames/character-flight-fringe-frame-216-crop.png`, `character-perched-fringe-frame-492-crop.png` | Candidate parts cut from a reference board with baked light edges; drawn at `FILM_BIRD_SCALE = 2` from 65–266 px sources. Pack is explicitly `NOT_APPROVED_ARTWORK`. | Rebuild the bird as approved layered art with clean alpha, matched feather texture at seams, and native-resolution parts; add matte-decontamination passes. |
| V-04 | 1              | 72 / 3.0 s                                           | Background is soft at 1080p; foliage has little fine detail and visible painterly blur.                                 | **P2**   | `defect-frames/environment-upscale-softness-frame-072.png`                                                | Single 852×479 painted crop upscaled to 2400×1350, then camera-scaled; distant plane is a blurred copy of the same plate.                                            | Paint or generate a native 2400×1350+ background with separate foreground/midground/distant layers; stop deriving parallax from a blurred duplicate.        |
| V-05 | 2, 3           | 156 / 6.5 s; 216 / 9.0 s; 288 / 12.0 s; 492 / 20.5 s | Rigid cutout motion: whole-body translation, wing rotation only, no banking, body bob, head lead, or feather overlap.   | **P2**   | Contact sheet frames 156/216/288; motion is continuous but mechanically uniform.                          | Nine-part 2D sprite rig with no deformation or secondary motion; flight path is a two-point interpolation.                                                           | Add banking/pitch, body squash-and-stretch, head/tail overlap, and wing-root deformation; drive flight with a curved path and speed profile.                |
| V-06 | 4              | 672 / 28.0 s                                         | Closing line is small and sits low over the bird’s feet and busy moss; readability drops at normal viewing size.        | **P2**   | `defect-frames` contact sheet; full frame 672.                                                            | Text overlay uses a small type size and no dedicated lower-third treatment.                                                                                          | Increase type size, add a subtle gradient/scrim, and place the line in clean negative space.                                                                |
| V-07 | 1, 3           | 139–143 / 5.79–5.96 s; 524–527 / 21.83–21.96 s       | Near-frozen tails: consecutive-frame difference below 0.02 for at least three frames.                                   | **P3**   | `motion-analysis.json`                                                                                    | Eased camera endpoints and a held landing settle produce static tails.                                                                                               | Add a small idle/ambient drift or shorten the hold.                                                                                                         |
| V-08 | 3              | 492 / 20.5 s                                         | Foot contact is visually soft: toes are partly buried in moss and one foot sits lower than the other.                   | **P3**   | `defect-frames/landing-foot-contact-frame-492.png`                                                        | Feet are separate sprites without ground-depth sorting; moss is painted into the plate.                                                                              | Add contact shadows and a small ground-offset solve; keep toes above the moss line.                                                                         |

## What is actually good

- The film is watchable and the four-shot story is understandable on first viewing.
- Camera motion is smooth; no jitter, snap, or unintended scale pop was detected.
- The palette and light direction are consistent; the mist/pollen overlay unifies the
  shots.
- The opening title is legible and well placed.
- No corrupt, missing, black, or stretched frames were found.
- Preview and export match structurally (SSIM 0.973–0.976).

## Dominant limitation

The dominant limitation is **artwork and character construction**, not render
architecture. The engine reliably produces frames, camera moves, and motion; the
characters are visibly assembled from provisional raster parts, and the background is
an upscaled single plate. The transition ghosting is a separate compositing defect that
makes the provisional character construction more obvious.

Until the bird is re-authored as clean, approved, native-resolution layered art and the
background has real depth layers, adding more motion systems will not produce
professional storybook quality.

## Decision

**Artistic readiness: PENDING USER REVIEW.** Agent assessment: **not production-ready**
at 4/10 overall visual quality, with two P1 transition defects. The film is a successful
technical demonstration and a credible storyboard-level animatic, not a finished
illustrated film.
