# Where the Light Lands — Asset Provenance

**Phase:** 4  
**Paid API usage:** **$0 / zero calls**  
**Network use during render:** local server only; no remote provider or cloud renderer

## Forest plate

The film environment is derived from the existing painted start frame:

```text
Source: assets/premium-video-v1/start-frame.png
Source SHA-256: 3bd6ed479b7febc43c25fcb44b46f68d760d335ecfe9bdd7c4d6b8c725a0e9d1
Source provenance: user-supplied, generated through ChatGPT; candidate review asset,
not cleared production artwork
```

The flying bird was excluded by cropping the right side of the source. Local FFmpeg only:

```bash
ffmpeg -i assets/premium-video-v1/start-frame.png \
  -vf "crop=852:479:820:160,scale=2400:1350:flags=lanczos,unsharp=5:5:1.0:5:5:0" \
  apps/web/public/assets/film/where-the-light-lands-plate.png

ffmpeg -i apps/web/public/assets/film/where-the-light-lands-plate.png \
  -vf "gblur=sigma=10,eq=brightness=-0.08:saturation=0.82:contrast=0.94" \
  apps/web/public/assets/film/where-the-light-lands-plate-distant.png
```

| Derived asset | Path                                                                  | SHA-256                                                            |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Primary plate | `apps/web/public/assets/film/where-the-light-lands-plate.png`         | `bbea1b1be41a8689f65f829b5ec4d1c68d841142110c9d94200af53623e14329` |
| Distant plate | `apps/web/public/assets/film/where-the-light-lands-plate-distant.png` | `fecfa8941f6ef5884e9bc4e9d828d371d30c36585359a9c74fc816b2a3f06bc3` |

The plate is an upscaled 852×479 crop. It is intentionally documented as a soft painted
background, not native 1080p detail and not a newly painted multilayer forest.

## Character

Character assets are the existing Phase 2.7 candidate pack:

```text
apps/web/public/assets/premium-bird-v1/
├── manifest.json
└── parts/{body,head,eye,beak,tail,wing-far,wing-near,leg-left,leg-right}.png
```

Provenance source: `apps/web/public/assets/premium-bird-v1/provenance.json`.

Status: **NOT_APPROVED_ARTWORK**. The parts are candidate reconstructions with known
head/body seams, wing-root halos, white fringe, and low source resolution. The film uses them
as a technical animation demonstration, not as approved production illustration.

The reusable motion package references the same nine-part construction and pivots. The
historical Phase 2.5 and Phase 2.7 benchmark code and artifacts were not modified.

## Generated video

```text
Path: outputs/where-the-light-lands/final.mp4
SHA-256: 61ef10891b96d09eeb06d88bf8bcd9b2477b30514ff87b9d5e64a8e8ea88bf62
Size: 15,419,466 bytes
```

The output is Git-ignored by design. It was rendered locally at 1920×1080, 24 fps, 720
frames, H.264, silent.

## Local tools

- Chromium via Playwright for Canvas 2D frame rasterization.
- FFmpeg `libx264` for local H.264 encoding.
- FFprobe for stream metadata and full-decode verification.

No image-generation request, video-generation request, cloud render, external artwork
download, or paid service was used in Phase 4.
