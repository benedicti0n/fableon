# Phase 5.1 Stage 2A — Real Provider Execution Report

**Date:** 2026-11-10  
**Starting HEAD:** `655592111e3b0e2ee5c930e6c7ed9fba6f2c6788`  
**Experiment:** `phase-05.1-folk-pilot`  
**Providers:** OpenAI `gpt-image-2.6-sunburst`; Gemini `gemini-nano-banana-2.1`  
**Combined ceiling:** **$2.50**  
**Outcome:** Both providers produced usable masters and four rig parts. No full library, provider film, push, or Phase 6 work was started.

## 1. Authorization creation and verification

Two experiment-scoped authorizations were created and approved through the existing server-side
authorization domain service. No JSON record was hand-written and the spending gate was not
disabled.

The operator tool is `scripts/provider-authorize.mjs`. It:

1. reads the live provider status from `/api/studio/providers/status`;
2. reuses an already-active record when the limits match;
3. otherwise creates a pending record and approves it through
   `/api/studio/providers/authorizations/:id/approve`;
4. refuses to create a duplicate or reset a consumed budget when an active record with different
   limits already exists.

The Studio server was started with the real data directory:

```text
FABLEON_DATA_DIR=/Users/benediction/Downloads/Web Dev projects/fableon/.fableon-data
```

Credentials were loaded from the ignored root `.env`. No secret was printed or committed.
The approval actor is recorded truthfully as `delegated-local-operator`, reflecting the explicit
delegation in the Stage 2A instruction. It is not represented as a Studio UI confirmation.

| Field               | OpenAI                        | Gemini                        |
| ------------------- | ----------------------------- | ----------------------------- |
| Authorization ID    | `auth_1794308320695_bc6c13cc` | `auth_1794308322845_6b6082a5` |
| Experiment          | `phase-05.1-folk-pilot`       | `phase-05.1-folk-pilot`       |
| Model               | `gpt-image-2.6-sunburst`      | `gemini-nano-banana-2.1`      |
| Maximum spend       | $1.50                         | $1.00                         |
| Maximum requests    | 6                             | 6                             |
| Outputs per request | 1                             | 1                             |
| Status              | `active`                      | `active`                      |
| Approved by         | `delegated-local-operator`    | `delegated-local-operator`    |
| Approved at         | 2026-11-10T10:58:42.210Z      | 2026-11-10T10:58:42.944Z      |
| Expires at          | 2026-11-11T10:58:40.348Z      | 2026-11-11T10:58:42.604Z      |
| Combined ceiling    | **$2.50**                     |                               |

### Idempotency verification

The CLI was run a second time with identical arguments. Both records returned `reused-active`:

```text
reused-active auth_1794308320695_bc6c13cc active 1.5
reused-active auth_1794308322845_6b6082a5 active 1
```

No duplicate authorization was created and the spent/request counters were not reset. The
persisted store at `.fableon-data/provider-benchmark/authorizations.json` was inspected
independently and showed both records active before generation.

### Pre-request gate behavior

For every paid request the server created a reservation before submission, checked
provider/model/experiment binding, remaining request allowance and remaining budget, and
rejected requests that would exceed the cap. Completed usage was reconciled from the provider
response. Failed Gemini attempts retained conservative holds. The gate returned `403` when no
authorization existed, as observed in the earlier blocked preflight.

## 2. Actual API requests

All timestamps are UTC on 2026-11-10. Estimates are conservative reservation bounds, not
invoices. “Reconciled” is the server’s usage-based cost calculation.

| #   | Provider | Request key                    | Operation       |  Estimate | Input / output / total tokens | Reconciled | Result                          |
| --- | -------- | ------------------------------ | --------------- | --------: | ----------------------------: | ---------: | ------------------------------- |
| 1   | OpenAI   | `stage2a-openai-master`        | generate-master | $0.097920 |           367 / 1,132 / 1,499 |  $0.035795 | Success, 1 image                |
| 2   | Gemini   | `stage2a-gemini-master`        | generate-master | $0.051290 |                             — |  $0.051290 | Failed: HTTP 400 mime rejection |
| 3   | Gemini   | `stage2a-gemini-master-retry1` | generate-master | $0.051290 |                             — |  $0.051290 | Failed: HTTP 502 response shape |
| 4   | Gemini   | `stage2a-gemini-master-retry2` | generate-master | $0.051290 |           379 / 2,098 / 3,705 |  $0.050969 | Success, 1 image                |
| 5   | OpenAI   | `stage2a-openai-head`          | generate-part   | $0.074530 |         1,749 / 1,449 / 3,198 |  $0.052215 | Success, 1 image                |
| 6   | OpenAI   | `stage2a-openai-torso`         | generate-part   | $0.074510 |         1,746 / 1,449 / 3,195 |  $0.052200 | Success, 1 image                |
| 7   | OpenAI   | `stage2a-openai-upper-arm`     | generate-part   | $0.074520 |         1,745 / 1,449 / 3,194 |  $0.052195 | Success, 1 image                |
| 8   | OpenAI   | `stage2a-openai-forearm`       | generate-part   | $0.074535 |         1,747 / 1,449 / 3,196 |  $0.052205 | Success, 1 image                |
| 9   | Gemini   | `stage2a-gemini-parts-sheet`   | generate-part   | $0.052763 |         1,361 / 2,583 / 4,643 |  $0.052442 | Success, 1 four-part sheet      |

OpenAI used **5 of 6** requests; Gemini used **4 of 6**. No request was automatically retried.
The two Gemini retries were manual after adapter fixes and each consumed a request and budget.

### Gemini adapter fixes

Two real API-contract mismatches were found and fixed:

1. The live API rejected `response_format.mime_type: "image/png"` with HTTP 400 and accepted
   `image/jpeg` only. The adapter now requests JPEG.
2. The raw Interactions response returned the image inside `steps[].content[]`, not at
   `output_image`. The adapter now searches the real response shape and extracts usage from
   `total_input_tokens`, `total_output_tokens`, `total_thought_tokens`, and `total_tokens`.
3. A provider test was added for the `steps[]` image shape and JPEG mime type.

The failed attempts are preserved, including their request keys, estimates, errors and holds.
The 400 rejection is likely unbilled; the 502 may have been billed. No provider invoice is
available, so the authorization ledger keeps the conservative hold in both cases.

## 3. Actual generated images

| Asset               | Provider | Path                                                                                         | Dimensions | Container  | SHA-256 (first 16) |
| ------------------- | -------- | -------------------------------------------------------------------------------------------- | ---------: | ---------- | ------------------ |
| Artisan master      | OpenAI   | `outputs/folk-provider-benchmark/openai/attempts/stage2a-openai-master/output-00.png`        |  1536×1024 | PNG, alpha | `f0634647c1fc35e9` |
| Artisan master      | Gemini   | `outputs/folk-provider-benchmark/gemini/attempts/stage2a-gemini-master-retry2/output-00.png` |  2528×1696 | JPEG       | `02fcbb305e47d72a` |
| Four-part rig sheet | Gemini   | `outputs/folk-provider-benchmark/gemini/attempts/stage2a-gemini-parts-sheet/output-00.png`   |  2048×2048 | JPEG       | `a59c013cf81133d8` |
| Head                | OpenAI   | `outputs/folk-provider-benchmark/stage-2a/openai-pack/parts/artisan_head.png`                |    280×329 | PNG, alpha | pack manifest      |
| Torso anchor        | OpenAI   | `outputs/folk-provider-benchmark/stage-2a/openai-pack/parts/artisan_torso.png`               |    320×435 | PNG, alpha | pack manifest      |
| Near upper arm      | OpenAI   | `outputs/folk-provider-benchmark/stage-2a/openai-pack/parts/artisan_nearUpperArm.png`        |    100×169 | PNG, alpha | pack manifest      |
| Near forearm + hand | OpenAI   | `outputs/folk-provider-benchmark/stage-2a/openai-pack/parts/artisan_nearForearm.png`         |     80×152 | PNG, alpha | pack manifest      |
| Head                | Gemini   | `outputs/folk-provider-benchmark/stage-2a/gemini-pack/parts/artisan_head.png`                |    270×274 | PNG, alpha | pack manifest      |
| Torso anchor        | Gemini   | `outputs/folk-provider-benchmark/stage-2a/gemini-pack/parts/artisan_torso.png`               |    277×435 | PNG, alpha | pack manifest      |
| Near upper arm      | Gemini   | `outputs/folk-provider-benchmark/stage-2a/gemini-pack/parts/artisan_nearUpperArm.png`        |     45×103 | PNG, alpha | pack manifest      |
| Near forearm + hand | Gemini   | `outputs/folk-provider-benchmark/stage-2a/gemini-pack/parts/artisan_nearForearm.png`         |     139×66 | PNG, alpha | pack manifest      |

Gemini returns JPEG bytes. The files retain `.png` names from the pre-fix adapter path, but
their content is JPEG; Sharp and the pack pipeline identify them by content. This is recorded as
a naming limitation, not treated as a valid PNG container.

All raw outputs, request JSON, response JSON, usage ledgers, manifests and failed-attempt evidence
are retained under `outputs/folk-provider-benchmark/`.

## 4. Accepted and rejected artwork

| Provider | Images returned | Accepted assets | Accepted with repair | Rejected images | Failed attempts |
| -------- | --------------: | --------------: | -------------------: | --------------: | --------------: |
| OpenAI   |               5 |               5 |                    4 |               0 |               0 |
| Gemini   |               2 |               5 |                    4 |               0 |               2 |

OpenAI’s raw images were all usable. The master was accepted as-is (after alpha trim for the
pack). The four parts were accepted with registration repair: alpha trim, scale correction,
orientation correction and pivot placement. No output was discarded.

Gemini’s two successful images were the master and the four-part sheet. The sheet was accepted
with chroma-key, despill, crop, trim and pivot repair; the four derived parts are counted as four
usable assets from one image. The two failed attempts produced no image and are preserved as
rejected attempts, not silent retries.

Repair notes are recorded in `docs/benchmarks/phase-05.1/stage-2a/asset-decisions.json`.

## 5. Character-identity comparison

Both masters are original Rajasthani-inspired cutout designs. Neither copies a recognizable
existing character.

| Trait                 | OpenAI Sunburst                                            | Gemini Nano Banana 2.1                                     |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Master view           | Front three-quarter, fuller figure                         | Strict side profile, slimmer figure                        |
| Turban / face         | Saffron turban, indigo tail, moustache, earring            | Saffron turban, indigo tail, moustache, earring            |
| Garment               | Ochre angrakha with sash and indigo sleeves                | Ochre angrakha with sash and indigo sleeve trim            |
| Background            | Native transparency                                        | Opaque cream background                                    |
| Identity across parts | Head and torso retain palette and motifs                   | Head and torso retain palette and motifs                   |
| Main mismatch         | Torso part has no connected sleeve; arm parts are separate | Sheet-extracted arm pieces are small relative to the torso |

Within each provider the identity is coherent enough for a small-gate test. Cross-provider
identity is intentionally not identical: the views and proportions differ, so the two sets are
not interchangeable without re-authoring. OpenAI’s front view gives a more complete character
read; Gemini’s profile master gives a cleaner side-view face and turban silhouette.

## 6. Rig-part extraction results

### OpenAI

- Native alpha output, alpha-trimmed with bounding-box offsets recorded.
- Alpha report flags linework-related near-black fringe and transparent-color residue; neither
  prevented straight-alpha compositing.
- Parts were generated individually against the master reference. They arrived at different
  angles and scales and needed diagnostic registration:
  - head target pivot `(470, 430)`, scale `0.45`;
  - torso target pivot `(440, 560)`, scale `0.55`;
  - upper arm target pivot `(530, 490)`, scale `0.22`;
  - forearm target pivot `(510, 680)`, scale `0.22`, source pivot `(429, 280)`.
- The forearm pivot was iterated several times to close a visible elbow gap; the final diagnostic
  pivot sits at the cuff rather than the original sleeve-end guess.

### Gemini

- The four-part sheet used a flat `#00FF00` chroma-key background.
- Extraction: key green, despill green fringes, crop four quadrants, alpha-trim, register pivots.
- No native alpha exists; all transparency is reconstructed. The master itself remains opaque.
- Crops were calibrated manually because the sheet layout is not grid-aligned to exact pixels.
  The upper-arm and forearm crops are small (45×103 and 139×66 after trim) and are scaled up for
  the diagnostic.
- Pivots: head `(470, 430)` scale `0.5`; torso `(440, 560)` scale `0.6`; upper arm `(530, 490)`
  scale `0.35`; forearm `(560, 670)` scale `0.32`.

### Verification performed

- Alpha presence and transparent/opaque ratios: recorded per part in the pack manifests.
- Bounding boxes and source/target pivot registration: recorded per part.
- Visual outline, palette and joint-overlap review: performed on the masters, parts and elbow
  frames.
- Proportion and shoulder/neck registration: **not production-validated**. The diagnostic targets
  are hand-tuned for the elbow test, not a complete character rig.

## 7. Elbow animation test

The test uses the existing `@fableon/folk-motion` package and `resolveFolkPose`. It does not
introduce a new rigging engine.

- Rig: torso → head; torso → upper arm → forearm.
- Range: 0° to 60° in 5° steps, 13 frames.
- Upper arm rotates at 12% of the bend; forearm rotates the full bend.
- OpenAI base: upper arm −21.5°, forearm 44.3°.
- Gemini base: upper arm 0°, forearm 90°.
- Renderer: headless Chromium canvas with a checkerboard alpha background and cyan joint markers.
- Video: ffmpeg H.264, 12 fps.

### Result

Both providers articulate through the full 0–60° range without detached parts or rendering
failure.

- **OpenAI:** the forearm initially exposed a gap at the elbow. Moving the diagnostic forearm
  pivot to the cuff closed the gap. The elbow seam is usable but visible, and the arm sits close
  to the torso. The shoulder attachment remains visually offset because the torso and arm were
  generated separately.
- **Gemini:** the sheet-derived upper arm and forearm share a cleaner elbow seam and rotate
  outward more naturally. The shoulder attachment is still visibly offset and the arm is small
  relative to the torso, so this is not production-scale registration.

Neither test is a full character animation. Only the near arm was tested; the far arm, legs,
head turn and torso deformation were not.

## 8. Exact usage and estimated charges

### Per provider

| Metric                          |    OpenAI |    Gemini |
| ------------------------------- | --------: | --------: |
| Authorization cap               | $1.500000 | $1.000000 |
| Requests used / allowed         |     5 / 6 |     4 / 6 |
| Successful requests             |         5 |         2 |
| Failed requests                 |         0 |         2 |
| Images returned                 |         5 |         2 |
| Usable assets                   |         5 |         5 |
| Estimated request sum           | $0.396015 | $0.206631 |
| Completed-usage cost            | $0.244610 | $0.103410 |
| Failed-attempt hold             | $0.000000 | $0.102579 |
| Conservative spent (ledger)     | $0.244610 | $0.205989 |
| Remaining approved budget       | $1.255390 | $0.794011 |
| Cost per usable asset (ledger)  | $0.048922 | $0.041198 |
| Cost per usable asset (usage)   | $0.048922 | $0.020682 |
| Provider-reported billed amount |      none |      none |

### Combined

| Metric                    |     Value |
| ------------------------- | --------: |
| Combined ceiling          | $2.500000 |
| Estimated request sum     | $0.602646 |
| Completed-usage cost      | $0.348020 |
| Failed-attempt hold       | $0.102579 |
| Conservative spent        | $0.450599 |
| Remaining approved budget | $2.049401 |
| Total images returned     |         7 |
| Total usable assets       |        10 |
| Failed attempts           |         2 |

OpenAI reported 14,282 total tokens across five successful requests: 7,354 input and 6,928
output. Gemini reported 8,348 total tokens across two successful requests: 1,740 input, 4,681
output and 1,927 thought tokens. The Gemini failed attempts returned no usage.

No provider reported a billed amount in the API response. All charges above are calculated from
published token pricing and the provider usage response; they are estimates, not invoices. The
authorization ledger uses the conservative figure, including the two failed Gemini holds.

## 9. Visual comparison artifacts

- `docs/benchmarks/phase-05.1/stage-2a/artwork-and-rig-comparison.png` — masters, extracted
  parts and five elbow frames per provider.
- `docs/benchmarks/phase-05.1/stage-2a/full-comparison.png` — full-size comparison sheet.
- `docs/benchmarks/phase-05.1/stage-2a/elbow-side-by-side.mp4` — synchronized side-by-side elbow
  test.
- `docs/benchmarks/phase-05.1/stage-2a/elbow-openai.mp4` and `elbow-gemini.mp4` — individual
  clips.
- `docs/benchmarks/phase-05.1/stage-2a/openai-master.png` and `gemini-master.png` — reference
  copies of the accepted masters.
- `docs/benchmarks/phase-05.1/stage-2a/requests/` — every request and response JSON, including
  the two failures.
- `docs/benchmarks/phase-05.1/stage-2a/cost-summary.json`,
  `openai-cost-report.json`, `gemini-cost-report.json` — exact cost data.
- `docs/benchmarks/phase-05.1/stage-2a/asset-decisions.json` — accepted/rejected and repair notes.
- `docs/benchmarks/phase-05.1/stage-2a/authorizations.json`,
  `authorization-creation.json` — persisted approval evidence and creation record.
- `docs/benchmarks/phase-05.1/stage-2a/openai-pack-manifest.json`,
  `gemini-pack-manifest.json`, `pack-report.json`, `rig-test-report.json` — registration and
  rig-test evidence.
- `docs/benchmarks/phase-05.1/stage-2a/openai-usage-ledger.json`,
  `gemini-usage-ledger.json` — provider usage ledgers.
- `outputs/folk-provider-benchmark/comparison/final-verdict.md` — short verdict.
- `outputs/folk-provider-benchmark/comparison/visual-comparison.png` and `side-by-side.mp4` —
  duplicate comparison deliverables under `outputs/`.

Historical preflight screenshots from the previous blocked attempt remain in the directory as a
record; they are not results of this executed gate.

## 10. Known limitations

1. **Gemini required two manual retries.** The PNG mime-type rejection and the `steps[]` parser
   mismatch were real adapter defects. Both attempts consumed request and budget allowance.
2. **Gemini has no native alpha.** Chroma-key extraction reconstructs transparency; despill can
   alter edge pixels and green fringing remains a risk on future palettes.
3. **Gemini files are JPEG bytes with `.png` names.** The pipeline handles them by content, but
   the names are misleading and should be normalized before production.
4. **Registration is diagnostic, not production.** Part scales, source pivots and target pivots
   were hand-tuned. Shoulder and neck alignment are visibly imperfect in both providers.
5. **The parts are not a complete character.** No far arm, legs, feet, hands in alternate poses,
   background, horse or secondary character were generated.
6. **OpenAI parts lose some construction fidelity.** The torso was generated without connected
   sleeves, and individually generated arm pieces arrived at different angles and scales.
7. **Gemini sheet crops are small.** The upper-arm and forearm source crops are only 45×103 and
   139×66 after trim, which limits production sharpness when scaled up.
8. **No invoice is available.** Failed Gemini holds are conservative and may overstate the true
   charge. The 400 rejection is likely unbilled; the 502 may have been billed.
9. **Pricing is not provider-confirmed.** Estimates use verified published rates; the server
   reconciles token usage, but only a provider invoice can confirm the final amount.

## 11. Test results

| Command                                  | Result                      |
| ---------------------------------------- | --------------------------- |
| `pnpm format:check`                      | PASS                        |
| `pnpm lint`                              | PASS — 0 errors, 0 warnings |
| `pnpm typecheck`                         | PASS                        |
| `pnpm test`                              | PASS — 305 tests / 45 files |
| `pnpm vitest run apps/web/lib/providers` | PASS — 32 tests / 7 files   |
| `pnpm build`                             | PASS                        |
| Paid provider calls during test runs     | 0                           |

A first `pnpm test` invocation executed concurrently with `pnpm build` produced one transient
failure. Two standalone full-suite reruns passed 305/305; the failure did not reproduce. This is
recorded rather than hidden.

The new provider test covers the real Gemini `steps[].content[]` image shape and the JPEG mime
type. The authorization/gate integration was exercised by the real CLI flow and by the server’s
`403` response in the earlier no-authorization preflight.

## 12. Git commits

| Purpose                           | Commit     |
| --------------------------------- | ---------- |
| Starting point                    | `6555921`  |
| Code and operator tools           | `ab62428`  |
| Typing and registration follow-up | `3cfad89`  |
| Stage 2A evidence and artifacts   | `6f9d194`  |
| This execution report             | final HEAD |

The artifact commit contains the comparison images/video, cost and usage evidence, authorization
snapshots, pack manifests, rig-test output and request/response records. This report is committed
immediately after it; the report commit is the final HEAD reported in the handoff. No push was
performed.

## 13. Recommendation

**Do not approve a full-library budget yet.** The small gate proves both providers can produce a
usable artisan master and four rig parts inside their caps, but neither proves production-ready
decomposition across the whole body.

- **OpenAI** is the stronger choice on native alpha and per-part generation control. It returned
  5/5 usable images. It is more expensive per usable asset ($0.048922) and needs registration
  repair because independently generated parts do not share a common construction.
- **Gemini** is materially cheaper on completed usage ($0.020682 per usable asset) and produced
  the cleaner sheet-derived elbow seam. It required two adapter-fix retries and reconstruction
  of alpha, and its extracted arm crops are smaller and less production-ready.

The next gate should be a separate, narrowly authorized experiment that tests:

1. both arms and both legs, not only the near arm;
2. a complete eight-to-ten-part sheet or part set with a fixed extraction contract;
3. production pivot calibration against the actual rig slots;
4. one full-character composite still and a short joint diagnostic.

No such authorization was created in this stage. Full library generation, provider films, Phase 6
and push remain out of scope.
