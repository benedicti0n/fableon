# Phase 5.1 Stage 2C.4 — Runtime Recovery Report

**Date:** 2026-11-11  
**Starting HEAD:** `4683bcf`  
**Mode:** runtime isolation and recovery, zero paid calls  
**Status:** **PASS for runtime recovery and technical rendering**; artistic approval remains pending

## 1. Starting HEAD

| Item                      | Value              |
| ------------------------- | ------------------ |
| Starting commit           | `4683bcf`          |
| Starting working tree     | clean              |
| Stage 2C.2 paid spend     | $0.189908 combined |
| Stage 2C.4 paid spend     | **$0.00**          |
| Stage 2C.4 provider calls | **0**              |

## 2. Original failure reproduction

The original `HEAD` version of `scripts/stage2c2-render.ts` was extracted to a temporary script, with only its output directories redirected, and run under the new parent supervisor with a 15-second wall clock.

Captured result: `docs/benchmarks/phase-05.1/stage-2c4/logs/original-failure.result.json`

```json
{
  "timedOut": true,
  "elapsedMs": 15065,
  "exitCode": 1
}
```

Captured stderr:

```text
page.evaluate: TypeError: c.toDataURL is not a function
    at draw (<anonymous>:1:4119131)
    at window.render (<anonymous>:1:4119174)
    at eval (eval at evaluate (:370:30), <anonymous>:1:11)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
    at main (.../scripts/stage2c2-render-original.ts:236:28)

[supervisor] wall-clock timeout after 15000 ms; sending SIGTERM to process group 14168
[supervisor] final status: TIMEOUT
```

This is an exact reproduction of the first failing operation, not a timeout-only inference.

## 3. Last observable startup checkpoint

Before the fix there was no useful application-level checkpoint. The script emitted no stage logs, and the external `perl` wrapper was malformed:

```bash
perl -e 'alarm 60; exec @ARGV' 60 ./node_modules/.bin/tsx ...
```

`60` was in `@ARGV`, so Perl attempted to execute a program named `60`. The wrapper returned `EXIT:0` with zero stdout and zero stderr. Captured in `logs/perl-supervisor-bug.log`.

After the fix, the same layered boundary trace is observable:

```text
process-start
imports-start
sharp-done
playwright-done
folk-motion-done
renderer-done
decode-finished
extract-finished
single-sprite-start / page-ready / browser-closed
assembly-start / renderer-ready / assembly-finished
video-start / encoded / video-finished
```

The complete startup record is `docs/benchmarks/phase-05.1/stage-2c4/STARTUP_TRACE.md`.

## 4. Root-cause evidence

**Confirmed root cause:** the browser-side renderer called `toDataURL()` on a `CanvasRenderingContext2D` instead of the `<canvas>` element.

```ts
const c = document.getElementById("c").getContext("2d");
// ...
return c.toDataURL("image/png"); // wrong receiver
```

The exception is thrown at the first `page.evaluate`. The error path then:

1. logged the exception,
2. set `process.exitCode = 1`,
3. did **not** close Chromium.

Chromium's open Playwright connection keeps the Node event loop alive. The process therefore hangs despite the failing exit code. The outer shell timeout eventually kills it. The timeout is a consequence, not the cause.

The Stage 2C.3 retry did not fix this because `HEAD` still contained the original `process.exitCode = 1` path, with no browser cleanup, no page-error listener and no default page timeout.

Full analysis: `docs/benchmarks/phase-05.1/stage-2c4/CONFIRMED_ROOT_CAUSE.md`.

## 5. Actual repair

- Replaced `c.toDataURL(...)` with `document.getElementById('c').toDataURL(...)`.
- Tracked the active browser and closed it on the error path before `process.exit(1)`.
- Added `page.setDefaultTimeout(15000)`, `pageerror` and console-error logging.
- Added synchronous checkpoint logging and one-frame diagnostic capping.
- Replaced the unsafe Perl wrapper with `scripts/stage2c4/supervise.mjs`, a parent-side supervisor with detached process groups, SIGTERM, SIGKILL fallback and a result JSON.
- Split the workflow into seven independently runnable smoke tests plus a parent-supervisor self-test.
- Added regression guards in `apps/web/lib/folk/stage2c4-runtime.test.ts`.

Details: `docs/benchmarks/phase-05.1/stage-2c4/RUNTIME_FIX.md`.

## 6. Independent smoke-test results

Full matrix: `docs/benchmarks/phase-05.1/stage-2c4/EXECUTION_MATRIX.md`.

| Test                               | Result | Duration | Evidence                   |
| ---------------------------------- | ------ | -------: | -------------------------- |
| 0. Supervisor timeout cleanup      | PASS   | 2,512 ms | parent and grandchild gone |
| 1. Process startup                 | PASS   |    71 ms | `logs/test1.trace.log`     |
| 2. Module loading                  | PASS   |   906 ms | `logs/test2.trace.log`     |
| 3. Decode paid images              | PASS   |   466 ms | `smoke/03-decode.json`     |
| 4. Persistent extraction masks     | PASS   |   834 ms | `smoke/04-extract.json`    |
| 5. Single sprite                   | PASS   | 1,228 ms | `single-sprite-openai.png` |
| 6. Production articulated assembly | PASS   | 3,161 ms | `smoke/06-assembly.json`   |
| 7. 24-frame MP4                    | PASS   | 5,619 ms | `smoke/07-video.json`      |

The fixed legacy path also completed one frame for both providers with exit code 0:

- `logs/legacy-one-frame.trace.log`
- `logs/legacy-one-frame.result.json`
- elapsed 5,687 ms
- both providers reached `browser-closed`
- one-frame MP4s exist under `outputs/folk-provider-benchmark/stage-2c4/legacy/`

## 7. OpenAI source-image decoding

`smoke/03-decode.json`:

- PNG, 1536×1024, 4 channels, alpha present.
- SHA-256 `9186a76dafa97379ad794fef70b44803474a77c150db9f7e352d32751e9a87bb`.
- Center pixel is fully transparent; the artwork occupies the two designed cells.
- Existing extracted upper arm candidate: PNG 338×855, RGBA, SHA-256 `6779420f…`.

## 8. Gemini source-image decoding

`smoke/03-decode.json`:

- Actual bytes are JPEG, 2528×1696, 3 channels, no native alpha; the `.png` filename is historical.
- SHA-256 `838a950e309fe9f22c1530a5705dd933e1fb1d54413cae3f7b3a8fe1fe1455d8`.
- Center pixel is green `(1,254,3,255)`, confirming the chroma background.
- Existing extracted upper arm candidate: PNG 290×650, RGBA, SHA-256 `196bb9bd…`.

## 9. Part extraction results

The Stage 2C.4 extractor writes full-source-dimension masks, reloads them, validates the reloaded byte length, and then applies them. The Stage 2C.2 candidates were not overwritten.

| Provider | Part         | Candidate | Green-dominant opaque |
| -------- | ------------ | --------- | --------------------: |
| OpenAI   | nearUpperArm | 338×855   |                     0 |
| OpenAI   | nearForearm  | 279×862   |                     0 |
| OpenAI   | nearThigh    | 432×981   |                     0 |
| OpenAI   | nearShin     | 430×879   |                     0 |
| Gemini   | nearUpperArm | 286×646   |                     0 |
| Gemini   | nearForearm  | 339×833   |                     0 |
| Gemini   | nearThigh    | 638×1306  |                     0 |
| Gemini   | nearShin     | 431×1266  |                     0 |

All mask and candidate hashes are in `smoke/04-extract.json` and the Git-ignored resolution directories under `outputs/folk-provider-benchmark/stage-2c4/{provider}/masks/`.

## 10. Single-frame renderer results

`05-sprite.ts` rendered the actual OpenAI paid upper-arm extract through a controlled Canvas 2D test:

- `docs/benchmarks/phase-05.1/stage-2c4/single-sprite-openai.png`
- 640×640, RGBA PNG.
- Source: `outputs/folk-provider-benchmark/stage-2c4/openai/parts/nearUpperArm.png`
- Source SHA-256 `f2577446…`.
- No `toDataURL` error, no hang, clean exit.

The production renderer test is stronger and is recorded next.

## 11. Rig integration results

`06-production-assembly.ts` uses the actual `apps/web/lib/folk/renderer.ts` `FolkRenderer`, bundled with Vite, plus the real background/config layers and `@fableon/folk-motion`.

For both providers:

- Pack parts: 32 (31 base slots plus bell).
- Paid replacements: near upper arm, near forearm, near thigh, near shin.
- Resolved nodes: 29.
- Missing part IDs: 0.
- All transform coefficients finite: true.
- Shoulder–elbow distance: 142.04 master px, matching the Stage 2B baseline (508,470 → 532,610).
- Frames: neutral, reach, elbow −45°, elbow −90°.

Artifacts:

- `neutral-openai.png`, `neutral-gemini.png`
- `joint-stress-openai.png`, `joint-stress-gemini.png`
- `outputs/folk-provider-benchmark/stage-2c4/{provider}/production-{neutral,reach,elbow-45,elbow-90}.png`

The joint-stress images use the production renderer's debug skeleton overlay. They are diagnostics, not final presentation frames.

## 12. One-second MP4 results

`07-video.ts` rendered 24 frames at 640×360, 24 FPS, through the same production renderer, then encoded with local FFmpeg. FFprobe and a full decode were run.

| Provider | Video                                                                  | Frames |  FPS | Duration | Full decode | SHA-256     |
| -------- | ---------------------------------------------------------------------- | -----: | ---: | -------: | ----------- | ----------- |
| OpenAI   | `outputs/folk-provider-benchmark/stage-2c4/openai/articulation-1s.mp4` |     24 | 24/1 |  1.000 s | PASS        | `b010cc68…` |
| Gemini   | `outputs/folk-provider-benchmark/stage-2c4/gemini/articulation-1s.mp4` |     24 | 24/1 |  1.000 s | PASS        | `e3e1cb29…` |

No AI video generation was used.

## 13. Artwork-related blockers

- The precision mask editor (brush/erase/undo/redo, interactive review) is still not implemented. Stage 2C.4 deliberately kept it out of the critical path.
- Hands are baked into the paid forearms. The old `handOpen`/`handGrip` parts are transparent in the technical pack to avoid duplicate hands.
- The old near dhoti, near elbow cover and near foot are hidden because the paid thigh, forearm and shin already contain those regions.
- The OpenAI arm preserves the floral sleeve and cuff. The Gemini arm preserves the Gemini palette and geometric language, but it does not read as the same decorative family as the OpenAI arm.
- The leg replacements load and render, but no separate leg-only articulation diagnostic was produced.
- No matched old-vs-new neutral reconstruction IoU was computed in this phase. No numerical artistic improvement is claimed.
- Every candidate remains `reviewStatus: technical-test-only`; artistic approval is not granted.

Details: `docs/benchmarks/phase-05.1/stage-2c4/VISUAL_LIMITATIONS.md`.

## 14. Process cleanup evidence

The parent supervisor self-test started a child and a grandchild that never exit:

- `logs/test0.stdout.log` records both PIDs.
- `logs/test0.stderr.log` records the 2,500 ms wall-clock timeout, SIGTERM and final timeout status.
- `logs/test0.result.json` records `timedOut: true`.
- Both PIDs were absent after termination.

No Chromium, FFmpeg or renderer process from Stage 2C.4 remained after the test run. Two prior Playwright Chromium orphan groups from earlier attempts (PGIDs 4098 and 42941) were found and terminated with SIGTERM; a follow-up scan returned no matches. No unrelated server was killed. See `logs/orphan-cleanup.log`.

## 15. New regression tests

`apps/web/lib/folk/stage2c4-runtime.test.ts`:

1. canvas, not context, supplies `toDataURL`;
2. Chromium is closed and `process.exit(1)` is present on failure;
3. the supervisor uses a detached process group and SIGKILL fallback.

The test is a focused guard for the exact failure and cleanup behavior. The live one-frame legacy run is the behavioral regression proof.

## 16. Existing test results

| Command             | Result                          |
| ------------------- | ------------------------------- |
| `pnpm format:check` | PASS                            |
| `pnpm lint`         | PASS, zero warnings             |
| `pnpm typecheck`    | PASS                            |
| `pnpm test`         | PASS — **361 tests / 55 files** |
| `pnpm build`        | PASS                            |
| `pnpm test:browser` | PASS — **59 tests**             |
| Paid calls in tests | **0**                           |

The browser suite initially could not start because the Stage 2C.2 diagnostic `next dev` server was still running. That server was stopped, the suite was rerun, and all 59 tests passed. Screenshot files regenerated by the browser suite were restored to their committed state.

## 17. Actual created artifacts

Tracked Stage 2C.4 evidence:

- `docs/benchmarks/phase-05.1/stage-2c4/STARTUP_TRACE.md`
- `CONFIRMED_ROOT_CAUSE.md`
- `RUNTIME_FIX.md`
- `ARTWORK_INTEGRATION.md`
- `VISUAL_LIMITATIONS.md`
- `COST_ACCOUNTING.md`
- `EXECUTION_MATRIX.md` / `.json`
- `single-sprite-openai.png`
- `neutral-openai.png`, `neutral-gemini.png`
- `joint-stress-openai.png`, `joint-stress-gemini.png`
- `articulation-openai.png`, `articulation-gemini.png`
- `comparison-contact-sheet.png`
- `logs/` and `smoke/`

Git-ignored runtime artifacts:

- `outputs/folk-provider-benchmark/stage-2c4/{provider}/masks/`
- `outputs/folk-provider-benchmark/stage-2c4/{provider}/parts/`
- `outputs/folk-provider-benchmark/stage-2c4/{provider}/production-*.png`
- `outputs/folk-provider-benchmark/stage-2c4/{provider}/video-frames/`
- `outputs/folk-provider-benchmark/stage-2c4/{provider}/articulation-1s.mp4`
- `outputs/folk-provider-benchmark/stage-2c4/legacy/`
- `outputs/folk-provider-benchmark/stage-2c4/openai/single-sprite-frame.png`

No Stage 2C.2 source file was overwritten.

## 18. Additional API cost

**$0.00.**

- OpenAI calls: 0
- Gemini calls: 0
- Authorizations activated: 0
- Images generated: 0
- AI video generated: 0

Stage 2C.2 usage-derived cost remains $0.189908 combined (OpenAI $0.085175; Gemini $0.104733). It is not a provider invoice.

## 19. Full commit hashes

| Purpose                                                | Commit                           |
| ------------------------------------------------------ | -------------------------------- |
| Starting point                                         | `4683bcf`                        |
| Fix renderer stall and add supervisor/regression guard | `536a31e`                        |
| Add seven-test Stage 2C.4 recovery harness             | `d85cf8d`                        |
| Record Stage 2C.4 evidence                             | `bc730ce`                        |
| This report                                            | final report commit (final HEAD) |

## 20. Final HEAD and working-tree status

The final HEAD is the commit containing this report. The working tree must be clean after that commit. No push was performed.

## 21. Recommendation

**GO for offline artwork integration work; NO-GO for additional paid generation.**

Gate A–H:

| Gate                                 | Result |
| ------------------------------------ | ------ |
| A. Process observability             | PASS   |
| B. Root-cause isolation              | PASS   |
| C. Repair                            | PASS   |
| D. Decode and extraction             | PASS   |
| E. Production single-frame renderer  | PASS   |
| F. Articulated paid arm in two poses | PASS   |
| G. 24-frame verified MP4             | PASS   |
| H. Zero paid calls                   | PASS   |

Next milestone: implement the persistent precision mask editor, then review the paid arm/leg candidates artistically and rebuild a versioned 31-part pack. Do not spend the remaining Stage 2C authorization balances until the mask editor and visual review are complete.
