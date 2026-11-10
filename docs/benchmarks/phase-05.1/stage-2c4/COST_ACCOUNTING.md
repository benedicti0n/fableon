# Stage 2C.4 — Cost Accounting

## Provider spend

| Item                                   |        Amount |
| -------------------------------------- | ------------: |
| Stage 2C.2 OpenAI usage-derived cost   |     $0.085175 |
| Stage 2C.2 Gemini usage-derived cost   |     $0.104733 |
| Stage 2C.2 combined                    | **$0.189908** |
| Stage 2C.4 new paid calls              |         **0** |
| Stage 2C.4 new spend                   |     **$0.00** |
| Authorizations activated in Stage 2C.4 |             0 |

No provider request was submitted, no authorization balance was consumed, and no image was generated. The Stage 2C.2 usage records remain unchanged. The Stage 2C.2 amounts are usage-derived, not provider invoices.

## Local runtime

Measured supervisor durations:

| Operation                                        | Duration |
| ------------------------------------------------ | -------: |
| Supervisor timeout self-test                     | 2,521 ms |
| Startup                                          |    70 ms |
| Imports                                          |   752 ms |
| Paid-image decode                                |   399 ms |
| Extraction (8 parts)                             |   856 ms |
| Single sprite                                    | 1,110 ms |
| Production assembly (2 providers, 4 frames each) | 3,161 ms |
| 24-frame MP4s (2 providers)                      | 5,583 ms |
| Fixed legacy one-frame run (2 providers)         | 5,687 ms |

Manual mask correction time: **0 minutes** in this phase, because no interactive mask correction was performed. This is not evidence that future artistic correction is free; no artist review occurred.

## Usable parts

- Technically extracted: **8** (four per provider).
- Technically loaded into the production pack: **8**.
- Technically rendered: **8**.
- Artistically approved: **0**.
