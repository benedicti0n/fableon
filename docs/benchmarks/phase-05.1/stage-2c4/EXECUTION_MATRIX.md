# Stage 2C.4 Execution Matrix

| Test                                 | Started                  | Last checkpoint                                                      | Duration | Result   | Evidence                 |
| ------------------------------------ | ------------------------ | -------------------------------------------------------------------- | -------: | -------- | ------------------------ |
| 0. Parent supervisor timeout cleanup | 2026-11-10T23:47:11.276Z | {"parent":17399,"grandchild":17400,"marker":"timeout-child-started"} |  2512 ms | **PASS** | logs/test0.stderr.log    |
| 1. Process startup                   | 2026-11-10T23:47:13.902Z | 2026-11-10T23:47:13.971Z process-done                                |    71 ms | **PASS** | logs/test1.trace.log     |
| 2. Module loading                    | 2026-11-10T23:47:14.043Z | 2026-11-10T23:47:14.935Z imports-done                                |   906 ms | **PASS** | logs/test2.trace.log     |
| 3. Decode paid images                | 2026-11-10T23:47:15.018Z | 2026-11-10T23:47:15.478Z decode-finished                             |   466 ms | **PASS** | smoke/03-decode.json     |
| 4. Extract persistent masks          | 2026-11-10T23:47:15.553Z | 2026-11-10T23:47:16.380Z extract-finished                            |   834 ms | **PASS** | smoke/04-extract.json    |
| 5. Render one sprite                 | 2026-11-10T23:47:16.459Z | 2026-11-10T23:47:17.680Z browser-closed                              |  1228 ms | **PASS** | single-sprite-openai.png |
| 6. Production articulated assembly   | 2026-11-10T23:47:17.757Z | 2026-11-10T23:47:20.907Z assembly-finished                           |  3161 ms | **PASS** | smoke/06-assembly.json   |
| 7. 24-frame MP4                      | 2026-11-10T23:47:20.990Z | 2026-11-10T23:47:26.594Z video-finished                              |  5619 ms | **PASS** | smoke/07-video.json      |

The parent supervisor is `scripts/stage2c4/supervise.mjs`; it records child PID, wall-clock timeout, exit code, signal, stdout and stderr.
The supervisor self-test expects a controlled timeout: the parent and grandchild PIDs must both be gone after SIGTERM.
