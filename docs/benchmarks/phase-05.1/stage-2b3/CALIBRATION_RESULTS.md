# Stage 2B.3 — Calibration Results

## Versioned rigs

| Provider | Rig ID                         | Parts | Attachments | Registration changed? |
| -------- | ------------------------------ | ----: | ----------: | --------------------- |
| OpenAI   | `artisan_openai_anatomical_v1` |    31 |          30 | **No**                |
| Gemini   | `artisan_gemini_anatomical_v1` |    31 |          30 | **No**                |

The versioned rigs preserve the Stage 2B.2 socket geometry and add the anatomical landmark
reference. They do not claim a visual registration improvement that the source parts cannot
support.

## Socket alignment

| Provider | Max rendered socket error | Average rendered socket error |
| -------- | ------------------------: | ----------------------------: |
| OpenAI   |           2.26 × 10⁻¹³ px |               2.75 × 10⁻¹⁴ px |
| Gemini   |           2.23 × 10⁻¹³ px |               2.76 × 10⁻¹⁴ px |

## Master reconstruction

| Provider | Silhouette IoU | Assessment                                                       |
| -------- | -------------: | ---------------------------------------------------------------- |
| OpenAI   |         0.5086 | partial silhouette similarity; shoulder, wrist and shoe mismatch |
| Gemini   |         0.4620 | partial silhouette similarity; arm, face and clothing mismatch   |

## Landmark error

Marked **unavailable**. Master landmarks are inferred from a different view; no numeric
improvement is claimed.

## Verdict

The connector solver remains correct. The anatomical registration target is **not achieved** for
the visible shoulder, wrist-band, shoe, Gemini arm and facial areas without new source artwork.
This is a deliberate ARTWORK-BLOCKED result, not a hidden failure.
