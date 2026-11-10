# Phase 5.1 — Stage 1 Test Evidence

**Date:** 2026-11-10  
**Paid provider calls:** **0**  
**Provider keys present:** **no**

## Automated checks

| Command             | Result                      |
| ------------------- | --------------------------- |
| `pnpm format:check` | PASS                        |
| `pnpm lint`         | PASS                        |
| `pnpm typecheck`    | PASS                        |
| `pnpm test`         | PASS — 304 tests / 45 files |
| `pnpm build`        | PASS                        |
| `pnpm test:browser` | PASS — 58 tests             |

## Provider test coverage

27 unit tests under `apps/web/lib/providers`:

### Catalog and pricing

- verified model IDs only;
- explicit capability differences (OpenAI transparency/mask vs Gemini limitations);
- conservative OpenAI cost bound;
- Gemini 2K token-equivalent price;
- rejection of unverified provider/model combinations.

### OpenAI adapter

- generation request body includes model, size, quality, transparent PNG;
- edits use multipart FormData and reference image;
- provider errors surface without retry;
- missing key refuses to build a request;
- usage and request ID parsing.

### Gemini adapter

- documented Interactions endpoint and `Api-Revision` header;
- image response format and 2K size;
- reference image input blocks;
- native transparency and mask requests rejected;
- missing key refuses to build a request.

### Budget authority

- pending request does not authorize spending;
- approval requires exact `APPROVE $<cap>` confirmation;
- reservation and reconciliation;
- duplicate request rejection;
- concurrent reservations cannot both exceed the cap;
- revocation;
- expiry.

### Asset preparation

- source pivot → target pivot registration math;
- transparent part accepted with real alpha;
- fully opaque part rejected;
- mask extraction produces real transparent edges;
- missing rig slots reported;
- background center-cover to 2600×1500;
- hashes and byte sizes recorded.

### Service safety

- dry estimate makes no `fetch` call;
- unauthorized execution is refused before any provider call;
- unknown model is refused.

## Browser coverage

`tests/browser/phase-05-1.spec.ts`:

1. Provider gate loads with both keys absent and models listed.
2. Dry estimate displays a cost without a provider call.
3. Unauthorized generation returns HTTP 403 with `authorization_missing`.
4. Pending authorization creation succeeds but does not authorize spending.
5. Wrong approval confirmation is rejected with HTTP 400.
6. Cost dashboard shows actual spend $0.00 and “no film claimed”.
7. Rig-slot contract lists the semantic parts.
8. Provider production route refuses to show a film without a complete pack.

Existing Phase 3, 4 and 5 browser tests remain in the suite and pass.

## Screenshot evidence

- `screenshots/provider-gate.png`
- `screenshots/provider-pending-authorization.png`
- `screenshots/provider-costs.png`
- `screenshots/provider-rig-slots.png`
- `screenshots/provider-production-gate.png`

## What is deliberately not tested as complete

- No real provider HTTP request was made.
- No real generated master, part, background or provider film exists.
- No cost invoice exists.
- Provider account access and model entitlement are unverified.
- The small art-quality gate and full-library comparison remain Stage 2 work.

## Notes

- Tests that construct adapters with fake keys use **mocked fetch**. They never reach a
  provider endpoint.
- The Phase 2.5 and Studio paint playback assertions were stabilized because short
  playbacks can finish before a transient “Pause” label is observed. Both tests still verify
  frame advance, stop-at-final and replay. No product behavior was hidden.
- Browser tests use an isolated Playwright data directory; the pending authorization created
  there is not a production approval.
