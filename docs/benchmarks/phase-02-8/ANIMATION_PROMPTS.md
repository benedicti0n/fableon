# Phase 2.8 — Image-to-Video Animation Prompts

**Target shot:** The Little Bird Comes Home  
**Duration target:** 2 seconds at 24 fps for evaluation.  
**Provider-dependent note:** Gemini Omni 1.2 Flash generates 3–15 seconds, so a
3-second generation will be retained and a derived 2-second evaluation clip
labeled. Do not claim native 2-second output.

No prompt in this document has been executed against a paid provider.

## 1. Primary animation prompt

Use the approved clean 16:9 start frame as the first-frame/reference image.

```text
Animate the provided hand-painted children's storybook illustration into a
beautiful, fluid animated shot.

A small, expressive woodland songbird with warm chestnut feathers, a golden ochre
body, a soft cream breast, and layered slate-blue wings flies gracefully toward a
moss-covered branch in a sunlit forest.

The bird begins in gentle flight. Its wings move through natural upstroke and
downstroke motions with clearly articulated primary and secondary feathers. The
motion has weight and follows the bird's body rather than rotating rigid plates.

As it approaches the branch, the bird gradually slows, slightly raises its head,
spreads its wings to brake, and extends its delicate legs. Its feet touch the
branch naturally and grip it. The bird absorbs the landing, lowers its body
slightly, folds its wings against its sides, and settles into a peaceful perched
pose. Its tail follows the landing with subtle secondary movement. The head makes
one small natural adjustment after settling.

The forest remains beautifully illustrated: layered foliage, textured tree
trunks, soft atmospheric depth, golden morning sunlight from the upper right, and
delicate watercolor/gouache surface qualities. Preserve the appearance of the
original artwork throughout: brush texture, pigment variation, paper grain, and
soft painted edges.

Maintain consistent character anatomy, markings, colors, proportions, facial
identity, and feather structure. The same bird must remain recognizable from the
first frame to the last. Keep the camera static, with no cuts, zooms, pans, or
camera shake. Smooth continuous movement, no sudden character transformation,
no new objects or characters, no text, no talking, no exaggerated cartoon
physics, and no drastic changes to the forest.

The shot ends with the bird calmly perched on the branch.
```

## 2. Negative prompt / constraints

```text
extra birds, duplicate bird, extra wings, extra legs, missing wings, missing
legs, duplicate eyes, extra beak, changing species, morphing character, identity
drift, changing feather markings, changing palette, new objects, new characters,
text, letters, typography, watermark, border, frame, UI, labels, camera cut,
camera zoom, camera pan, camera shake, sudden jump cut, teleportation, foot
sliding, sliding through branch, feet passing through branch, body stretching,
rubber deformation, plastic 3D look, flat vector look, low-resolution mush,
blurring, ghosting, flicker, frame-to-frame popping, background morphing,
disappearing trunks, moving branch geometry, lighting direction change,
exaggerated cartoon physics, talking, lip sync, audio-driven performance
```

## 3. Variant A — Minimal motion / consistency first

```text
Using the provided start frame, create a very gentle, restrained 3-second
animation. The bird makes one soft wing adjustment, drifts slightly closer to the
branch, lands with minimal body movement, folds its wings, and settles. Prioritize
exact character identity, stable facial features, stable feather markings, and a
static background over dramatic motion. Slow, smooth timing. The camera does not
move. No cuts, no new objects, no text. End on a calm perched pose.
```

Use if the first balanced attempt shows identity drift.

## 4. Variant B — Balanced motion (primary)

Use the primary prompt above. This is the default experiment variant: natural
wing articulation, braking, contact, wing fold, and settle while preserving
identity and background stability.

## 5. Variant C — Expressive motion

```text
Using the provided start frame, create a more expressive 3-second landing with a
clear flight beat: two readable wing strokes, a buoyant body arc, a decisive
braking spread, visible leg extension, branch contact, a soft body compression,
wing fold, and tail follow-through. Preserve the exact character identity and
painted style throughout. Keep the camera static. Allow subtle secondary motion
in the tail and foliage, but do not change the forest layout, lighting, or
character design. No cuts, no new characters, no text. End on a calm perched pose.
```

Use only after A/B establish that the model can hold identity.

## 6. Endpoint prompt (if last-frame conditioning is used)

```text
Using the provided start frame and endpoint frame as the first and last frames,
animate a smooth continuous landing between them. The bird flies toward the
branch, brakes with open wings, extends its legs, contacts the branch, folds its
wings, and settles into the exact ending pose. Preserve the same character
identity, feather markings, palette, lighting, and painted background. Static
camera, no cuts, no text, no new objects. The motion should be physically
believable and continuous, with no teleporting or identity morphing.
```

Provider note: Gemini Omni 1.2 Flash supports first+last frame interpolation for
3–10 second clips. Luma Ray 3.2 supports start/end and multi-keyframe controls.
Kling 3.0 supports start/end frames. Confirm the selected provider’s exact
duration/resolution before execution.

## 7. Prompt variants for provider testing

| Variant | Motion intensity | Primary purpose                            |
| ------- | ---------------- | ------------------------------------------ |
| A       | Minimal          | Identity/background preservation baseline  |
| B       | Balanced         | Primary quality test                       |
| C       | Expressive       | Motion ceiling after consistency is proven |

Do not generate all three with paid services unless separately authorized. The
default plan is one balanced attempt after approval.

## 8. What the prompt must not be asked to do

- Do not generate 48 separate frames from text.
- Do not animate the character sheet or multiple bird poses.
- Do not ask for a 2-second native clip from a provider with a 3-second minimum.
- Do not add narration, sound effects, music, text, or captions.
- Do not substitute procedural forest art if the source frame is missing.
- Do not rely on the prompt alone for identity; use the approved image
  reference/endpoint where the provider supports it.

## 9. Current status

**BLOCKED.** No approved clean start frame exists, and no paid generation is
authorized. Prompts are ready for manual provider use after those gates are
resolved.
