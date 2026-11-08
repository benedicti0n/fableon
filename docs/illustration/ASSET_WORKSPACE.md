# Illustration Asset Workspace

**Route:** `/studio/assets`  
**Status:** Phase 2.6 implementation.

## 1. Purpose

The workspace prepares and inspects local artwork. It does not generate images
and does not claim automatic layer separation. Every imported file remains
local; browser state is session-only until the user exports a pack archive.

## 2. Import

- Accepts PNG, WebP, and JPEG.
- Inspects dimensions, format, alpha, content bounds, file size, color space
  where available, and SHA-256 source/prepared hashes.
- Shows non-destructive warnings for halos, opaque backgrounds, transparent RGB
  residue, and empty content.
- Preview uses a checkerboard; prepared derivatives are shown beside originals.
- Files are auto-assigned to character or environment roles when their stem
  matches a template role. Unmatched files remain available for manual
  assignment.

SVG is rejected. It must be rasterized in an authoring tool first.

## 3. Character preparation

- Nine-part storybook-bird template.
- Manual assignment per part.
- Numeric pivot and registration editing with immediate composed preview.
- Source, trimmed, and prepared bounds plus pivot overlay.
- Missing-part, parent, alpha, hash, draw-order, and occlusion diagnostics.
- Hidden-anatomy flag blocks animation readiness until authored replacement
  artwork is supplied.

## 4. Environment preparation

- Single background plate or layered environment.
- Explicit depth order with simple forward/back controls.
- Transparent foreground/atmosphere validation.
- Registration and transform-aware composition.
- Numeric registration editing per selected layer.

## 5. Export and import

Export produces a ZIP containing:

```text
manifest.json
provenance.json
assets/<prepared derivatives>
source/<original imports>
```

The archive is validated structurally and by asset presence. Re-importing it
reconstructs the pack and decodes its prepared assets for preview and pivot
editing. Re-export is supported.

## 6. Boundaries

- No AI image generation buttons or provider calls.
- No fake auto-rigging or inpainting.
- No digital-painting editor.
- No durable database or cloud storage.
- No persisted scene-schema change.
- No full character-rig or timeline editor.

The workspace is a preparation and inspection tool, not a production asset
management system.
