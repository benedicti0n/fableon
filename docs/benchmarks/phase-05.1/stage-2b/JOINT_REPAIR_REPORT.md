# Phase 5.1 Stage 2B — Joint Repair Report

**Date:** 2026-11-10  
**Baseline artwork:** original Stage 2A OpenAI and Gemini packs  
**Paid calls for this diagnostic:** 0

## 1. Problem being corrected

Stage 2A articulated, but it read as assembled cardboard:

- OpenAI: oval shoulder attachment, visible elbow discontinuity, forearm pivot repair.
- Gemini: shoulder shape mismatch, visible elbow hinge, forearm overlapping clothing.

The core defect was not the rotation math. It was the absence of a joint contract: hidden overlap,
occlusion ownership, cover artwork and limits were not represented in the rig.

## 2. What changed

`@fableon/folk-motion` now has `FolkJoint` metadata on rig nodes. A joint records:

- `kind`: shoulder, elbow, wrist, hip, knee, ankle or neck;
- `parentNodeId`: the exact parent in the rig hierarchy;
- `overlap`: hidden rectangle in child pivot-local pixels;
- `occlusion`: parent-over-child, child-over-parent or cover-over;
- `coverNodeId`: optional joint-cover sprite;
- `limits`: local rotation range;
- `notes`: optional repair context.

`resolveFolkPose` validates every joint and returns it on the resolved node. `jointOverlapCorners`
maps the hidden rectangle through the current world matrix. `clampJointRotation` and
`rotationWithinJointLimits` expose limits without silently changing existing animation.

## 3. Stage 2B draw order

The v2 rig changes ownership at the seams:

| Area     | Old behavior                                     | Stage 2B behavior                                                        |
| -------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| Shoulder | upper arm drawn over torso as an oval            | torso draws above the upper-arm top; sleeve emerges from under the torso |
| Elbow    | forearm above upper arm without a cover contract | forearm plus matching elbow-cover node above the upper arm               |
| Wrist    | hand above forearm                               | hand above forearm with wrist overlap and limits                         |
| Hip      | thigh above dhoti/pelvis                         | dhoti/pelvis covers the hip seam; thigh sits behind                      |
| Knee     | thigh above shin                                 | shin above thigh with hidden overlap                                     |
| Ankle    | shin above foot                                  | foot above shin with ankle overlap                                       |
| Neck     | neck above torso, necklace below                 | necklace covers the collar seam; head above neck                         |

The full 31-part contract and draw order are in `CHARACTER_PART_INVENTORY.md`.

## 4. Diagnostic render

`before-after-elbow.png` uses the original four Stage 2A parts per provider:

- **Before:** Stage 2A target pivots and original draw order. Upper arm above torso.
- **After:** Stage 2B v2 draw order; upper arm shifted 26 px outward and 2 px down; forearm shifted
  20 px outward; 3% upper-arm and 6% forearm overlap expansion around the pivot.
- Angles: 0°, 15°, 30°, 45°, 60°, 75°, 90°.
- Both providers, same renderer, same background, same camera.

### Observed result

- Both providers: the separate oval shoulder is removed. The upper arm now emerges from under the
  torso instead of sitting on top of it.
- OpenAI: the forearm connects through the expanded overlap and the elbow does not open a
  transparent gap through 90°. The sleeve reads thinner than the Stage 2A version, and the art is
  still visibly assembled.
- Gemini: the sheet-derived elbow remains cleaner. The upper arm is still small relative to the
  torso, and the shoulder needs production-scale registration.
- The final 31-part contract adds real elbow-cover sprites. The diagnostic does not fabricate a
  vector circle or claim that a cover already exists.

### Acceptance status

**Engineering mechanism: pass.** The metadata, draw order, validation and 90° elbow test work.

**Artistic acceptance: not yet.** The diagnostic is intentionally limited to four existing parts.
It cannot prove a complete 31-part character, clothing continuity or natural walk/reach motion.

## 5. Validation rules

`validateProviderPack` rejects a pack when:

- a required part is missing;
- a part file hash does not match the manifest;
- a joint parent has no packed part;
- parent-over-child or child-over-parent draw order is inverted;
- a joint cover is missing or draws beneath its child;
- the hidden overlap rectangle falls outside the registered artwork bounds;
- joint limits are invalid.

This prevents a manifest with 31 filenames from being declared complete without seam geometry.

## 6. Executed result

Both provider packs now contain 31 validated parts and render through the full eight-second
walk–reach–grip–release test.

| Check                  | OpenAI                                      | Gemini                                    |
| ---------------------- | ------------------------------------------- | ----------------------------------------- |
| Shoulder articulation  | acceptable, visible sleeve seam             | weak; upper arm reads as a tube           |
| Elbow 0–90°            | acceptable; cover and overlap close the gap | moderate; cover helps, forearm is tubular |
| Wrist/grip swap        | pass                                        | pass                                      |
| Hip/knee/ankle         | pass; cloth thigh compromise                | pass after thigh recolor and shin crop    |
| Bell attach/detach     | pass                                        | pass                                      |
| Severe transparent gap | none observed in sampled frames             | none observed after repair                |

Local repairs included facial pivots for both providers, a Gemini torso shoulder-patch fill,
Gemini leg segmentation and thigh recoloring, Gemini shin-edge cropping, a turban lift, a brow
reduction, and turban-tail fragment removal.

Remaining defects are artistic, not structural: the shoulder and elbow seams remain visible, and
the characters still read as cutout puppets. Neither provider is approved for a full film.
