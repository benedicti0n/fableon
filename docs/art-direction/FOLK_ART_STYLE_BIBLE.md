# Fableon Folk-Art Style Bible

**Production:** The Little Brass Bell  
**System:** Fableon local cutout animation  
**Reference posture:** original Rajasthani/Indian folk-art animation language, not a copy of any existing character or film frame.

This bible governs the pilot and future Fableon folk productions. It is deliberately a
**flat, graphic, rig-friendly** language rather than a painterly AI-image look.

## 1. Core principle

**Design for the joint, not only for the still.**

Every character is authored as a master illustration with separately extractable parts.
Silhouettes, overlaps, and hidden geometry matter more than surface detail, because the
same asset must survive rotation, occlusion, and reuse across shots.

## 2. Palette

| Role | Hex | Use |
| --- | --- | --- |
| Ink outline | `#2a1710` | Every major silhouette, 7–10 px at master scale |
| Warm skin | `#c98254` | Artisan skin |
| Skin shadow | `#a9633c` | Far limbs and facial shadow |
| Skin light | `#e0a06b` | Hand and face highlights |
| Ochre | `#d39a3d` | Coat, cart body, sandstone highlights |
| Ochre dark | `#b77a2b` | Cart shafts, wheel shading, floor pattern |
| Indigo | `#29445f` | Turbans, doors, harness, cart canopy |
| Indigo light | `#3e6385` | Sleeve and joint accents |
| Cream | `#f2e3c6` | Dhoti, horse body, trim |
| Cream shade | `#dcc9a4` | Cloth folds and horse shadow |
| Terracotta | `#b55034` | Sash, banners, wheel rims, horse mane |
| Terracotta dark | `#8f3a26` | Tail tuft, deep accents |
| Gold | `#e0b354` | Jewellery, harness studs, bell, trim |
| Gold dark | `#b8872f` | Bell shadow and metal depth |
| Saffron | `#cf5a32` | Artisan turban |
| Shoe brown | `#5a2f1d` | Mojari shoes and hooves |
| Hair | `#332018` | Hair, moustache, pupils |
| Horse body | `#e8cda0` | Horse coat |
| Horse shade | `#c9a878` | Far legs and horse shadow |
| Horse mane | `#a94f32` | Mane and tail |

Accent rules:

- Keep one dominant warm field (ochre/cream), one cool counterweight (indigo), and one
  hot accent (terracotta/saffron).
- Gold is for ornament and metal, not for large fills.
- Do not introduce photographic gradients. Gradients are allowed only in sky/light
  washes and the brass bell.

## 3. Outline rules

- Use a consistent dark ink outline around every readable form.
- Master line weight is **7–10 px** at the authored resolution.
- Interior detail lines are **3–5 px** and never darker than the silhouette outline.
- Do not use soft drop shadows as a substitute for line work.
- Do not let two independently moving parts share a single continuous outline; each part
  needs its own closed outline so it remains readable when rotated.
- Joint discs may read as bangles, armbands, harness rings, or cloth knots. This turns a
  technical overlap into a deliberate folk ornament.

## 4. Shape language

- Rounded rectangles, arched windows, lotus/temple silhouettes, and circular jewellery.
- Heads are slightly oversized; hands and feet are simplified but readable.
- Torsos are stable masses; limbs are tapered capsules.
- The horse is constructed from a barrel, arched neck, wedge head, and four clear legs.
- Architecture uses repeating arches, jaali diamonds, chevrons, and gold bands.
- Every shape should read as a flat cutout at thumbnail size.

## 5. Character proportions

### Artisan

- Total master height: 1100 px; ground at 1020 px.
- Head + turban: roughly 1/5 of total height.
- Shoulder width: about 1.4 head widths.
- Arms reach to mid-thigh; hands are simplified mittens with a separate grip pose.
- Legs are split at hip, knee, and ankle.
- Clothing: ochre angrakha, cream dhoti, terracotta sash, indigo turban tail and sleeves,
  gold jewellery, brown mojari shoes.
- Identity anchors: saffron turban with indigo band and gold pin, curled moustache, gold
  earring, asymmetric coat trim.

### Horse

- Master: 1400×950; ground at 894 px.
- Barrel body, arched neck, long wedge head, two upright ears, terracotta mane/tail.
- Four legs with upper, lower, and hoof segments; near and far pairs visibly separated.
- Harness: indigo collar and saddle blanket, gold studs, terracotta girth strap.
- Identity anchors: cream coat, terracotta mane/tail, blue-and-gold harness, long pale
  muzzle.

### Cart and bell

- Cart: ochre body, indigo canopy, two spoked wheels, gold diamond motifs, long shafts.
- Wheels are independent sprites with a measured center pivot.
- Bell: compact brass dome, terracotta bands, clapper, top loop. Readable at 38% scale.

## 6. Fabric and jewellery rules

- Patterns are geometric and repeatable: diamonds, dots, chevrons, lotus petals.
- Patterns follow the form; do not paint a single detailed texture across a joint.
- Use gold bands at wrists, elbows, knees, and harness points to make joints intentional.
- Turbans, sashes, and canopy cloth should have a clear silhouette outside the body.
- Avoid lace, photoreal embroidery, or high-frequency detail that will shimmer when
  scaled.

## 7. Background design language

Two locations share one visual grammar:

1. **Courtyard** — sandstone haveli, central indigo gate, arched windows, jaali panels,
   hanging banners, tree, pots, rangoli.
2. **Village lane** — converging sandstone buildings, central arched gate, hanging cloth,
   cobbled lane, pots and plants.

Rules:

- Author at **2600×1500** with a 100/75 px bleed around the 2400×1350 world.
- Separate sky, distant, main, and foreground layers. Do not derive every layer from one
  blurred image.
- Keep light from the upper right; shadows fall left/down.
- Keep the performance area (roughly world x 500–1800, y 500–1200) free of tall
  foreground occluders.
- Pattern density belongs on walls and borders, not behind faces.
- No blank canvas edges at the maximum camera move.

## 8. Animation limitations

This is a **2D hierarchical cutout** system, not a mesh-deformation system.

Supported:

- Parent-child rotation and translation.
- Two-bone IK for arms and legs.
- Foot planting by phase and stride length.
- Blink by eyelid swap.
- Open-hand/grip-hand swap.
- Prop transfer between hand and harness anchors.
- Four-leg horse gait with phase offsets.
- Wheel rotation from traveled distance.
- Camera pan/zoom and four-layer parallax.

Not supported:

- Feather-level deformation, cloth simulation, or soft-body squash.
- Full facial rigs or lip sync.
- Independent hoof IK with ground adaptation on uneven terrain.
- 3D turning in the round; characters are side-view cutouts.
- Complex hand articulation beyond open/grip.

## 9. Rigging-friendly illustration guidance

1. Author one master per character at a known scale and registration origin.
2. Keep every moving part in its own named group with a closed outline.
3. Extend hidden geometry 20–30 px past each joint boundary.
4. Put the pivot at the actual mechanical center, not at the visual center of the bounding
   box.
5. Separate far-side limbs and give them a darker value.
6. Avoid limbs crossing the torso in the master pose.
7. Keep the hand and wrist clear of the hip silhouette so the prop remains visible.
8. Author a grip variant and an open-hand variant at the same wrist registration.
9. Keep the head/neck join covered by a collar, scarf, or mane.
10. Hash every exported part and record its source master.

## 10. Acceptable vs unacceptable artwork

### Acceptable

- `apps/web/public/assets/folk-pilot/masters/artisan.png` — flat, outlined, readable
  silhouette, separated limbs, ornament at joints.
- `apps/web/public/assets/folk-pilot/masters/horse.png` — four separated legs, harness
  anchors, consistent palette.
- `apps/web/public/assets/folk-pilot/masters/cart.png` — independent wheels and shafts.
- `docs/benchmarks/phase-05/diagnostic-frames/frame-340.png` — coherent courtyard
  composition with character, horse, cart, and architecture.
- `docs/benchmarks/phase-05/diagnostic-frames/frame-520.png` — bell attached at the
  harness, single character silhouette.

### Unacceptable

- `docs/benchmarks/phase-04/acceptance-test/defect-frames/character-perched-fringe-frame-492-crop.png`
  — white alpha fringe and a hard rectangular cutout edge from the previous candidate
  bird. The new pipeline avoids this by authoring parts as vector masters and exporting
  transparent PNGs with clean edges.
- `docs/benchmarks/phase-04/acceptance-test/defect-frames/transition-double-eye-frame-532-crop.png`
  — two character states alpha-blended at a crossfade. The folk renderer never blends
  two character silhouettes; the environment dissolves and one cast is drawn at full
  opacity.
- A photoreal or 3D-rendered horse with soft gradients — rejected: wrong medium.
- A single moving flat PNG with no articulated parts — rejected: not a cutout rig.
- Independently generated body parts with mismatched line weight or identity — rejected:
  the master-first rule exists to prevent this.

## 11. Review status

All pilot artwork is **original local vector art**, generated without an image API. It is
marked `pending_artistic_approval` in the asset manifest. The agent's visual inspection
is not user approval. The pilot is a production-system proof and animatic, not a final
painted film.
