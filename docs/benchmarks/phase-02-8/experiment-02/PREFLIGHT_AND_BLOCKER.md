# Phase 2.8 Experiment 2 — Revised First/Last-Frame Preflight and Blocker

**Date:** 2026-11-09  
**Revision:** 2 — revised endpoint re-check  
**Status:** **BLOCKED BEFORE PAID GENERATION — SCENE ALIGNMENT IMPROVED, CHARACTER IDENTITY STILL FAILS**  
**Provider:** Google Gemini  
**Model:** `gemini-omni-1.2-flash`  
**Planned request:** 3 seconds, 720p native, 16:9, start + end conditioning  
**Spend:** **$0.00** — no API request was made  
**Video artifacts:** None created

## 1. Decision

The revised endpoint is a major improvement over the first endpoint. The branch,
right-side trunk, lighting direction, flowers, and lower composition now align
closely with the start frame. The pair is no longer a different scene.

However, two material mismatches remain:

1. The revised endpoint introduces a **large left-side tree trunk** that is not
   present in the start frame.
2. The perched bird is still a **different character construction**: much larger
   eye, shorter/thicker beak, rounder head and body, shorter tail, and simplified
   wing markings.

Those are not pose-only differences. They violate the experiment’s requirement
to preserve character identity and forest geometry. A first/last-frame
generation would have to morph the bird’s face/body and add or remove a tree,
so the result would not be a clean endpoint-conditioning test.

**Stop before submitting the paid request.** Do not spend the $0.25 cap on this
pair.

## 2. Repository state

- **Starting HEAD:** `6db440e`
- **Branch:** `main`
- **Working tree at re-check start:** clean except the replaced endpoint asset
- **Revised endpoint:** `assets/premium-video-v1/end-frame.png`
- **Revised endpoint SHA-256:**
  `e0d3a948382e9b93d52dfa969108b52ab78737927293b64dfaab6bbb5a87d106`
- **Start frame SHA-256:**
  `3bd6ed479b7febc43c25fcb44b46f68d760d335ecfe9bdd7c4d6b8c725a0e9d1`
- No push performed
- No Phase 3 work started

The previous endpoint (`e3bec87…`) remains in git history and is not used by
this revision.

## 3. Input assets

| Property      | Start frame                               | Revised end frame                       |
| ------------- | ----------------------------------------- | --------------------------------------- |
| Path          | `assets/premium-video-v1/start-frame.png` | `assets/premium-video-v1/end-frame.png` |
| Dimensions    | 1672×941                                  | 1672×941                                |
| Aspect ratio  | 1.7768:1                                  | 1.7768:1                                |
| Format        | PNG 8-bit RGB                             | PNG 8-bit RGB                           |
| Size          | 2,970,254 bytes                           | 3,046,308 bytes                         |
| Decodes       | Yes                                       | Yes                                     |
| One bird      | Yes                                       | Yes                                     |
| Text / labels | None                                      | None                                    |
| Alpha         | None                                      | None                                    |
| SHA-256       | `3bd6ed47…e9d1`                           | `e0d3a948…d106`                         |

Both files pass the technical checks. Provenance for both is user-supplied;
macOS metadata records a download source of `https://chatgpt.com/`. Neither is
a cleared production asset.

## 4. Compatibility findings

| Check                                            | Result           | Finding                                                                                                       |
| ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| Same dimensions                                  | **PASS**         | 1672×941                                                                                                      |
| Same aspect ratio                                | **PASS**         | 1.7768:1                                                                                                      |
| Both decode                                      | **PASS**         | Valid PNGs                                                                                                    |
| One bird / no text                               | **PASS**         | No labels, panels, or multiple birds                                                                          |
| Branch geometry                                  | **PASS (close)** | Same curved mossy branch and contact area                                                                     |
| Right-side trunk                                 | **PASS (close)** | Same dominant right trunk and foliage                                                                         |
| Lower-left flowers                               | **PASS (close)** | Same flower cluster and placement                                                                             |
| Lighting direction                               | **PASS (close)** | Warm beams from the upper right                                                                               |
| Camera framing                                   | **PASS (close)** | Same 16:9 composition and branch placement                                                                    |
| Left-side forest geometry                        | **FAIL**         | Revised endpoint adds a large left tree trunk that is absent from the start frame                             |
| Character identity                               | **FAIL**         | Different eye size, beak shape, head/body ratio, tail length, and wing markings                               |
| Clean compositing                                | **PARTIAL**      | Feet grip the branch and no hard matte halo is obvious, but the bird reads as a separately designed character |
| Suitable for clean first/last-frame conditioning | **FAIL**         | The model would have to morph identity and add/remove background geometry                                     |

Scene-level alignment is now good. Character-level alignment is not.

## 5. Quantitative evidence

### Revised pair vs start frame

| Metric                            |        Value |
| --------------------------------- | -----------: |
| SSIM, all channels                | **0.761365** |
| SSIM, R                           |     0.757769 |
| SSIM, G                           |     0.767817 |
| SSIM, B                           |     0.758508 |
| Mean absolute difference (0–255)  |    **13.32** |
| Pixels differing by more than 10  |       28.81% |
| Pixels differing by more than 25  |       24.46% |
| Pixels differing by more than 50  |       16.91% |
| Pixels differing by more than 100 |        6.14% |

Per-region mean absolute difference:

| Region       |       MAD | Interpretation                                  |
| ------------ | --------: | ----------------------------------------------- |
| Top left     | **34.42** | New left tree trunk and denser foliage          |
| Top right    |      8.14 | Right trunk/canopy aligns well                  |
| Bottom left  |      6.31 | Branch/flowers align well                       |
| Bottom right |      4.43 | Branch/trunk/flowers align well                 |
| Center       | **27.97** | Bird identity/pose and midground foliage differ |

The mismatch is now concentrated in the upper-left background and the bird, not
spread across the whole frame.

### Revision 1 vs revision 2

| Pair                                  |         SSIM | Global MAD |
| ------------------------------------- | -----------: | ---------: |
| Original start vs revision 1 endpoint |     0.144777 |       62.7 |
| Original start vs revision 2 endpoint | **0.761365** |  **13.32** |

The revision is a large improvement. It is still not a clean identity match.

### Region diagnostics

| Region                     |     SSIM / metric | Interpretation                                                                                      |
| -------------------------- | ----------------: | --------------------------------------------------------------------------------------------------- |
| Upper-left background crop | SSIM **0.355067** | The added left trunk is a real geometry change                                                      |
| Bird head crop             | SSIM **0.184237** | Diagnostic only; crop alignment is approximate, but confirms a substantial facial-design difference |

The head-crop SSIM is not a formal identity score because the two heads are not
pixel-aligned and the birds are in different poses. It is used only to support
the visual finding. The direct head comparison is the stronger evidence.

## 6. Visual evidence

- `docs/benchmarks/phase-02-8/experiment-02/start-end-comparison.png`
  - left: start frame;
  - middle: revised end frame;
  - right: amplified absolute difference.
- `docs/benchmarks/phase-02-8/experiment-02/start-end-bird-crops.png`
  - left: start bird;
  - right: revised end bird.
- `docs/benchmarks/phase-02-8/experiment-02/start-end-head-crops.png`
  - left: start head close-up;
  - right: revised end head close-up.
- `docs/benchmarks/phase-02-8/experiment-02/start-end-left-trunk-crops.png`
  - left: start upper-left background;
  - right: revised end upper-left background.
- `docs/benchmarks/phase-02-8/experiment-02/end-frame-revision-comparison.png`
  - left: rejected revision 1 endpoint;
  - right: revised revision 2 endpoint.

## 7. Remaining visual defects

### D1 — Added left-side tree trunk

The start frame’s upper-left is open forest with thin trunks and foliage. The
revised endpoint adds a large, detailed tree trunk and branch structure in that
region. A model interpolating the pair would have to grow a tree during the
landing or ignore the endpoint’s left side.

### D2 — Character identity drift

The revised bird remains a different design:

- eye is substantially larger relative to the head;
- beak is shorter and thicker;
- head is rounder and the body is plumper;
- tail is shorter;
- wing markings are broader and less layered;
- facial feather markings and cream/chestnut transitions differ.

The palette family is correct, but the construction is not the same character.
This is the same class of defect Experiment 1 exposed.

### D3 — Compositing assessment

No hard white matte halo or floating feet are obvious at normal viewing. The
visible foot grips the moss, and the branch contact is plausible. The remaining
issue is not a crude cutout edge; it is that the perched bird is a different
character design composited into the scene.

## 8. Provider and model verification

Current Gemini documentation was checked on 2026-11-09:

- `gemini-omni-1.2-flash` supports first/last-frame interpolation.
- First/last-frame interpolation supports **3–10 seconds**.
- Two images are supplied in the input list, followed by a text prompt.
- 720p is native/default; 1080p and 4K are upscaled.
- Standard pricing: **$12.00 per 1M video tokens**; 720p uses about
  **5,792 tokens/s**, or **~$0.07/s**.
- A 3-second 720p attempt is approximately **$0.21**, within the **$0.25**
  experiment cap.

The local `.env` contains `GEMINI_API_KEY`. The value was not printed, logged,
or committed. No request was sent.

## 9. Planned request — not executed

| Parameter         | Value                           |
| ----------------- | ------------------------------- |
| Provider          | Google Gemini                   |
| Model             | `gemini-omni-1.2-flash`         |
| Mode              | First/last-frame image-to-video |
| Duration          | 3 seconds                       |
| Resolution        | 720p native                     |
| Aspect ratio      | 16:9                            |
| Images            | Start frame + revised end frame |
| Prompt            | Balanced-motion landing prompt  |
| Attempts          | 1                               |
| Automatic retries | None                            |
| Interaction ID    | **None**                        |
| Provider status   | **Not called**                  |

## 10. Cost and spend

| Item                        |     Value |
| --------------------------- | --------: |
| Paid API requests           |     **0** |
| Spend                       | **$0.00** |
| Estimated cost if unblocked |    ~$0.21 |
| Experiment cap              |     $0.25 |
| Remaining under cap         |     $0.25 |
| Usage record                |      None |

No `cost-report.json`, `metadata.json`, or generated MP4 exists.

## 11. Required corrections

The endpoint must preserve both the scene and the character:

1. **Keep the same left-side forest geometry.** Do not add a large left trunk
   that is absent from the start frame. Use the start frame’s background as the
   scene base.
2. **Preserve the start bird’s facial construction:** eye size, beak shape,
   head/body ratio, cheek/feather markings, and cream/chestnut transitions.
3. **Preserve the start bird’s body and wing design:** slender body, long tail,
   layered slate-blue wing feathers, and golden accents.
4. **Use a perched pose derived from the start character**, not a newly designed
   rounder bird.
5. **Keep the existing branch, right trunk, flowers, and lighting** that already
   match.
6. **Check feet and branch contact** at high resolution; the current contact is
   plausible but should be preserved.
7. Re-run this compatibility check before any paid request.

Recommended workflow: use the start frame as the scene base and inpaint/compose
a perched version of the **same** bird onto the existing branch, rather than
generating a new scene or a new character. A matching endpoint should differ
from the start primarily in the bird’s pose and wing position, not in the forest
or facial design.

## 12. What was deliberately not created

- `original-video.mp4`
- `metadata.json`
- `contact-sheet.png`
- `selected-frames/`
- `comparison-with-experiment-01.mp4`
- `cost-report.json`
- `EVALUATION.md` with fabricated scores

Only updated input-comparison evidence and this blocker document exist.

## 13. Next action

1. Produce a revision 3 endpoint from the start frame, preserving the left
   background and the start bird’s facial/body identity.
2. Re-run the comparison and check the head, tail, wing markings, left
   background, and feet.
3. If the pair passes, submit exactly one 3-second, 720p, 16:9 first/last-frame
   request under the $0.25 cap.
4. If it fails, stop again and report the specific mismatch.

No Phase 3 work was started. No push was performed.
