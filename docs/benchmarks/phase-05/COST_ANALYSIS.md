# Phase 5 — Cost Analysis

**Production:** The Little Brass Bell  
**Ledger:** `docs/benchmarks/phase-05/cost-ledger.json` (copy of `outputs/folk-pilot/cost-ledger.json`)  
**Events:** 9 final-benchmark events  
**Paid image/video API calls:** **0**  
**First-film marginal cash cost:** **$0.00**

## 1. What was actually executed

| Operation            | Provider               | Model                     |         Runtime | Output                           |
| -------------------- | ---------------------- | ------------------------- | --------------: | -------------------------------- |
| Asset generation     | `fableon-local-vector` | `fableon-svg-v1`          |        6,009 ms | 61 transparent parts + 6 masters |
| Final 1080p render   | `fableon-local`        | Canvas 2D + FFmpeg        |      194,257 ms | 720 frames, 15,198,058 bytes     |
| 720p preview render  | `fableon-local`        | Canvas 2D + FFmpeg        |      175,690 ms | 720 frames, 8,602,453 bytes      |
| Walk/horse variation | `fableon-local`        | Canvas 2D + FFmpeg        |       42,819 ms | 192 frames, 2,540,801 bytes      |
| Reach variation      | `fableon-local`        | Canvas 2D + FFmpeg        |       23,616 ms | 96 frames, 1,315,679 bytes       |
| Provider preflight   | none                   | n/a                       |            0 ms | blocked                          |
| Manual preparation   | agent-assisted         | original vector authoring | 0 human minutes | not monetized                    |

The final-benchmark ledger was started after archiving the development ledger to
`outputs/folk-pilot/archive/cost-events-development.jsonl`. The archive preserves the
earlier iteration events; the committed ledger is the clean final pass.

## 2. Actual API cost

| Provider          |             Calls |       Billed outputs | Actual charge |
| ----------------- | ----------------: | -------------------: | ------------: |
| Black Forest Labs |                 0 |                    0 |         $0.00 |
| Google Gemini     |                 0 |                    0 |         $0.00 |
| OpenAI            |                 0 |                    0 |         $0.00 |
| Local vector      | 1 generation pass | 61 parts / 6 masters |         $0.00 |
| **Total**         |  **0 paid calls** |                **—** |     **$0.00** |

No API key was used. No retry, fallback, or hidden provider call occurred. The remote
spending gate in `apps/web/lib/folk/providers.ts` requires a persisted authorization record
and rejects missing or over-cap requests.

## 3. Local compute

| Metric                       |                               Value |
| ---------------------------- | ----------------------------------: |
| Final 1080p render           | 193,166 ms raster + 1,091 ms encode |
| 1080p median frame           |                            262.1 ms |
| 1080p p95 frame              |                            369.1 ms |
| 720p preview render          |   175,183 ms raster + 507 ms encode |
| 720p median frame            |                            231.6 ms |
| Variation renders            |           42,310 + 23,160 ms raster |
| Total final-benchmark frames |                               1,776 |
| Measured/estimated energy    |                         **unknown** |

The host is an Apple M1 MacBook Air with 8 GB unified memory. No calibrated wall-power
meter or GPU power telemetry is available, so electricity is left **unknown**, not
invented. To measure it: use a wall meter, run a 60-second render, record mean kW, multiply
by hours, and label it whole-system energy. Do not label GPU-only telemetry as total system
energy.

## 4. Provider comparison

Only the local provider was executed. The hosted rows are **price-based scenarios, not
observed calls**.

Scenario assumption: six master artworks (artisan, horse, cart, bell, courtyard, street),
two candidate attempts each = 12 generated outputs.

| Metric                           | Local vector                           | BFL FLUX 3 Klein | Gemini Nano Banana 2.1 | OpenAI GPT Image 2 |
| -------------------------------- | -------------------------------------- | ---------------: | ---------------------: | -----------------: |
| Executed?                        | **Yes**                                |               No |                     No |                 No |
| Generated outputs                | 61 parts from 6 masters                |      12 scenario |            12 scenario |        12 scenario |
| Approved masters                 | 6                                      |        6 assumed |              6 assumed |          6 assumed |
| API charges                      | **$0.00 actual**                       | $0.168 estimated |      $0.6048 estimated |   $0.492 estimated |
| Cost per master (2 attempts)     | $0.00                                  |           $0.028 |                $0.1008 |             $0.082 |
| Cost per character (2 attempts)  | $0.00                                  |           $0.028 |                $0.1008 |             $0.082 |
| Cost per background (2 attempts) | $0.00                                  |           $0.028 |                $0.1008 |             $0.082 |
| GPU/runtime                      | 6.0 s asset generation + local renders |              N/A |                    N/A |                N/A |
| Film asset cost                  | **$0.00 actual**                       |  $0.168 scenario |       $0.6048 scenario |    $0.492 scenario |

If one attempt per master is enough, halve the hosted estimates: BFL $0.084, Gemini
$0.3024, OpenAI $0.246. These are planning numbers from the supplied brief, not invoices.
OpenAI/Gemini edit requests may cost more than the output-only figures shown.

## 5. Marginal cost

| Metric                                                              |                                               Value |
| ------------------------------------------------------------------- | --------------------------------------------------: |
| First-film marginal cash cost                                       |                                           **$0.00** |
| Incremental cash cost of a different animation from the same assets |                                           **$0.00** |
| First-film local render time                                        |                                             194.3 s |
| Variation render time                                               |                                     42.8 s / 23.6 s |
| Manual preparation time                                             |     0 human minutes (agent-authored vector masters) |
| Development cost                                                    |                excluded from the film marginal cost |
| Hardware                                                            | existing Apple M1; not counted as a new $0 purchase |

The expensive part of this production was **authoring and rigging**, not rendering. Once
the cast, parts, and rigs exist, changing speed, reach target, gait timing, and camera
costs only local render time.

## 6. Eight-minute story estimate

Do not multiply the 30-second cost by 16 without accounting for unique assets.

Two cases:

1. **Reuse the pilot cast and locations.** API cost: **$0**. Local render: roughly 16× the
   frame count, about 48–60 minutes on this M1, depending on camera and effects. New
   animation configuration is data, not new artwork.
2. **Add four new locations/props and two alternates, two attempts each.** Hosted asset
   scenario: 12 outputs → BFL **$0.168**, Gemini **$0.6048**, OpenAI **$0.492** at the
   supplied prices. Local API cost remains **$0**; authoring/rigging time is the real cost
   driver.

The dominant cost drivers are unique master artworks, repair/retry count, rig authoring,
and manual review time — not video duration alone.

## 7. Cost decision

**Gate E — cost tracking: PASS.** Every executed generation pass and render is in the
append-only ledger. Actual, estimated, unknown, and hypothetical values are separated.
**Gate F — no unapproved spending: PASS.** No paid API was contacted.
