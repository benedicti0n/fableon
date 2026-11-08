# Premium Bird Art Direction

**Character:** The Little Bird  
**Project:** Fableon Phase 2.7 premium artwork validation  
**Status:** **BLOCKED — PREMIUM SOURCE ARTWORK REQUIRED**  
**Approval gate:** Gate 1 — Master Character (not yet submitted)

This document defines the single definitive character and the visual standard the
premium artwork must meet. It is a specification, not evidence that the artwork
exists. No premium master, transparent parts, or painted forest has been supplied
to the repository.

## 1. Character identity

The Little Bird is a small woodland songbird with a gentle, curious,
intelligent personality. It should feel like a character from a professionally
published children's picture book, not a mascot, icon, vector puppet, or
generic AI cartoon.

The character must remain unmistakably the same bird across:

- neutral reference;
- wings-raised and wings-lowered poses;
- landing/braking pose;
- perched pose;
- every one of the 48 animation frames.

Identity is carried by anatomy, silhouette, palette, markings, lighting, and
feather construction — not by repeating a text description.

## 2. Visual style

- Traditional children's storybook illustration.
- Hand-painted gouache and watercolor appearance.
- Soft organic forms with deliberate brush texture.
- Rich but controlled color and surface variation.
- Consistent warm directional light.
- Natural feather anatomy and believable volume.
- Delicate edge variation and watercolor glazing.
- No hard black cartoon outline.
- No flat vector fills, plastic 3D shading, or low-detail AI gloss.

The target is a quiet, warm, whimsical illustration suitable for a premium
animated picture book. It should look good as a still illustration and remain
coherent when separated and animated.

## 3. Palette

| Role                      | Suggested color | Notes                                     |
| ------------------------- | --------------- | ----------------------------------------- |
| Head/back chestnut        | `#8B5A3C`       | Warm, softly varied; not flat brown       |
| Golden ochre body         | `#C9974F`       | Midtone volume; gentle gradient           |
| Cream breast/belly        | `#F2E3C6`       | Warm cream, not white                     |
| Slate-blue wings          | `#5C7A8A`       | Layered feathers with blue-gray variation |
| Deep teal flight feathers | `#2F4F55`       | Darker tips, subtle teal glaze            |
| Warm golden beak          | `#D6A45A`       | Small, refined, believable                |
| Eye                       | `#1C1713`       | Dark, expressive, integrated              |
| Legs/feet                 | `#8A5B3A`       | Delicate, painted, articulated            |
| Warm highlight            | `#F5D9A3`       | Upper-right key light                     |
| Cool shadow               | `#4D5A50`       | Sage/teal ambient shadow                  |

Color must remain harmonious across every part and every pose. Avoid highly
saturated novelty colors, pure black, and pure white.

## 4. Anatomy and design

### Head

- Naturally rounded skull with a slight crown and cheek volume.
- Soft feather transitions around the cheek, crown, and throat.
- Tonal variation from warm chestnut crown to cream cheek/throat.
- Expressive eye set into the face, with a subtle ring and highlight.
- Small, believable golden beak; upper and lower mandible readable.
- No oversized mascot eye or emoji expression.

### Body

- Natural chest-to-belly transition from ochre to cream.
- Gentle breast volume, visible ribcage/shoulder structure under the paint.
- Soft overlapping feather groups, not a single flat oval.
- Subtle ambient occlusion under the wing and at the tail base.
- Readable silhouette at thumbnail and close-up sizes.

### Wings

- Distinct shoulder/covert region.
- Layered secondary feathers.
- Separate primary flight feathers with natural overlap and tips.
- Consistent slate-blue/teal markings across poses.
- Wing configurations must preserve the same feather count and identity.
- Near and far wings must show evidence of hidden-side anatomy, not a single
  duplicated plate.

### Tail

- Separately readable tail feather fan.
- Consistent structure and length.
- Natural attachment at the rump.
- Painted feather edges and soft separation.

### Legs and feet

- Two articulated legs with clear hip/thigh, tarsus, and toes.
- Anatomically understandable perching feet.
- Clear contact points for the branch.
- Painted texture, not mechanically uniform lines.
- No extra legs, fused toes, or impossible joints.

## 5. Lighting and material

- Primary light: warm dawn key from the upper right.
- Fill: cool sage/teal ambient light from the lower left.
- Soft rim light on the crown, back, and wing edges.
- Consistent shadow direction across all poses and all separated parts.
- Gouache/watercolor surface: pigment variation, paper grain, subtle blooms,
  controlled dry-brush edges, and glazed shadows.
- Texture must be restrained and stable. It must not crawl or regenerate per
  frame.
- Avoid specular plastic highlights, uniform noise, and heavy black outlines.

## 6. Feather construction rules

- Feather groups should be designed as overlapping painted masses, not repeated
  disconnected strokes.
- Edges should vary in softness and transparency.
- Primary flight feathers should be individually readable but remain part of a
  coherent wing.
- The shoulder/covert region should overlap the secondary feathers naturally.
- The wing should overlap the body without a visible cookie-cutter seam.
- The body must extend beneath the near wing so rotation does not expose a hole.
- The tail should overlap the rump and remain attached during rotation.

## 7. Required character sheet

The master delivery must include:

1. Full-body three-quarter side view with both wings readable.
2. Front/three-quarter head study.
3. Wing-spread study with feather groups labeled.
4. Foot/perch study.
5. Palette and lighting notes.
6. Neutral, wings-raised, wings-lowered, landing, and perched poses.
7. A registration/pivot guide for the nine animation parts.

The master must be complete, uncropped, and surrounded by comfortable margins.
No typography, border, props, or extra characters.

## 8. Animation-ready layer plan

Required parts:

```text
The Little Bird
├── body
├── head
│   ├── eye
│   └── beak
├── wing-far
├── wing-near
├── tail
├── leg-left
└── leg-right
```

Rules:

- Every part has a transparent background.
- Parts overlap intentionally at the shoulder, neck, rump, hips, and face.
- Pivots are at anatomical attachments, not image corners.
- Registration is consistent across all parts.
- The far wing and hidden body surfaces are painted, not inferred.
- Do not create a part by cutting a flattened image if the cut exposes missing
  anatomy.
- Do not use arbitrary circles, flat patches, or vector fills to repair gaps.

### Hidden anatomy

The near wing obscures part of the body. A complete body plate and far-wing
surface must be supplied or reconstructed in the same style. If they are not,
the pack must be marked **occlusion unresolved** and must not be animated as
production-ready artwork.

## 9. Scale and file expectations

- Master character: at least 3000 px on the long edge, preferably 4096 px.
- Individual parts: at least 2048 px on the long edge where practical.
- Transparent PNG or WebP for parts; no JPEG transparency.
- 8-bit RGBA sRGB.
- Generous transparent margins; do not pre-trim away intentional soft edges.
- Consistent registration canvas across parts.
- Source files and provenance metadata retained.

## 10. Environment direction

The character will land on a delicate branch in an enchanted forest at dawn.
The environment is specified separately in
`docs/illustration/prompts/PREMIUM_FOREST_PROMPT.md`, but the shared direction is:

- warm morning light entering through a painted canopy;
- deep sage/ink shadows and ochre highlights;
- complex tree silhouettes with hand-painted foliage masses;
- layered foreground, midground, and distant atmosphere;
- a natural, irregular landing branch with a readable contact point;
- no baked-in bird, text, border, or geometric polygon trees;
- no disconnected floating leaf dashes or straight log platform.

## 11. Acceptance criteria

The master character is ready for Gate 1 only when:

- [ ] It reads as a professional storybook illustration at full size.
- [ ] The silhouette is clear and appealing at 1920×1080.
- [ ] Head, body, wings, tail, and feet have believable anatomy.
- [ ] Feather groups overlap naturally.
- [ ] Palette and lighting are cohesive and controlled.
- [ ] The surface has convincing gouache/watercolor variation.
- [ ] Eyes and beak are expressive without mascot exaggeration.
- [ ] No clip-art, SVG, emoji, plastic 3D, or low-detail AI look.
- [ ] The same character is recognizable in all five poses.
- [ ] Hidden body/far-wing geometry is supplied or explicitly flagged.
- [ ] Provenance and usage rights are documented.
- [ ] The user and ChatGPT approve the actual master image.

Automated checks can confirm dimensions, alpha, registration, and palette
statistics. They cannot approve artistic identity.

## 12. Current gate status

**BLOCKED.** The repository contains no premium master character, no premium
transparent parts, and no premium forest artwork. The existing Phase 2.5 and
Phase 2.6 images are procedural/diagnostic and must not be presented as premium
evidence.

The next action is to generate or commission the master artwork using
`docs/illustration/prompts/MASTER_BIRD_PROMPT.md`, then submit it for Gate 1
review. Do not separate, rig, or animate a master before approval.

## 13. Approval checkpoints

| Gate                 | Required evidence                                               | Status      |
| -------------------- | --------------------------------------------------------------- | ----------- |
| 1 — Master character | Approved master sheet and five identity poses                   | **BLOCKED** |
| 2 — Prepared artwork | Approved neutral and wing-pose compositions, resolved occlusion | Not started |
| 3 — Final animation  | Actual 48-frame MP4 and representative frames                   | Not started |
