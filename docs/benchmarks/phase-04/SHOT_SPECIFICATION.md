# Where the Light Lands — Shot Specification

**Composition ID:** `where-the-light-lands-30s`  
**Film spec version:** `where-the-light-lands-v1`  
**Spec hash at final render:** `ecacc59ab78d851fc4e332ea4ffe608724d3827ed7bbafe9d469c03f41ff61ba`  
**Output:** 30.000 seconds · 720 frames · 24 fps · 1920×1080 · H.264 · silent

## Timeline contract

| Shot | Start | End | Frames | Duration |
| --- | ---: | ---: | ---: | ---: |
| `shot-1` Awakening Forest | 0 | 143 | 144 | 6.000 s |
| `shot-2` Little Bird in Flight | 144 | 359 | 216 | 9.000 s |
| `shot-3` The Landing | 360 | 527 | 168 | 7.000 s |
| `shot-4` A Place to Rest | 528 | 719 | 192 | 8.000 s |

Frame indices are integer and global. `localFrame = globalFrame - startFrame`. The
composition validator rejects gaps, overlaps, duplicate IDs, non-contiguous shots, invalid
transitions, invalid frame counts, and out-of-range global frames.

## Transition semantics

- **Fade from black:** shot 1, first 12 frames. At local frame 0 the output is black; by local
  frame 11 the current shot is fully visible. Output frame count is unchanged.
- **Crossfade:** shots 2, 3, and 4 use the first 12 frames of the incoming shot. The outgoing
  shot is held on its **last frame** (`frameCount - 1`) while the incoming shot fades in. At
  local frame 0, outgoing opacity is 1 and incoming opacity is 0; at local frame 11, incoming
  is 1 and outgoing is 0. No frame is duplicated in the global timeline; the held source frame
  is an explicit crossfade rule.
- **Fade to black:** shot 4, last 24 frames. The current shot fades to black while the global
  frame count remains exactly 720.

## Camera specification

Camera world: `2400 × 1350`. Canonical viewport: `1920 × 1080`. Camera center is clamped so
the viewport never leaves the world.

### Shot 1 — camera-awakening

| Frame | Center | Zoom | Easing |
| ---: | --- | ---: | --- |
| 0 | (1180, 680) | 1.00 | ease-in-out |
| 143 | (1300, 710) | 1.06 | ease-in-out |

Slow pan/zoom reveal of the painted forest and branch.

### Shot 2 — camera-flight

| Frame | Center | Zoom | Easing |
| ---: | --- | ---: | --- |
| 0 | (980, 700) | 1.02 | ease-in-out |
| 108 | (1180, 780) | 1.04 | ease-in-out |
| 215 | (1360, 830) | 1.03 | ease-in-out |

Gentle follow as the bird crosses the frame. The bird is not centered every frame; the
camera leaves breathing room and the background parallax supplies depth.

### Shot 3 — camera-landing

| Frame | Center | Zoom | Easing |
| ---: | --- | ---: | --- |
| 0 | (1300, 790) | 1.04 | ease-in-out |
| 110 | (1420, 830) | 1.06 | ease-in-out |
| 167 | (1450, 835) | 1.07 | ease-in-out |

Camera settles on the branch as the bird brakes and contacts it.

### Shot 4 — camera-rest

| Frame | Center | Zoom | Easing |
| ---: | --- | ---: | --- |
| 0 | (1450, 820) | 1.07 | ease-in-out |
| 191 | (1520, 840) | 1.16 | ease-in-out |

Slow push-in toward the perched bird.

## Character motion specification

Character: nine-part Little Bird rig (body, tail, far wing, left leg, right leg, near wing,
head, beak, eye). Scale: 2.0. Part pivots and local transforms match the Phase 2.7 candidate
construction. The character is drawn through the hierarchy evaluator, not as a single moving
PNG.

### Shot 2 — flight preset

- Local frames 0–215.
- Path: `(420, 640)` → `(1150, 760)`, smooth arc with a small flight bob.
- Wing beat: sinusoidal near/far wing rotations with a phase offset.
- Tail follow-through, small head stabilization, legs tucked.
- No foot contact.

### Shot 3 — landing preset

- Local frames 0–167.
- Approach from `(1100, 650)` toward the contact point `(1450, 1250)`.
- Braking starts 24 frames before contact; wings spread.
- Contact at **local frame 110** (global frame 470).
- Settle over frames 110–150; wings fold, tail follows through, body compresses slightly.
- Foot contact solver shifts the body so the lower foot lands exactly at branch world Y
  `1250`. The correction is affine and deterministic.

### Shot 4 — idle preset

- Local frames 0–191.
- Position: `(1450, 1250)`, solved to branch contact.
- Subtle body breathing, head/tail adjustments, wing fold, periodic blink every 96 frames.
- Foot contact solved every frame.

## Environment specification

- World plate: `apps/web/public/assets/film/where-the-light-lands-plate.png`
- Distant plane: `apps/web/public/assets/film/where-the-light-lands-plate-distant.png`
- Two practical depth planes plus a screen-space atmosphere:
  - distant plate depth `0.18`, opacity `0.78`;
  - primary painted plate depth `0.55`, opacity `1.0`;
  - atmospheric overlay (light, mist, pollen, leaf sway).
- This is a conservative two-plane parallax demonstration, not a true repainted multilayer
  forest.

## Ambient specification

- 22 seeded pollen particles, deterministic absolute-frame positions.
- 9 foreground leaf shapes with seeded placement and sinusoidal sway.
- Light-ray opacity and mist drift evaluated from absolute global frame.
- No accumulated particle state. Direct frame 400 evaluation equals repeated evaluation.

## Titles

- Opening: global frames 24–108, fade in/out 18 frames, centered at `(960, 260)`.
- Ending: global frames 600–688, fade in/out 18 frames, centered at `(960, 900)`.

## Output and reproduction

```bash
# Required checkpoint (5 seconds, crosses shot 1 → shot 2)
pnpm render:demo:checkpoint

# Full film + review artifacts
pnpm render:demo
```

The full render writes:

```text
outputs/where-the-light-lands/
├── final.mp4
├── render-manifest.json
└── render-report.json
```

The final MP4 is intentionally Git-ignored. Selected review frames and the contact sheet are
committed under `docs/benchmarks/phase-04/`.

## Verification

Final render:

- 720 decoded video frames;
- 24 fps;
- 30.000 s;
- 1920×1080;
- H.264 video stream;
- full `ffmpeg -f null -` decode completed with exit 0;
- no audio stream;
- no paid API request was made.
