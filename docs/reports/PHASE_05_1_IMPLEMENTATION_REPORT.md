# Phase 5.1 — Stage 1 Implementation Report

- **Phase:** 5.1 — Provider-first artwork architecture
- **Date:** 2026-11-10
- **Branch:** `main`
- **Starting HEAD:** `48f6d14fd5a2ff1493ebc7491a7a77a2a8925a90`
- **Final implementation HEAD before this report:** `a5b7e88`
- **Report commit:** the commit containing this report
- **Paid API calls:** **0**
- **Stage 2:** **not started**
- **Remote push:** **none**

## 1. Initial and final repository state

The repository started clean at `48f6d14` with the complete Phase 5 vector-animation
baseline. That baseline remains intact:

- `outputs/folk-pilot/final.mp4` and its 61-part vector pack are unchanged;
- Phase 4 and Phase 5 reports and evidence remain in place;
- existing project and review routes remain present;
- no user project data was reset or overwritten.

Stage 1 added a new provider namespace under `apps/web/lib/providers`, API routes under
`/api/studio/providers`, Studio routes under `/studio/providers`, and a separate output root
`outputs/folk-provider-benchmark/`.

## 2. Implemented provider adapters

### OpenAI

`apps/web/lib/providers/openai.ts`

- `POST /v1/images/generations` for text-only generation.
- `POST /v1/images/edits` multipart for reference images and masks.
- Verified model selection: `gpt-image-2.6-sunburst`, `gpt-image-2.6-flare`.
- Maps `size`, `quality`, `background`, `output_format`, `n` and safety identifier.
- Parses `data[].b64_json`, request ID and token usage.
- One attempt, no retry, no fallback.
- Server-side key only (`OPENAI_API_KEY`).

### Gemini

`apps/web/lib/providers/gemini.ts`

- `POST /v1beta/interactions` with `Api-Revision: 2026-05-20`.
- Verified model: `gemini-nano-banana-2.1`.
- Text and image input blocks, `response_format` aspect ratio/image size.
- Supports `previous_interaction_id` for multi-turn editing.
- Parses `output_image.data`, interaction ID and usage fields when returned.
- Explicitly rejects native transparency and mask-guided edits; those are not Gemini
  capabilities in this adapter.
- Server-side key only (`GEMINI_API_KEY`).

### Explicit non-goals

- Local ComfyUI is no longer required or privileged.
- No RTX 5060 dependency.
- No image-to-video API.
- No procedural vector substitution for a provider production run.
- The Phase 5 vector pack remains an engineering baseline, not a provider film.

## 3. Verified model identifiers

Official documentation was fetched on 2026-11-10:

- OpenAI image guide and pricing list `gpt-image-2.6-sunburst` and `gpt-image-2.6-flare`.
  The guide describes GPT Image 2.6 Sunburst for detailed work and Flare for fast iteration,
  with complexity control, markup-guided edits, SVG output and animated GIF output.
- Google's image-generation guide lists `gemini-nano-banana-2.1` as Nano Banana 2.1 with
  1K/2K/4K output, conversational editing and up to 14 references.

The adapters contain an allowlist and reject any other model ID. Account-level access is
**not yet verified** because both keys are absent and no paid call is authorized.

## 4. Pricing and capability references

Full detail is in `docs/benchmarks/phase-05.1/PROVIDER_REFERENCE.md`.

| Provider               |                 Input |       Image output | Transparency | Mask   |
| ---------------------- | --------------------: | -----------------: | ------------ | ------ |
| OpenAI GPT Image 2.6   | $8/M image, $5/M text | $30/M image tokens | Yes          | Yes    |
| Gemini Nano Banana 2.1 |               $1.50/M |              $30/M | **No**       | **No** |

Gemini's published equivalents are 1K = 1,120 tokens ($0.0336), 2K = 1,680 ($0.0504), and
4K = 3,780 ($0.113). OpenAI's 2.6 token consumption varies; the estimator uses a conservative
2× bound over the documented quality table and clearly labels it as a bound, not a quote.

The cost UI displays the pricing source and version. No invoice is fabricated.

## 5. Budget enforcement design

`apps/web/lib/providers/authorization.ts` implements a persisted, server-side authority:

- provider/model/experiment-specific records;
- explicit `pending` → `active` approval with a required exact confirmation string;
- expiry, revocation, request-count limit, output-count limit and resolution limit;
- conservative reservation before submission;
- duplicate request-key rejection;
- serialized read-modify-write for concurrent reservations;
- reconciliation from actual usage after completion;
- release or full-reservation charge on failure depending on whether the provider was
  submitted;
- remaining-budget calculation and exhausted status;
- no automatic retry and no fallback.

The `/studio/providers` page creates **pending** requests only. Approval requires the user to
type `APPROVE $<cap>`. No active authorization was approved by this agent.

## 6. Art-generation workflow

- Character design records for the artisan and horse are in `design.ts`.
- Master prompts include identity anchors, palette, outline, proportions, orientation and
  provider-specific transparency instructions.
- Part prompts include the approved master reference, the exact part, palette/outline
  matching, 20–30 px hidden joint overlap and a prohibition on unrelated body parts.
- Background prompts are separate, character-free 16:9 compositions.
- The UI exposes provider, model, operation, prompt, resolution/quality, output count,
  references and the conservative estimate before any call.
- Execution is disabled unless an active authorization and a server key both exist.

## 7. Character-part workflow

`apps/web/lib/providers/assets.ts` implements:

- semantic slot mapping from the existing 61-part rig;
- source-pivot → target-pivot registration with measured offsets and scale;
- real alpha validation (alpha presence, opaque ratio, white/black halo warnings, empty
  content);
- mask extraction for providers without native transparency;
- explicit repair history;
- SHA-256 and byte size for every processed part;
- missing-slot reporting;
- a pack manifest consumed by the existing `FolkRenderer`.

Two production methods remain to be compared in Stage 2:

1. reference-guided part generation (more calls, higher identity control);
2. character-sheet generation plus mask extraction (fewer calls, more repair).

No method is declared the winner before real provider output exists.

## 8. Rig integration

The existing `packages/folk-motion` rigs are unchanged. Provider packs must map to the same
semantic part IDs and target pivots:

- 29 artisan slots;
- 27 horse slots;
- 4 cart slots;
- 1 bell slot.

The pack preparation path records the source pivot, target pivot, scale, draw offset and hash.
The existing rig editor is now pack-aware and can load a complete provider pack for joint
stress testing. A pack with missing slots is reported as incomplete and is not treated as a
film-ready asset library.

## 9. Background workflow

`buildBackgroundPrompt()` produces separate courtyard and village-lane specifications with
matching architecture, palette, light direction and a clear performance area. The pack
preparation step center-covers a flat provider image to 2600×1500 and records it as a flat
background; explicit repaired layers can be supplied separately. The UI labels a flat
background as flat rather than pretending it is a full parallax environment.

## 10. Studio screenshots

Actual browser captures:

- `docs/benchmarks/phase-05.1/screenshots/provider-gate.png`
- `docs/benchmarks/phase-05.1/screenshots/provider-pending-authorization.png`
- `docs/benchmarks/phase-05.1/screenshots/provider-costs.png`
- `docs/benchmarks/phase-05.1/screenshots/provider-rig-slots.png`
- `docs/benchmarks/phase-05.1/screenshots/provider-production-gate.png`

The gate screenshot shows both keys absent, a real dry estimate, no active authorization and
a disabled generation action.

## 11. Cost-dashboard screenshots

`provider-costs.png` shows the OpenAI/Gemini comparison with actual reconciled spend $0.00,
zero completed generations, zero accepted assets, and the explicit statement that no film is
claimed. It also shows the pending test authorization created in the isolated Playwright data
directory; that record is not a real spending approval.

## 12. Automated test results

| Command                   | Result                          |
| ------------------------- | ------------------------------- |
| `pnpm format:check`       | PASS                            |
| `pnpm lint`               | PASS                            |
| `pnpm typecheck`          | PASS                            |
| `pnpm test`               | PASS — **304 tests / 45 files** |
| `pnpm build`              | PASS                            |
| `pnpm test:browser`       | PASS — **58 tests**             |
| Provider adapter tests    | 27 tests with mocked HTTP       |
| Paid provider calls in CI | **0**                           |

Provider tests cover configuration, explicit model selection, request construction, response
parsing, usage extraction, error handling, no-retry behavior, transparency/mask rejection,
budget authorization, expiry/revocation, duplicate requests, concurrency, alpha validation,
pivot registration and mask extraction.

Two pre-existing playback assertions were stabilized because short playbacks can finish
before a transient “Pause” label is observed: Phase 2.5 playback from frame 44, and Studio
paint playback from frame 1140. Both tests still verify advance and stop at the final frame.
No product behavior was hidden.

## 13. Known limitations

1. **No real provider artwork exists.** Keys are absent and no spending is authorized.
2. **No provider film exists.** Stage 2 has not started.
3. **Account access is unverified**, including OpenAI organization verification and Gemini
   paid-tier access.
4. **OpenAI 2.6 token counts are variable.** The estimator is a conservative bound, not an
   exact quote; actual usage must be reconciled after a real request.
5. **Gemini transparency and masking are not equivalent to OpenAI.** The explicit mask/repair
   path is implemented, but its real quality is unmeasured.
6. **Graphical mask/pivot editing is minimal.** The pack API and rig-slot contract exist; the
   Studio currently exposes a read-only slot listing and a pack-aware stress-test viewer, not
   a full paint-style mask editor.
7. **No provider invoice exists.** The committed ledger is empty of paid events and must not
   be mistaken for a completed benchmark.
8. **Browser tests create a pending authorization in isolated test data.** It is not a real
   approval and does not authorize spending in the application data directory.

## 14. Exact remaining steps for real generation

1. Put `OPENAI_API_KEY` and `GEMINI_API_KEY` in the server environment. Never commit them.
2. Verify account access to each exact model ID and, for OpenAI, complete any required
   organization verification.
3. Set provider-side billing alerts at 50%, 80% and 100% of the proposed caps.
4. Open `/studio/providers`, select the provider/model and create a **pending** authorization
   for the small-gate cap.
5. Approve it with the exact `APPROVE $<cap>` confirmation.
6. Run the small gate: master, head, upper arm, forearm, retries within cap.
7. Review alpha, identity, outline continuity and elbow stress; reject if not rig-usable.
8. Only after a passed small gate, approve the full-library cap.
9. Generate the 61 parts and two backgrounds using the chosen method.
10. Prepare the provider pack; fix every missing slot and alpha warning.
11. Run the pack-aware joint stress test and diagnostic animation clips.
12. Render the canonical 720-frame film locally with `scripts/render-folk.mjs --pack ...`.
13. Produce the separate OpenAI and Gemini MP4s, side-by-side comparison and actual cost
    report.
14. Reconcile provider invoices/costs and record manual repair time.

## 15. Proposed spending authorization

These are **proposals only**. No approval exists.

| Stage        | Provider        | Max outputs | Proposed cap | Why                                          |
| ------------ | --------------- | ----------: | -----------: | -------------------------------------------- |
| Small gate   | OpenAI Sunburst |           6 |    **$1.50** | Master + three parts + retries               |
| Small gate   | Gemini 2.1      |           6 |    **$1.00** | Same gate at 2K                              |
| Full library | OpenAI Sunburst |          89 |   **$15.00** | 63 base assets + 40% retries/reference edits |
| Full library | Gemini 2.1      |          89 |    **$8.00** | 63 base assets + 40% retries                 |

The user must approve each provider and stage separately. A small-gate approval is not a
full-library approval. A previous unrelated approval is not valid.

## 16. Full commit hashes

| Commit        | Purpose                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| `48f6d14`     | Starting HEAD                                                                            |
| `d2406e3`     | Provider catalog, OpenAI/Gemini adapters, spending authority, ledger, asset registration |
| `9688ea7`     | Stabilize the pre-existing Phase 2.5 playback assertion                                  |
| `55564d4`     | Provider Studio, API routes, pack preview, stress-test route                             |
| Report commit | The commit containing this report; verify with `git log -1 --oneline`                    |

## 17. Final working-tree status

- Stage 1 code and documentation committed.
- No paid provider request was made.
- No provider film, master, part or background is claimed.
- The Phase 5 vector film remains intact and is clearly labelled the engineering baseline.
- Working tree clean after the report commit.
- No push.
- Phase 6 not started.
