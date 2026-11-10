# Stage 2B.3 — Visual Quality Review

## Neutral reconstruction

| Provider | Evidence                           | Result                                                                                        |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| OpenAI   | `master-reconstruction-openai.png` | assembled silhouette differs materially; shoulder/wrist/shoe/face defects remain              |
| Gemini   | `master-reconstruction-gemini.png` | assembled silhouette differs materially; tubular arm, face/turban and clothing defects remain |

## Defects and classification

| Defect                             | Classification       | Why                                                                |
| ---------------------------------- | -------------------- | ------------------------------------------------------------------ |
| OpenAI shoulder oval/disconnection | **ARTWORK-BLOCKED**  | upper-arm sprite has no hidden shoulder geometry                   |
| OpenAI double wrist band           | **ARTWORK-BLOCKED**  | duplicate band is baked into hand/forearm sprites                  |
| OpenAI oversized shoes             | **ARTWORK-BLOCKED**  | shoe silhouette is too large relative to the master                |
| OpenAI facial/accessory offset     | Partial code-fixable | landmark editor can adjust, but source facial construction differs |
| Gemini tubular upper arm           | **ARTWORK-BLOCKED**  | sleeve is a simple tube, not a shaped shoulder/arm                 |
| Gemini turban band over eye        | Partial              | pivots can move it, but baked band geometry remains                |
| Gemini dhoti/leg slivers           | Partial              | local crops can reduce edges; source sheet merged parts            |
| Both neutral silhouette            | **ARTWORK-BLOCKED**  | generated parts cannot reconstruct the master without deformation  |

## Seam evaluation

The socket system keeps connectors coincident, but visual seams remain. The reconstruction shows
that a zero socket error is not the same as anatomical correctness. This review does not claim
artistic approval.

## Final visual verdict

**ARTWORK-BLOCKED** for the major shoulder, wrist-band, shoe, Gemini arm and facial defects.
Further socket mathematics would not fix them. A new source-art pass is required for an anatomically
coherent puppet.
