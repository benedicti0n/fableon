# Phase 2.8 — Video Provider Selection

**Research date:** 2026-11-09  
**Decision:** Provisional selection for a first controlled test — **Google Gemini
Omni 1.2 Flash** (`gemini-omni-1.2-flash`), 720p, 3 seconds.  
**Status:** Provider chosen; source artwork and spending authorization are
blocked. No generation has been performed.

Detailed evidence: `docs/research/PHASE_02_8_VIDEO_PROVIDERS.md`.

## Ranking

| Rank | Candidate                 | Role                                     |
| ---- | ------------------------- | ---------------------------------------- |
| 1    | **Gemini Omni 1.2 Flash** | Best overall / best economical qualified |
| 2    | **Kling 3.0 / 3.0 Omni**  | Strong character-element alternative     |
| 3    | **Luma Ray 3.2**          | Strongest keyframe control               |
| 4    | **Runway Gen-4.5**        | Credible premium alternative             |
| 5    | **Wan2.2 TI2V-5B**        | Best local option, not feasible locally  |
| —    | **OpenAI Sora 2 / Pro**   | API shut down; not eligible              |

These are provisional rankings based on documented capabilities and cost, not
on generated Fableon footage. No visual-quality score is claimed.

## Why Omni 1.2 Flash

- Current paid Gemini API model, announced GA 2026-11-05.
- Image-to-video with 16:9 output.
- 3–15 second durations; first/last-frame interpolation 3–10 seconds.
- Up to six reference images for identity consistency.
- 720p native default; 1080p/4K are documented as upscaled.
- About **$0.07/s at 720p** and **~$0.104/s at 1080p upscaled**.
- A 3-second 720p attempt is approximately **$0.21** (provider price only).
- Native audio exists but is not required; the experiment should ignore/mute it.

## Why not the alternatives for the first attempt

- **Kling 3.0/3.0 Omni:** excellent element and start/end controls, but the
  official pricing is in credits and USD conversion requires account
  confirmation. It remains the first fallback.
- **Luma Ray 3.2:** excellent start/end/multi-keyframe control, but 5-second
  minimum and credit-based pricing. Useful if Omni cannot hold the landing.
- **Runway Gen-4.5:** strong model and simple $0.12/s pricing, but Gen-4.5
  image-to-video duration/resolution/end-frame details need account verification.
- **Wan2.2 local:** no paid API, but 24 GB VRAM for TI2V-5B (and 80 GB for
  I2V-A14B) exceeds the current Apple M1 8 GB machine. Not authorized to download
  or run here.
- **OpenAI Sora:** API shut down 2026-09-24; no replacement.

## Selected preflight

| Item                    | Planned value                                     |
| ----------------------- | ------------------------------------------------- |
| Provider                | Google                                            |
| Model                   | `gemini-omni-1.2-flash`                           |
| Mode                    | Image-to-video                                    |
| Aspect                  | 16:9                                              |
| Resolution              | 720p (native); optional 1080p is upscaled         |
| Duration                | 3 seconds (minimum; target is 2 seconds)          |
| Original retention      | Keep complete 3-second original                   |
| Evaluation clip         | Derived 2-second clip, clearly labeled            |
| Attempts                | 2 maximum, no automatic retries                   |
| Estimated provider cost | 2 × $0.21 = **$0.42** at 720p                     |
| Authorized budget       | **$0.00** — no authorization yet                  |
| Source image            | **Missing premium 16:9 start frame**              |
| Credentials             | Gemini API paid-tier key — not present/authorized |

## Fallback sequence

1. Gemini Omni 1.2 Flash 720p, 3-second, one attempt after approval.
2. If identity/motion is inadequate, Kling 3.0 Omni or Luma Ray 3.2 as a
   controlled second provider test, with separate authorization.
3. Do not compare providers by paying for many attempts before one real output
   has been reviewed.

## Hard gates

- **Source artwork:** blocked until a clean 16:9 starting frame exists.
- **Paid generation:** blocked until the user approves the provider and a
  spending cap. Default authorized budget remains $0.
- **Evaluation:** blocked until a real MP4 exists.
- **Phase 3:** not started.
