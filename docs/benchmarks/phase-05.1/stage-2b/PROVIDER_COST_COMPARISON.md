# Phase 5.1 Stage 2B — Provider Cost Comparison

**Date:** 2026-11-10  
**Stage 2B paid calls:** 0  
**Stage 2B authorization:** pending, not granted

## 1. Stage 2A actuals (historical, unchanged)

| Metric                          |    OpenAI |    Gemini |  Combined |
| ------------------------------- | --------: | --------: | --------: |
| Requests used                   |     5 / 6 |     4 / 6 |         9 |
| Images returned                 |         5 |         2 |         7 |
| Usable assets                   |         5 |         5 |        10 |
| Conservative ledger spend       | $0.244610 | $0.205989 | $0.450599 |
| Completed-usage cost            | $0.244610 | $0.103410 | $0.348020 |
| Failed-attempt hold             | $0.000000 | $0.102579 | $0.102579 |
| Cost per usable asset (ledger)  | $0.048922 | $0.041198 | $0.045060 |
| Cost per usable asset (usage)   | $0.048922 | $0.020682 | $0.034802 |
| Provider-reported billed amount |      none |      none |      none |

### Gemini reconciliation

```
Conservative ledger        $0.205989
Completed successful usage $0.103410
Difference                 $0.102579
```

The difference is exactly two failed requests at $0.0512895 each:

| Request                        | Result                           | Accounting                              |
| ------------------------------ | -------------------------------- | --------------------------------------- |
| `stage2a-gemini-master`        | HTTP 400, PNG mime rejected      | conservative hold; likely unbilled      |
| `stage2a-gemini-master-retry1` | HTTP 502, image shape not parsed | conservative hold; may have been billed |

The 400 was rejected before image generation, so it is probably not billed. The 502 may represent a
billed generation whose response we could not parse at the time. No invoice is available. The
holds remain in the ledger; historical events were not altered.

## 2. Stage 2B estimate

Free estimate calls only. No request was submitted to a provider.

| Sheet               |        OpenAI |        Gemini |
| ------------------- | ------------: | ------------: |
| Head (3×3)          |     $0.327565 |    $0.0545025 |
| Body (3×2)          |     $0.327555 |    $0.0544980 |
| Arms (3×3)          |     $0.363425 |    $0.0561885 |
| Legs (4×2)          |     $0.291620 |    $0.0527910 |
| **Base plan total** | **$1.310165** | **$0.217980** |
| Combined base plan  | **$1.528145** |               |

These are conservative reservation bounds, not invoices. The plan permits one manual repair per
sheet inside the caps, but each repair must be a deliberate, counted request; no automatic retry
is allowed.

### Proposed caps

| Provider |   Cap | Requests | Outputs/request | Resolution      | Status      |
| -------- | ----: | -------: | --------------: | --------------- | ----------- |
| OpenAI   | $4.00 |       10 |               1 | up to 2048×2048 | pending     |
| Gemini   | $3.00 |       10 |               1 | 2K              | pending     |
| Combined | $7.00 |       20 |               — | —               | not granted |

Estimated headroom:

- OpenAI: $4.00 − $1.310165 = **$2.689835**.
- Gemini: $3.00 − $0.217980 = **$2.782020**.

## 3. Cumulative accounting

| Metric                                           |     Value |
| ------------------------------------------------ | --------: |
| Stage 2A completed-usage cost                    | $0.348020 |
| Stage 2A conservative spend                      | $0.450599 |
| Stage 2B spent to date                           | $0.000000 |
| Active remaining Stage 2A budget                 | $2.049401 |
| Pending Stage 2B ceiling                         | $7.000000 |
| Projected total if Stage 2B executes at estimate | $1.978744 |

The projected total uses Stage 2A conservative spend plus the Stage 2B estimate. Completed actual
cost will be lower if usage reconciles below the reservations.

## 4. Projected unit economics

These are projections, not achieved costs. The packs are not generated yet.

| Metric                                      |    OpenAI |    Gemini |
| ------------------------------------------- | --------: | --------: |
| Contract parts                              |        31 |        31 |
| Stage 2A conservative + Stage 2B estimate   | $1.554775 | $0.423969 |
| Projected cost per approved part            | $0.050154 | $0.013676 |
| Projected cost per first 8-second animation | $1.554775 | $0.423969 |
| Incremental API cost of reusing the rig     | $0.000000 | $0.000000 |

The incremental reuse cost is zero **provider API cost** only. It does not include local compute,
electricity, engineering time or manual repair time.

## 5. Production time and manual work

No Stage 2B provider artwork exists yet, so actual generation count, repair hours and render time
cannot be claimed. The preparation work completed so far is engineering time, not provider spend.
The final report must separate:

- provider API spend;
- local render compute time;
- manual repair time;
- engineering time;
- approved/rejected/repaired part counts.

## 6. Authorization state

The two pending records are stored at
`docs/benchmarks/phase-05.1/stage-2b/authorizations-pending.json`.

- OpenAI: `auth_1794315751164_678c8d79`, $4.00, 10 requests, pending, `approvedBy: null`.
- Gemini: `auth_1794315751766_c1eef16a`, $3.00, 10 requests, pending, `approvedBy: null`.
- Both expire `2026-11-13T13:02:30.000Z`.

No Stage 2B spending is authorized until both are explicitly approved with the exact confirmation
strings. The Stage 2A authorizations are a different experiment and cannot be used.
