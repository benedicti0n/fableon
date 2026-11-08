# Character Part Preparation

**Package:** `@fableon/illustration-pipeline`  
**Template:** `storybook-bird`  
**Status:** Phase 2.6 implementation.

## 1. Input scenarios

### A. Already-layered artwork (preferred)

The user imports one transparent image per part. Fableon validates part
completeness, source dimensions, alpha, pivots, hierarchy, draw order, and rig
compatibility. The original images are preserved; derivatives are only created
for trimming or normalization.

### B. Single flattened illustration

A flattened image does **not** contain hidden wing surfaces, rear body sections,
or complete limb geometry. Fableon provides a constrained mask workflow:

1. Load the flattened source.
2. Choose a rectangular region.
3. Paint or supply a mask.
4. Extract the visible selected pixels.
5. Adjust registration and pivot numerically.
6. Mark the part as requiring hidden-anatomy reconstruction.
7. Supply an authored replacement part later.

The mask function is explicit and non-generative. It never inpaints missing
anatomy and never claims that segmentation produced a complete rig.

### C. Missing or incomplete parts

The preparation report lists missing required parts, parent mismatches, opaque
character parts, missing hashes, unresolved occlusion, and registration
problems. An incomplete pack is inspectable but `ready` remains false.

## 2. Template

```text
body
├── head
│   ├── eye
│   └── beak
├── wing-far
├── wing-near
├── tail
├── leg-left
└── leg-right
```

Draw order:

| Part      | zIndex |
| --------- | ------ |
| tail      | 10     |
| wing-far  | 20     |
| leg-left  | 30     |
| leg-right | 31     |
| body      | 50     |
| wing-near | 60     |
| head      | 70     |
| beak      | 80     |
| eye       | 85     |

The template is a recommendation, not a schema constraint. The benchmark-local
landing rig expects these roles. Future characters may define different anatomy.

## 3. Pivot editing

Pivots are stored in original source-image coordinates. The interface can edit
`pivot.x` and `pivot.y` numerically and redraw the composed character. Trimming
does not change the pivot; `preparedOffset` preserves the original-to-prepared
transform.

Pivot preview should show:

- source bounds;
- retained trim/content bounds;
- prepared bounds;
- pivot point;
- registration point;
- draw order;
- parent relationship.

## 4. Mask extraction

`extractMaskedRegion(source, mask, { region, maskAlphaThreshold })`:

- requires source and mask to have identical dimensions;
- copies selected source RGBA bytes exactly;
- makes unselected pixels fully transparent;
- returns region-local pixels, source-coordinate content bounds, coverage, and
  visible-pixel count;
- warns on empty masks, selected-but-transparent content, near-full masks, and
  hidden-anatomy risk.

It does not remove halos, feather edges, or background color. Those decisions
require explicit user action or authored replacement art.

## 5. Occlusion metadata

```json
"occlusion": {
  "requiresReconstruction": true,
  "note": "Rear wing surface is hidden by the near wing in the flattened source."
}
```

A pack with unresolved reconstruction requirements is not animation-ready. This
is enforced by `validateCharacterPreparation`.

## 6. Composition preview

The preparation UI draws parts at `registration + preparedOffset`, sorted by
`zIndex`. The preview is for inspection and registration, not a final rendered
frame. It uses the prepared derivatives and never regenerates the artwork.

## 7. Output

The preparation workflow produces a validated illustration pack. Export includes
the manifest, prepared assets, optional original sources, hashes, and provenance.
The pack can be re-imported and composed identically.
