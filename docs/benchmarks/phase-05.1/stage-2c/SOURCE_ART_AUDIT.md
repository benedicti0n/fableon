# Stage 2C — Source Art Audit

**Starting HEAD:** `2610311`  
**Paid calls:** 0

## Confirmed findings

- OpenAI master: integrated sleeves, compact curled shoes, continuous garment.
- OpenAI sheets: sleeveless torso, separate sleeve segments, duplicate wrist bands, oversized shoes.
- Gemini master: continuous side-profile figure with shaped sleeves and headwear.
- Gemini sheets: tubular arm segments, altered garment/headwear geometry.
- Previous registration normalized parts to fixed rig heights; dimensions alone do not prove master fidelity.
- Previous silhouette IoU: OpenAI 0.5086, Gemini 0.4620. These are diagnostic warnings, not anatomical error measurements.
- OpenAI uses native alpha with antialiased dark contours; Gemini uses chroma extraction with binary-looking alpha edges.

## Consequence

The previous packs are not pixel-preserving decompositions. Stage 2C must begin from master-visible regions and generate only missing occluded geometry.
