# Stage 2C.4 — Runtime Fix

## 1. Correct canvas data URL

`scripts/stage2c2-render.ts` now uses the canvas element:

```ts
return document.getElementById("c").toDataURL("image/png");
```

The 2D context is used only for drawing.

## 2. Guaranteed browser cleanup

The legacy script now tracks the active browser:

```ts
let activeBrowser: Browser | null = null;
```

- assigned immediately after `chromium.launch()`
- cleared after `browser.close()`
- closed in the error path before `process.exit(1)`

The error path now calls `process.exit(1)`, not `process.exitCode = 1`.

## 3. Bounded page and process behavior

The legacy script adds:

- `page.setDefaultTimeout(15000)`
- `pageerror` logging
- console-error logging
- one-frame cap through `STAGE2C4_MAX_FRAMES` for diagnosis
- output redirection through `STAGE2C4_LEGACY_STAGE` and `STAGE2C4_LEGACY_DOCS`
- synchronous trace lines at every preparation/render boundary

## 4. Parent supervisor

`scripts/stage2c4/supervise.mjs` runs each test with:

- a separate child process group (`detached: true`)
- captured stdout and stderr
- a wall-clock deadline enforced by the parent
- `SIGTERM` to the whole process group
- `SIGKILL` fallback after 2 seconds
- an explicit result JSON containing PID, timeout, exit code, signal and elapsed time

The self-test (`test0`) starts a child and grandchild that never exit. The supervisor terminates both. No orphan remained.

## 5. Seven independent smoke paths

| Test | Entry point                 | Purpose                                             |
| ---- | --------------------------- | --------------------------------------------------- |
| 1    | `01-startup.mjs`            | minimal Node startup                                |
| 2    | `02-imports.ts`             | Sharp, Playwright, folk-motion, production renderer |
| 3    | `03-decode.ts`              | decode paid OpenAI PNG and Gemini JPEG/PNG          |
| 4    | `04-extract.ts`             | persist and reload extraction masks                 |
| 5    | `05-sprite.ts`              | render one extracted sprite                         |
| 6    | `06-production-assembly.ts` | production `FolkRenderer` neutral/reach/elbow poses |
| 7    | `07-video.ts`               | 24-frame 640×360 H.264 MP4                          |

`run-smoke.mjs` runs them in order and writes `EXECUTION_MATRIX.json` / `.md`.

## 6. Legacy verification

The fixed legacy script ran with `STAGE2C4_MAX_FRAMES=1`:

- exit code **0**
- elapsed **5687 ms**
- trace ends at `main-done`
- both providers reach `browser-closed`
- one-frame MP4s exist under `outputs/folk-provider-benchmark/stage-2c4/legacy/`

This verifies the original first-frame operation no longer throws. It does not claim the legacy 120-frame geometry is visually valid.

## 7. Regression coverage

`apps/web/lib/folk/stage2c4-runtime.test.ts` guards:

- canvas, not context, supplies `toDataURL`
- Chromium is closed and `process.exit(1)` is present on failure
- the supervisor uses a detached process group and SIGKILL fallback
