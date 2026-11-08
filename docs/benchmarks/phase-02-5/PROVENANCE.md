# Phase 2.5 — Provenance

## Artifacts

| Artifact                      | Path                                                                |
| ----------------------------- | ------------------------------------------------------------------- |
| Art direction                 | `docs/benchmarks/phase-02-5/ART_DIRECTION.md`                       |
| Contact sheet                 | `docs/benchmarks/phase-02-5/contact-sheet.png`                      |
| Playable GIF                  | `docs/benchmarks/phase-02-5/landing-preview.gif`                    |
| Optional H.264 preview        | `docs/benchmarks/phase-02-5/landing-preview.mp4`                    |
| Performance measurements      | `docs/benchmarks/phase-02-5/performance.json`                       |
| Quality assessment            | `docs/benchmarks/phase-02-5/QUALITY_ASSESSMENT.md`                  |
| Selected frames               | `docs/benchmarks/phase-02-5/selected-frames/`                       |
| Character pose sheet          | `docs/benchmarks/phase-02-5/character-poses.png`                    |
| Full-resolution pose previews | `docs/benchmarks/phase-02-5/character-poses/`                       |
| Reproducible full sequence    | `docs/benchmarks/phase-02-5/frames/` (ignored generation directory) |

Full-resolution selected frames: `frame-000.png`, `frame-008.png`,
`frame-016.png`, `frame-024.png`, `frame-030.png`, `frame-038.png`,
`frame-047.png`. All are 1920×1080 PNGs.

The GIF is 960×540, 48 frames, generated from the actual 1920×1080 frame
sequence. GIF delay quantization is documented in the quality assessment.

## Generation pipeline

1. `createStorybookBirdArt(seed)` paints nine transparent part canvases:
   tail, far wing, both legs, body, head, beak, eye, and near wing.
2. `createLandingSceneArt(seed)` paints a dedicated close-up forest and a
   tapered branch.
3. `createLandingRig()` defines the benchmark-local parent/child hierarchy,
   pivots, draw order, and scalar tracks.
4. `renderLandingFrame(context, frame, benchmark)` evaluates the rig with
   `@fableon/sprite-motion` and composites the parts on Canvas 2D.
5. The `/benchmarks/phase-02-5` page exposes the real renderer plus capture
   functions for the frame sequence, contact sheet, and pose previews.
6. `pnpm benchmark:phase-02-5` uses Playwright Chromium to render all 48 frames,
   write selected frames, generate the contact and pose sheets, measure
   performance, and invoke ffmpeg for the GIF.

Seed: `20261109`.

## What is authored vs procedural

- **Programmatically authored:** all character silhouettes, feather groups,
  wing shapes, eye/beak, tail, legs, branch, forest masses, light, and labels.
  The source is TypeScript drawing code in `packages/paint-engine`, not imported
  raster art.
- **Procedural texture:** seeded paper grain, brush marks, washes, and color
  variation from Fableon Paint.
- **Canvas primitives:** paths, gradients, ellipses, transforms, clipping, and
  alpha compositing.
- **External art:** none. No illustration, photograph, AI image, GIF, or model
  output was imported.
- **External paid services/credentials:** none.
- **Fonts:** labels and UI text use system font stacks; there are no embedded
  font assets. Text is not part of the animation frames.
- **GIF/optional video encoder:** local `ffmpeg` palette generation and H.264
  encoding of the benchmark only. No production video stack or Remotion
  integration was added.

## Character identity

All five pose previews and all 48 frames are rendered from the same part
canvases and palette. The part set is:

```text
tail
wingFar
legLeft
legRight
body
wingHead (head)
beak
eye
wingNear
```

The rig adds attachment transforms and pivots around the body. The master parts
have transparent backgrounds and are reused without per-frame regeneration.

## Licensing

The generated artwork is original in-repository output for the private
unlicensed Fableon project. No third-party licensed assets are included. Human
review is required before any external use.

## Limitations

- Locally authored procedural illustration is not a substitute for a
  professional illustrator or an approved high-quality generated asset.
- The layered parts have visible construction at some joints and do not hide
  all seams at extreme poses.
- GIF color quantization and centisecond frame delays prevent exact 24 FPS/color
  reproduction. The native PNG sequence and Canvas preview are authoritative.
- Character consistency is proven for this single benchmark identity, not for a
  general production rig.
