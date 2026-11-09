# Phase 4.1 — Video Integrity

**Artifact:** `outputs/where-the-light-lands/final.mp4`  
**SHA-256:** `61ef10891b96d09eeb06d88bf8bcd9b2477b30514ff87b9d5e64a8e8ea88bf62`  
**Size:** 15,419,466 bytes  
**Inspection date:** 2026-11-10

## FFprobe

| Property     | Result          | Expected  | Decision |
| ------------ | --------------- | --------- | -------- |
| Duration     | **30.000000 s** | 30.000 s  | PASS     |
| Video frames | **720**         | 720       | PASS     |
| Frame rate   | **24/1**        | 24 fps    | PASS     |
| Resolution   | **1920×1080**   | 1920×1080 | PASS     |
| Codec        | **H.264**       | H.264     | PASS     |
| Audio        | **none**        | None      | PASS     |
| Container    | MP4             | MP4       | PASS     |
| Aspect ratio | 16:9            | 16:9      | PASS     |

`ffmpeg -v error -i final.mp4 -f null -` completed with **exit 0**. The full decode
produced no errors or warnings.

## Frame and black-level analysis

All 720 frames were decoded to 320×180 grayscale for deterministic diagnostics.

| Metric                          |             Result |
| ------------------------------- | -----------------: |
| Frames evaluated                |                720 |
| Mean luminance minimum          |                6.0 |
| Mean luminance maximum          |              149.3 |
| Consecutive-frame MAD mean      |              2.130 |
| Consecutive-frame MAD median    |              1.367 |
| MAD p95                         |              5.487 |
| MAD p99                         |             12.921 |
| MAD maximum                     |             13.284 |
| Jump candidates >20 or >1.5×p99 |           **none** |
| Black frames (mean < 8)         | **0 and 719 only** |

Black frames occur only at the start and end of the intentional fades. No unintended
black-frame range was found.

### Near-frozen tails

The diagnostic found two near-frozen runs at a very low threshold (MAD < 0.02 for at
least three frames):

- frames **139–143** (end of shot 1);
- frames **524–527** (end of shot 3 / settling).

These coincide with the eased camera tail and the landing settle. They are not corrupt
or missing frames, but they are visually static stretches. Severity: **P3** unless a
human reviewer finds them distracting.

## Other integrity checks

- No missing frames: decoded count equals container frame count equals 720.
- No duplicate output frames were found by the timeline contract.
- No corrupted frames: full decode passed.
- No stretched aspect ratio: 1920×1080 and 16:9 throughout.
- No unintended transparency: output is opaque H.264 with no alpha stream.
- No text clipping observed in the opening or ending titles.
- Audio absence is intentional for Phase 4.

## Decision

**Video integrity: PASS.**

The file is a valid, complete, decodable 30-second 1080p H.264 film. The only motion
anomalies found at the global diagnostic level are low-magnitude near-frozen tails at
shot ends, and the intentional fades.
