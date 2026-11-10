# Stage 2C.4 — Startup Trace

## Environment

| Item                  | Actual                                                  |
| --------------------- | ------------------------------------------------------- |
| Platform              | macOS `darwin arm64`                                    |
| Node                  | `v25.9.0`                                               |
| pnpm                  | `11.1.3`                                                |
| tsx                   | `4.23.15`                                               |
| FFmpeg                | `/opt/homebrew/bin/ffmpeg` 8.1.1                        |
| Playwright Chromium   | bundled Chromium 1254 (`chrome-headless-shell`)         |
| Working directory     | `/Users/benediction/Downloads/Web Dev projects/fableon` |
| Stage 2C.4 paid calls | **0**                                                   |

## Why the earlier trace was missing

The Stage 2C.4 diagnostic wrapper was invoked as:

```bash
perl -e 'alarm 60; exec @ARGV' 60 ./node_modules/.bin/tsx scripts/stage2c2-render.ts
```

`60` was passed as the first element of `@ARGV`, so Perl attempted to execute a program named `60` instead of tsx. The command returned `EXIT:0` with zero bytes on stdout and stderr, and no trace file was created. This is reproduced in `logs/perl-supervisor-bug.log`.

The correct form is:

```bash
perl -e 'alarm shift; exec @ARGV' 60 ./node_modules/.bin/tsx scripts/stage2c2-render.ts
```

Stage 2C.4 replaces this with `scripts/stage2c4/supervise.mjs`, a parent-side Node supervisor with an explicit child process group, wall-clock timeout, captured stdio, timeout marker and SIGKILL fallback.

## Checkpoints from the successful smoke run

The full machine-readable record is `EXECUTION_MATRIX.json`. Timings below are measured monotonic durations from the supervisor result files.

| Test                                |                              Last checkpoint | Duration |
| ----------------------------------- | -------------------------------------------: | -------: |
| 0 — supervisor timeout self-test    | `grandchild` starts, then both PIDs are gone |  2521 ms |
| 1 — process startup                 |                               `process-done` |    70 ms |
| 2 — module loading                  |                               `imports-done` |   752 ms |
| 3 — paid image decode               |                            `decode-finished` |   399 ms |
| 4 — persistent mask extraction      |                           `extract-finished` |   856 ms |
| 5 — single sprite                   |                             `browser-closed` |  1110 ms |
| 6 — production articulated assembly |                          `assembly-finished` |  2731 ms |
| 7 — 24-frame MP4                    |                             `video-finished` |  5583 ms |

## Startup sequence observed

The minimal startup test writes a synchronous line before importing any application module:

```text
process-start
pid 17413 ppid 17406
cwd /Users/benediction/Downloads/Web Dev projects/fableon
node v25.9.0 darwin arm64
process-done
```

The module test then imports each boundary separately:

```text
sharp-start → sharp-done
playwright-start → playwright-done
folk-motion-start → folk-motion-done
renderer-start → renderer-done
decode-smoke-done 1536x1024
```

No application server starts during these imports. The production renderer is bundled once with Vite and loaded into a blank Playwright page for the assembly and video tests.

## Original failing checkpoint

The original script reached the first `page.evaluate` and failed there. The captured reproduction is in `logs/original-failure.stderr.log`; the timeout and process cleanup are in `logs/original-failure.result.json`.

## Logs directory

- `logs/test0.*` — timeout supervisor self-test
- `logs/test1.*` — process startup
- `logs/test2.*` — module loading
- `logs/test3.*` — paid-image decode
- `logs/test4.*` — extraction
- `logs/test5.*` — single sprite
- `logs/test6.*` — production articulated assembly
- `logs/test7.*` — MP4 export
- `logs/original-failure.*` — exact original failure, followed by controlled termination
- `logs/legacy-one-frame.*` — legacy script after the fix, one frame, clean exit
