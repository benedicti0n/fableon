# Phase 2.8 — Generation Preflight

**Status:** **NOT AUTHORIZED / BLOCKED**  
**Provider:** Google  
**Model:** `gemini-omni-1.2-flash`  
**Mode:** Image-to-video  
**Planned first test:** 3-second, 16:9, 720p, one generation attempt  
**Authorized spend:** **$0.00**

No provider request was made. No API key is present in the environment or
repository.

## 1. Selected request

| Property            | Value                                                     |
| ------------------- | --------------------------------------------------------- |
| Provider            | Google Gemini API                                         |
| Model               | `gemini-omni-1.2-flash`                                   |
| Input               | Approved clean 16:9 start frame + animation prompt        |
| Output              | MP4, native audio included but ignored                    |
| Aspect ratio        | 16:9                                                      |
| Resolution          | 720p native (1080p is an upscaled output tier)            |
| Duration            | 3 seconds minimum                                         |
| Target evaluation   | Retain original 3 s; derive a labeled 2 s evaluation clip |
| First attempt       | Balanced prompt (variant B)                               |
| Maximum attempts    | 2                                                         |
| Automatic retries   | None                                                      |
| Camera              | Static                                                    |
| Source image        | **MISSING**                                               |
| Credentials         | **MISSING**                                               |
| Spend authorization | **NOT GRANTED**                                           |

## 2. Cost estimate

Official Omni 1.2 Flash pricing:

- 720p: approximately **$0.07 per second** → 3 s = **~$0.21**.
- 1080p (upscaled): approximately **$0.104 per second** → 3 s = **~$0.31**.
- 4K (upscaled): approximately **$0.209 per second** → 3 s = **~$0.63**.

Planned scenario:

| Scenario                        | Attempts | Est. provider cost |
| ------------------------------- | -------: | -----------------: |
| One 3 s 720p attempt            |        1 |         **~$0.21** |
| Two 3 s 720p attempts           |        2 |         **~$0.42** |
| Two 3 s 1080p upscaled attempts |        2 |         **~$0.62** |

The cost of creating a premium start frame (illustrator or approved image
generation) is **not included** and is unknown here. The existing candidate
frames are diagnostic and are not substitutes.

**Requested (not yet granted):** approve Gemini Omni 1.2 Flash at 720p with a
maximum provider cap of **$0.42** for up to two 3-second attempts, no automatic
retries. The default authorized budget remains **$0** until the user explicitly
grants that cap.

## 3. Credentials and execution path

Checked environment variables:

```text
GEMINI_API_KEY=absent
GOOGLE_API_KEY=absent
OPENAI_API_KEY=absent
RUNWAYML_API_SECRET=absent
LUMA_API_KEY=absent
```

### Option A — Direct API: BLOCKED

Requires:

- paid Gemini API access;
- an API key stored outside the repository;
- explicit spending authorization;
- a clean approved start frame.

None is available.

### Option B — Manual provider workflow: BLOCKED

Could upload the source frame and prompt through the Google AI Studio / Gemini
app manually. Blocked because the clean premium start frame is missing and no
spend is authorized.

### Option C — Local model: BLOCKED

The current machine is an Apple M1 with 8 GB unified memory and no NVIDIA CUDA.
Wan2.2 TI2V-5B is documented at 24 GB VRAM; I2V-A14B at 80 GB. No model download
or local run was attempted.

## 4. Source image

Required path once supplied:

```text
assets/premium-video-v1/start-frame.png
```

Optional endpoint:

```text
assets/premium-video-v1/end-frame.png
```

The folder does not exist. See `INPUT_ASSET_AUDIT.md` for the exact still-frame
brief and quality requirements.

**Do not use** `docs/benchmarks/phase-02-7-gate2/selected-frames/frame-016.png`
as a premium input. It is diagnostic candidate art with a procedural background.
It may be used only for a zero-cost technical smoke test under a separate,
explicitly labeled approval.

## 5. Planned provider request (reference only, not executed)

The following is the shape of a manual/direct Gemini Interactions request. Do
not execute it until all gates are approved.

```json
{
  "model": "gemini-omni-1.2-flash",
  "input": [
    {
      "type": "image",
      "data": "<base64 of assets/premium-video-v1/start-frame.png>",
      "mime_type": "image/png"
    },
    {
      "type": "text",
      "text": "<ANIMATION_PROMPTS.md primary prompt>"
    }
  ],
  "response_format": {
    "type": "video",
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "duration": "3s"
  },
  "generation_config": {
    "video_config": {
      "task": "image_to_video"
    }
  }
}
```

Provider notes:

- `task: image_to_video` is a fallback if natural-language prompting does not
  select the intended mode.
- First+last frame interpolation requires 3–10 seconds; a single image supports
  up to 15 seconds.
- Output carries SynthID. Do not remove or misrepresent it.
- Confirm current API pricing and terms in the account immediately before use.

## 6. Output handling plan

If generation is approved and succeeds:

1. Preserve the complete original MP4 unchanged.
2. Record provider, model, prompt, source image path/hash, seed/reference if
   available, cost, generation time, and terms.
3. Inspect with ffprobe: dimensions, duration, fps, codec.
4. Generate selected evaluation frames and a contact sheet.
5. Derive a 2-second comparison clip only if needed, and label it **derived**.
6. Do not frame-interpolate to hide defects.
7. Compare with `docs/benchmarks/phase-02-7-gate2/landing-preview.mp4` using the
   criteria in the phase prompt.
8. Keep the original file for independent review.

## 7. Hard stop

No paid request will be issued until:

- a clean, approved 16:9 start frame exists;
- the user explicitly approves the provider and a spending cap;
- credentials are configured outside the repository;
- the current provider/model/pricing terms are rechecked.

Until then, the experiment remains **BLOCKED**.
