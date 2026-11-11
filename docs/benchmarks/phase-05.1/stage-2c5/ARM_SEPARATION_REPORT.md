# Stage 2C.5 — Arm Separation Report

## Result

**Technical separation: PASS**  
**Independent wrist rotation: PASS**  
**Grip-hand artwork: ARTWORK-BLOCKED**

## OpenAI

- Forearm source: right cell of the arm sheet.
- Wrist split: absolute source y **612**.
- Forearm owns the gold wrist band; hand starts below it.
- Forearm source crop: 255×528 at x 1053, y 84.
- Hand source crop: 241×334 at x 1029, y 612.
- Forearm scale to master elbow–wrist: `0.28966`.
- Hand scale: same as forearm; target hand height ≈ 96.75 master px.
- Source RGB mismatches in visible pixels: **0**.
- Green-dominant opaque pixels: **0**.

The wrist test renders the open hand at 0°, +30° and −35° while the forearm matrix is unchanged. The production video shows the hand changing angle independently while the elbow and shoulder move.

## Gemini

- Forearm source: right cell of the arm sheet.
- Wrist split: absolute source y **1166**.
- The bangle stack belongs to the forearm; the hand starts below it.
- Forearm source crop: 258×545 at x 1774, y 621.
- Hand source crop: 223×288 at x 1890, y 1166.
- Forearm scale: `0.27796`.
- Target hand height ≈ 80.05 master px.
- Source RGB mismatches in visible pixels: **0**.
- Green-dominant opaque pixels: **0**.

The wrist rotation is independent, but the Gemini hand is visibly small and its geometric decorative language differs from the OpenAI sleeve. This is a visual limitation, not a technical one.

## What is blocked

The paid sheets contain an **open hand only**. A separate gripping-hand pose does not exist. Rotating the open hand to a grip point is not the same as a painted grip pose. The grip-pose artwork is therefore marked **ARTWORK-BLOCKED**. A future generation would need a hand in a closed grip, preserving the provider's hand palette, outline and wrist-top pivot; the wrist cuff/bangle should remain owned by the forearm.

## Evidence

- `openai-arm-poses.png`
- `gemini-arm-poses.png`
- `articulation-openai-arm.png`
- `articulation-gemini-arm.png`
- `outputs/folk-provider-benchmark/stage-2c5/{provider}/arm-articulation-2s.mp4`
