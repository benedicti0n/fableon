# Professional Artwork Handoff Guide

**For:** illustrators, art directors, and approved image-generation workflows  
**Pipeline:** `/studio/assets` → versioned illustration pack → rig adapter → render  
**Status:** Phase 2.6 delivery contract. Premium artwork is currently required to
unblock the artistic benchmark.

## 1. What Fableon needs

Fableon does not need a finished animation from the artist. It needs **master
artwork and preparation-friendly layers** that Fableon can register, validate,
and animate deterministically.

The handoff should preserve:

- character identity, anatomy, palette, lighting, and material;
- exact layer registration;
- transparent edges without destructive keying;
- provenance and usage rights;
- enough hidden-side artwork to avoid invented anatomy.

## 2. Delivery package structure

Preferred delivery:

```text
storybook-bird-v1/
├── reference/
│   ├── character-sheet.png
│   ├── palette.png
│   └── lighting-notes.md
├── poses/
│   ├── neutral.png
│   ├── wings-raised.png
│   ├── wings-lowered.png
│   ├── landing.png
│   └── perched.png
├── parts/
│   ├── body.png
│   ├── head.png
│   ├── eye.png
│   ├── beak.png
│   ├── wing-far.png
│   ├── wing-near.png
│   ├── tail.png
│   ├── leg-left.png
│   └── leg-right.png
├── environment/
│   ├── background.png
│   ├── distant-forest.png
│   ├── midground-trees.png
│   ├── foreground-trees.png
│   ├── landing-branch.png
│   ├── atmospheric-light.png
│   └── foreground-details.png
└── provenance.json
```

Accepted formats: **PNG or WebP** with transparency for parts and overlays;
PNG/JPEG for opaque background plates. JPEG must not be used for transparent
parts. SVG may be supplied only as an authoring source; rasterize it before
import. Do not deliver PSD-only files unless a separate raster export is also
provided.

## 3. Character design target

A small, expressive storybook songbird:

- warm ochre/chestnut body;
- soft cream belly and throat;
- blue-slate layered wings;
- rounded head with a gentle, readable eye;
- small golden beak;
- delicate ochre legs and toes;
- soft painted edges and gouache/watercolor surface texture;
- consistent warm light from the upper right;
- clear silhouette at 1920×1080.

Avoid flat vector fills, emoji-like faces, heavy outlines, disconnected brush
dashes, and unrelated textures.

## 4. Character source deliverables

1. **Master character sheet** — front/side/three-quarter views with proportion
   and feather-group callouts.
2. **Palette and lighting sheet** — named colors, value relationships, light
   direction, shadow treatment.
3. **Five poses** — neutral, wings-raised, wings-lowered, landing/braking,
   perched.
4. **Nine transparent parts** matching this template:

| Part ID     | Required content                                          |
| ----------- | --------------------------------------------------------- |
| `body`      | Torso, breast, back, body feather groups                  |
| `head`      | Skull, cheek, crown, neck attachment                      |
| `eye`       | Iris, pupil, ring, highlight; transparent outside the eye |
| `beak`      | Upper and lower beak                                      |
| `wing-far`  | Recessed wing, including hidden-side attachment artwork   |
| `wing-near` | Foreground wing with layered primaries                    |
| `tail`      | Tail feather fan and rump attachment                      |
| `leg-left`  | Far leg, foot, toes                                       |
| `leg-right` | Near leg, foot, toes                                      |

5. **Hidden-side reconstruction** — if a wing or body section is occluded in the
   master pose, paint the missing geometry separately or supply a reconstruction
   note. Fableon will not invent it.

Parts must share one identity and palette. Do not generate each frame
independently from a text prompt.

## 5. Registration and pivots

- Deliver parts at a consistent scale and resolution.
- Align every part to a common registration canvas if possible.
- Pivots are stored in **original untrimmed source-image coordinates**.
- Do not pre-trim tightly; Fableon trims fully transparent padding at threshold
  0 and preserves offsets. If you trim yourself, document the offset.
- Expected attachment pivots are the natural hip/shoulder/neck/face points, not
  the upper-left corner.
- Provide a pivot overlay or notes for each part.
- Keep intentional soft/watercolor alpha edges. Do not key them to hard edges.

## 6. Environment deliverables

Preferred:

- 1920×1080 or larger painterly forest composition;
- no baked-in bird;
- background plate plus independent layered elements;
- landing branch on its own transparent layer with a clear contact area;
- atmospheric light/mist as a transparent overlay;
- foreground foliage as transparent framing layers;
- consistent palette/lighting with the character;
- no JPEG artifacts around fine edges.

Layered environment roles:

```text
sky, distant-forest, midground-trees, foreground-trees,
landing-branch, atmospheric-light, foreground-details
```

A single polished background plate is acceptable for the first comparison, but
layers are preferred for future parallax.

## 7. Occlusion and reconstruction rule

A flattened illustration does not contain hidden wing surfaces or complete limb
geometry. Fableon must not pretend that segmentation recovers them.

Required practice:

1. Identify every part that is occluded in the master pose.
2. Paint or generate the missing geometry from the same character design.
3. Document it as reconstruction artwork.
4. If it is not available, mark the part as requiring reconstruction in
   `/studio/assets`; the pack will remain **not animation-ready**.
5. Do not approve a pack with unresolved occlusion.

## 8. Provenance and rights

Deliver `provenance.json` with one record per source:

```json
{
  "asset": "parts/wing-near.png",
  "origin": "artist-created",
  "creator": "Illustrator name",
  "sourceRef": "commission-2026-11 / file version 3",
  "license": "private commission, Fableon project use",
  "notes": "Hidden-side feathers reconstructed separately."
}
```

Allowed origins: `user-created`, `artist-created`, `ai-generated`,
`licensed-third-party`, `procedurally-generated`, `diagnostic`.

Do not assume online images are reusable. Record the model/provider and approval
state for generated assets. Never deliver credentials or private provider keys.

## 9. Technical quality checklist

- [ ] PNG/WebP with correct transparency.
- [ ] No accidental opaque background on character parts.
- [ ] No white/black alpha halos.
- [ ] No aggressive sharpening, blur, recoloring, or compression artifacts.
- [ ] Consistent scale, identity, palette, and lighting.
- [ ] Parts overlap naturally at joints.
- [ ] Pivots are at anatomical attachments.
- [ ] Hidden anatomy is supplied or explicitly flagged.
- [ ] Registration positions documented.
- [ ] Environment has a clear character focal area.
- [ ] Branch contact point is readable.
- [ ] Provenance and license metadata included.
- [ ] Master source files retained by the artist/owner.

## 10. Import and review workflow

1. Start Fableon and open `/studio/assets`.
2. Choose Character or Environment mode.
3. Import the source files and inspect checkerboard previews, dimensions, alpha
   bounds, trim offsets, hashes, and warnings.
4. Assign files to template parts or environment roles.
5. Set pivots and registration numerically.
6. Resolve blocking diagnostics.
7. Export the `.fableon-pack.zip`.
8. Re-import it to verify the manifest, derivatives, and provenance.
9. Run the Phase 2.6 benchmark with the premium pack.
10. Review the actual animation with the user and ChatGPT.

## 11. Acceptance gate

A premium pack is ready for the artistic benchmark only when:

- all nine character parts are present;
- all parent and draw-order checks pass;
- every part has a source and prepared hash;
- unresolved occlusion is zero;
- environment background exists and overlays are transparent;
- archive export/import reproduces the pack;
- the rendered comparison preserves the source artwork;
- the user and ChatGPT review the animation and accept the artistic direction.

Technical acceptance does **not** equal artistic acceptance.

## 12. Non-goals

This guide does not request AI generation orchestration, automatic rigging,
inpainting, a full painting application, camera animation, or final video
composition. Phase 2.6 only prepares and validates source artwork for the
existing deterministic animation prototype.
