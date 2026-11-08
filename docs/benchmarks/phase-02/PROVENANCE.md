# Phase 2 Visual Benchmark Provenance

## Artifacts

All paths are relative to the repository root.

| Artifact              | Path                                              |
| --------------------- | ------------------------------------------------- |
| Contact sheet         | `docs/benchmarks/phase-02/contact-sheet.png`      |
| Frame 0 — Dawn        | `docs/benchmarks/phase-02/frame-0000-dawn.png`    |
| Frame 216 — Glide     | `docs/benchmarks/phase-02/frame-0216-glide.png`   |
| Frame 528 — Descent   | `docs/benchmarks/phase-02/frame-0528-descent.png` |
| Frame 840 — Landing   | `docs/benchmarks/phase-02/frame-0840-landing.png` |
| Frame 1151 — Final    | `docs/benchmarks/phase-02/frame-1151-final.png`   |
| Render metrics        | `docs/benchmarks/phase-02/render-metrics.json`    |
| Painted forest (dawn) | `apps/web/public/assets/forest-dawn.png`          |
| Painted forest (deep) | `apps/web/public/assets/forest-deep.png`          |
| Painted branch        | `apps/web/public/assets/branch.png`               |
| Painted bird          | `apps/web/public/assets/bird.png`                 |

The five benchmark frames are direct `canvas.toDataURL("image/png")` captures of
native 1920×1080 canvases rendered by `@fableon/render-engine` from
`SAMPLE_PROJECT` (`where-the-light-lands.project.json`). They are not hand-made
marketing mockups and are not screenshots of the Studio UI.

## Generation method

1. `createWhereTheLightLandsAssets(seed)` in `@fableon/paint-engine` paints four
   transparent/opaque raster assets on real Canvas 2D surfaces.
2. Those canvases are exposed as an in-memory `ImageAssetResolver`.
3. `evaluateProjectFrame(project, frame)` produces a deterministic FramePlan.
4. `renderFrame` composites solid, image, and text layers into a 1920×1080
   canvas.
5. The harness at `/benchmarks/phase-02` renders the five representative frames
   and a contact sheet, and exports the actual canvas data URLs.

Seed: `20261109`.

## What is procedural

- Forest skies, suns, glow, hills, mist, distant vegetation, tree trunks,
  branches, canopy masses, leaf marks, foreground foliage, and paper grain.
- The bird silhouette, breast, head, eye, beak, tail, legs, wing shapes, feather
  marks, and body texture.
- The contact sheet layout, title, and labels.

The artwork uses Fableon Paint's seeded organic strokes, dry-brush bristles,
layered washes, paper grain, and deterministic PRNG. It also uses ordinary
Canvas 2D gradients, Bézier paths, and fills for base shapes and lighting. Those
primitives are identified as Canvas 2D support rather than imported art.

## What is authored or imported

- **No imported artwork.** No external illustration, photograph, GIF, model
  output, or copyrighted asset is used.
- **No AI image generation.** The art was generated locally by code.
- **Typography.** The final title is rendered by the Canvas text layer using the
  system font stack `Iowan Old Style, Georgia, serif`. It is not an embedded
  font asset. Text metrics may vary slightly across operating systems.
- **Audio.** The project manifest keeps the Phase 1 audio reference but no
  audio file exists or is rendered. Audio is outside Phase 2.

## Source dimensions and overdraw

The painted forest plates are 2048×1152, wider/taller than the 1920×1080 scene
canvas. Phase 1 animates the forest background horizontally, so the extra margin
prevents exposed edges. The renderer draws image layers at their intrinsic pixel
size; the scene canvas clips them.

- `forest-dawn.png`: 2048×1152, opaque.
- `forest-deep.png`: 2048×1152, opaque.
- `branch.png`: 2048×360, transparent.
- `bird.png`: 720×540, transparent.

## Licensing

These assets are generated in-repository for the private Fableon project. They
contain no third-party licensed art. The repository remains private and
unlicensed. Human review is still required before any external use.

## Honest assessment

The generated frames are a real, deterministic engineering result and a genuine
first visual direction. They are not yet proof that the custom paint engine meets
the final storybook-quality bar.

Strengths:

- Cohesive olive/ochre palette and a readable warm-light focal point.
- Layered depth and atmospheric light shafts.
- Recognizable bird with distinct head, beak, eye, body, wing, tail, and legs.
- Transparent bird/branch composition works over the painted forest.
- Stable static artwork avoids frame-to-frame texture regeneration.

Known artistic weaknesses:

- Foliage marks repeat in stroke shape and can read as floating dashes rather
  than clustered leaves.
- Some trunk shading looks flat or rectangular at full resolution.
- The branch reads more like a log than an elegant foreground branch.
- The bird is a single static illustration; it does not articulate wings across
  flight and landing.
- Scenes 2–4 reuse the same forest plate, so visual variety is limited beyond
  layer motion and the branch entrance.
- Paper grain is subtle and not yet a convincing wet-media surface.
- The title is typographic, not painted lettering.

Artistic readiness remains **PENDING USER REVIEW**. Engineering evidence is
documented separately in the Phase 2 report.
