# Stage 2C.4 — Confirmed Root Cause

## Conclusion

The stalled prepare/render process was **not** blocked in Sharp, FFmpeg, Chromium startup or image decoding. It failed on the first `page.evaluate` because the browser-side function called `toDataURL()` on a `CanvasRenderingContext2D` instead of the `<canvas>` element.

## Reproduced failing operation

The original Stage 2C.2 script was recovered from `HEAD` (`4683bcf`), with only its output directories redirected, and run under the Stage 2C.4 supervisor with a 15-second wall clock.

Command:

```bash
node scripts/stage2c4/supervise.mjs --timeout 15000 \
  --stdout .../original-failure.stdout.log \
  --stderr .../original-failure.stderr.log \
  --result .../original-failure.result.json \
  -- ./node_modules/.bin/tsx scripts/stage2c2-render-original.ts
```

Exact captured error (`logs/original-failure.stderr.log`):

```text
page.evaluate: TypeError: c.toDataURL is not a function
    at draw (<anonymous>:1:4119131)
    at window.render (<anonymous>:1:4119174)
    at eval (eval at evaluate (:370:30), <anonymous>:1:11)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
    at main (.../scripts/stage2c2-render-original.ts:236:28)
```

The exact failing source is:

```ts
const c = document.getElementById("c").getContext("2d");
// ...
return c.toDataURL("image/png"); // c is the 2D context
```

The correct expression is:

```ts
return document.getElementById("c").toDataURL("image/png");
```

## Why the process hung after the error

The error propagated to `main().catch(...)`, which only did:

```ts
console.error(...);
process.exitCode = 1;
```

The Playwright browser was not closed on the error path. Chromium's open connection keeps the Node event loop alive, so `process.exitCode = 1` cannot terminate the process. The parent command eventually reached its outer 900-second shell timeout.

The external timeout is **not** the root cause. The first failing operation is the `toDataURL` call; the unbounded lifetime is the missing error-path browser cleanup.

## Why there were no useful logs

Two independent diagnostic defects made the first failure invisible:

1. The original script had no stage logging before the frame loop. Its only output was the final report after both providers completed.
2. The Stage 2C.4 `perl` supervisor invocation passed `60` into `@ARGV`, so `exec @ARGV` tried to execute a file named `60`; it exited `0` and wrote nothing. See `logs/perl-supervisor-bug.log`.

The shell pipeline also used `| tail -30`, which buffers until the long-lived process exits. That is why a visible error was not flushed to the terminal during the stall.

## Why the Stage 2C.3 retry did not fix it

`HEAD` at the start of Stage 2C.4 (`4683bcf`) still contains the original `process.exitCode = 1` path, no page-error listener, no `activeBrowser` cleanup and no `page.setDefaultTimeout`. The Stage 2C.3 working-tree change was not present in the commit. A retry could therefore reproduce the same first-frame exception and the same live Chromium connection.

## Evidence

- `logs/original-failure.stderr.log` — exact exception and first frame
- `logs/original-failure.result.json` — `timedOut: true`, 15065 ms
- `logs/perl-supervisor-bug.log` — malformed supervisor, exit 0, zero output
- `logs/legacy-one-frame.trace.log` — same legacy path after fix, complete to `main-done`
- `logs/legacy-one-frame.result.json` — exit 0 in 5687 ms
