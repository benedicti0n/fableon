# Phase 5.1 — Stage 2A Controlled Provider Quality Gate

**Date:** 2026-11-10  
**Starting HEAD:** `c39831dc15d11cbcbac93bf63ba1d4875286be0a`  
**Mode:** Real-provider preflight and quality-gate attempt  
**Paid API calls:** **0**  
**Actual API spend:** **$0.00**  
**Stage 2A result:** **BLOCKED — no explicit spending authorization**

## 1. Executive summary

Both provider credentials are present in the ignored repository-root `.env`, and both
adapters load them when the environment is exported. The Studio correctly lists
`gpt-image-2.6-sunburst`, `gpt-image-2.6-flare`, and `gemini-nano-banana-2.1`.

However, **no active spending authorization exists**. The proposed caps of $1.50 for OpenAI
and $1.00 for Gemini were explicitly described as proposals, not grants. The server rejected
both providers’ generation requests with HTTP 403 `authorization_missing` before any
provider call.

No master, part, background, rig preview, joint clip, or comparison artwork was generated.
No paid request was made. The vector baseline remains untouched. Stage 2A cannot claim any
artistic or rig-quality result.

## 2. Preflight state

| Item                           | Result                                                         |
| ------------------------------ | -------------------------------------------------------------- |
| Starting HEAD                  | `c39831dc15d11cbcbac93bf63ba1d4875286be0a`                     |
| Working tree before experiment | clean                                                          |
| Provider SDK approach          | documented REST adapters; no Node SDK dependency added         |
| OpenAI key present             | yes, in ignored root `.env`                                    |
| Gemini key present             | yes, in ignored root `.env`                                    |
| Keys tracked in Git            | no                                                             |
| `.env` ignored                 | yes                                                            |
| Active authorizations          | **none**                                                       |
| Persisted authorization store  | absent                                                         |
| Provider output directory      | only `outputs/folk-provider-benchmark/stage-2a/preflight.json` |
| Existing Phase 5 film          | unchanged, SHA-256 `1f99ec3e…b908e`                            |

### Credential-loading caveat

Next runs with `apps/web` as its working directory. A normal `pnpm dev` does **not** load the
repository-root `.env`; the status endpoint reported both providers unconfigured. Exporting
the root `.env` into the server environment made both report `configured: true`.

Before an approved Stage 2A run, either:

- export the root `.env` into the server process, or
- place the keys in `apps/web/.env.local` (server-only, ignored).

Do not commit either file.

### Key-shape observation

No key value was printed or logged.

- OpenAI key: classic `sk-` project-key shape.
- Gemini key: present, but not the classic `AIza` shape. The server reports it configured;
  account/model entitlement is still unverified. This may be a newer Google key format or
  an invalid/legacy value. It cannot be validated without a request, and no request is
  authorized.

## 3. Verified models and pricing

The Stage 1 catalog remains the source of truth:

| Provider | Model                    | Price basis                                                                  |
| -------- | ------------------------ | ---------------------------------------------------------------------------- |
| OpenAI   | `gpt-image-2.6-sunburst` | $8/M image input, $30/M image output, $5/M text; conservative 2× token bound |
| OpenAI   | `gpt-image-2.6-flare`    | Same token rates; not selected for this gate                                 |
| Gemini   | `gemini-nano-banana-2.1` | $1.50/M input, $30/M image output; 2K = 1,680 tokens = $0.0504               |

Dry estimates for one artisan master:

| Provider        | Request                                        | Estimate / max reservation |
| --------------- | ---------------------------------------------- | -------------------------: |
| OpenAI Sunburst | 1536×1024, medium, transparent PNG, one output |              **$0.096195** |
| Gemini 2.1      | 1536×1024, 2K, opaque, one output              |              **$0.050746** |

These are estimator outputs, not invoices.

## 4. Authorization check

`GET /api/studio/providers/status` with the exported environment returned:

```json
{
  "providers": [
    { "provider": "openai", "configured": true },
    { "provider": "gemini", "configured": true }
  ],
  "authorizations": [],
  "packs": []
}
```

There is no `outputs/folk-provider-benchmark/<provider>/manifest.json` and no provider pack.

## 5. Generation gate test

The API was asked to generate one master for each provider with a stable request key. The
server rejected both before any provider fetch:

| Provider | HTTP status | Error code              | Provider call |
| -------- | ----------: | ----------------------- | ------------- |
| OpenAI   |         403 | `authorization_missing` | none          |
| Gemini   |         403 | `authorization_missing` | none          |

The exact response was:

> No approval exists for this provider, model, and experiment. Request and approve a
> spending limit first.

This is the intended hard gate. A key alone is not permission to spend.

## 6. Experiment results

| Required Stage 2A item           | Result                       |
| -------------------------------- | ---------------------------- |
| OpenAI artisan master            | **not generated**            |
| Gemini artisan master            | **not generated**            |
| Master-referenced head / arms    | **not generated**            |
| Extracted transparent parts      | none                         |
| Hidden overlap geometry / pivots | none                         |
| Elbow-bend joint test            | none                         |
| Rig preview images / clips       | none                         |
| Side-by-side artwork comparison  | none                         |
| Actual API usage                 | 0 requests, 0 images         |
| Actual billed amount             | $0.00                        |
| Manual repair time               | 0 minutes                    |
| Technical validation             | preflight only               |
| Artistic approval                | **not applicable / pending** |

No placeholder images, fake provider directories, or copied vector parts were substituted.

## 7. Why Stage 2A stopped

Stage 2A requires a real generated master and real parts. The task explicitly says the
proposed caps are not authorizations, and Stage 1 deliberately seeded no approval. The
correct behavior is to stop rather than:

- infer approval from the presence of keys;
- approve the cap on the user’s behalf;
- call a provider to “test” credentials;
- substitute vector art for provider output;
- generate one image as an unauthorized exception.

Both providers are therefore **blocked**, not failed and not passed.

## 8. Spending safeguards verified

| Safeguard                         | Observation                                               |
| --------------------------------- | --------------------------------------------------------- |
| No authorization → no call        | PASS — both providers 403                                 |
| Key alone does not authorize      | PASS                                                      |
| Provider/model/experiment binding | enforced                                                  |
| Conservative reservation          | available; not exercised because authorization was absent |
| Max six outputs                   | not exercised                                             |
| No automatic retry                | adapters make one attempt                                 |
| No fallback                       | explicit provider only                                    |
| No quality/size upgrade           | request fields are explicit                               |
| Records                           | no provider events were generated                         |

## 9. Regression checks

| Command                                              | Result           |
| ---------------------------------------------------- | ---------------- |
| `pnpm format:check`                                  | PASS             |
| `pnpm lint`                                          | PASS             |
| `pnpm typecheck`                                     | PASS             |
| `pnpm vitest run apps/web/lib/providers`             | PASS — 31 tests  |
| `pnpm test`                                          | PASS — 304 tests |
| `pnpm build`                                         | PASS             |
| `pnpm test:browser tests/browser/phase-05-1.spec.ts` | PASS — 3 tests   |
| Provider calls during checks                         | **0**            |

Full Phase 5 browser suite was previously green at 58 tests; the Stage 2A checks above are
the relevant provider regression set. Existing Phase 5 evidence was restored after browser
screenshots were regenerated by test runs.

## 10. Evidence artifacts

- `docs/benchmarks/phase-05.1/stage-2a/preflight.json`
- `docs/benchmarks/phase-05.1/stage-2a/screenshots/openai-blocked-estimate.png`
- `docs/benchmarks/phase-05.1/stage-2a/screenshots/gemini-blocked-estimate.png`
- `docs/benchmarks/phase-05.1/stage-2a/screenshots/cost-dashboard-blocked.png`
- `outputs/folk-provider-benchmark/stage-2a/preflight.json`

The screenshots show keys configured, the dry estimates, no authorization, and the disabled
paid gate.

## 11. Technical vs artistic assessment

**Technical preflight: PASS.** The adapters, model catalog, pricing, credential loading,
authorization store, and hard rejection path behave as designed.

**Artistic assessment: NOT AVAILABLE.** No generated artwork exists. There is no evidence to
judge OpenAI or Gemini identity consistency, contour continuity, alpha quality, joint
compatibility, or repair burden.

## 12. Recommendation

**Do not grant a full-library budget to either provider yet.**

Operational recommendation:

- OpenAI is the better candidate for a rig-ready small gate on paper because it supports
  native transparent output and mask-guided edits.
- Gemini requires an explicit mask/repair path and has a higher preparation burden.
- Neither has earned a full-library budget without actual master/part evidence.
- If the user wants to proceed, approve only the **$1.50 OpenAI** and **$1.00 Gemini**
  six-output small gates, separately. Do not approve the $15/$8 full-library caps now.

## 13. Exact next steps

1. Make the keys visible to the server (export root `.env`, or use ignored
   `apps/web/.env.local`).
2. Verify account access to the exact model IDs; complete OpenAI organization verification
   if required.
3. Set provider-side billing alerts at 50%, 80%, and 100% of the small-gate caps.
4. Open `/studio/providers`, select OpenAI Sunburst, create a pending request for **$1.50**,
   then explicitly approve it with `APPROVE $1.50`.
5. Repeat for Gemini 2.1 with **$1.00** and `APPROVE $1.00`.
6. Re-run Stage 2A. Max six chargeable outputs per provider; no automatic retries.
7. Review the real master, head, upper arm, forearm, alpha edges, pivots and elbow stress.
8. Only after a passed small gate should a full-library cap be considered.

## 14. Final status

- **OpenAI:** blocked pending explicit authorization.
- **Gemini:** blocked pending explicit authorization.
- **Paid calls:** 0.
- **Actual spend:** $0.00.
- **Provider films:** not started.
- **Full library:** not started.
- **Phase 6:** not started.
- **Push:** none.
- **Working tree:** clean after this report commit.
