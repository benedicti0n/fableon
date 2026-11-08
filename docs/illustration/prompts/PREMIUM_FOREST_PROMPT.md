# Premium Forest Generation Prompts

**Setting:** Enchanted woodland at dawn, for The Little Bird landing sequence  
**Status:** Not generated. No image-generation provider or paid service is
authorized by this document.  
**Purpose:** Provider-neutral source-artwork specification for an approved
illustrator or authorized image-generation workflow.

Do not substitute the procedural Phase 2 forest and call it premium artwork. A
single exceptional painted background plate is acceptable for the first
validation; layered assets are preferred for future parallax.

## 1. Environment direction

The forest should feel richly illustrated, peaceful, cinematic, atmospheric,
warm, organic, and deeply layered. It is the environment for a quiet two-second
landing, not a busy fantasy matte painting.

Required direction:

- enchanted woodland at dawn;
- warm morning sunlight entering through a painted canopy;
- complex tree silhouettes with organic branching;
- hand-painted foliage clusters, not polygon crowns or floating dashes;
- natural bark texture and soft moss/lichen variation;
- painted light and shadow with integrated sunbeams;
- distant mist and atmospheric depth;
- rich green/olive/sage vegetation with warm ochre highlights;
- a clear character focal area and a readable landing branch;
- no baked-in bird, text, border, or unnecessary props.

## 2. Master forest prompt

```text
Create a beautiful, professionally illustrated children's storybook forest at
dawn, designed as the background for a small woodland songbird landing on a
delicate branch.

The scene should feel like a hand-painted gouache and watercolor illustration:
richly layered trees, soft atmospheric depth, warm morning sunlight entering
from the upper right through an irregular canopy, delicate mist in the distance,
and a quiet, peaceful, cinematic mood. The forest is enchanted but natural, warm
and inviting rather than dark or threatening.

Use complex organic tree silhouettes with believable branching, hand-painted
foliage masses, subtle bark texture, moss and lichen variation, and painterly
light and shadow. Foliage should read as overlapping painted clusters with
varied edges and color, not geometric polygons, stamped leaves, disconnected
floating dashes, or repetitive brush marks. Sunbeams should be soft and
integrated into the atmosphere, not hard-edged geometric wedges.

Compose a clear open focal area in the middle-distance where a small bird can
land. Include a naturally irregular, tapered branch crossing the lower middle
of the composition with a pale, readable top edge and a clear landing point.
The branch should feel delicate and organic, with painted bark, subtle shadow,
and small clustered leaves near its ends, not a straight horizontal log or a
uniform wooden platform.

Palette: warm dawn cream and peach near the light, golden ochre highlights,
sage and olive midtones, deep ink-green and blue-green shadows, soft misty
blue-gray distance. Rich color harmony, restrained detail, sophisticated
painterly depth.

No bird, no characters, no text, no border, no watermark, no frame. The image
must remain readable at 1920x1080 and preserve fine painted edges for later
character compositing.
```

## 3. Negative prompt

```text
bird, character, animal, person, text, letters, watermark, signature, border,
frame, UI, split screen, collage, photorealistic photograph, HDR, sharp digital
matte painting, flat vector art, polygon trees, low-poly geometry, geometric
canopy, clip art, emoji, cartoon outline, plastic 3D render, game asset,
repetitive stamped leaves, floating disconnected leaf dashes, repeated brush
marks, uniform noise, heavy black outlines, straight log platform, wooden plank,
hard-edged geometric light shafts, neon colors, muddy shadows, oversaturated
greens, oversharpened edges, chromatic aberration, lens flare, busy foreground
blocking the landing area
```

## 4. Technical output

- Master: 1920×1080 minimum; 2560×1440 or 3840×2160 preferred.
- Format: PNG or high-quality lossless source; no JPEG for transparent layers.
- Color: sRGB.
- Keep the landing area unobstructed.
- Preserve fine painted edges; do not apply destructive sharpening or noise.
- A single background plate is acceptable for Phase 2.7. Layered delivery is
  preferred.

## 5. Layer prompts

If the provider/artist can deliver layers, use the same approved master and
consistent palette/lighting. Generate each layer against a transparent
background or a flat chroma background for explicit masking. Do not claim a
layer is transparent unless it actually has an alpha channel.

### 5.1 Background plate

```text
Using the approved forest master as the exact environment reference, produce a
clean 16:9 background plate containing the sky, distant mist, distant tree
silhouettes, and deep atmospheric base. No bird, branch, foreground foliage, text,
border, or props. Preserve the master's palette, dawn light direction, soft
painted depth, and fine edge quality. The plate must leave space for separately
composited midground trees, foreground foliage, and a landing branch.
```

### 5.2 Distant trees

```text
Using the approved forest master as the exact environment reference, isolate the
distant tree line and misty silhouettes on a fully transparent background.
Low contrast, cool sage/blue-green atmospheric color, soft painted edges, no
foliage details that belong in the midground. No bird, branch, text, border, or
foreground elements. Preserve registration and scale relative to the master.
```

### 5.3 Midground trees

```text
Using the approved forest master as the exact environment reference, isolate the
midground trees and canopy masses on a fully transparent background. Complex
organic silhouettes, hand-painted foliage clusters, subtle bark texture, warm
ochre edge light from the upper right, deep sage/ink shadows. No bird, branch,
text, border, or foreground framing. Preserve the master's scale and lighting.
```

### 5.4 Foreground foliage

```text
Using the approved forest master as the exact environment reference, isolate the
foreground foliage framing elements on a fully transparent background. Large,
softly overlapping painted leaf masses with varied edges, dark ink-green and warm
ochre accents, natural depth cues, and a clear open center for the character.
No bird, branch, text, border, or background sky. Preserve the master's lighting
direction and palette.
```

### 5.5 Landing branch

```text
Using the approved forest master as the exact environment reference, isolate a
single naturally irregular, tapered landing branch on a fully transparent
background. Painted bark, ochre top-edge light, cool green underside shadow,
small clustered leaves near the ends, and a clear central contact area. The branch
must be organic and delicate, not a straight log or uniform plank. No bird, text,
border, or background scenery. Preserve the master's scale and light direction.
```

### 5.6 Atmospheric light

```text
Using the approved forest master as the exact environment reference, create a
transparent atmospheric light overlay: soft warm sunbeams entering from the upper
right, gentle dawn mist, subtle golden haze, and delicate dust motes. Edges must
be soft and painterly, never hard geometric wedges. No bird, branch, text, border,
or opaque background. The overlay should enhance the scene without obscuring the
landing area.
```

### 5.7 Foreground details

```text
Using the approved forest master as the exact environment reference, create a
sparse transparent foreground-detail layer: a few painted leaves, small twigs,
soft grass blades, and subtle atmospheric flecks near the frame edges. Keep the
center and landing area clear. Match the master's palette, light direction, and
gouache/watercolor surface. No bird, text, border, or large opaque masses.
```

## 6. Consistency requirements

- Use the approved forest master as the reference for every layer.
- Keep the horizon, tree placement, branch contact point, light direction, and
  palette registration consistent.
- Do not independently invent a different forest for each layer.
- Preserve the same brush/material language across layers.
- Layers may be masked from the master when the provider cannot output
  transparency; explicit masking is allowed and must be documented.
- Do not bake a bird or character shadow into the background.

## 7. Acceptance criteria

- [ ] The image reads as a professional painted storybook forest.
- [ ] Tree silhouettes are organic and varied.
- [ ] Foliage reads as painted masses, not polygons or disconnected dashes.
- [ ] Sunbeams are soft and integrated, not geometric wedges.
- [ ] The branch is natural, tapered, and visually supports the landing.
- [ ] The character focal area is clear.
- [ ] The palette supports the bird without camouflage.
- [ ] Fine painted edges survive import and compositing.
- [ ] A single plate or validated layers are supplied with provenance.
- [ ] No procedurally painted substitute is presented as premium artwork.

## 8. Current status

**BLOCKED.** No premium forest source artwork exists in the repository. The
Phase 2/2.5/2.6 forest images are procedural diagnostic art and must not be
used as evidence of premium environment quality.

Generate or commission the forest master with this prompt, then submit the
actual image for review before integration.
