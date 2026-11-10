# Stage 2C — Master Rig Blueprint

## Outputs

- `openai-full-guide.png`, `gemini-full-guide.png`
- `openai-visible-nearUpperArm.png`, `openai-visible-nearForearm.png`
- `openai-visible-nearThigh.png`, `openai-visible-nearShin.png`
- `gemini-visible-nearUpperArm.png`, `gemini-visible-nearForearm.png`
- `gemini-visible-nearThigh.png`, `gemini-visible-nearShin.png`
- `openai-contract.json`, `gemini-contract.json`

## Method

1. Load the original master and Stage 2C landmark record.
2. Place shoulder/elbow/wrist and hip/knee/ankle/sole landmarks.
3. Draw the arm and leg skeleton over the master.
4. Extract capsule-shaped visible master regions for upper arm, forearm, thigh and shin.
5. Record expected segment lengths and hidden-overlap allowances.
6. Mark each part `source-preserved` or `needs-editing` using the master-to-rig segment ratio.

## Limitation

The first landmark revision still places some inferred joints near the torso/leg centerline. The
blueprints are a starting point, not an approved anatomical calibration. The master-visible
extractions include overlapping clothing and must be refined with precise masks before paid
generation.

## Hidden geometry

Shoulder, elbow, hip and knee regions require concealed fabric extensions behind the visible
contour. The contract records parent/child hidden-overlap allowances; the current extracted
regions do not contain that hidden material.
