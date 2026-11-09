# Phase 4.1 — Studio UX Test

**Route tested:** `/studio/composition`  
**Browser:** Playwright Chromium  
**Storage:** isolated temporary `FABLEON_DATA_DIR`  
**Date:** 2026-11-10

## Tested behavior

| Check                            | Result   | Evidence                                                              |
| -------------------------------- | -------- | --------------------------------------------------------------------- |
| Composition page loads           | PASS     | `studio-screenshots/composition-default-1280.png`                     |
| Four shot cards visible          | PASS     | Awakening Forest, Little Bird in Flight, The Landing, A Place to Rest |
| Global timeline exposes 0–719    | PASS     | Slider and `30.00 s` display                                          |
| Shot buttons jump to starts      | PASS     | 0 / 144 / 360 / 528 and data attributes matched                       |
| Scrubbing updates rendered frame | PASS     | Actual Canvas pixels and `data-frame` changes                         |
| Play advances frames             | PASS     | 528→540 during playback                                               |
| Pause stops playback             | PASS     | 555→555 after pause                                                   |
| Preview 1280×720 / 1920×1080     | PASS     | Canvas attributes changed to both sizes                               |
| Opening title visible            | PASS     | Frame 72 state and screenshot                                         |
| Ending title visible             | PASS     | Frame 620 state                                                       |
| Invalid export range feedback    | PASS     | Visible `endFrame must be at most 719.`                               |
| Short export completes           | PASS     | 24-frame 1280×720 job; progress 100                                   |
| Completed export playable        | PASS     | `duration=1.000`, 1280×720, readyState 4                              |
| Duplicate active export rejected | PASS     | HTTP 409                                                              |
| Long export cancellation         | **FAIL** | Stuck `rendering`; 48-byte partial MP4                                |
| Existing project route           | PASS     | Demo project loaded and screenshot captured                           |
| Existing shot/review route       | PASS     | Demo AI shot loaded and screenshot captured                           |

## Screenshots

- `studio-screenshots/composition-default-1280.png`
- `studio-screenshots/composition-title-1920.png`
- `studio-screenshots/composition-export-completed.png`
- `studio-screenshots/projects-demo.png`
- `studio-screenshots/shot-review-demo.png`

The earlier broad script initially reported invalid-export feedback and video readiness
as failures because it checked before React state and video metadata settled. A focused
rerun confirmed both work:

- alert: **“endFrame must be at most 719.”**
- video: **readyState 4, duration 1.000 s, 1280×720**.

The cancellation failure was reproduced in the focused rerun and is real.

## Confirmed workflow defect — long render cancellation

- Job: `dc70309b-cfe9-4951-9a69-4ea289e3fa60`
- Start: 0, end: 719, 1280×720
- Before cancel: `rendering`, 18/720 frames
- Cancel request: accepted; status file `cancelRequested: true`
- After 60 seconds: still `rendering`; no further progress
- Render process: **not running**
- Partial output: **48-byte MP4**
- Terminal status: **never written**
- Partial file: `outputs/phase-04-acceptance/cancelled-partial.mp4`
- Status record: `outputs/phase-04-acceptance/cancelled-job-status.json`

This means the long-render process can die without transitioning the job to
`cancelled`/`failed`, leaving a stale “rendering” record and a corrupt partial MP4. The
short Studio export (24 frames) works. CLI rendering also works.

## Other observations

- The expected 400 from the deliberate invalid-export test appears as a browser console
  error; it is handled by a visible alert in the UI.
- No unexpected page-level JavaScript errors were found in the focused run.
- The page correctly labels Phase 4 and keeps the Phase 3 project/review routes working.

## Decision

**Studio functionality: PARTIAL.**

Core preview, navigation, scrubbing, playback, resolution selection, invalid-input
feedback, short export, and existing Studio routes work. Long-job cancellation/status
recovery is broken and must be fixed or the cancel control should be removed until
supported.
