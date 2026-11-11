# Stage 2C.5 — Leg Separation Report

## Result

**Technical separation: PASS**  
**Independent ankle rotation: PASS**  
**Visual quality: PARTIAL**

## OpenAI

- Shin source: right cell of the leg sheet.
- Ankle split: absolute source y **825**.
- Shin owns the ankle skin; foot/shoe starts below it.
- Shin source crop: 359×715 at x 995, y 110.
- Foot source crop: 430×164 at x 968, y 825.
- Shin scale to master knee–ankle: `0.23896`.
- Foot scale: same as shin; target foot height ≈ 39.19 master px.
- Source RGB mismatches in visible pixels: **0**.
- Green-dominant opaque pixels: **0**.

The shoe outline belongs to the foot. Swinging the foot around the ankle changes the shoe orientation without rotating the shin. The contact sheet contains neutral stance, hip flexion, knee flexion, knee extension, ankle up/down, heel and toe-off.

## Gemini

- Shin source: right cell of the leg sheet.
- Ankle split: absolute source y **1341**.
- Shin source crop: 431×1120 at x 1706, y 221.
- Foot source crop: 200×146 at x 1845, y 1341.
- Shin scale: `0.15122`.
- Target foot size ≈ 30.24×22.08 master px.
- Source RGB mismatches in visible pixels: **0**.
- Green-dominant opaque pixels: **0**.

The Gemini foot is source-proportionate but very small compared with the far-side Stage 2B foot. The near ankle is technically independent, but the pack is not visually production-ready: the near shoe/foot needs artistic review or a new provider-matched foot with a consistent scale.

## Decorative ownership

- Dhoti border/drape: thigh.
- Knee cuff: shin.
- Ankle skin: shin.
- Shoe/foot outline: foot.
- The old `nearDhoti` and `nearFoot` sprites are hidden in the technical pack to prevent duplicate borders/shoes.

## Evidence

- `openai-leg-poses.png`
- `gemini-leg-poses.png`
- `articulation-openai-leg.png`
- `articulation-gemini-leg.png`
- `outputs/folk-provider-benchmark/stage-2c5/{provider}/leg-articulation-2s.mp4`
