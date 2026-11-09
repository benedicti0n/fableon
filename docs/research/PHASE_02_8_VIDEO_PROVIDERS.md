# Phase 2.8 — AI Video Provider Research

**Research date:** 2026-11-09  
**Purpose:** Determine which current image-to-video service is worth a first
controlled Fableon experiment.  
**Status:** Research only. No provider was called, no account was connected, and
**$0** was spent.

> No direct comparative footage was generated. The rankings below are based on
> official capabilities, documented pricing, and control surfaces — not on
> measured artistic output. Visual-quality claims remain hypotheses until real
> footage is evaluated.

## 1. Executive findings

1. **OpenAI Sora is not an option.** The Sora product was discontinued on
   2026-04-26, and the Sora 2 models / Videos API were shut down on 2026-09-24.
   The official video-generation guide explicitly says there is no one-to-one
   replacement API.
2. **Google Gemini Omni 1.2 Flash is the best current direct API candidate.**
   It is GA (2026-11-05), accepts image input, supports 16:9, 3–15 second clips,
   first/last-frame interpolation, up to six reference images, native audio, and
   is priced around **$0.07/s at 720p** or **$0.104/s at 1080p upscaling**.
3. **Kling 3.0 / 3.0 Omni** is the strongest alternative for explicit character
   elements/start-end frames, but credit-to-dollar conversion and exact API model
   IDs need account-level confirmation.
4. **Luma Ray 3.2** has the strongest published keyframe control surface
   (start/end/multi-keyframe), but its API is credit-based and its 5-second
   minimum makes a 2-second experiment more expensive than Omni’s 3-second
   minimum.
5. **Runway Gen-4.5** is a credible high-quality option at $0.12/s, but its
   image-to-video duration/resolution controls need account-level verification.
6. **Local Wan2.2 is not feasible on this machine.** The current environment is
   an Apple M1 with 8 GB unified memory and no NVIDIA CUDA. Even the efficient
   TI2V-5B model is documented at 24 GB VRAM for 720p; the A14B image-to-video
   model is documented at 80 GB VRAM.
7. **The source-artwork gate is separate and currently missing.** No clean
   premium 16:9 starting frame exists. Provider selection is therefore
   provisional; no generation can answer the artistic question yet.

## 2. Provider comparison

| Provider / model                 | API available                     | Image input     | Start / end frames                                                       | Reference / identity control                                                    | Duration                    | Resolution                                            | Motion control                                             | Cost evidence                                                                   |
| -------------------------------- | --------------------------------- | --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Google Gemini Omni 1.2 Flash** | Yes, Gemini API paid tier         | Yes             | Yes; first+last 3–10 s                                                   | Up to 6 reference images; stronger 1.2 consistency                              | 3–15 s                      | 720p native default; 1080p/4K upscaled                | Text prompt; image-to-video task; conversation editing     | $0.07/s 720p; ~$0.104/s 1080p upscaled (official)                               |
| **Kling 3.0 / 3.0 Omni**         | Yes, Kling API                    | Yes             | Yes                                                                      | Element library, multi-image/video references, subject binding                  | 3–15 s                      | 720p, 1080p, 4K                                       | Prompt, multi-shot, start/end frames, elements             | 6–12 credits/s (720/1080 no audio) official; USD/credit unverified              |
| **Luma Ray 3.2**                 | Yes, Luma Agents API              | Yes             | Yes; start/end; multi-keyframe                                           | Keyframes/reference images; no dedicated reusable character ID in docs reviewed | 5 or 10 s                   | 360p, 540p, 720p, 1080p                               | Strong keyframe/multi-keyframe control; prompt             | 100 credits/5 s 720p; 400 credits/5 s 1080p official; USD/credit plan-dependent |
| **Runway Gen-4.5**               | Yes, Runway Dev API               | Yes             | First image; check endpoint for end-frame support                        | Characters/references available; exact Gen-4.5 consistency control unverified   | 5 or 10 s (API input guide) | 1280×720 documented input; exact output set per model | Prompt, image-to-video, keyframes/video-to-video elsewhere | 12 credits/s = $0.12/s at $0.01/credit (official)                               |
| **OpenAI Sora 2 / Pro**          | **No — API shut down 2026-09-24** | Historical only | Historical                                                               | Historical                                                                      | 16/20 s historically        | 720p/1080p historically                               | Historical                                                 | Not currently purchasable                                                       |
| **Wan2.2 (local)**               | Local open source                 | Yes             | Start frame; no documented end-frame keyframe control in reviewed README | No hosted character asset; prompt/image only                                    | 5 s typical                 | 480p/720p; TI2V-5B 720p at 24 fps                     | Prompt/image; local code                                   | Apache-2.0; no API fee; hardware/compute cost                                   |

### Notes

- OpenAI’s current documentation says the product was discontinued and the
  Videos API was shut down. Historical capability tables are intentionally not
  used to rank it as current.
- Veo 3.1 Preview in the Gemini API was shut down on 2026-10-22. Runway still
  lists Veo 3.1 as a routed model, but it is not the cheapest direct option.
- Google’s 1080p/4K Omni output is documented as **upscaled**, not native
  1080p/4K. Do not claim native 1080p generation.
- Luma’s credit-to-dollar conversion depends on the account/plan; use its
  dashboard/list rate. The $0.30/5 s 720p figure from a secondary pricing guide
  is an estimate, not a quote.
- Kling “credits” are not stated as USD on the reviewed official pricing page;
  a Runway resale listing is available at $0.09–$0.43/s depending on model and
  audio/resolution. Do not treat Kling credits as USD without confirmation.
- Runway’s API input guide says durations are 5 or 10 seconds and 1280:720 is
  accepted; exact Gen-4.5 output availability should be verified in the account
  before purchase.
- Commercial terms, model licenses, and content policies differ by provider.
  They must be reviewed before any production use. This document is not legal
  advice.

## 3. Weighted evaluation

Weights are the Phase 2.8 priorities: visual quality 30%, character consistency
25%, motion coherence 20%, cost 15%, API control 10%.

Because no generated footage exists, visual quality and motion are **not scored
from evidence**. The table below records documented capability fit only.

| Candidate             | Visual quality evidence                                  | Consistency controls                                       | Motion controls                                   | Verified cost                     | API/control                                  | Provisional rank           |
| --------------------- | -------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------- | --------------------------------- | -------------------------------------------- | -------------------------- |
| Gemini Omni 1.2 Flash | No Fableon test; official longer-clip/reference examples | Strong: 6 refs, first/last, 1.2 consistency claims         | Strong: 3–15 s, prompt, image-to-video            | $0.07/s 720p; $0.104/s 1080p      | Gemini Interactions API; image+text; SynthID | **1 (best overall)**       |
| Kling 3.0 / 3.0 Omni  | No Fableon test; official examples                       | Strong: element library, multi-image/video refs, start/end | Strong: flexible 3–15 s, multi-shot, start/end    | Credits only; USD unverified      | Kling Open Platform                          | **2**                      |
| Luma Ray 3.2          | No Fableon test; official examples                       | Strong keyframe/start/end; no hosted character ID          | Strong multi-keyframe; 5/10 s                     | Credits; estimated $0.30/5 s 720p | Clear generation API                         | **3 (best control)**       |
| Runway Gen-4.5        | No Fableon test; strong benchmark claims from vendor     | Characters/references; Gen-4.5 specifics unverified        | Image-to-video; 5/10 s; exact controls unverified | $0.12/s verified                  | Runway Dev API                               | **4**                      |
| Wan2.2 TI2V-5B        | Open model; no Fableon test                              | Prompt/image only                                          | Prompt/image; local code                          | No fee; hardware cost             | 24 GB VRAM required                          | **5 (not local-feasible)** |
| OpenAI Sora 2 / Pro   | Historical                                               | N/A                                                        | N/A                                               | Unavailable                       | Shut down                                    | **Not eligible**           |

## 4. Recommendations

### Best overall candidate

**Google Gemini Omni 1.2 Flash (`gemini-omni-1.2-flash`)** at 720p for the first
test.

Reasons:

- current, documented, paid API;
- direct image input and image-to-video task;
- 16:9 output;
- 3–15 second durations, with a 3-second minimum (the reference target is 2
  seconds, so the original must be retained and a derived 2-second evaluation
  clip labeled);
- first/last-frame support for a controlled landing endpoint;
- up to six reference images for identity;
- lowest verified per-second price;
- no need for a separate local GPU stack.

Caveat: 1080p is upscaled; a 3-second 720p test is the cheapest meaningful first
step. A 2-second native output is not offered.

### Best economical candidate

**Gemini Omni 1.2 Flash at 720p** is also the best economical qualified option:
about **$0.21 for one 3-second attempt** at the documented $0.07/s rate (plus
any image-generation cost for the start frame, which is not included).

If a stronger keyframe workflow is required, **Luma Ray 3.2 720p** is the next
choice at 100 credits per 5 seconds (roughly $0.30 at the commonly cited rate,
but confirm the account’s credit value). Its 5-second minimum makes it less
cheap for a 2-second experiment.

### Best potential local/open-source candidate

**Wan2.2 TI2V-5B** is the best local fit on paper: 720p at 24 fps, image-to-video,
Apache-2.0, and documented to run on a 24 GB consumer GPU.

**Not feasible on the current machine:** Apple M1, 8 GB unified memory, no CUDA.
The 14B image-to-video model is documented at 80 GB VRAM. A cloud GPU or a
different workstation would be required, with separate authorization.

## 5. Dated sources

All sources accessed **2026-11-09**. Provider pages change; verify before any
purchase.

| Source                              | URL                                                                                                  | Used for                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| OpenAI Sora 2 announcement          | https://openai.com/index/sora-2/                                                                     | Product launch, Sora discontinuation notice                                                |
| OpenAI Sora API guide               | https://developers.openai.com/api/docs/guides/video-generation                                       | API shut down 2026-09-24; historical image-reference/character details                     |
| OpenAI API pricing                  | https://developers.openai.com/api/docs/pricing                                                       | Confirms no current Sora video pricing                                                     |
| Google Gemini Omni docs             | https://ai.google.dev/gemini-api/docs/omni                                                           | Image-to-video, 3–15 s, 16:9, 1080p upscaled, first/last frames, 6 refs                    |
| Google Gemini Omni 1.2 announcement | https://blog.google/innovation-and-ai/technology/developers-tools/introducing-gemini-omni-1-2-flash/ | GA date, 15 s, $0.07/s 720p, consistency, SynthID                                          |
| Google Gemini API pricing           | https://ai.google.dev/gemini-api/docs/pricing#gemini-omni-1.2-flash                                  | $12/1M video tokens; ~$0.07/s 720p, ~$0.104/s 1080p                                        |
| Kling 3.0 user guide                | https://kling.ai/quickstart/klingai-video-3-model-user-guide                                         | 3–15 s, image-to-video, start/end, element consistency, 720/1080/4K, native audio, credits |
| Kling 3.0 Omni guide                | https://kling.ai/quickstart/klingai-video-3-omni-model-user-guide                                    | Multi-image/video element references, up to 7 images, 3–15 s, pricing credits              |
| Kling API pricing                   | https://kling.ai/document-api/pricing/base/video                                                     | 720/1080/4K credit rates                                                                   |
| Luma Ray 3.2 generation docs        | https://docs.agents.lumalabs.ai/guides/videos/generation/                                            | Image-to-video, start/end, multi-keyframe, 5/10 s, 16:9, 720/1080p                         |
| Luma Ray 3.2 pricing                | https://docs.agents.lumalabs.ai/guides/pricing/                                                      | 100 credits/5 s 720p, 400 credits/5 s 1080p                                                |
| Luma official LLM info              | https://lumalabs.ai/llm-info                                                                         | Ray3.2 current; 1080p; API/credit context                                                  |
| Runway models                       | https://docs.dev.runwayml.com/guides/models/                                                         | Gen-4.5, image-to-video, Kling/Veo/Omni routing                                            |
| Runway pricing                      | https://docs.dev.runwayml.com/guides/pricing/                                                        | Gen-4.5 12 credits/s, $0.01/credit                                                         |
| Runway API inputs                   | https://docs.dev.runwayml.com/assets/inputs/                                                         | 5/10 s durations, 1280:720 image input guidance                                            |
| Runway Gen-4.5 announcement         | https://runwayml.com/research/introducing-runway-gen-4.5                                             | Model positioning/limitations                                                              |
| Wan2.2 repository                   | https://github.com/Wan-Video/Wan2.2                                                                  | I2V-A14B 80 GB, TI2V-5B 24 GB, 720p 24 fps, Apache-2.0                                     |

## 6. What remains unverified

- Direct comparative visual quality on Fableon's storybook artwork.
- Whether the models preserve a _painted_ bird's feather identity rather than
  morphing it.
- Actual latency under the paid account.
- Kling credit-to-USD conversion and exact API model IDs.
- Luma credit-to-USD conversion under the account plan.
- Runway Gen-4.5 exact image-to-video resolution/end-frame options in-account.
- Commercial terms and output rights for each provider.
- Whether 1080p/4K upscaling introduces unacceptable softness for painting.

These must be resolved with real footage, not more documentation.
