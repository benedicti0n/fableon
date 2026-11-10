# Stage 2B.3 — Root Cause Analysis

**Starting HEAD:** `29da208`  
**Baseline:** Stage 2B.2 connector rigs and renders  
**Paid calls:** 0

## Confirmed defect matrix

| Provider | Part / area    | Visual defect                                        | Root cause                                                                            | Code-fixable?    |
| -------- | -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------- |
| OpenAI   | Shoulder       | bulky oval / disconnected sleeve                     | upper-arm sprite has no hidden shoulder socket artwork                                | **No — artwork** |
| OpenAI   | Forearm/hand   | double gold wrist band                               | hand sprite and forearm cuff both contain a band                                      | **No — artwork** |
| OpenAI   | Feet           | oversized curled shoe                                | shoe sprite proportion and silhouette                                                 | **No — artwork** |
| OpenAI   | Face           | moustache/eye can converge                           | accessory connectors derive from independent part pivots, not master facial landmarks | Partial          |
| OpenAI   | Torso/clothing | seams and overlap                                    | independently generated parts do not share a continuous construction                  | **No — artwork** |
| Gemini   | Upper arm      | tubular sleeve                                       | source upper-arm sprite is a simple tube                                              | **No — artwork** |
| Gemini   | Shoulder/torso | awkward socket                                       | torso art lacks a sleeve socket; upper arm is a separate tube                         | **No — artwork** |
| Gemini   | Turban/eye     | band covers eye                                      | turban and eye are separate generated pieces with baked band geometry                 | Partial          |
| Gemini   | Forearm        | conspicuous layering                                 | forearm is a thin separate tube with no concealed elbow gusset                        | **No — artwork** |
| Gemini   | Dhoti/legs     | edge slivers                                         | leg sheet merged cloth and limb; local cropping leaves edges                          | Partial          |
| Both     | Neutral pose   | assembled character does not match master silhouette | source parts have different construction, angles, scale and occlusion from the master | **No — artwork** |
| Both     | Socket math    | 0 error but visible seams                            | socket correctness is independent of anatomical/source-art correctness                | No code defect   |

## Why Stage 2B.2 did not fix the visible defects

Stage 2B.2 proved the attachment invariant. It did not prove that the child connector is on the
right anatomical point of the _illustrated_ part. A mathematically perfect socket can still attach a
forearm whose painted wrist is offset from the expected wrist location.

## Artwork stop condition

The master reconstruction shows that the generated part set cannot reproduce the master without
major deformation:

- OpenAI silhouette IoU: **0.5086**.
- Gemini silhouette IoU: **0.4620**.

The largest mismatches are the shoulder/upper-arm assembly, wrist/hand duplication, shoe
proportion, Gemini upper-arm tube, and the facial/turban registration. These are not resolved by
another socket transform. The correct verdict is **ARTWORK-BLOCKED** for those parts.
