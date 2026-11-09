# Phase 5 — Style Review

**Film:** The Little Brass Bell  
**Art source:** original local vector masters (`assets/folk-pilot/masters/`)  
**Reference status:** art-direction reference only; no reference frame reproduced.

## What was built

The pilot uses a deliberately flat cutout language: dark ink outlines, sandstone/ochre
fields, indigo architecture and costume, terracotta accents, gold ornament, and cream
cloth. The full rules are in `docs/art-direction/FOLK_ART_STYLE_BIBLE.md`.

## Coherence checks

| Criterion              | Observed result                                                                          | Assessment                                             |
| ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Outline consistency    | 7–10 px master silhouettes; 3–5 px interior detail; same ink color across masters        | Consistent                                             |
| Palette coherence      | Ochre, cream, indigo, terracotta, saffron, gold recur in characters and both backgrounds | Consistent                                             |
| Character identity     | Saffron turban, indigo band, curled moustache, gold earring, ochre coat, cream dhoti     | Readable and stable                                    |
| Horse identity         | Cream coat, terracotta mane/tail, blue-and-gold harness, four separated legs             | Stable, though the head/neck reads slightly llama-like |
| Cart identity          | Ochre body, indigo canopy, gold diamond motifs, two spoked wheels                        | Stable and readable                                    |
| Background grammar     | Arches, jaali diamonds, chevrons, gold bands, sandstone walls                            | Shared across both locations                           |
| Flatness               | No photographic gradients; only sky/light wash and brass shading                         | Consistent with the brief                              |
| Silhouette readability | All four actors read at 720p                                                             | Pass                                                   |

## Strengths

- The artisan is immediately recognizable as a folk-art village artisan, not a generic
  cartoon. The turban, moustache, earring, coat trim, and dhoti work together.
- The horse and cart share the same ornamental vocabulary as the architecture.
- The palette is warm without becoming monochrome; indigo gives the eye a rest.
- Joints are disguised as bangles, sleeve bands, harness rings, or cloth overlaps.
- The film never uses a painterly AI gradient or photorendered surface.

## Weaknesses

1. **Horse anatomy.** The neck is thick and the head is long; at small scale it can read
   as a donkey or llama rather than a horse. The ears are also large.
2. **Hands.** The open and grip hands are mitten-like. They work for this scale but would
   not support close-up hand acting.
3. **Background detail.** The architecture is flat and repetitive. It is coherent, but
   not a native painted 1080p environment with deep texture.
4. **Facial range.** The artisan has one face, a blink, and a fixed moustache. There is no
   eyebrow or mouth acting.
5. **Line weight.** A few decorative strokes (mane, cloth folds) sit close to the
   silhouette weight, which flattens the read at 720p.

## Acceptable / unacceptable examples

Acceptable:

- `apps/web/public/assets/folk-pilot/masters/artisan.png`
- `apps/web/public/assets/folk-pilot/masters/horse.png`
- `apps/web/public/assets/folk-pilot/masters/cart.png`
- `docs/benchmarks/phase-05/diagnostic-frames/frame-340.png`
- `docs/benchmarks/phase-05/diagnostic-frames/frame-520.png`

Unacceptable from the earlier pipeline (kept as a comparison, not reused):

- `docs/benchmarks/phase-04/acceptance-test/defect-frames/character-perched-fringe-frame-492-crop.png`
- `docs/benchmarks/phase-04/acceptance-test/defect-frames/transition-double-eye-frame-532-crop.png`

## Decision

**Style system: PASS as an original, coherent pilot language.**  
**Artistic approval: PENDING USER REVIEW.** The vector pilot is production-system proof,
not a final painted film. No AI image provider was used, so this is not evidence about
FLUX/Gemini/OpenAI style fidelity.
