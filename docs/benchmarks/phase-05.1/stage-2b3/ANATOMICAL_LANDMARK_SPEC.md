# Stage 2B.3 — Anatomical Landmark Specification

## Schema

`packages/folk-motion/src/anatomy.ts` defines a versioned landmark set:

```ts
interface AnatomicalLandmark {
  id: string;
  semantic:
    | "head-center"
    | "neck"
    | "chin"
    | "eye"
    | "nose"
    | "headwear"
    | "shoulder"
    | "elbow"
    | "wrist"
    | "palm"
    | "grip"
    | "chest"
    | "waist"
    | "pelvis"
    | "hip"
    | "knee"
    | "ankle"
    | "heel"
    | "toe"
    | "sole";
  x: number; // normalized against master silhouette bounds
  y: number;
  origin: "observed" | "inferred" | "manual";
  confidence: number; // 0..1
  side?: "near" | "far" | "center";
  notes?: string;
}
```

Landmark sets are stored as `artisan_openai_anatomical_v1` and
`artisan_gemini_anatomical_v1` companion records. They are not hardcoded into animation code.

## Coordinate space

Landmarks are normalized to the **master silhouette bounds**, not raw image dimensions. This makes
them independent of the master image resolution and keeps the far-side inferred points explicit.

## Observation status

- `head-center`, `eye`, `nose` are treated as observed.
- Neck, shoulders, elbows, wrists, hips, knees and ankles are **inferred** because the characters
  are side-view and the far-side joints are occluded.
- Every inferred landmark records confidence and a note.

## Landmark files

- `docs/benchmarks/phase-05.1/stage-2b3/openai-landmarks.json`
- `docs/benchmarks/phase-05.1/stage-2b3/gemini-landmarks.json`

These are calibration references, not proof of observed anatomy. They are deliberately not used to
claim a landmark-error improvement.
