# Stage 2C.5 — Joint Articulation Report

## Arm poses

Rendered through the production `FolkRenderer` at 640×360 with a 2.6× camera:

- neutral;
- shoulder lift;
- elbow 30°;
- elbow 60°;
- elbow 90°;
- wrist out;
- wrist in;
- open hand.

Source: `openai-arm-poses.png`, `gemini-arm-poses.png`.

The production renderer applied absolute pose patches to `nearUpperArm`, `nearForearm` and `handOpen`. The unit test confirms the forearm matrix remains unchanged when only `handOpen` rotates and the hand matrix changes. Wrist independence is therefore structural, not just a visual coincidence.

**Grip pose:** blocked. The paid sheets contain only an open hand. No grip-pose artwork was invented.

## Leg poses

Rendered at 640×360 with a 2.4× camera:

- neutral stance;
- hip flexion;
- knee flexion;
- knee extension;
- ankle up;
- ankle down;
- heel;
- toe-off.

Source: `openai-leg-poses.png`, `gemini-leg-poses.png`.

The unit test confirms the shin matrix remains unchanged when only `nearFoot` rotates. The ankle is independent in the technical rig.

The Gemini near foot is visually small and does not match the far-side Stage 2B shoe; this is marked **PARTIAL**, not a visual approval.

## Motion videos

Production-rendered 48-frame, 2-second H.264 MP4s at 1280×720 and 24 FPS:

| Provider | Arm                                                                        | Leg                                                                        |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| OpenAI   | `outputs/folk-provider-benchmark/stage-2c5/openai/arm-articulation-2s.mp4` | `outputs/folk-provider-benchmark/stage-2c5/openai/leg-articulation-2s.mp4` |
| Gemini   | `outputs/folk-provider-benchmark/stage-2c5/gemini/arm-articulation-2s.mp4` | `outputs/folk-provider-benchmark/stage-2c5/gemini/leg-articulation-2s.mp4` |

All four are 1280×720, 24/1 FPS, 48 frames, 2.000 s, and pass full FFmpeg decode. Hashes and frame hashes are in `video-report.json`.

The arm motion rotates the shoulder, elbow and wrist on separate nodes. The leg motion rotates the hip, knee and ankle on separate nodes.

## Joint ownership test

`apps/web/lib/providers/stage2c5-rig.test.ts` verifies:

1. rotating `handOpen` leaves `nearForearm` unchanged;
2. rotating `nearFoot` leaves `nearShin` unchanged;
3. the rig uses the existing master pivots and segment lengths.
