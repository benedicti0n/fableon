# Stage 2B.3 — Registration Methodology

## Coordinate chain

1. **Master image** — original provider master, pixels.
2. **Master silhouette** — alpha bounds (Gemini cream background removed by flood fill).
3. **Landmark normalized** — 0..1 inside the master silhouette.
4. **Generated part source** — original part pixels before registration.
5. **Registered sprite rect** — `offsetX/Y`, `width/height` in rig coordinates.
6. **Sprite-local normalized** — 0..1 inside the registered sprite rect.
7. **Rig-local** — connector positions after crop conversion.
8. **Character/world/screen** — placement and camera transforms.

## Reconstruction procedure

- Use the Stage 2B.1 neutral/walk-entry pose so the comparison is not an artificial T-pose.
- Resolve all parts through the Stage 2B.2 connector rig.
- Render the independent sprites to a transparent 1:1 canvas.
- Extract the master silhouette.
- Scale the master uniformly to the reconstruction silhouette height.
- Center within the reconstruction bounds; no nonuniform stretching.
- Produce original, reconstruction and 50% overlay panels.
- Compute silhouette IoU as an objective difference indicator.

## What the IoU does and does not mean

IoU compares the whole silhouette, including pose, clothing shape and generated-part differences.
It is **not** an anatomical landmark metric and is not used to claim per-joint correctness. A low
IoU here is evidence that the independent sprite set does not reconstruct the master silhouette,
which is an artwork/assembly limitation.

## Landmark error

The master landmarks are largely inferred from a 3/4 or profile view. Reporting precise landmark
errors would imply observation accuracy that does not exist. Landmark error is therefore marked
**unavailable**, not fabricated. The editor exposes the inferred points for manual calibration.
