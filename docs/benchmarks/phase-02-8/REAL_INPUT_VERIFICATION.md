# Phase 2.8 — Real Input Verification

**Date:** 2026-11-09  
**Status:** VERIFIED — SUITABLE FOR ONE 720p IMAGE-TO-VIDEO ATTEMPT  
**Selected provider:** Google Gemini Omni 1.2 Flash

## 1. Discovered asset

| Property       | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Path           | `assets/premium-video-v1/start-frame.png`                          |
| Dimensions     | **1672 × 941**                                                     |
| Aspect ratio   | 1.7768:1 (approximately 16:9)                                      |
| Format         | PNG, 8-bit RGB, non-interlaced                                     |
| File size      | 2,970,254 bytes                                                    |
| SHA-256        | `3bd6ed479b7febc43c25fcb44b46f68d760d335ecfe9bdd7c4d6b8c725a0e9d1` |
| Alpha channel  | None                                                               |
| Endpoint frame | Not supplied (`assets/premium-video-v1/end-frame.png` absent)      |

## 2. Visual inspection

The image is a single, coherent storybook illustration:

- one chestnut-and-golden songbird with cream breast and layered slate-blue wings;
- one painterly sunlit forest with layered depth and visible brush texture;
- one moss-covered landing branch with a readable contact area;
- warm sunlight from the upper right;
- the bird begins in flight, left of center, with wings spread and legs
  extended toward the branch;
- no labels, typography, diagrams, panels, pivot markers, checkerboards, UI,
  watermarks, borders, or multiple birds;
- no visible rigging construction or character-sheet content.

The composition is appropriate for a static-camera landing shot. A natural
landing can occur within a 3-second generation.

## 3. Provenance

The file is user-supplied. macOS metadata records a download source of
`https://chatgpt.com/`, indicating the image was generated through ChatGPT and
then placed in the repository. No embedded authorship, license, or model
metadata was found in the PNG. The file is marked as coming from an external
source by the local quarantine attribute.

This provenance is sufficient for an internal benchmark experiment, but it is
not a documented production license. Do not treat the image as approved
production artwork or as a cleared commercial asset without a separate rights
review.

## 4. Resolution assessment

The earlier input brief preferred **1920 × 1080 or larger**. This frame is
1672 × 941, about 1.57 megapixels. It is therefore below the preferred 1080p
source size.

It remains suitable for the selected experiment because:

- the planned output is **720p native** (1280 × 720, about 0.92 megapixels);
- the source has more pixels than the planned output;
- the aspect ratio is effectively 16:9;
- the image is clean, single-scene, and not an upscale of a low-resolution
  character sheet.

Limitations to record with the result:

- the provider may rescale or crop the input to its own internal size;
- the final output cannot be described as native 1080p;
- fine feather detail may soften during generation;
- no matching endpoint frame exists, so the landing pose is prompt-directed,
  not endpoint-constrained.

## 5. Suitability decision

**SUITABLE** as the first-frame input for one controlled 3-second, 720p,
16:9 image-to-video generation.

It is not suitable for a 1080p native-quality claim, and it does not replace a
licensed final production frame.

## 6. Exact source file

```text
assets/premium-video-v1/start-frame.png
```

The original file must remain unchanged. Generation will read it, encode a
temporary base64 copy in memory, and write the provider output separately under
`docs/benchmarks/phase-02-8/generated/`.
