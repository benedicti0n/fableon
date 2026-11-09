# Phase 4.1 — Preview vs Export Consistency

**Preview:** `/studio/composition` Canvas at 1920×1080  
**Export:** `outputs/where-the-light-lands/final.mp4` decoded at the same global frame numbers  
**Comparison:** structural side-by-side plus SSIM (H.264 compression expected)

## Frames compared

| Frame | Shot                             | Preview file          | Export file           |   SSIM (all) |
| ----: | -------------------------------- | --------------------- | --------------------- | -----------: |
|    72 | Awakening Forest / opening title | captured at 1920×1080 | decoded MP4 frame 72  | **0.973435** |
|   240 | Little Bird in Flight            | captured at 1920×1080 | decoded MP4 frame 240 | **0.973905** |
|   470 | The Landing / contact            | captured at 1920×1080 | decoded MP4 frame 470 | **0.975848** |
|   620 | A Place to Rest / ending title   | captured at 1920×1080 | decoded MP4 frame 620 | **0.974767** |

SSIM around 0.974–0.976 is consistent with H.264 compression, yuv420 chroma conversion,
and the export's final scaling. It is not a structural mismatch.

## Visual comparison

Side-by-side pairs are in:

```text
comparison/preview-vs-export/
├── frame-72.png
├── frame-240.png
├── frame-470.png
└── frame-620.png
```

Each pair is left = Studio Canvas preview, right = decoded MP4 frame.

Observed structural consistency:

- camera framing and branch/tree positions align;
- character position and wing pose align;
- title text and position align;
- layer ordering and lighting align;
- color is slightly softened by H.264 encoding, with no structural shift.

No evidence was found for a separate preview renderer or a different export animation
path. Both use `FilmRenderer` and `evaluateFilmFrame`.

## Decision

**Preview/export consistency: PASS.**

The preview and exported video represent the same composition state. Differences are
consistent with normal video compression, not with divergent animation logic.
