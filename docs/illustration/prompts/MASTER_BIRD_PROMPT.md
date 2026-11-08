# Master Bird Generation Prompts

**Character:** The Little Bird  
**Purpose:** Provider-neutral prompt package for an approved illustrator or
authorized image-generation workflow.  
**Status:** Not executed. No image-generation provider or paid service is
authorized by this document.

Do not treat a generated image as approved artwork. Gate 1 review is mandatory.
Do not generate every animation frame independently; produce one identity and a
small approved pose/part set, then animate through Fableon.

## 1. Generation rules

- Use the approved master image as an image reference for every subsequent
  pose/part edit whenever the tool supports reference-conditioned generation.
- Repeating a text description alone is not sufficient for identity consistency.
- Keep pose, camera, scale, lighting, and palette stable between references.
- Generate at the highest practical resolution; preserve the original files.
- Do not add typography, borders, UI, watermarks, or extra characters.
- Do not claim transparency if the provider only returns a flat background.
  Mask the artwork explicitly in an approved editor or in `/studio/assets`.
- Record provider, model/version, prompt, seed/reference, and approval state in
  provenance.
- If the provider cannot preserve identity, stop and report the limitation.

## 2. Master character prompt

Use this prompt for the canonical three-quarter full-body reference.

```text
Create an exceptionally beautiful, professionally illustrated children's
storybook character: a small woodland songbird with a warm chestnut-brown head
and back, a soft golden ochre body, a cream-colored breast and belly, and
elegant slate-blue wings with deep teal and blue-gray flight feathers.

The bird has delicately layered feathers, carefully observed anatomical forms,
subtle shadows, soft gouache pigment variation, watercolor glazing, and natural
hand-painted contours. Its face is gentle, curious, intelligent, and expressive,
with small dark eyes integrated into the face and a refined warm golden beak.
Its legs and feet are delicate, articulated, and believable.

Every feather group should feel intentionally illustrated: overlapping secondary
feathers, distinct primary flight feathers, a readable shoulder/covert region,
a separate tail fan, and soft feather transitions around the cheek and crown.
The body should have natural volume and believable anatomy while remaining
charmingly stylized.

The character should resemble the work of a skilled traditional picture-book
illustrator, with sophisticated color harmony, subtle brush texture, delicate
edge variation, soft watercolor blooms, and warm natural morning lighting from
the upper right. Use restrained cool sage/teal fill light and soft ambient
shadow. Avoid hard black outlines and flat vector shapes.

Show a clear three-quarter side profile with the complete body and both wings
readable, comfortable margins, and a calm neutral pose. The silhouette must be
clear and appealing at 1920x1080. The bird should be visually suitable for
separation into independently animatable parts, with hidden body and far-wing
anatomy either visible or noted for reconstruction.

The artwork must have a cohesive visual identity suitable for repeated use in a
premium animated children's film. It should look like a finished illustration,
not a character icon.

No typography, no decorative border, no extra characters, no unnecessary props,
no background scenery.
```

## 3. Negative prompt

```text
flat vector art, SVG shapes, clip art, emoji, mascot icon, plastic 3D cartoon,
generic AI cartoon, glossy toy render, chibi proportions, oversized eyes,
hard black outline, comic ink line, geometric polygons, low-detail feather
plates, repeated stamped feathers, disconnected brush dashes, muddy colors,
neon saturation, pure black shadows, pure white highlights, plastic specular
shine, uniform noise, heavy sharpening, chromatic aberration, text, letters,
watermark, signature, border, frame, extra birds, extra wings, extra legs,
fused toes, duplicated head, malformed beak, asymmetrical eyes, cropped body,
busy background, props, scenery, perspective distortion
```

## 4. Technical output

- Long edge: 4096 px preferred; minimum 3000 px for the master.
- Aspect ratio: approximately 4:3 or square reference canvas with generous
  margins.
- Format: PNG or high-quality lossless source; no destructive JPEG for the
  master.
- Background: plain warm neutral or transparent; no scenery in the character
  master.
- Lighting: upper-right warm key, soft cool fill, consistent across poses.
- Keep both wings and the full body in frame.

## 5. Prompt 1 — Neutral character reference

Use the approved master image as the reference. Preserve identity and palette.

```text
Using the approved master character as the exact identity reference, create a
clean neutral reference pose of the same small woodland songbird. Three-quarter
side view, complete body visible, both wings readable, calm upright posture,
feet relaxed but anatomically correct. Preserve the chestnut head and back,
golden ochre body, cream breast, slate-blue layered wings, teal flight feathers,
golden beak, dark expressive eyes, and delicate brown legs. Match the master's
face, proportions, feather markings, lighting direction, and gouache/watercolor
surface exactly. Plain warm neutral background with generous margins. No text,
border, props, scenery, or extra characters. This is an identity reference, not
a new character design.
```

## 6. Prompt 2 — Wings raised

```text
Using the approved master character as the exact identity reference, illustrate
the same bird with both wings fully raised in a graceful flight pose. Preserve
the identical face, head shape, body proportions, chestnut/golden/cream palette,
slate-blue wing markings, teal flight feathers, beak, eyes, tail structure, and
leg anatomy. Show the shoulder/covert region, layered secondaries, and distinct
primaries with natural overlap. The pose should feel buoyant and believable, not
mechanical. Keep the complete body visible, both wings readable, comfortable
margins, plain warm neutral background, consistent upper-right morning light.
No text, border, scenery, props, or extra characters. Do not redesign the bird.
```

## 7. Prompt 3 — Wings lowered

```text
Using the approved master character as the exact identity reference, illustrate
the same bird with both wings lowered and partially folded. Preserve the exact
identity, palette, feather markings, face, beak, eyes, tail, and legs. Show the
near wing overlapping the body naturally and the far wing receding behind the
body without exposing missing anatomy. Keep the body volume and cream breast
readable. Use the same upper-right key light and cool ambient fill. Complete body
visible, comfortable margins, plain warm neutral background. No text, border,
scenery, props, or extra characters. Do not change the character design.
```

## 8. Prompt 4 — Landing approach

```text
Using the approved master character as the exact identity reference, illustrate
the same bird in a landing/braking approach pose. Body pitched slightly upward,
both wings open to brake, tail adjusted for balance, legs extended toward an
unseen branch. Preserve identity, anatomy, feather structure, palette, lighting,
and surface treatment. The pose must communicate deceleration and anticipation,
with natural overlapping wings and no broken joints. Complete body visible,
comfortable margins, plain warm neutral background. No text, border, scenery,
props, or extra characters. Do not redesign the bird.
```

## 9. Prompt 5 — Perched

```text
Using the approved master character as the exact identity reference, illustrate
the same bird perched calmly on an invisible horizontal branch contact. Wings
folded naturally, tail relaxed, head making a small attentive adjustment, feet
anatomically correct with a readable perch grip. Preserve the exact face,
proportions, chestnut/golden/cream palette, slate-blue wing markings, teal
flight feathers, golden beak, dark eyes, and painted surface. Warm upper-right
morning light, soft cool fill, plain warm neutral background, comfortable
margins. No text, border, visible branch, scenery, props, or extra characters.
Do not change the character identity.
```

## 10. Prompt 6 — Character turnaround/reference sheet

```text
Using the approved master character as the exact identity reference, create a
clean character turnaround/reference sheet of the same bird: front, side,
three-quarter, and rear views, all at the same scale and with the same anatomy,
palette, feather markings, and lighting direction. Include a small head detail,
wing-spread detail, and foot detail. Use a simple neutral background and clear
spacing. No labels, typography, decorative border, props, scenery, or extra
characters. The sheet must read as one character, not four similar birds.
```

## 11. Prompt 7 — Transparent animation-ready parts

Image generators rarely produce true, precisely registered transparency. Use an
approved image editor or masking workflow after generation. The prompt below is
for a part-atlas base image, not a claim of production-ready alpha.

```text
Using the approved master character as the exact identity reference, create a
clean part-atlas illustration on a perfectly flat solid chroma background for
later manual masking. Show the same bird's body, head, eye, beak, near wing, far
wing, tail, left leg, and right leg as clearly separated painted elements with
comfortable spacing. Preserve the master's exact proportions, palette, feather
markings, lighting direction, and gouache/watercolor surface. Do not add text,
labels, shadows on the background, props, or extra anatomy. Do not invent hidden
surfaces; if a body or far-wing surface is not visible in the source, leave a
clearly separated reconstruction area for an approved edit. The output is a
masking source, not an animation-ready transparent pack.
```

After generation, use `/studio/assets` to:

1. import the atlas or individual edited parts;
2. mask each part explicitly;
3. set source-space pivots and registration;
4. resolve or flag hidden anatomy;
5. verify pixel preservation and alpha edges;
6. export the versioned illustration pack.

## 12. Prompt 8 — Occluded-body reconstruction

```text
Using the approved master character and the approved part-atlas reference,
create the missing painted body and far-wing surfaces that are hidden by the near
wing in the master pose. Reconstruct only the concealed anatomy needed for
rotation: the body beneath the near wing, the far shoulder, the far wing's
hidden attachment, and the rump beneath the tail. Match the master's exact
anatomy, chestnut/golden/cream palette, slate-blue/teal feathers, lighting
direction, feather scale, and gouache/watercolor surface. No new markings, no
new character design, no props, no text. The reconstruction must overlap the
original visible regions cleanly when separated.
```

The reconstruction is a **labeled reconstruction**, not a claim that the original
artist painted those surfaces. Record its source, editor, approval, and blending
notes in provenance.

## 13. Consistency workflow

1. Select the best master candidate and obtain Gate 1 approval.
2. Store the approved master and its exact provenance.
3. For every pose, use the approved master as an image reference; do not rely on
   text alone.
4. Compare face, beak, eye placement, crown shape, breast markings, wing feather
   count, tail length, leg proportions, and palette.
5. Reject a pose if it introduces a different bird.
6. Keep a consistent canvas scale and lighting direction.
7. Record rejected candidates and reasons; do not hide identity drift.
8. If the provider cannot maintain identity, report it as a provider limitation
   and use an illustrator or manual editing workflow instead.

## 14. Prompt review checklist

- [ ] Master prompt preserves the exact design brief.
- [ ] Negative prompt blocks vector/emoji/plastic looks.
- [ ] Eight outputs are defined.
- [ ] Every pose explicitly references the approved master.
- [ ] Transparent-part limitations are stated honestly.
- [ ] Hidden-anatomy reconstruction is labeled as reconstruction.
- [ ] No provider or paid call is executed without authorization.
- [ ] Gate 1 approval precedes separation and rigging.

## 15. Current status

**BLOCKED.** No master image has been generated, acquired, or approved. The
prompts are ready for an approved illustrator or authorized image-generation
workflow. Do not proceed to asset preparation or animation until the actual
master artwork is supplied and approved.
