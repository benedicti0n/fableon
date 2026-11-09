# Phase 5 — Quality Assessment

**Artifact:** `outputs/folk-pilot/final.mp4`  
**SHA-256:** `1f99ec3e791d09b929f86bf204c61562c2cd599e580d8509f729efee0dfb908e`  
**Assessment:** agent visual/technical review, pending user approval

This report deliberately avoids unsupported numeric art scores. It uses evidence and
qualitative verdicts.

## 1. Art quality

| Criterion           | Verdict                                              | Evidence                                                                                         |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Originality         | **Strong**                                           | Original artisan, horse, cart, bell, courtyard, and lane; no reference frame reproduced.         |
| Outline consistency | **Acceptable**                                       | Bold ink silhouette throughout; a few decorative strokes approach silhouette weight.             |
| Folk-art coherence  | **Strong**                                           | Ochre/cream/indigo/terracotta palette, jaali/chevron/diamond ornament, flat theatrical staging.  |
| Pattern quality     | **Acceptable**                                       | Jaali windows, gold diamonds, harness studs, rangoli; patterns are graphic and repeatable.       |
| Character identity  | **Strong for the artisan; acceptable for the horse** | Artisan turban/moustache/earring/coat read consistently. Horse neck/head is slightly llama-like. |
| Background quality  | **Acceptable, not final**                            | Two layered locations share a grammar; architecture is flat and repetitive at 1080p.             |
| Hand/face detail    | **Weak at close range**                              | Mitten hands and a single blink; no mouth/brow acting.                                           |

The dominant art limitation is **authored detail**, not a missing style system. The film
looks like a coherent folk-art animatic, not a final painted storybook film.

## 2. Rig quality

| Check                | Verdict        | Evidence                                                                                |
| -------------------- | -------------- | --------------------------------------------------------------------------------------- |
| Shoulder seams       | **Acceptable** | Sleeve bands and joint discs cover the shoulder; no hole observed in walk/reach frames. |
| Elbow seams          | **Acceptable** | Elbow discs remain covered through the reach.                                           |
| Hip/knee seams       | **Acceptable** | Dhoti panels and joint discs cover the leg chain.                                       |
| Head/neck transition | **Acceptable** | Collar/necklace covers the join; nod does not open a gap.                               |
| Hand pose swap       | **Pass**       | Open hand before grip; grip hand during attach; release after.                          |
| Horse leg joints     | **Acceptable** | Four three-segment legs with visible joint discs; gait is readable.                     |
| Harness attachment   | **Pass**       | Bell sits at the harness anchor after attach and remains stable.                        |
| Alpha fringes        | **Pass**       | Vector-exported parts have clean transparent edges; no Phase 4 white fringe observed.   |
| Layer ordering       | **Pass**       | Cart behind horse, horse behind artisan at the attach beat, bell above harness.         |

Visible rig compromises:

- Joint discs read as ornamental bands; this is intentional, but on the horse they can
  look like mechanical pivots.
- In shot 4 the artisan’s near arm crosses the horse chest, creating a crowded silhouette.
- The near hand can merge visually with the harness at small scale.

## 3. Animation quality

| Check                    | Verdict                           | Evidence                                                                                                                                 |
| ------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Human walk               | **Acceptable**                    | Articulated hips/knees/ankles, opposing arm swing, body bob; frames 120–263.                                                             |
| Blink                    | **Pass**                          | Eyelid visibility toggles every 72 frames.                                                                                               |
| Reach / grip             | **Pass**                          | Two-bone arm reaches the harness target; grip swap at frame 484; bell transfer at 504.                                                   |
| Prop transfer            | **Pass**                          | Bell moves from hand to harness and stays there through shot 5.                                                                          |
| Horse gait               | **Acceptable, slightly prancing** | Four legs alternate; frame 340 and 600 show lifted/planted phases. Not a natural gallop.                                                 |
| Tail motion              | **Pass**                          | Tail base/tuft sway through shots 3–5.                                                                                                   |
| Cart wheels              | **Pass**                          | Distance-derived rotation; both wheels turn together.                                                                                    |
| Horse–cart attachment    | **Pass**                          | Shaft tip remains aligned to the horse chest.                                                                                            |
| Camera                   | **Pass**                          | Smooth pans/zooms; no jitter or snap.                                                                                                    |
| Temporal consistency     | **Pass**                          | No frame jumps above threshold; only a short eased tail at frames 115–118.                                                               |
| Story clarity            | **Strong**                        | Empty courtyard → artisan enters → horse/cart arrive → bell attached → departure.                                                        |
| Transitions              | **Pass technically**              | No duplicate characters at 264, 432, or 600.                                                                                             |
| Transitions artistically | **Acceptable**                    | Incoming cast appears at full opacity over a dissolving environment; at 600 this is a visible cast/location change, but not a duplicate. |

## 4. Confirmed defects and limitations

| ID   | Severity | Area        | Description                                                                                                            | Evidence                              |
| ---- | -------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| F-01 | P2       | Art         | Horse neck/head reads slightly llama-like; ears are large.                                                             | `masters/horse.png`; frames 340, 520  |
| F-02 | P2       | Composition | Shot 4 artisan overlaps the horse chest; the bell hand is visually crowded.                                            | `diagnostic-frames/frame-500.png`     |
| F-03 | P2       | Animation   | Horse gait reads as a prance/trot; hoof timing is not a natural walk.                                                  | frames 340, 600                       |
| F-04 | P2       | Art         | Backgrounds are flat, repetitive vector sets without native painted 1080p detail.                                      | `masters/courtyard.png`, `street.png` |
| F-05 | P3       | Art         | Hands are mitten-like; no finger articulation.                                                                         | frames 200, 500                       |
| F-06 | P3       | Rig         | Joint discs remain visible as mechanical circles on the horse.                                                         | frames 340, 520                       |
| F-07 | P3       | Transition  | Cast appears at a new location/position at frame 600 while the environment dissolves; no duplicate, but a visible pop. | frames 599/600                        |
| F-08 | P3       | Sound       | Film is silent.                                                                                                        | manifest `audioPresent: false`        |

No P0 or P1 defect was found in the final film.

## 5. What is genuinely good

- The film is watchable and the story is readable in one pass.
- The artisan identity is stable across all five shots.
- The bell transfer is visible and stable.
- The cart follows the horse and the wheels turn.
- There are no duplicate silhouettes at crossfades.
- The full decode is clean; no corrupt, missing, or frozen stretches.
- The palette and ornament feel deliberately folk-art rather than generic AI fantasy.
- The 61-part asset pack is reusable without regenerating artwork.

## 6. Decision

**Gate C — animation: PASS for the required pilot actions.**  
**Gate D — full film: PASS technically.**  
**Artistic readiness: PENDING USER REVIEW.** The result is a coherent production proof and
animatic. It is not a final painted film; the main gaps are horse anatomy, crowded shot-4
staging, gait naturalness, and background detail.
