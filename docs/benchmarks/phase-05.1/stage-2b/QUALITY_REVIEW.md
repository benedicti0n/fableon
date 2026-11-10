# Phase 5.1 Stage 2B — Quality Review

**Status:** executed for both providers  
**Paid Stage 2B calls:** 9 (4 OpenAI, 5 Gemini)  
**Videos rendered:** 4 provider clips + 2 side-by-side comparison clips  
**Final verdict:** OpenAI conditional pass; Gemini conditional, not production-ready

## 1. What was reviewed

- OpenAI Stage 2B head, body, arms and legs sheets;
- Gemini Stage 2B head, body, arms (including one rejected sheet and one repair), and legs sheets;
- both 31-part packs after local registration;
- OpenAI and Gemini eight-second walk–reach–grip–release renders;
- both reusable variation renders;
- the side-by-side comparison and contact sheets.

## 2. Criterion-by-criterion evaluation

| Criterion                   | OpenAI                                                                 | Gemini                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Master illustration quality | Strong, detailed, expressive; strongest overall                        | Clean flat style but simpler; turban band reads heavily over the eye                                               |
| Identity preservation       | Strong across head, torso and limbs                                    | Moderate; face/accessory registration needed several local corrections                                             |
| Rig-part consistency        | Good; palette and motifs survive extraction                            | Moderate; arms read as separate blue tubes and the original arm sheet had to be rejected                           |
| Shoulder quality            | Acceptable; sleeve emerges from under torso, slight seam               | Weak-to-moderate; upper arm can read as a detached club under the torso                                            |
| Elbow quality               | Acceptable; cover and overlap close the gap, cuff seam remains visible | Moderate; cover helps, but the forearm is long and tubular                                                         |
| Wrist/hand quality          | Good; open/grip swap works, double gold wristband is a minor artifact  | Good; open/grip swap works and the bell sits in the grip hand                                                      |
| Hip/knee quality            | Good; cloth thigh under dhoti, no severe gap                           | Moderate after repair; bare/cloth thigh originally drifted outside the dhoti, shin crop included dhoti edge        |
| Walking quality             | Believable stylized gait; feet alternate and contact the ground        | Stiffer gait; arms often hide behind torso, but feet contact and alternate                                         |
| Reach/grip quality          | Clear reach and grip; bell attaches at the hand                        | Clear reach and grip; arm is visually tubular, bell attaches                                                       |
| Alpha/edge quality          | Native alpha, clean edges, some linework fringe                        | Chroma-key/despill edges, some fringe and dhoti-edge contamination                                                 |
| Manual repair burden        | Moderate: facial pivots, part registration, frame re-renders           | High: rejected arms sheet, one repair call, torso patch, leg segmentation, thigh recolor, turban/brow/pivot repair |
| Actual generation usage     | 4 requests, 4 images                                                   | 5 requests, 5 images including repair                                                                              |
| Conservative spending       | $0.403720                                                              | $0.272609                                                                                                          |

## 3. Defects that remain

### OpenAI

- The upper arm is still a separate sleeve piece; the shoulder does not fully hide the joint.
- The forearm includes a gold band at the elbow and the hand includes another at the wrist, so the
  wrist reads as stacked bangles.
- The grip is close but the open hand approaches the bell from below; the contact is readable, not
  anatomically precise.
- The cloth thigh under the dhoti is a compromise; it avoids bare skin but is not tailored to the
  dhoti folds.

### Gemini

- The turban’s blue band sits heavily over the eye and reads like a large brow.
- The upper arm is a blue tube with little shoulder integration.
- The original arm sheet merged upper arms and bent forearms; one repair call was required.
- The leg sheet merged thigh/shin/foot into full legs; local segmentation, thigh recoloring and
  shin-edge cropping were required.
- The torso sheet contained a dark shoulder blob; it was filled locally with the clean ochre.
- The face/accessory pivots needed manual repair; the result is recognizable but less expressive
  than OpenAI.

## 4. What the eight-second test proves

- Both packs are technically complete: 31 / 31 parts, valid hashes, valid joint contracts.
- Both render at 1280×720, 24 fps, 192 frames, 8.000 seconds, H.264.
- Both use the same camera, background, prop, motion configuration and renderer.
- Both execute walk → reach → grip → release → idle and attach/detach the bell.
- Both reuse the same rig with a different motion config and zero additional provider calls.
- Frame hashes are deterministic.

## 5. What it does not prove

- It does not prove production-ready human anatomy.
- It does not remove the assembled-cutout look.
- It does not prove every clothing layer remains stable in a longer film.
- It does not make Gemini equal to OpenAI on identity or seam quality.
- It does not justify a full-library budget yet.

## 6. Artistic decision

| Provider | Technical | Artistic                   | Decision                                                                                                 |
| -------- | --------- | -------------------------- | -------------------------------------------------------------------------------------------------------- |
| OpenAI   | PASS      | CONDITIONAL PASS           | Best candidate for the next small gate; not a full-film approval                                         |
| Gemini   | PASS      | CONDITIONAL / NEEDS REPAIR | Preserve as a valid comparison and proof, but do not promote to production without another targeted pass |

Neither provider is approved for a full film. OpenAI is the stronger candidate for a next
small-gate experiment; Gemini remains usable as a stylized comparison but needs further arm,
face and clothing repair.
