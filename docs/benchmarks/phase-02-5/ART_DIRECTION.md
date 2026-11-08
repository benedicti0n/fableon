# Phase 2.5 — Art Direction & Feasibility Audit

> Benchmark: **The Little Bird Comes Home**  
> Target: a two-second, 48-frame, 24 FPS illustrated landing animation at
> 1920×1080. This is a feasibility prototype for the hybrid asset-plus-paint
> direction, not the final Phase 3 animation system.

## 1. Audit of existing artwork

### 1.1 Existing forest

Reusable:

- The warm olive/ochre color relationships.
- The idea of a layered forest with a luminous focal area.
- The seeded paper grain and broad wash approach.
- Canvas 2D asset generation and the render/compositing pipeline.

Problems:

- Tree crowns are assembled from many detached organic strokes, which read as
  floating dashes rather than painted leaf masses.
- Trunks are flat, dark shapes with little form or atmosphere.
- Light shafts use hard polygon edges.
- The branch is a straight, uniform horizontal platform.
- Scenes 2–4 reuse nearly the same plate, limiting visual variety.

Decision: replace the landing environment with a **dedicated close-up
composition**. Keep the palette and paint primitives, but shift the visual
construction from many small marks toward broad painted masses, soft
atmospheric depth, and a smaller number of deliberate details.

### 1.2 Existing bird

Reusable:

- The general ochre/cream/blue-gray palette.
- The storybook bird concept.
- The idea of a warm breast, cream face, and darker wings.

Problems:

- It is one flattened 720×540 image with no independent parts.
- The silhouette is basic; feather groups and anatomy are simplified.
- Wings cannot rotate at a shoulder or fold.
- Legs and feet are added marks, not attachable parts.
- The flattened PNG contains no hidden wing surfaces or complete articulation
  geometry. Automatically cutting it up would expose missing anatomy and produce
  unprofessional seams.

Decision: create **new layered artwork** from scratch. Do not attempt to
salvage the flattened image into a production rig.

### 1.3 Renderer and schema constraints

- Schema version 1 has top-left-based image transforms and no anchor/pivot field.
  We will not change persisted scene semantics.
- The hierarchical rig will be a benchmark-local runtime definition evaluated
  separately and documented as a Phase 3 input, not a schema extension.
- The renderer can draw transparent layered images and can consume world
  transforms if the benchmark renderer supplies them.
- Canvas 2D supports the required gradients, alpha, paths, and transforms. It
  does not provide skeletal deformation, 3D surfaces, or physically accurate
  media simulation.
- No external illustrator, image-generation service, or paid provider is
  authorized in this phase. Artwork must be authored locally in code or sourced
  from already-available assets.

### 1.4 Feasibility conclusion

A locally authored layered character can demonstrate:

- a stronger silhouette and color model than the flattened bird;
- independent wings, head, tail, beak, eye, and legs;
- shoulder/hip pivots and believable attachment;
- deterministic pose sampling and animated secondary motion;
- a clearer, calmer painted environment.

It cannot yet guarantee:

- professional picture-book illustration polish;
- complete hidden-side anatomy;
- painterly feather deformation at production quality;
- seamless limb joins at every extreme pose;
- the final color/detail quality of a human illustrator or a high-quality
  approved generated asset.

This phase therefore targets an honest **feasibility improvement** and a clear
record of remaining art dependency. It must not claim final production quality.

## 2. Target visual direction

Think of a close-up plate from a children's picture book:

- A small, warm ochre-breasted bird in a quiet forest.
- Soft morning light entering from the upper right.
- The bird visibly larger than in Phase 2 so its face, breast, wing groups,
  feather texture, and feet can be read.
- A delicate, tapered branch rather than a log.
- Background foliage made from soft, overlapping painted masses with only a few
  deliberate leaf accents.
- Restrained grain and brush texture over confident shapes, not random texture.

### Palette

| Role         | Color family                                       |
| ------------ | -------------------------------------------------- |
| Sky/light    | Warm cream, muted peach, soft sage glow            |
| Deep forest  | Ink green, blue-green, dark umber                  |
| Mid foliage  | Olive, sage, moss                                  |
| Bird body    | Warm ochre breast, cream face, chestnut/earth back |
| Bird wings   | Blue-slate, teal, deepened ink-blue tips           |
| Bird accents | Pale cream eye ring, amber beak, warm dark eye     |
| Branch       | umber, ochre highlights, cool green shadow         |

Typography is not part of the animation; no title is required in the 48-frame
landing proof.

## 3. Character design

### Identity

A compact storybook songbird with:

- a rounded head and alert eye;
- a short, warm amber beak;
- a cream throat and ochre breast;
- earth-brown back and crown;
- blue-slate layered wings with lighter feather edges;
- a long, tapered tail;
- slender ochre-brown legs and visible toes.

The character should remain instantly recognizable in every pose and every
frame.

### Layered parts

```text
Bird root
├── Tail
├── Left / far wing
├── Left leg
├── Right leg
├── Body
├── Head
│   ├── Beak
│   └── Eye
└── Right / near wing
```

Additional parts may include a small crest or cheek highlight only if they
improve attachment and do not create extra seams. The core required parts are
independent raster canvases with transparent backgrounds.

### Pivots

- **Body:** center-of-mass pivot, so the whole character can rotate/translate.
- **Head:** neck pivot at the lower-back of the skull.
- **Wings:** shoulder pivots near the body's upper sides.
- **Tail:** base pivot at the rump.
- **Legs:** hip pivots under the belly; knees/toes drawn inside each leg part.
- **Beak:** base at the face.
- **Eye:** center of the eye for blink/scaling.

Parts will overlap intentionally at joints; no part should expose the canvas
background at normal range.

### Pose sheet

Five preview poses will be produced:

1. Perched, neutral.
2. Wings fully raised.
3. Wings fully lowered.
4. Landing/braking.
5. Perched/settled.

The same master parts and palette must be used for all five.

## 4. Motion design

### Technical timeline

- 48 frames, 0–47, 24 FPS, two seconds.
- 1920×1080 native Canvas 2D composition.
- Deterministic elapsed-time playback in the preview.
- Rig sampled from a benchmark-local animation definition.
- No per-frame random art generation; all artwork is stable across frames.

### Phases

| Frames | Phase    | Intent                                                      |
| ------ | -------- | ----------------------------------------------------------- |
| 0–15   | Flight   | Enter from upper left, gentle flap, curved descent          |
| 16–29  | Approach | Decelerate, brake with wings, extend legs, pitch up         |
| 30–37  | Contact  | Feet meet branch, body compresses, wings fold, tail follows |
| 38–47  | Settle   | Calm perched pose, small head adjustment, damped tail       |

### Motion principles

- Wings rotate at shoulders with asymmetric follow-through; flapping is not a
  single repeated rotation.
- Body follows an arc and uses controlled vertical compression on contact.
- Head counter-rotates to stay stable and makes one small settle adjustment.
- Legs extend before contact; feet lock to the branch after contact. No sliding.
- Tail lags behind body and wing changes.
- Easing is selected per property/phase, not one curve for everything.
- A blink can be performed by scaling the eye and/or a small eyelid part.
- All transform and timing values are explicit in code or data; no wall-clock
  dependence.

### Branch

A new branch design will be painted for this benchmark:

- thinner and tapered toward the right;
- curved/asymmetric rather than a straight horizontal bar;
- bark texture and a cool underside shadow;
- small clustered leaves at the far ends, leaving a clear landing area;
- a defined contact point around the center.

The branch stays static; no physics simulation.

## 5. Visual-quality risks

| Risk                                 | Mitigation                                                                  | Remaining limitation                                                  |
| ------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Sprite seams at wing/leg joints      | Overlap parts, pivot near attachment, test extreme poses                    | Some seam may show at extreme angles                                  |
| Bird still looks like vector collage | Layered gradients, feather groups, soft edges, grain, contact shadow        | No true painted deformation or hidden anatomy                         |
| Background busier than character     | Soft broad masses, reduce small dashes, focus light behind bird             | Procedural art may still feel less authored than a human illustration |
| Branch looks like a log              | New tapered curved path, texture, clustered leaves                          | Static branch lacks physics                                           |
| Foot sliding at contact              | Keyframe hip/body/feet together after contact and test world foot positions | No IK; contact is authored, not physical                              |
| Wing motion feels mechanical         | Distinct flap keys, overlap, asymmetric follow-through                      | No skeletal mesh deformation                                          |
| Frames flicker                       | Stable baked part canvases, no per-frame randomness                         | Browser raster differences remain                                     |
| GIF color/timing limits              | Use ffmpeg palette optimization; document 24 FPS/color approximation        | GIF cannot match full film color/audio                                |

## 6. What this benchmark will and will not prove

Will demonstrate:

- a layered character can be authored locally and composed deterministically;
- pivot-aware articulation is feasible without changing schema version 1;
- a short landing sequence can be rendered from real frame state;
- the renderer and Studio can display and export the result;
- a hybrid pipeline can use strong authored shapes plus procedural texture.

Will not prove:

- production-grade character illustration;
- full rigging, IK, or deformation;
- final film quality;
- suitability of fully procedural character art for Fableon's target style.

## 7. Provisional recommendation

Proceed with a **hybrid asset-plus-paint prototype** for this phase. If the
layered character demonstrates better silhouette, articulation, and appeal but
still lacks final illustration quality, retain the architecture and treat
higher-quality character art as a dependency on an approved illustrator or
approved image-generation workflow. Do not expand the paint engine with random
detail in an attempt to compensate for weak authored shapes.
