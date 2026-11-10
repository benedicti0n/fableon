# Phase 5.1 Stage 2A — Execution Report

**Date:** 2026-11-10  
**Starting HEAD:** `e747a62491b0be693e5ce1b3593312b342e3de72`  
**Requested providers:** OpenAI `gpt-image-2.6-sunburst`, Gemini `gemini-nano-banana-2.1`  
**Paid API calls:** **0**  
**Actual spend:** **$0.00**  
**Execution result:** **BLOCKED — no active persisted authorization**

## 1. Images generated

**None.**

No OpenAI or Gemini master, head, torso anchor, upper arm, forearm, transparent part,
background, rig preview, or elbow-test clip was generated. No provider request was
submitted. No vector artwork was substituted.

## 2. Accepted and rejected candidates

| Candidate                    | Count |
| ---------------------------- | ----: |
| OpenAI masters generated     |     0 |
| Gemini masters generated     |     0 |
| Parts generated or extracted |     0 |
| Accepted assets              |     0 |
| Rejected candidates          |     0 |
| Preserved failed outputs     |     0 |

There are no candidate images to review.

## 3. Authorization verification

The live Studio server was started with the real application data directory:

```text
FABLEON_DATA_DIR=/Users/benediction/Downloads/Web Dev projects/fableon/.fableon-data
```

Both credentials were loaded by the server:

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

The requested experiment was `phase-05.1-folk-pilot`. No active, unexpired authorization
for either provider/model could be found.

### What was found instead

The only authorization record anywhere in the repository is:

```text
.fableon-data/playwright/provider-benchmark/authorizations.json
```

It contains one **pending** record:

| Field               | Value                                                     |
| ------------------- | --------------------------------------------------------- |
| Experiment          | `phase-05.1-browser-test`                                 |
| Provider/model      | OpenAI / `gpt-image-2.6-sunburst` (pending, not approved) |
| Max spend           | $1.00                                                     |
| Max requests        | 2                                                         |
| Max outputs/request | 1                                                         |
| Approved by         | none                                                      |
| Status              | `pending`                                                 |

That is not a Stage 2A authorization. It is a Playwright test fixture in a different data
directory, bound to a different experiment, and it remains unapproved. It cannot be used
for production spending.

No active record was found in:

- `.fableon-data/provider-benchmark/authorizations.json` (file absent);
- the user home tree;
- any temporary OpenCode data directory.

## 4. Why this is a blocker

The execution prompt is not a spending authorization. The server also correctly refuses to
treat a key as permission:

```text
POST /api/studio/providers/generate
→ 403 authorization_missing
```

The Studio UI showed “No authorizations exist. Paid generation is disabled.”

The most likely explanation is that the approval was completed against a different
`FABLEON_DATA_DIR` (for example the Playwright test server), or the exact approval
confirmation did not persist. The current real application data directory has no store at
all.

## 5. Provider/model bindings and budgets

No usable budget record exists. For reference, the intended small-gate caps remain:

| Provider | Model                    | Proposed cap | Max outputs | Active? |
| -------- | ------------------------ | -----------: | ----------: | ------- |
| OpenAI   | `gpt-image-2.6-sunburst` |        $1.50 |           6 | **No**  |
| Gemini   | `gemini-nano-banana-2.1` |        $1.00 |           6 | **No**  |

These are still proposals, not grants. No reservation was created.

## 6. Dry cost estimates

With the keys loaded, the estimator returned:

| Provider        | Planned request                          | Estimate / max reservation |
| --------------- | ---------------------------------------- | -------------------------: |
| OpenAI Sunburst | 1536×1024, medium, transparent, 1 output |                  $0.096195 |
| Gemini 2.1      | 1536×1024, 2K, opaque, 1 output          |                  $0.050746 |

These are not invoices. Actual charges are **$0.00** because no request was submitted.

## 7. Character consistency

**Not assessed.** There are no generated masters. No identity, facial design, palette,
clothing motif, outline weight, proportion, or horse/background comparison can be made.

## 8. Alpha quality

**Not assessed.** No transparent or opaque generated artwork exists. No alpha channel,
white fringe, checkerboard, edge clipping or hidden-overlap geometry was produced.

## 9. Pivot and registration results

**Not assessed.** No head, torso anchor, upper arm or forearm was generated; therefore no
pivot, shoulder anchor, elbow registration or rig-slot mapping was tested.

## 10. Joint-seam quality

**Not assessed.** No generated parts exist to inspect at the shoulder or elbow.

## 11. Elbow animation results

**Not rendered.** The existing Fableon rig can perform the test, but there is no generated
upper arm/forearm pair to insert. Rendering the Phase 5 vector parts would not be a
provider-artwork test and was deliberately not substituted.

## 12. Actual versus estimated spending

| Metric                          |   Value |
| ------------------------------- | ------: |
| Requests submitted              |       0 |
| Images returned                 |       0 |
| Provider-reported billed amount |    none |
| Estimated charge                |   $0.00 |
| Reconciled spend                |   $0.00 |
| Reserved budget                 |   $0.00 |
| Outputs charged                 |       0 |
| Cost per usable asset           | **N/A** |

## 13. Repair work

| Work             |  Time |
| ---------------- | ----: |
| Manual cleanup   | 0 min |
| Mask repair      | 0 min |
| Pivot adjustment | 0 min |
| Image review     | 0 min |

No artwork was created or repaired.

## 14. Remaining issues

1. **No persisted active authorization exists in the real data directory.**
2. The only record is a pending Playwright test authorization, not a Stage 2A approval.
3. The exact approval did not persist where the execution server reads it.
4. The root `.env` keys are loaded only when exported or placed in `apps/web/.env.local`;
   a normal `pnpm dev` from the monorepo does not automatically load the root file.
5. Gemini key shape is non-classic; account/model access remains unverified.
6. No provider art quality or rig compatibility has been measured.

## 15. Recommendation

**Do not grant a full-library budget.** There is no small-gate evidence. Do not approve the
$15/$8 full-library caps.

Recommended next gate:

1. Start Studio with the **same** `FABLEON_DATA_DIR` that the execution will use, preferably
   the default repository `.fableon-data`.
2. Confirm the server status shows both keys configured.
3. Create a pending request for experiment `phase-05.1-folk-pilot`, provider OpenAI,
   model `gpt-image-2.6-sunburst`, cap **$1.50**, max requests 6, max outputs/request 1.
4. Approve with the exact string `APPROVE $1.50`.
5. Verify the authorization store now contains an `active` record with approvedBy/approvedAt.
6. Repeat for Gemini `gemini-nano-banana-2.1`, cap **$1.00**, `APPROVE $1.00`.
7. Re-run Stage 2A. The first provider call will then be the OpenAI artisan master, followed
   by up to four reference-guided parts and one retry.

OpenAI remains the better candidate for rig-ready parts on paper because of native
transparency and mask support. Gemini will require a tested chroma-key/mask repair path.

## 16. Tests executed

| Command                                  | Result                      |
| ---------------------------------------- | --------------------------- |
| `pnpm format:check`                      | PASS                        |
| `pnpm lint`                              | PASS                        |
| `pnpm typecheck`                         | PASS                        |
| `pnpm test`                              | PASS — 304 tests / 45 files |
| `pnpm vitest run apps/web/lib/providers` | PASS — 31 tests             |
| `pnpm build`                             | PASS                        |
| Provider/Studio gate browser test        | PASS — 3 tests              |
| Paid provider calls during checks        | **0**                       |

## 17. Artifacts

- `docs/benchmarks/phase-05.1/stage-2a/resume-preflight.json`
- `docs/benchmarks/phase-05.1/stage-2a/screenshots/resume-no-authorization.png`
- `docs/benchmarks/phase-05.1/stage-2a/preflight.json`
- `docs/benchmarks/phase-05.1/stage-2a/screenshots/openai-blocked-estimate.png`
- `docs/benchmarks/phase-05.1/stage-2a/screenshots/gemini-blocked-estimate.png`
- `docs/benchmarks/phase-05.1/stage-2a/screenshots/cost-dashboard-blocked.png`
- `outputs/folk-provider-benchmark/stage-2a/preflight.json`

There are no `outputs/folk-provider-benchmark/openai/` or `gemini/` production directories
because no generation was authorized.

## 18. Final status

- **OpenAI:** blocked — no active authorization.
- **Gemini:** blocked — no active authorization.
- **Paid calls:** 0.
- **Actual spend:** $0.00.
- **Artwork:** none.
- **Joint test:** not run.
- **Full library:** not started.
- **Phase 6:** not started.
- **Push:** none.
- **Working tree:** clean after this report commit.
