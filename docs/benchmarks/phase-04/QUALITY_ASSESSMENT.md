# Where the Light Lands — Quality Assessment

**Assessment date:** 2026-11-10  
**Reviewed artifact:** `outputs/where-the-light-lands/final.mp4`  
**Review evidence:** `selected-frames/`, `contact-sheet.png`, `timeline-diagram.png`,
actual decoded frames at 3 s, 10 s, 15 s, 19.58 s, 25.83 s, and 29.96 s  
**Artistic decision:** **PENDING USER REVIEW** — not self-certified

## Gate A — Engineering

| Criterion              | Result                  | Evidence                                                         |
| ---------------------- | ----------------------- | ---------------------------------------------------------------- |
| Multi-shot timeline    | **PASS**                | Four contiguous shots, 0–143 / 144–359 / 360–527 / 528–719       |
| Total output duration  | **PASS**                | 720 frames / 24 fps = exactly 30.000 s                           |
| Resolution             | **PASS**                | 1920×1080                                                        |
| Frame rate             | **PASS**                | 24 fps                                                           |
| Codec/container        | **PASS**                | H.264 MP4                                                        |
| Full decode            | **PASS**                | `ffmpeg -v error -i final.mp4 -f null -` exit 0                  |
| Character articulation | **PASS (technical)**    | Nine-part hierarchical rig, wing/tail/head/leg transforms        |
| Landing contact        | **PASS (mathematical)** | Lower foot solved to branch world Y 1250 at and after contact    |
| Camera animation       | **PASS**                | Four deterministic camera tracks with pan/zoom/follow/push-in    |
| Parallax               | **PASS (conservative)** | Two derived depth planes plus atmosphere; not a full repaint     |
| Ambient effects        | **PASS**                | Seeded pollen, leaf sway, light, mist; absolute-frame evaluation |
| Transitions            | **PASS**                | Fade from black, 12-frame crossfades, 24-frame fade to black     |
| Titles                 | **PASS**                | Opening and ending titles render and fade                        |
| Studio preview         | **PASS**                | `/studio/composition` loads, scrubs, plays, and exports          |
| Local MP4 export       | **PASS**                | Studio job and CLI render verified                               |
| Paid API calls         | **ZERO**                | No provider code path or network request in the render pipeline  |

## Gate B — Artistic review

This is a **technical animation milestone**, not a production-quality illustrated film. The
following observations are intentionally direct.

### Composition

The forest reveal, branch framing, and slow push-in read clearly. The branch is a strong
visual anchor and the bird stays readable against the background. The opening title sits well
in the sunlit clearing. The ending title is readable and the final fade is graceful.

### Painterly texture

The source plate is painterly and warm, but it is an upscaled 852×479 crop. At 1920×1080 it
looks soft rather than finely painted. The distant layer is intentionally blurred; the
primary plate still lacks native full-HD detail. The film does not claim a newly painted
multilayer forest.

### Character quality

The Phase 2.7 candidate parts remain visibly cutout-like at 2× scale:

- white/light fringe around the head, breast, and wing roots;
- a visible head/body seam and hard shoulder overlap;
- low-resolution feather edges;
- the bird reads as a layered puppet rather than a painted continuous character.

This is the largest artistic limitation. It is inherited candidate artwork, not a Phase 4
regression.

### Wing and landing motion

Wings articulate through the hierarchy with distinct up/down phases, and the landing preset
spreads the wings to brake, extends the legs, contacts the branch, compresses, and folds.
Foot contact is mathematically exact at the branch. The motion still reads as 2D sprite
articulation: joints rotate as rigid pieces, with no feather deformation or soft-body settle.
The landing is clear but not fully organic.

### Camera

The camera is restrained and smooth. Shot 1 reveals the clearing; shot 2 follows the flight;
shot 3 settles on the branch; shot 4 pushes in. No transparent plate edges or unintended
stretching were observed in the decoded frames. The motion is intentionally slow and may feel
gentle to the point of being static in shot 1.

### Environment and atmosphere

Pollen, leaf sway, light-ray opacity, and mist move subtly and deterministically. No
accumulated-state drift or random-access mismatch was found in tests. The effect is
supportive rather than distracting. The parallax is a two-plane approximation, not a fully
layered painted forest.

### Scene continuity

The shot transitions preserve total duration and order. Crossfades hold the outgoing last
frame; no dropped or duplicated output frames were found. The bird’s path and landing are
readable across the cut. The character does not morph into a different species, but the
candidate art’s seams remain visible.

### Audio

The film is intentionally **silent**. No narration, music, or sound effects are present. This
is not a defect against the Phase 4 acceptance gate, but it is a clear limitation for a
finished story.

## Overall assessment

| Area                     | Observation                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| Engineering completeness | Strong: real 30 s, 4-shot, 1080p local render with verified decode |
| Story clarity            | Clear: forest → flight → landing → rest                            |
| Character animation      | Functional articulated rig; puppet-like and seam-heavy             |
| Camera                   | Smooth and coherent                                                |
| Environment              | Warm painterly plate; soft upscaled detail; conservative parallax  |
| Audio                    | None                                                               |
| Production readiness     | **NOT READY** artistically                                         |

**Artistic quality: PENDING USER REVIEW.** The film is a valid local-pipeline demonstration,
but the candidate character artwork and soft environment plate are below the intended
production bar. A human reviewer should decide whether the next investment belongs in
character artwork, source-resolution recovery, or animation deformation.

## Recommended next artistic work

1. Replace the candidate nine-part bird with an approved higher-resolution painted character.
2. Recover or repaint a native 1920×1080 forest plate and, if possible, true separate depth
   layers.
3. Add feather-root overlap/covert art and a soft contact shadow tuned to the bird’s landing.
4. Add audio only after the visual pipeline is accepted.
