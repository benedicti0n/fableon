# Phase 2.6 Source Artwork Requirements

**Status: BLOCKED — premium source artwork is not present in the repository.**

Phase 2.6 validates the illustration preparation and animation pipeline with a
**diagnostic fixture**: the Phase 2.5 procedural layered bird and forest were
rasterized to PNG, imported through the real inspection/trim/hash pipeline, and
animated with the same landing motion.

This is an acceptable engineering result, but it is **not** an artistic-quality
benchmark for premium artwork. No premium-art comparison is claimed.

## 1. Why the premium comparison is blocked

The benchmark requires real high-quality source artwork to answer whether
Fableon preserves genuinely beautiful illustration through preparation and
animation. The repository contains only procedurally authored Phase 2 and Phase
2.5 artwork. Importing that art proves the pipeline; it cannot prove that
premium artwork survives the pipeline because no premium artwork exists.

Do not describe the diagnostic result as artistic validation.

## 2. Required character deliverables

Supply a consistent storybook songbird with a warm ochre/chestnut body, cream
belly, blue-slate wings, expressive eyes, small golden beak, delicate feet, and
soft painted edges.

Preferred:

1. Master character sheet.
2. Neutral side/three-quarter pose.
3. Wings-raised pose.
4. Wings-lowered pose.
5. Landing/braking pose.
6. Perched pose.
7. Separate transparent character parts for:
   - body
   - head
   - eye
   - beak
   - wing-far
   - wing-near
   - tail
   - leg-left
   - leg-right
8. Authored hidden-body or rear-wing reconstruction where the master pose
   occludes anatomy.

Part requirements:

- PNG or WebP with transparency. No flattened background.
- At least 2× target display scale where possible.
- Consistent palette, feather markings, lighting direction, proportions, and
  rendering style across every part.
- Paint edges may be soft and semi-transparent; do not aggressively key them.
- Include source provenance and usage rights.

If only a flattened illustration is available, it must be prepared through the
mask workflow and any occluded anatomy must be authored separately. Fableon does
not infer hidden anatomy.

## 3. Required environment deliverables

- 1920×1080 or larger painterly forest composition.
- Consistent warm dawn light, sage/ink shadows, and ochre highlights.
- Background plate with no baked-in bird.
- Independent landing branch layer with a clear contact area.
- Optional midground trees, foreground foliage, mist/light overlays, and
  foreground details on transparent layers.
- Painted fine edges preserved; avoid JPEG compression on transparent layers.

A single polished background plate is acceptable for Phase 2.6. A layered
environment is preferred for future parallax and camera work.

## 4. Provenance and licensing

Every asset must document:

- origin: user-created, artist-created, AI-generated, licensed third party, or
  procedural;
- creator/provider where applicable;
- source reference and version;
- license or usage rights;
- whether the asset was edited or reconstructed.

Do not assume that an image found online is reusable.

## 5. Preparation and acceptance path

1. Open `/studio/assets`.
2. Import source files in Character or Environment mode.
3. Assign files to template parts or layers.
4. Set pivots in source coordinates and registration in the pack canvas.
5. Resolve all blocking diagnostics, including hidden-anatomy reconstruction.
6. Export the validated `.fableon-pack.zip`.
7. Re-import the archive to confirm manifest, derivatives, and provenance.
8. Run `/benchmarks/phase-02-6` with the imported pack once the benchmark is
   wired to a replaceable premium pack.

Acceptance evidence for a premium benchmark should include:

- no pixel difference between each source region and its prepared derivative
  beyond the documented PNG round-trip tolerance;
- zero environment-plate difference;
- rig compatibility and foot-lock checks passing;
- frame-difference metrics comparing the imported render to the same artwork
  composed without import;
- human review of the actual animation.

## 6. What Phase 2.6 already provides

- Strict pack manifest and validation.
- Fidelity-preserving PNG/WebP import with alpha, trim, padding, and hashes.
- Character part assignment, pivot/registration editing, mask extraction, and
  unresolved-occlusion reporting.
- Imported pack to rig adapter.
- Layered environment pack composition.
- Portable ZIP export/import.
- A diagnostic benchmark proving the pipeline path end to end.
- A browser workspace for preparing the real assets when they arrive.
