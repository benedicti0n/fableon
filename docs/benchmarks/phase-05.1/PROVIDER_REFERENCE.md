# Phase 5.1 — Verified Provider Reference

**Document date:** 2026-11-10  
**Providers:** OpenAI Images, Google Gemini Nano Banana  
**Paid requests made:** **0**

## Official sources consulted

- OpenAI image generation guide: <https://developers.openai.com/api/docs/guides/image-generation>
- OpenAI image prompting guide: <https://developers.openai.com/api/docs/guides/image-prompting>
- OpenAI pricing: <https://developers.openai.com/api/docs/pricing#image-generation>
- Gemini image generation: <https://ai.google.dev/gemini-api/docs/image-generation>
- Gemini pricing: <https://ai.google.dev/gemini-api/docs/pricing>

## Verified model identifiers

| Provider | Model ID                 | Status in docs                                           | Intended role                                                          |
| -------- | ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| OpenAI   | `gpt-image-2.6-sunburst` | GPT Image 2.6 Sunburst, listed in pricing and model docs | Preferred for character consistency and precise reference-guided parts |
| OpenAI   | `gpt-image-2.6-flare`    | GPT Image 2.6 Flare, listed in pricing and model docs    | Faster/iteration alternative; same token rates                         |
| Gemini   | `gemini-nano-banana-2.1` | Nano Banana 2.1, current high-efficiency workhorse       | Full production alternative with 1K/2K/4K output                       |

The adapters reject any model ID outside this catalog. A configured key does not enable an
unlisted model.

## Capability differences

| Capability             | OpenAI 2.6 Sunburst/Flare                                | Gemini Nano Banana 2.1                                     |
| ---------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Text-to-image          | Yes                                                      | Yes                                                        |
| Reference-image edit   | Yes                                                      | Yes, up to 14 references                                   |
| Mask-guided edit       | Yes                                                      | **No** in this adapter; explicit mask/repair path required |
| Native transparent PNG | **Yes** (`background: "transparent"`, PNG/WebP)          | **No** documented native transparency                      |
| SVG output             | Yes                                                      | No                                                         |
| Quality levels         | `low`, `medium`, `high`, `xhigh`, `max`                  | `standard`; resolution controlled with 1K/2K/4K            |
| Sizes                  | 1024², 1536×1024, 1024×1536, 2048², 2048×1152, 3840×2160 | 1K, 2K, 4K with aspect ratio                               |
| Usage reporting        | Token usage in response                                  | Usage fields when returned by Interactions                 |
| Multi-turn editing     | Image API edit / Responses API conversation              | `previous_interaction_id`                                  |
| Watermark              | Provider policy dependent                                | SynthID watermark reported by Google                       |

The UI exposes these differences. It does not silently claim parity.

## Pricing used by the estimator

### OpenAI

Official image-token rates:

| Token class        | USD per 1M tokens |
| ------------------ | ----------------: |
| Image input        |             $8.00 |
| Cached image input |             $2.00 |
| Image output       |            $30.00 |
| Text input         |             $5.00 |

GPT Image 2.6 token counts vary by model/prompt/quality. The estimator therefore uses a
**conservative upper bound**: the documented earlier-model quality table scaled by requested
megapixels and multiplied by **2×**, plus bounded reference-image and text tokens. The estimate
is labelled as a bound, not a quote. Actual usage is reconciled from the provider response.

Current UI example: 1536×1024, medium, one transparent image → about **$0.096** maximum.

### Gemini

Official rates:

| Token class              | USD per 1M tokens |
| ------------------------ | ----------------: |
| Input (text/image/video) |             $1.50 |
| Image output             |            $30.00 |

Documented output equivalents:

| Image size | Output tokens | Equivalent |
| ---------- | ------------: | ---------: |
| 1K         |         1,120 |    $0.0336 |
| 2K         |         1,680 |    $0.0504 |
| 4K         |         3,780 |     $0.113 |

The estimator adds bounded text and reference input tokens. Current UI example: 2K, one image
→ about **$0.051**.

## Credential state on this host

| Variable         | State      |
| ---------------- | ---------- |
| `OPENAI_API_KEY` | **absent** |
| `GEMINI_API_KEY` | **absent** |
| `GOOGLE_API_KEY` | absent     |

No key value is printed, logged, stored in reports, or returned to the browser. Status routes
return only a boolean `configured` flag.

## Account access not yet verified

Because no key exists and no paid call is authorized:

- actual model access for the configured account is unverified;
- OpenAI API Organization Verification may be required for GPT Image models;
- Gemini paid-tier access and billed image pricing are unverified for the account;
- no provider invoice exists.

These are Stage 2 blockers, not reasons to fake results.

## Billing-alert guidance

Before Stage 2 authorization:

1. Set a provider-side hard or alert budget in the OpenAI and Google billing consoles.
2. Set alerts at 50%, 80%, and 100% of the proposed local cap.
3. Treat provider-side billing as authoritative; the local ledger cannot override it.
4. Keep the local cap below the provider-side alert threshold.
5. Export the provider invoice after the run and reconcile it against the local ledger.

## Adapter implementation notes

- OpenAI adapter: `POST /v1/images/generations` for text-only requests; `POST /v1/images/edits`
  multipart for references/masks; `n`, `size`, `quality`, `background`, `output_format=png`.
- Gemini adapter: `POST /v1beta/interactions` with `Api-Revision: 2026-05-20`, text/image input
  blocks, `response_format` image size/aspect ratio, `previous_interaction_id` for multi-turn.
- Both adapters make **one** attempt per call. There is no retry/fallback inside the adapter.
- Tests mock HTTP. No test calls a paid endpoint, even if real keys are present.
