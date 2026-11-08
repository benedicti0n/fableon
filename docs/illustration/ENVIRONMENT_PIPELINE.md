# Layered Environment Pipeline

**Package:** `@fableon/illustration-pipeline`  
**Status:** Phase 2.6 implementation.

## 1. Supported structures

Fableon accepts both:

1. **Single polished background plate** — one imported image, usually role
   `sky` with category `background`.
2. **Layered environment** — independently replaceable transparent layers for
   future parallax/camera work.

Recommended layers:

```text
sky                    zIndex 0
distant-forest         zIndex 10
midground-trees        zIndex 20
foreground-trees       zIndex 30
landing-branch         zIndex 40
atmospheric-light      zIndex 50
foreground-details     zIndex 60
```

All layers are optional except that at least one background plate must exist.
Missing recommended layers are warnings, not structural failures. A single
background plate is a valid environment for this phase.

## 2. Registration and transforms

`createEnvironmentRenderPlan(pack)` sorts layers by explicit `zIndex` and
computes:

```text
x = registration.x + preparedOffset.x + transform.x
y = registration.y + preparedOffset.y + transform.y
width = preparedSize.width
height = preparedSize.height
```

Optional transforms support `scaleX`, `scaleY`, `rotation` (degrees), and
`opacity`. Rotation and scale use the layer's top-left corner as the transform
origin in Phase 2.6; this is a simple registration model, not a camera system.

## 3. Composition

`renderEnvironmentPack(context, pack, images)` draws prepared derivatives
directly on the existing Canvas 2D renderer. It:

- never redraws the artwork procedurally;
- preserves prepared alpha;
- uses high-quality image smoothing;
- applies layer opacity;
- draws in deterministic depth order;
- fails loudly if a decoded layer image is missing.

Fableon Paint may be composed as an optional separate overlay, but it is not
required and must not destructively replace imported artwork.

## 4. Transparency requirements

Foreground and atmosphere layers must be transparent. An opaque foreground layer
would hide the character and is rejected as a preparation error. Opaque props
produce a warning because some full-frame props are legitimately opaque.

Trimming follows the same conservative alpha threshold as character parts. Fine
painted edges are preserved; the importer does not apply arbitrary keying,
sharpening, or blur.

## 5. Validation

`validateEnvironmentPreparation(pack)` checks:

- valid pack schema;
- at least one background layer;
- transparent foreground/atmosphere layers;
- explicit unique draw order;
- recommended depth values;
- missing hashes;
- registration outside the canvas;
- pack kind.

It returns `ready`, `missingRecommendedRoles`, and structured issues. A
technically incomplete environment remains inspectable but is not marked ready.

## 6. Scope boundary

Phase 2.6 does **not** implement camera parallax controls, depth-of-field,
occlusion culling, atmospheric simulation, or a scene editor. It provides the
validated layered asset contract and composition path that a future camera
system can consume.
