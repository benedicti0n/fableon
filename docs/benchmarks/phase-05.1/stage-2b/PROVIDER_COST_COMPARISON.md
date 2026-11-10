# Phase 5.1 Stage 2B — Provider Cost Comparison

**Date:** 2026-11-10  
**Stage 2B paid calls:** 9 (4 OpenAI, 5 Gemini)  
**Stage 2B completed-usage cost:** $0.676329  
**Stage 2B remaining budget:** $6.323671

## 1. Stage 2A actuals (historical, unchanged)

| Metric                    |    OpenAI |    Gemini |  Combined |
| ------------------------- | --------: | --------: | --------: |
| Requests used             |     5 / 6 |     4 / 6 |         9 |
| Images returned           |         5 |         2 |         7 |
| Usable assets             |         5 |         5 |        10 |
| Conservative ledger spend | $0.244610 | $0.205989 | $0.450599 |
| Completed-usage cost      | $0.244610 | $0.103410 | $0.348020 |
| Failed-attempt hold       | $0.000000 | $0.102579 | $0.102579 |

Gemini reconciliation: $0.205989 − $0.103410 = **$0.102579**, exactly two failed attempts at
$0.0512895 each. The 400 mime rejection is likely unbilled; the 502 response-shape failure may have
been billed. No invoice exists, so the conservative holds remain.

## 2. Stage 2B actuals

| Metric                            |    OpenAI |            Gemini |  Combined |
| --------------------------------- | --------: | ----------------: | --------: |
| Requests used                     |    4 / 10 |            5 / 10 |         9 |
| Images returned                   |         4 |                 5 |         9 |
| 31-part packs                     |         1 |                 1 |         2 |
| Rejected sheets                   |         0 | 1 (original arms) |         1 |
| Estimated request sum             | $1.310165 |         $0.274313 | $1.584478 |
| Completed-usage cost              | $0.403720 |         $0.272609 | $0.676329 |
| Remaining cap                     | $3.596280 |         $2.727391 | $6.323671 |
| Cost per part                     | $0.013023 |         $0.008794 | $0.010909 |
| Cost per completed rig            | $0.403720 |         $0.272609 | $0.676329 |
| Cost per first 8-second animation | $0.403720 |         $0.272609 | $0.676329 |
| Incremental API cost of reuse     | $0.000000 |         $0.000000 | $0.000000 |

The Gemini repair sheet (`stage2b-gemini-arms-repair1`) is counted separately. The original Gemini
arms sheet was rejected for merging complete bent arms into the forearm cells. No Stage 2B HTTP
request failed; the rejection is an artistic/layout rejection, not a transport failure.

## 3. Cumulative Stage 2A + 2B

| Metric                                       |    OpenAI |              Gemini |  Combined |
| -------------------------------------------- | --------: | ------------------: | --------: |
| Stage 2A conservative                        | $0.244610 |           $0.205989 | $0.450599 |
| Stage 2A completed usage                     | $0.244610 |           $0.103410 | $0.348020 |
| Stage 2B completed usage                     | $0.403720 |           $0.272609 | $0.676329 |
| Cumulative conservative                      | $0.648330 |           $0.478598 | $1.126928 |
| Cumulative completed usage                   | $0.648330 |           $0.376019 | $1.024349 |
| Cumulative cost per part                     | $0.020914 | $0.012130–$0.015439 |         — |
| Cumulative cost per first 8-second animation | $0.648330 | $0.376019–$0.478598 |         — |

Gemini’s range reflects completed usage versus the conservative Stage 2A holds. The conservative
figure is the safer accounting figure; the completed-usage figure is the lower-bound estimate.

## 4. Local production cost

| Item                                        | Measured/estimated                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| Provider generation wall time (9 requests)  | 13:39:28–13:48:59 UTC ≈ 9.5 minutes                                          |
| Local render time per 8-second clip         | ≈ 20.7 seconds (`/usr/bin/time`; 192 frames)                                 |
| Four provider clips (base + variation each) | ≈ 83 seconds local compute                                                   |
| Additional comparison/contact renders       | under 10 seconds                                                             |
| Manual repair time                          | not separately instrumented; local scripts plus repeated visual registration |
| Incremental API cost of the reused rig      | $0                                                                           |

Local compute, electricity and human/engineering time are not included in provider spend.

## 5. Lease on the caps

| Provider |   Cap |     Spent | Remaining | Requests left |
| -------- | ----: | --------: | --------: | ------------: |
| OpenAI   | $4.00 | $0.403720 | $3.596280 |             6 |
| Gemini   | $3.00 | $0.272609 | $2.727391 |             5 |
| Combined | $7.00 | $0.676329 | $6.323671 |            11 |

No unused request is treated as a refund, and no reservation is reused for a future experiment.
The Stage 2B approvals remain active until their expiration or revocation.

## 6. Cost of a usable character

At the measured Stage 2B marginal cost:

- OpenAI: **$0.403720** for a 31-part rig and first eight-second animation.
- Gemini: **$0.272609** for a 31-part rig and first eight-second animation.
- Reuse: **$0 provider API cost** for a second motion configuration; local render only.

These are production-cost estimates, not a full-film budget. They exclude the remaining artistic
repair needed for either provider.
