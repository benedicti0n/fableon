# Phase 5 — Rigging Evaluation

**Package:** `packages/folk-motion`  
**Evaluator:** absolute-pivot hierarchical matrices over `@fableon/sprite-motion` matrix math  
**Film configuration:** `apps/web/public/assets/folk-pilot/film.json`

## Runtime model

Each part is authored in the master's coordinate space. A node stores its own absolute
pivot, parent, part ID, and draw order. At runtime:

```text
local = translate(pivot + offset) × rotate × scale × translate(-pivot)
world = parentWorld × local
```

This differs from the Phase 4 bird rig, where child translation was defined in the
parent's local sprite space. The absolute-pivot model makes a master-scale skeleton
possible and keeps every joint at its measured location. It also makes the debug skeleton
meaningful: a joint line is drawn from the parent's transformed pivot to the child's
transformed pivot.

## Artisan hierarchy

```text
pelvis (root)
├── torso
│   ├── sash
│   ├── necklace
│   ├── neck → head
│   │   ├── eye, eyelid, brow, moustache, earring
│   │   ├── turban
│   │   └── turbanTail
│   ├── shoulderSash
│   ├── farUpperArm → farForearm → farHand
│   └── nearUpperArm → nearForearm
│       ├── handOpen
│       └── handGrip (alternate visibility)
├── farThigh → farShin → farFoot
│   └── farDhoti
└── nearThigh → nearShin → nearFoot
    └── nearDhoti
```

Required joints present: root, pelvis, torso, neck, head, both shoulders, elbows, wrists,
hips, knees, and ankles. Optional attachments present: turban tail, sash, necklace,
earring, shoulder sash.

## Horse hierarchy

```text
torso (root)
├── tailBase → tailTuft
├── farFrontUpper → farFrontLower → farFrontHoof
├── farHindUpper → farHindLower → farHindHoof
├── nearFrontUpper → nearFrontLower → nearFrontHoof
├── nearHindUpper → nearHindLower → nearHindHoof
├── mane
├── saddleBlanket
├── harnessCollar
├── harnessStrap
├── harnessAnchor
└── neck → head
    ├── farEar, nearEar
    ├── eye
    ├── forelock
    └── bridle
```

## Cart and bell

```text
cartBody (root)
├── farWheel
├── shafts
└── nearWheel

bell (root)
```

The cart follows the horse root with a configured `offsetX = -275` world units and a
scale of 0.6. The shaft tip lands at the horse chest. Wheel rotation is derived from
traveled distance and wheel radius, not hand-keyed.

## Motion presets

All presets are data-driven. Changing speed, gait phase, reach target, or camera does not
require editing animation logic.

| Preset        | Applied to | What it does                                                       |
| ------------- | ---------- | ------------------------------------------------------------------ |
| `walk`        | Artisan    | Two-bone leg gait, opposing arm swing, body bob, cloth sway, blink |
| `idle`        | Artisan    | Planted feet, breathing, head drift, blink                         |
| `reach`       | Artisan    | Two-bone arm reach to a world target, grip swap, release           |
| `watch`       | Artisan    | Idle with a look toward the departing cart                         |
| `walk`        | Horse      | Four-leg phased gait, body bob, head nod, tail sway                |
| `nod`         | Horse      | Deliberate head/neck nod while standing                            |
| `idle`        | Horse      | Planted legs and small head/tail motion                            |
| rolling       | Cart       | Body bounce plus distance-derived wheel rotation                   |
| bell transfer | Prop       | Hand anchor before attach, harness anchor after attach             |

## Gait and foot planting

The walk uses a 60% stance / 40% swing cycle. During stance, the foot target moves
backward in master space at the same rate as the body advances, so the world foot position
stays approximately fixed. Swing adds a sine lift. Human ankles and horse fetlocks are
solved with two-bone IK; the foot/hoof local rotation cancels the parent chain rotation to
stay level.

This is an approximation, not a full ground-contact solver. Small slide is still possible
when the configured speed does not match the stride implied by the cycle. The film uses
matching values for the three walking segments.

## Hands, blink, and prop transfer

- `handOpen` and `handGrip` share the same wrist pivot; only one is visible.
- `eyelid` shares the eye pivot; visibility toggles for 3 frames every 72 frames.
- The bell is a separate prop. Before the attach frame it is drawn at the transformed hand
  pivot; after the attach frame it is drawn at the transformed `harnessAnchor`.
- The hand releases after the attach frame, but the bell remains at the harness.

## Tests

`packages/folk-motion/src/folk-motion.test.ts` covers:

- exact resolution of every artisan part;
- exclusive grip/open hand visibility;
- eyelid visibility during a blink;
- two-bone IK output sanity;
- deterministic motion for identical config;
- different thigh rotation when walk speed changes;
- all four horse hooves remain in the chain;
- both cart wheels share the distance-derived rotation;
- bell rig resolution.

`apps/web/lib/folk/folk-film.test.ts` additionally verifies that every rig `partId` exists
in the manifest and is unique. This test caught a real defect during development: artisan
and horse both exported a part named `torso`, and the runtime map overwrote one with the
other. The build now namespaces every part as `<actor>_<part>` and the test prevents a
regression.

## Known limitations

1. The rig is a 2D hierarchical cutout. There is no mesh deformation, feather/cloth
   simulation, or volumetric turn.
2. Horse legs use two-bone IK with a fixed bend direction. Uneven ground and independent
   hoof roll are not solved.
3. The human arm can cross the torso in the shot-4 reach. This is visible as a crowded
   silhouette but not a detached limb.
4. Hand acting is limited to open/grip; there are no finger rigs.
5. Facial acting is limited to blink and small head/neck rotation.
6. The debug skeleton is an inspection aid, not a production skeleton file format.

## Decision

**Gate B — rigging: PASS for the required pilot motions.** The rigs execute walk, reach,
grip, release, blink, horse gait, nod, tail sway, wheel rotation, and bell transfer from
saved configuration. **Artistic quality of the rig remains PENDING USER REVIEW.**
