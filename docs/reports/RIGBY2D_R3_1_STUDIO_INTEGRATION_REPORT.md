# Fableon — Rigby2D R3.1 Studio Integration Report

**Stage:** R3.1 — First Production Integration: Rigby2D Character Runtime Inside Fableon Studio
**Date:** 2026-11-13
**Starting Fableon HEAD:** `d56811700470921f0f56e0d633a10b8bce84855b`
**Rigby2D:** `0.5.1`, commit `307f7bf00d086a776b4a3c88c6fcca6fab97c531`, vendored under `vendor/rigby2d/`
**Mode:** local-only integration; no hosted deployment
**Additional paid API calls:** 0
**New image generation:** none
**Legacy rig removal:** none
**Push:** none

---

# Final verdict

# R3.1 PASS

Rigby2D is genuinely integrated into the Fableon backend and Studio. The R2.2 `.rigby` character is imported as a versioned, immutable asset; the Studio page imports, inspects, validates, renders, plays and scrubs real Rigby2D frames; joint flexion is measured from actual `sample_pose` world joints; and Fableon composited a 1920×1080, 24 fps H.264 shot from actual Rigby2D frames with Fableon-controlled placement. A second actor position proves placement is controlled by Fableon, not baked into the asset.

## Acceptance gates

| Gate                     | Status   | Evidence                                                                                                                                                                                                          |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — MCP integration      | **PASS** | Backend spawns the pinned vendored MCP server, completes `2025-06-18` handshake, discovers 42 tools, allowlists six, and records traces. `mcp-handshake.json`, `mcp-client.test.ts`                               |
| B — Character import     | **PASS** | R2.2 source imported as `artisan-arm-r22` version `v1`, SHA-256 `20752d5b…`, 23 bones / 29 slots / 4 IK / 4 animations, validation valid. `character-manifest.json`, `character-version.json`, `import.json`      |
| C — Studio preview       | **PASS** | `/studio/folk/rigby2d` imports, validates, renders 73 real frames, plays, pauses and scrubs; reload shows saved assets/jobs. Browser test passes. `studio-preview.png`, `studio-pose.png`, `studio-real-data.png` |
| D — Pose integrity       | **PASS** | R2.1 measures 149.25° / 119.19° / 90.67°; 30/60 fail, 90 passes. R2.2 measures 32.03° / 61.24° / 90.73°; all pass at ±3°. `ik-regression.json`, pose tests                                                        |
| E — Coordinate stability | **PASS** | Frame pivot `0.5012, 1.0473` and origin `211.005, 1017.976` are constant; root is `(0,0)`; bounds are identical at frames 0/36/72; placement draw position is constant. `frame-origin-diagnostics.json`           |
| F — Fableon composition  | **PASS** | Minimal Fableon shot config owns camera, background, actor position/scale and clip start; both 960,1040 and 620,1030 placements render. `shot-config.json`, `shot-config-offset.json`                             |
| G — MP4 export           | **PASS** | 73 frames, 1920×1080, 24 fps, H.264, 3.041667 s; FFprobe frame count and full decode pass; two shots. `shot-main.mp4`, `shot-offset.mp4`                                                                          |
| H — Safety               | **PASS** | 0 provider calls, 0 new generations, no legacy rig deletion, no Little Bird renderer change; full 61-test browser suite passes including Phase 4/5. `logs/`, `SPEND` record in R2.2                               |

---

## 1. Starting state and scope

| Item                         | Verified                                                           |
| ---------------------------- | ------------------------------------------------------------------ |
| Starting HEAD                | `d56811700470921f0f56e0d633a10b8bce84855b`                         |
| Starting worktree            | clean                                                              |
| Rigby2D source               | vendored at `vendor/rigby2d/`, commit `307f7bf…`, version `0.5.1`  |
| Vendor source hash           | `447614838e529dac148f311ce54a59346895689ed9adfad88c7339ab17021458` |
| Paid API calls               | 0                                                                  |
| New image generation         | 0                                                                  |
| Legacy rig removal           | none                                                               |
| Little Bird renderer changes | none                                                               |
| Hosted deployment            | none                                                               |
| Push                         | none                                                               |

The stage adds one character integration, one Studio workspace, one minimal Fableon shot compositor, and tests. It does not migrate every Fableon character, does not replace the existing folk rig, and does not remove any legacy page.

## 2. Architecture

### 2.1 Runtime boundary

```text
Fableon Studio
  ├─ /studio/folk/rigby2d            import · inspect · validate · render · preview · pose
  ├─ /studio/folk/rigby2d/render     Fableon shot page (canvas + FFmpeg source)
  └─ /api/studio/folk/rigby2d/*      narrow JSON/PNG API

Fableon backend
  ├─ Rigby2DCharacterRuntime         inspect · validate · samplePose · renderAnimation · getFrame · release
  ├─ Rigby2DMcpClient                ephemeral stdio JSON-RPC process per job
  ├─ asset store                     immutable versioned .rigby sources
  ├─ frame cache                     content-addressed PNG sequences + pivot metadata
  └─ render jobs                     queued/rendering/completed/failed/cancelled

Rigby2D
  └─ vendor/rigby2d/src/mcp/server.js  pinned 0.5.1, restricted --root workspace
```

Fableon owns the timeline, shot, camera, background, actor placement and FFmpeg encode. Rigby2D owns character evaluation and frame rasterization. No skeletal math, IK, mesh deformation or weight painting was reimplemented in Fableon.

### 2.2 MCP process manager

`apps/web/lib/rigby2d/mcp-client.ts` implements:

- pinned source verification: `PINNED_COMMIT`, `package.json` version `0.5.1`, and `SOURCE_SHA256`;
- a new ephemeral MCP process per job over newline-delimited stdio JSON-RPC;
- restricted `--root` workspace containing only the copied `.rigby`;
- `initialize` / `tools/list` handshake and tool schema discovery;
- allowlist: `inspect_project`, `validate_project`, `describe_rig`, `describe_animation`, `sample_pose`, `export_sprite_sheet`;
- per-request timeout and SIGTERM/SIGKILL of the process group;
- guaranteed stdin close, pending-request rejection, workspace removal and stderr capture;
- cancellation via `AbortSignal`;
- stable error codes (`MCP_TIMEOUT`, `MCP_CANCELLED`, `MCP_TOOL_FAILED`, `MCP_TOOL_NOT_ALLOWED`, `MCP_TOOL_SCHEMA_INVALID`, `MCP_PROCESS_EXITED`, `INVALID_PROJECT`, `FRAME_ORIGIN_UNSTABLE`, etc.).

`run_script` is not allowed. The browser cannot name an arbitrary MCP tool or filesystem path.

### 2.3 Asset store

```text
.fableon-data/rigby2d/
  characters/<characterId>/
    manifest.json
    versions/v1/character.rigby
    versions/v1/version.json
    validations/<versionId>-<timestamp>.json
    frame-exports/<cacheKey>.json
  cache/frames/<content-key>/
    meta.json
    frames/0000.png … 0072.png
  renders/<renderId>.json
  jobs/<ephemeral job>/
```

The `.rigby` source is written to a new version directory with `mkdir(..., { recursive: false })` and never overwritten. Imports are idempotent by SHA-256; a different hash creates `v2`, `v3`, etc. The manifest records character ID, name, runtime, runtime version/commit, source attribution, review status, timestamps, current version and version summaries. Each completed render also writes a per-character `frame-exports/<cacheKey>.json` record with frame count, canvas, pivot, origin, fps, scale, source hash and MCP evidence. Path traversal is blocked by ID validation and `assertInside`.

## 3. Imported character

**Source:** `outputs/rigby2d-r2/r2-2/rig/artisan-arm-pilot.rigby`

| Field                 | Value                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| Character ID          | `artisan-arm-r22`                                                                                      |
| Version               | `v1`                                                                                                   |
| Source SHA-256        | `20752d5bd25008fa138686f7ba9ae0ba326ac70d113d6e17a84b967b39c4de4c`                                     |
| Imported SHA-256      | same                                                                                                   |
| Runtime               | `rigby2d` `0.5.1` @ `307f7bf…`                                                                         |
| Bones / slots / skins | 23 / 29 / 1                                                                                            |
| IK constraints        | 4                                                                                                      |
| Images                | 29                                                                                                     |
| Animations            | `arm_angles` (1.5 s), `arm_showcase` (3 s), `arm_angles_ikfix` (1.5 s), `showcase_ikfix` (3 s)         |
| Validation            | `valid: true`; structure/images/jsonRoundTrip/binaryExport all `ok`                                    |
| Review status         | `approved_arm_motion_only` — approved only for the tested arm motion, not full-body story production   |
| Attribution           | R2.2 corrected continuous-arm pilot; OpenAI-generated artwork; Rigby2D native AutoRig; arm motion only |

The 22-vertex AutoRig candidate was imported. The rejected cuff-weight variants and the 85-vertex experimental mesh were **not** imported as production candidates. The R2.1 project is present only as `artisan-arm-r21`, marked `experimental_unreviewed`, for the historical angle regression.

Evidence: `character-manifest.json`, `character-version.json`, `import.json`, `inspect.json`, `validation.json`, `character-frame-export.json`, `source-hashes.json`.

## 4. MCP evidence

| Item                   | Value                                                     |
| ---------------------- | --------------------------------------------------------- |
| Protocol               | `2025-06-18`                                              |
| Server                 | `rigby2d` `0.5.1`                                         |
| Discovered tools       | 42                                                        |
| Allowlisted tools      | 6                                                         |
| Import handshake       | 90 ms                                                     |
| `tools/list`           | 1 ms                                                      |
| Import MCP elapsed     | 123 ms                                                    |
| Import peak RSS        | 64,496 KB                                                 |
| Validation MCP elapsed | 110 ms                                                    |
| Validation checks      | structure, images, jsonRoundTrip, binaryExport — all `ok` |

The recorded trace includes `initialize`, `tools/list`, and the three import calls (`inspect_project`, `describe_rig`, `validate_project`). Stderr is captured in `mcp-handshake.json`.

## 5. Pose integrity and regression guard

`apps/web/lib/rigby2d/pose.ts` measures flexion from three sampled world joints:

- 0° = straight;
- 90° = right angle;
- 180° = folded;
- flexion = angle between `(B − A)` and `(C − B)`.

The measurement records bend side (cross-product sign), upper/lower bone lengths, animation, time, requested angle, measured angle, delta and tolerance. It uses the actual `sample_pose` output from the saved Rigby2D animation — never animation names, key labels or target offsets.

| Character | Animation          | Time | Requested |    Measured | Result               |
| --------- | ------------------ | ---: | --------: | ----------: | -------------------- |
| R2.1      | `arm_angles`       | 0.25 |       30° | **149.25°** | **FAIL** (over-fold) |
| R2.1      | `arm_angles`       | 0.50 |       60° | **119.19°** | **FAIL** (over-fold) |
| R2.1      | `arm_angles`       | 0.75 |       90° |  **90.67°** | **PASS**             |
| R2.2      | `arm_angles_ikfix` | 0.25 |       30° |  **32.03°** | **PASS**             |
| R2.2      | `arm_angles_ikfix` | 0.50 |       60° |  **61.24°** | **PASS**             |
| R2.2      | `arm_angles_ikfix` | 0.75 |       90° |  **90.73°** | **PASS**             |

Tolerance was 3°. Bend side is `-1` for every tested pose; IK target `ik_hand_r` is recorded at `(108.178, 472.344)` for the 90° R2.2 pose. The Studio page exposes a “Measure actual flexion” panel with the same result and a PASS/FAIL badge.

Evidence: `ik-regression.json`, `validation.json`, `studio-pose.png`, `runtime.test.ts`, `pose.test.ts`.

## 6. Coordinate integration

Rigby2D’s `export_sprite_sheet(format: "json", trim: false, dedupe: false)` was used for pivot metadata; `format: "frames"` produced the PNGs at the same fps and scale.

| Field                  |                      Value |
| ---------------------- | -------------------------: |
| Frame canvas           |                  421 × 972 |
| Pivot                  |           `0.5012, 1.0473` |
| Origin in frame pixels |      `211.0052, 1017.9756` |
| Frames                 |                         73 |
| FPS                    |                         24 |
| Clip start             |                          0 |
| Actor anchor (main)    | `(960, 1040)`, scale `0.9` |
| Actor anchor (offset)  | `(620, 1030)`, scale `0.8` |

Placement is computed from the **skeleton-origin pivot**, not by centering each cropped PNG:

```text
originX = pivot.x × frameWidth
originY = pivot.y × frameHeight
scale   = actor.scale × camera.zoom
anchor  = worldToScreen(camera, viewport, actor.position)
drawX   = anchor.x − originX × scale
drawY   = anchor.y − originY × scale
```

Diagnostics at frames 0, 36 and 72:

- pivot: identical;
- origin: identical;
- root bone: `(0, 0)` at all three frames;
- bounds: `minX -208, minY 48, maxX 208, maxY 1015` at all three frames;
- draw position: `770.095, 123.822`, size `378.900 × 874.800` at all three frames;
- `pivotStable: true`, `placementStable: true`.

There is no per-frame centering and no crop-induced jump. The Fableon shot page supports a clip start frame; the shipped test shots use start frame 0.

Evidence: `frame-origin-diagnostics.json`, `frame-export.json`, `placement.test.ts`, `runtime.test.ts`.

## 7. Studio integration

Route: `/studio/folk/rigby2d` (also linked from the Studio header and the Folk Studio page).

The page supports:

1. importing an existing `.rigby` file;
2. viewing character counts, bones, slots, animations, review status and source attribution;
3. running Rigby2D validation;
4. selecting an animation;
5. requesting real Rigby2D frame rendering at a chosen FPS/export scale;
6. previewing actual Rigby2D frames;
7. play/pause;
8. scrubbing;
9. reading duration, FPS, frame canvas, pivot and cache key;
10. opening frame metadata, the source `.rigby`, and the validation/export details.

It also exposes Fableon-controlled actor X/Y/scale, loading states, failure states, cancellation and completed states. Saved characters and render jobs are loaded on mount, so a reload shows the previous imports and renders.

Browser test: `tests/browser/rigby2d.spec.ts` imports the real R2.2 fixture, validates it, renders 73 frames, plays/pauses, scrubs to frame 12, measures 90.73° flexion with PASS, screenshots, reloads and confirms the saved job is still present. Time: ~50 s.

Screenshots: `studio-preview.png`, `studio-pose.png`, `studio-real-data.png`.

## 8. Fableon-composited shots

Two shots were produced from the same actual Rigby2D frame sequence:

| Shot              | Actor position | Scale | Frames | Resolution | FPS |   Duration |   Bytes | SHA-256                                                            |
| ----------------- | -------------- | ----: | -----: | ---------- | --: | ---------: | ------: | ------------------------------------------------------------------ |
| `shot-main.mp4`   | `(960, 1040)`  |   0.9 |     73 | 1920×1080  |  24 | 3.041667 s | 160,577 | `d1a31c4649a3208f72dc18ffcbb27d0912dd1172a1adeb9a767cc96d5b9be62a` |
| `shot-offset.mp4` | `(620, 1030)`  |   0.8 |     73 | 1920×1080  |  24 | 3.041667 s | 146,806 | `8eff504fd3a4cc0ace12fd32dcb6bae7c771d8de09daf5f6c25f0e101036be2c` |

Both are H.264, have no audio, and passed FFprobe frame-count, resolution, codec and duration checks plus a full decode. The shot page uses Fableon camera placement (`worldToScreen`), a neutral Fableon stage background, Fableon actor position/scale and fixed frame-index sampling. It is a dedicated minimal R3.1 test shot, not a rewrite of the existing Phase 4 film composer.

Contact sheets: `contact-sheet.png`, `contact-sheet-offset.png`. Shot manifests: `shot-manifest.json`, `shot-manifest-offset.json`. Shot configs: `shot-config.json`, `shot-config-offset.json`. Raw frame transparency is preserved (`421×972` RGBA, alpha min 0 / max 255; `transparency.json`); the MP4 is intentionally composited over the opaque neutral stage.

## 9. Cache and measured performance

| Metric                      |                                                              Value |
| --------------------------- | -----------------------------------------------------------------: |
| Frame cache key             | `b7b17b17e55d3db6abd5b0ba88e5dd669f0f661f3806ff2e26681b63221274c4` |
| Frames                      |                                                                 73 |
| Cache size                  |                                                   30,156,787 bytes |
| Cold frame export           |                                                           20.578 s |
| — frames pass               |                                                           11.162 s |
| — metadata pass             |                                                            9.049 s |
| MCP process elapsed         |                                                           20.500 s |
| Peak MCP RSS                |                                                         488,848 KB |
| Composed frame loop, main   |                                                            2.634 s |
| Composed frame loop, offset |                                                            2.414 s |
| Median composed frame       |                                   34.7 ms (main), 32.0 ms (offset) |
| FFmpeg output               |                                            160,577 / 146,806 bytes |
| Cached repeat               |                                          immediate; `cached: true` |

The frame cache is keyed by character SHA-256, Rigby2D commit, animation, fps and scale. A cache lock and atomic temp-directory rename prevent incomplete entries from being treated as successful. Subsequent renders reuse the sequence; the second shot reused it.

**Resource note:** the 488 MB peak is dominated by the one-off JSON metadata sheet export at scale 1. The PNG sequence itself is 30 MB. A future upstream `export_sprite_sheet` metadata-only option, or a lower-scale metadata pass with exact pivot verification, would reduce this substantially.

## 10. Tests and repository checks

| Check               | Result                          | Log                     |
| ------------------- | ------------------------------- | ----------------------- |
| `pnpm format:check` | **PASS**                        | `logs/format-check.log` |
| `pnpm lint`         | **PASS**                        | `logs/lint.log`         |
| `pnpm typecheck`    | **PASS**                        | `logs/typecheck.log`    |
| `pnpm test`         | **403 / 403 tests, 63 files**   | `logs/unit-test.log`    |
| `pnpm build`        | **PASS**; all routes registered | `logs/build.log`        |
| `pnpm test:browser` | **61 / 61 tests**               | `logs/browser-test.log` |

Targeted coverage includes:

- `.rigby` signature/validation rejection;
- immutable/idempotent asset import and traversal rejection;
- MCP handshake, tool discovery, allowlist, schema validation, path escape and timeout cleanup;
- real `sample_pose` joint measurements;
- R2.1 149/119 failure and 90 pass;
- R2.2 32/61/91 pass;
- frame origin stabilization and placement math;
- content-addressed frame cache identity and frame count;
- per-character frame-export metadata record;
- actual Studio import/render/play/scrub/reload browser flow;
- FFprobe and full-decode verification inside the shot script.

The full browser suite includes the preserved Little Bird/Phase 4/Phase 5 routes and renders; all passed.

## 11. Code changes and commits

**New code and assets**

| Area             | Files                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Vendored runtime | `vendor/rigby2d/` (pinned source, licenses, pin, source hash)                                                                 |
| Runtime library  | `apps/web/lib/rigby2d/{constants,errors,mcp-client,storage,assets,frames,jobs,pose,placement,runtime,shot,view-types,api}.ts` |
| Studio API       | `apps/web/app/api/studio/folk/rigby2d/**`                                                                                     |
| Studio page      | `apps/web/app/studio/folk/rigby2d/page.tsx`, `apps/web/components/studio/rigby2d-studio.tsx`                                  |
| Shot page        | `apps/web/app/studio/folk/rigby2d/render/page.tsx`, `apps/web/components/studio/rigby2d-shot-surface.tsx`                     |
| Scripts          | `scripts/render-rigby2d-shot.mjs`, `scripts/rigby2d-r3-1-benchmark.ts`                                                        |
| Tests / fixtures | `apps/web/lib/rigby2d/*.test.ts`, `tests/browser/rigby2d.spec.ts`, `tests/fixtures/rigby2d/*.rigby`                           |
| Navigation       | Studio header and Folk Studio links                                                                                           |
| Tooling          | `eslint.config.mjs` ignores vendor; `.prettierignore` ignores vendor, outputs, local data and test results                    |

**Not changed:** Little Bird renderer, legacy folk rig files, provider service, authorization/cost ledger, `packages/composition-core`, `packages/camera-engine`, `packages/animation-core`, historical assets.

**Local commits**

| Commit        | Subject                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `8df732a`     | `feat(rigby2d): vendor pinned runtime and add character runtime adapter` |
| `6cd7e6a`     | `feat(studio): add Rigby2D runtime workspace, APIs and shot export`      |
| `7b9f196`     | `feat(rigby2d): support Fableon clip start in test shots`                |
| `612a225`     | `feat(rigby2d): record per-character frame exports and clean stale jobs` |
| `76ad343`     | `fix(rigby2d): include the runtime commit in frame cache identity`       |
| report commit | This report (final HEAD; see completion response)                        |

No push was performed.

## 12. Remaining limitations

1. **Local-only.** The Studio page and runtime are not deployed or authenticated for a hosted environment.
2. **One character.** The asset library supports multiple imports, but only the R2.2 arm is approved for this integration. R2.1 is a regression fixture; no other Fableon character was migrated.
3. **Baked frames, not an atlas runtime.** Fableon consumes `export_sprite_sheet` PNGs and pivot metadata. It does not yet run a PixiJS/Rigby2D skeletal runtime or pack a texture atlas.
4. **Static test-shot camera.** The Fableon shot uses a static camera and neutral background. Camera moves, shot transitions, titles and audio are existing Fableon responsibilities and are not exercised here.
5. **Metadata export memory.** The one-off JSON metadata sheet drove a 488 MB peak. The PNG sequence is 30 MB. A metadata-only upstream tool is the recommended optimization.
6. **Clip trim UI.** The shot config supports a clip start frame; the Studio preview plays the full rendered clip. A per-shot trim UI is R3.2 work.
7. **R2.2 cuff caveat.** The imported arm is approved only for the tested arm motion. The 90° cuff compression documented in R2.2 remains an artwork limitation; it is not a runtime failure.
8. **Cache retention.** There is no age-based cache eviction yet. Character sources are immutable and never garbage-collected; frame caches and render records are retained for review.
9. **No hosted concurrency.** The in-process job registry assumes a single Next process; multi-instance hosting needs a shared job supervisor.

## 13. Recommended next stage

**R3.2 — Character library and production shot workflow** (not started):

- asset library/list with version selection and review status;
- clip trim/start-duration UI tied to the existing Fableon timeline;
- integration with the existing `composition-core` shot/composer path rather than the dedicated R3.1 test shot;
- cache retention and cleanup policy;
- metadata-only MCP export or lower-memory metadata path;
- optional atlas/skeletal runtime for interactive preview;
- hosted auth and multi-process job supervision if deployment is pursued.

Do **not** begin R4/R5, full-character generation, or new provider spending on the strength of this arm-only integration.

---

## Final decision

# R3.1 PASS

The backend genuinely communicates with the pinned Rigby2D MCP server; the R2.2 character is imported as a versioned immutable asset; the Studio page renders, plays and scrubs real Rigby2D frames; the pose validator catches the historical R2.1 over-folds and passes the corrected R2.2 poses; coordinate placement is stable; and Fableon-composited 1920×1080 H.264 shots export and fully decode. The remaining work is production breadth (library, auth, cache policy, composer integration), not a blocker to this integration proof.
