# Imported Illustration Rig Adapter

**Package:** `@fableon/illustration-pipeline`  
**Rig system:** `@fableon/sprite-motion`  
**Status:** Phase 2.6 benchmark-local integration.

## 1. Responsibility

The adapter maps prepared illustration parts onto an existing hierarchical rig
without changing the persisted scene schema, the Phase 2.5 motion system, or the
imported pixels.

It does four things:

1. Resolves pack parts by stable ID or role.
2. Validates hierarchy and draw order against the base rig.
3. Shifts each imported image so its own source pivot lands on the rig
   attachment point.
4. Renders the imported images with the base rig's transforms and tracks.

It does **not** repaint, regenerate, segment, or deform the artwork.

## 2. Pipeline relationship

```text
Scene project (schema v1, unchanged)
  → evaluateProjectFrame(...) → FramePlan
  → benchmark-local frame index / landing timeline
  → illustration pack (parts, pivots, trim offsets, provenance)
  → imported character rig (base rig + pack bindings)
  → evaluateSpriteRig(packRig, frame)
  → renderImportedCharacter(context, frame, adapter)
  → PNG / GIF / MP4 evidence
```

`FramePlan` remains the authoritative scene description. The imported character
rig is a benchmark-local runtime definition, like the Phase 2.5 landing rig. It
is not persisted into the scene schema. Phase 3 may define a production
character/rig schema after reviewing this evidence.

## 3. Pivot mapping

The base rig's pivots and motion tracks are authoritative. For each node:

```text
drawOffset =
  part.preparedOffset + baseRigPivot - importedPartPivot
```

Then the imported prepared image is drawn at `drawOffset` inside the node's
local space. The imported part's own pivot lands exactly on the rig's attachment
point:

```text
drawOffset + importedPartPivot = baseRigPivot
```

This allows an imported part to carry a different pivot from the Phase 2.5
procedural part while still attaching correctly. The adapter reports pivot
remapping as informational metadata; it does not silently edit the manifest.

## 4. Hierarchy and draw order

- Base rig parent relationships are preserved.
- Pack parent relationships are validated against the base mapping.
- Pack `zIndex` becomes the render draw order.
- A mismatch between the base rig draw order and pack `zIndex` is reported as a
  warning; the pack's explicit order wins.
- Missing parts, duplicate matches, and incompatible parents are blocking
  errors.

## 5. Part images

`createImportedCharacterRig(baseRig, pack, images)` accepts a map from pack part
ID to a decoded `CanvasImageSource`. The prepared image is drawn directly with
`drawImage`; no canvas-wide repaint occurs. `preparedSize` determines the draw
rectangle, so a derivative must match its manifest dimensions.

Hidden-part inspection uses rig node IDs. The renderer preserves smoothing and
uses the imported alpha channel.

## 6. Determinism

- Exact integer frame evaluation comes from `evaluateSpriteRig`.
- Repeated evaluation is structurally equal.
- The adapter is immutable after creation.
- Draw order is explicit and sorted.
- No random or wall-clock data participates in rendering.
- The imported source textures are stable across frames.

## 7. Compatibility limits

The adapter is a Phase 2.6 benchmark bridge, not a general production rig:

- It expects a base rig whose node/role names map to the pack template.
- It does not solve IK, deformation, hidden anatomy, or mesh skinning.
- It does not add a character schema version.
- It does not support arbitrary animation curves beyond the base rig tracks.
- It uses rigid image transforms; painted feather surfaces do not bend.

These limits are deliberate. Premium artwork can improve visual quality without
requiring the motion prototype to be rewritten.
