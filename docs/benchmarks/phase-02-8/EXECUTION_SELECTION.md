# Phase 2.8 — Execution Selection

**Date:** 2026-11-09  
**Decision:** Execute one image-to-video generation with **Google Gemini Omni
1.2 Flash** (`gemini-omni-1.2-flash`) at 720p, 3 seconds, 16:9.  
**Authorized cap:** **$1.00**  
**Planned spend:** **~$0.21** for one attempt; hard maximum of two attempts
(**~$0.42**) only if the first attempt fails technically.

## 1. Environment inspection

The repository contains a local `.env` file. Only presence/absence was checked;
no secret value was printed.

| Variable              | Status      |
| --------------------- | ----------- |
| `OPENAI_API_KEY`      | **Present** |
| `GEMINI_API_KEY`      | Absent      |
| `GOOGLE_API_KEY`      | Absent      |
| `LUMA_API_KEY`        | Absent      |
| `RUNWAYML_API_SECRET` | Absent      |

The `.env` file is ignored by git and must not be committed.

## 2. Actual provider verification

### OpenAI

A read-only call to `GET https://api.openai.com/v1/models` with the configured
key returned **HTTP 401 — invalid API key**. The configured value is not a valid
OpenAI credential.

Independently, OpenAI’s current documentation states that the Sora 2 models and
Videos API were **shut down on 2026-09-24** and that no one-to-one replacement
API exists. Even with a valid OpenAI key, the previously researched Sora
workflow is not available.

**OpenAI is not usable for this experiment.**

### Google Gemini

The same configured value was tested against the read-only Google Generative
Language API:

- `GET /v1beta/models` returned **HTTP 200** with 50 models;
- `gemini-omni-1.2-flash` is listed;
- `POST /v1beta/models/gemini-omni-1.2-flash:countTokens` returned **HTTP 200**
  with 6 tokens.

Therefore the credential is actually a **valid Google Gemini API key**, even
though it is stored under the misleading variable name `OPENAI_API_KEY`.

No key value was logged, copied into git, or written to a report.

**Operational note:** rename the variable to `GEMINI_API_KEY` in the local
`.env` after this experiment. Do not change the secret value itself. This report
does not edit `.env`.

## 3. Selected provider and model

| Property          | Value                                                       |
| ----------------- | ----------------------------------------------------------- |
| Provider          | Google                                                      |
| API               | Gemini API / Interactions API                               |
| Model             | `gemini-omni-1.2-flash`                                     |
| Mode              | Image-to-video                                              |
| Input             | `assets/premium-video-v1/start-frame.png` + balanced prompt |
| Aspect ratio      | 16:9                                                        |
| Resolution        | 720p native                                                 |
| Duration          | 3 seconds (provider minimum)                                |
| Output            | MP4, native audio may be present but is not required        |
| Attempts          | 1 planned; 2 maximum only for a clear technical failure     |
| Automatic retries | None                                                        |
| Estimated latency | Unknown; video generation may take several minutes          |

### Why this selection

1. It is the only provider whose credential actually authenticates.
2. It is the only configured provider that currently offers image-to-video.
3. It supports reference-image conditioning, 16:9, 720p, and a 3-second
   minimum.
4. It has the lowest verified per-second price among the researched paid
   options.
5. The supplied frame is suitable for a 720p first-frame experiment.

The earlier provisional choice was also Gemini Omni 1.2 Flash. The selection is
unchanged; the difference is that it is now verified as actually callable.

## 4. Cost confirmation

Official Gemini Omni 1.2 Flash pricing (accessed 2026-11-09):

- **$12.00 per 1M video tokens**;
- 720p video consumption: **5,792 tokens per second**;
- effective 720p price: approximately **$0.07 per second**;
- 3-second 720p output: **~$0.21**;
- 1080p upscaled: ~$0.104/s → ~$0.31 for 3 seconds;
- 4K upscaled: ~$0.209/s → ~$0.63 for 3 seconds.

The model is **paid-tier only**; the free tier is documented as unavailable.

| Scenario                                      |       Cost |
| --------------------------------------------- | ---------: |
| One 3 s 720p attempt                          | **~$0.21** |
| Two 3 s 720p attempts                         | **~$0.42** |
| Authorized cap                                |  **$1.00** |
| Remaining margin under cap after one attempt  | **~$0.79** |
| Remaining margin under cap after two attempts | **~$0.58** |

Input-image tokens and any rounding are expected to be negligible relative to
the cap. If the provider reports a different billable amount after execution,
the actual amount will be recorded and the margin recalculated.

**Decision:** one 3-second 720p attempt is confidently within the $1.00 cap.

## 5. Exact request shape

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
      "text": "<balanced prompt from ANIMATION_PROMPTS.md>"
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

Endpoint:

```text
POST https://generativelanguage.googleapis.com/v1beta/interactions
```

The API key will be sent in the `x-goog-api-key` header, not in a URL, so it is
not exposed in request logs or shell history.

## 6. Output preservation plan

On success:

1. Save the raw JSON response separately from the decoded video.
2. Decode the MP4 to `docs/benchmarks/phase-02-8/generated/original-video.mp4`.
3. Never overwrite the original with a derived clip.
4. Record the interaction ID, model, prompt, source hash, requested parameters,
   actual latency, and cost estimate in `metadata.json`.
5. Inspect the MP4 with `ffprobe`.
6. Generate selected frames and a contact sheet.
7. Derive a 2-second evaluation clip only if needed, and label it **derived**.
8. Compare against `docs/benchmarks/phase-02-7-gate2/landing-preview.mp4`.

On failure:

1. Preserve the error response.
2. Report the exact HTTP status and provider error message.
3. Do not retry unless the failure is clearly technical and the second attempt
   remains within the cap.
4. If the failure is authentication, quota, billing, or model-access related,
   stop and report the blocker.

## 7. Remaining limitations

- The source frame is 1672 × 941, below the preferred 1920 × 1080 source size.
- No endpoint frame exists; the landing is prompt-directed.
- The model may add native audio; it is not part of the evaluation.
- One generation cannot establish long-term reliability.
- The key is stored under the wrong variable name; this is a local configuration
  defect, not a provider capability issue.
- No generation will be run in tests or CI.

## 8. Authorization record

The user authorized:

- one real paid generation attempt;
- a maximum total spend of **$1.00**;
- up to **two attempts** only if the first fails technically;
- no provider switching unless the selected provider cannot be called at all
  and another provider is already configured within the cap.

The selected request satisfies those conditions.
