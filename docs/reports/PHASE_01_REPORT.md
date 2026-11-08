# Phase 1 Completion Report

- **Phase:** 1 — Scene Schema & Deterministic Timeline
- **Date:** 2026-11-09
- **Branch:** `main`
- **Base commit:** `b06eb43` (`docs(report): record phase 0 completion`)
- **Implementation head before this report:** `9cbe125`
- **Status:** Complete; submitted for architectural review
- **Next phase:** Not started

## A. Executive Summary

Phase 1 delivered the canonical, renderer-independent scene data model and the
deterministic timeline/evaluation core that future engines will consume.

Fableon can now:

- Validate a versioned project document with structured, path-aware errors.
- Serialize and deserialize projects without losing identity, scene order, or
  keyframes.
- Load a realistic four-scene, 48-second bird-in-the-forest fixture.
- Resolve global project frames to half-open scene intervals and local frames.
- Evaluate hold, linear, and cubic ease-in-out transform keyframes with exact
  numerical behavior.
- Produce a pure `FramePlan` containing active scene data and resolved layer
  states in stacking order.
- Inspect the fixture interactively in the real `/studio` route, using the
  production evaluator rather than reimplementing timeline math in React.
- Validate every change through formatting, linting, strict TypeScript, tests,
  and a production build.
- Has a committed GitHub Actions workflow that runs the same gates on Node 24
  LTS (configured locally; not remotely executed).

Phase 1 did not implement painting, rendering, character rigs, camera effects,
AI, audio, databases, or video export. The Studio canvas remains an explicit
placeholder and the inspector is visibly data-only.

All required local checks passed: 66 tests across 9 files, production build, HTTP
runtime checks, and actual headless-Chromium interaction. The CI workflow is
configured but was not executed on GitHub, so it is not reported as passing.

**Recommendation:** GO for Phase 1 acceptance. Phase 2 must not begin without a
new phase prompt.

## B. Initial Repository State

Inspected before implementation:

- Branch `main`, working tree clean, HEAD at Phase 0's final commit `b06eb43`.
- Git reported the local branch in sync with `origin/main` at inspection time.
  No push was performed in Phase 1.
- Existing workspace: pnpm monorepo with `apps/web`, `packages/shared`, strict
  TypeScript, ESLint, Prettier, Vitest, and the Next.js Studio shell.
- Existing tests: 12 passing tests covering the homepage, Studio shell, shared
  pipeline constants, and `cn`.
- Existing documentation read before changes:
  - `docs/ARCHITECTURE.md`
  - `docs/ROADMAP.md`
  - `docs/MVP_SCOPE.md`
  - `docs/DEVELOPMENT_PROTOCOL.md`
  - `docs/reports/PHASE_00_REPORT.md`
- Local environment: Node.js `v25.9.0` (non-LTS), pnpm `11.1.3`, macOS. The
  repository recommends Node 24 LTS via `.nvmrc`; CI uses Node 24.
- No uncommitted user work existed. No existing files were overwritten.

### Documentation conflict identified

`docs/ROADMAP.md` originally listed character, camera, audio, and caption
structures among Phase 1 expected features. The Phase 1 prompt explicitly limits
the schema to project, scene, layer, transform, asset, and animation-track
contracts and forbids speculative systems. This report follows the phase prompt
and records the deferral in sections I and J. The architecture status document
was updated to describe the implemented version-1 scope accurately.

## C. Implemented Features

### Feature 1.1 — Versioned Project & Scene Schema

**Commit:** `f1f1ab4977687f9831ef5b87deb1e7d386ae3c45`  
**Message:** `feat(scene-schema): add versioned project and scene contracts`

**Implementation details**

- Created the renderer-independent `@fableon/scene-schema` package.
- Added Zod `4.6.7` runtime validation with strict objects and discriminated
  unions.
- Defined version-1 project, canvas, asset, scene, layer, transform, keyframe,
  and animation-track schemas.
- Added cross-field validation for duplicate scene/asset/layer IDs, duplicate
  layer stacking order, broken asset references, audio assets used as visual
  layers, and keyframe frames outside a scene.
- Added opacity-specific keyframe range validation and finite-number checks for
  all transform values.
- Added explicit construction helpers for transforms, keyframes, and tracks.
  They validate and reject bad input instead of clamping or repairing it.
- Added `ProjectValidationError` with stable issue paths such as
  `$.scenes[0].layers[1].transform.opacity`.
- Exported inferred TypeScript types for consumers.
- Kept the package free of React, Next.js, DOM, and rendering dependencies.

**Files**

- `packages/scene-schema/package.json`
- `packages/scene-schema/tsconfig.json`
- `packages/scene-schema/src/constants.ts`
- `packages/scene-schema/src/schema.ts`
- `packages/scene-schema/src/validation.ts`
- `packages/scene-schema/src/helpers.ts`
- `packages/scene-schema/src/index.ts`
- `packages/scene-schema/src/schema.test.ts`
- `pnpm-lock.yaml`

**Acceptance criteria**

| Criterion                                   | Result | Evidence                                                 |
| ------------------------------------------- | ------ | -------------------------------------------------------- |
| Valid project documents parse               | PASS   | Canonical valid document parses; inferred types compile  |
| Invalid documents produce actionable errors | PASS   | Structured paths/codes asserted across malformed cases   |
| TypeScript consumers can use exported types | PASS   | `Project` and layer types exercised in tests and web app |
| Tests cover valid and invalid inputs        | PASS   | 14 schema tests                                          |
| No renderer-specific code                   | PASS   | No React, Next.js, DOM, canvas, or renderer imports      |

**Tests added:** 14.

### Feature 1.2 — Project Serialization & Fixtures

**Commit:** `b21e2fbbfe045f2761196a16e286671aedd549f2`  
**Message:** `feat(scene-schema): add validated serialization and sample projects`

**Implementation details**

- Added `serializeProject(project)` with validation before export and stable,
  human-readable two-space JSON plus a final newline.
- Added `deserializeProject(json)` that parses JSON, wraps syntax errors as
  structured `invalid_json` issues, and always validates the document.
- Unknown future schema versions are rejected before Zod parsing with an
  `unsupported_schema_version` issue. No migration or repair occurs.
- Added a canonical four-scene, 1152-frame (48-second) fixture:
  `where-the-light-lands.project.json`.
- The fixture contains five asset references, four scenes, solid/asset/text
  layers, multiple animated transform properties, hold/linear/cubic keyframes,
  scene boundaries, and distinct transforms.
- Added `@fableon/scene-schema/fixtures` as a typed package subpath exporting
  the validated `SAMPLE_PROJECT`.
- The fixture is data only. No referenced image or audio file exists, and no
  renderer or storage layer claims otherwise.

**Files**

- `packages/scene-schema/fixtures/where-the-light-lands.project.json`
- `packages/scene-schema/src/serialize.ts`
- `packages/scene-schema/src/serialize.test.ts`
- `packages/scene-schema/src/fixtures.ts`
- `packages/scene-schema/src/index.ts`
- `packages/scene-schema/package.json`
- `pnpm-lock.yaml`

**Acceptance criteria**

| Criterion                                  | Result | Evidence                                                 |
| ------------------------------------------ | ------ | -------------------------------------------------------- |
| JSON round-trip retains project semantics  | PASS   | Deep equality of full project; scene/keyframe assertions |
| Invalid JSON produces useful import errors | PASS   | `invalid_json` issue with parser message and `$` path    |
| Unknown schema versions are rejected       | PASS   | `unsupported_schema_version` issue; no migration         |
| Example fixtures validate                  | PASS   | `SAMPLE_PROJECT` validated at module load and in tests   |
| Serialization is deterministic             | PASS   | Repeated serialization produces byte-identical JSON      |

**Tests added:** 6.

### Feature 1.3 — Global Timeline & Frame Resolution

**Commit:** `8cc6d01952b7ead53024b4fe887a6ec93b40f715`  
**Message:** `feat(animation-core): implement deterministic scene timeline`

**Implementation details**

- Created the pure `@fableon/animation-core` package depending only on the
  schema package.
- Added `buildTimeline(project)` with half-open scene intervals
  `[startFrame, endFrame)`, total frame calculation, and defensive rejection of
  empty or malformed timelines.
- Added `resolveGlobalFrame(timeline, frame)` returning scene ID, scene name,
  scene index, local frame, and boundary frames.
- Added `resolveProjectFrame(project, frame)` as a convenience wrapper.
- Added `framesToSeconds` and locale-independent `formatTimestamp` formatting
  (`m:ss.sss`).
- Added typed errors:
  - `TimelineError` for malformed/empty timelines.
  - `InvalidFrameError` for negative or non-integer indices.
  - `FrameOutOfRangeError` with frame, limit, and project/scene scope.
- Frozen timeline outputs and validated immutability/determinism.

**Files**

- `packages/animation-core/package.json`
- `packages/animation-core/tsconfig.json`
- `packages/animation-core/src/timeline.ts`
- `packages/animation-core/src/timeline.test.ts`
- `packages/animation-core/src/index.ts`
- `pnpm-lock.yaml`

**Acceptance criteria**

| Criterion                                | Result | Evidence                                               |
| ---------------------------------------- | ------ | ------------------------------------------------------ |
| Frame resolution is exact                | PASS   | 72/96 example table plus fixture boundary tests        |
| Scene boundaries work correctly          | PASS   | Frame 71→A/71, 72→B/0, 167→B/95, 168 throws            |
| Empty or invalid timelines rejected      | PASS   | Defensive tests for zero scenes and zero duration      |
| Functions are pure and deterministic     | PASS   | Deep-frozen input; repeated calls equal; frozen output |
| No React or rendering-library dependency | PASS   | Package imports only scene-schema types                |

**Tests added:** 12.

### Feature 1.4 — Keyframe Interpolation & Frame Evaluation

**Commit:** `ffba7cdf2ba58afb89688746093a507e24c7c3d2`  
**Message:** `feat(animation-core): implement deterministic keyframe evaluation`

**Implementation details**

- Added `evaluateKeyframeTrack(track, localFrame)` with:
  - Hold/step segments governed by the left keyframe.
  - Linear interpolation.
  - Cubic ease-in-out with documented `4t³` / `1 - (-2t+2)³/2` behavior.
  - Exact keyframe values; first-value hold before the track; last-value hold
    after it; single-keyframe constants.
- Added `evaluateLayerTransform`, `evaluateLayer`, `evaluateSceneFrame`, and
  `evaluateProjectFrame`.
- Added the renderer-independent `FramePlan` and `EvaluatedLayer` types,
  including resolved transforms, visibility, and asset/text/solid content.
- Layer evaluation sorts a copied array by explicit ascending `order`; the
  input project and layer array are never mutated.
- Rejects local scene frames outside the scene and global frames outside the
  project through typed errors.

**Files**

- `packages/animation-core/src/interpolate.ts`
- `packages/animation-core/src/evaluate.ts`
- `packages/animation-core/src/evaluate.test.ts`
- `packages/animation-core/src/index.ts`

**Acceptance criteria**

| Criterion                                   | Result | Evidence                                                |
| ------------------------------------------- | ------ | ------------------------------------------------------- |
| Frame 0 and final valid frame               | PASS   | Frame 0 and frame 24 of a 25-frame scene asserted       |
| Exact keyframe and midpoint linear behavior | PASS   | Frame 12 of 0→240 equals 120; exact keyframe equals 100 |
| Hold behavior                               | PASS   | Hold segment remains at left value until next keyframe  |
| Easing behavior                             | PASS   | Quarter/mid/three-quarter cubic values 15/120/225       |
| Multiple animated properties                | PASS   | X/Y/scale/rotation/opacity evaluated together           |
| Repeated evaluation and input immutability  | PASS   | Deep-frozen fixture; equal plans before/after           |
| JSON round-trip consistency                 | PASS   | Deserialized project produces identical plans           |

**Tests added:** 16.

### Feature 1.5 — Interactive Timeline Inspector

**Commit:** `1512d920092d313465c19d909f0d89e4565a0e33`  
**Message:** `feat(studio): add interactive scene timeline inspector`

**Implementation details**

- Replaced the static Studio placeholders with a real client-side inspector.
- The server page imports the validated sample project and passes plain,
  serializable data to the client component.
- The inspector uses `buildTimeline` for scene starts and
  `evaluateProjectFrame` for every displayed frame state. It does not duplicate
  timeline or interpolation logic.
- Added:
  - Project title, ID, frame rate, canvas, seed, and duration.
  - Four selectable scenes with global frame ranges and active highlighting.
  - Global frame slider with frame/timestamp output.
  - Previous/next scene boundary controls with disabled edge states.
  - Active scene name and local frame.
  - Evaluated layer list in stacking order with selection.
  - Resolved x/y/scale/rotation/opacity and visibility for the selected layer.
  - Asset manifest metadata, explicitly marked as reference-only.
  - A canvas placeholder explaining that painterly rendering begins in Phase 2.
- No playback simulation, export button, editable keyframes, or fake rendered
  artwork was added.

**Files**

- `apps/web/app/studio/studio-inspector.tsx`
- `apps/web/app/studio/studio-inspector.test.tsx`
- `apps/web/app/studio/page.tsx`
- `apps/web/app/studio/page.test.tsx`
- `apps/web/next.config.ts`
- `apps/web/package.json`
- `README.md`
- `pnpm-lock.yaml`

**Acceptance criteria**

| Criterion                                         | Result | Evidence                                                               |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| Scrubbing updates evaluated scene state           | PASS   | Component test and headless browser at frames 0/216/527/528/1151       |
| Scene boundaries visibly understandable           | PASS   | Scene list ranges, active highlighting, boundary controls, segment bar |
| Displayed values correspond to the real evaluator | PASS   | UI calls `evaluateProjectFrame`; tests assert exact resolved values    |
| No fake controls or mocked frame results          | PASS   | No export/playback controls; renderer explicitly disconnected          |
| Unit/component tests cover inspector behavior     | PASS   | 6 inspector tests plus 3 updated Studio page tests                     |
| Responsive layout remains usable                  | PASS   | Desktop/mobile browser captures at 1440×1000 and 390×844; no overflow  |

**Browser evidence:** Headless Chromium opened `/studio` and verified frame 0
dawn state, next-scene jumps to 216 and 528, previous-scene return to 216,
scene-list jump to 528, selected bird transform `760.00 px / 300.00 px / 4.00°`,
scrubber movement to 527, next-scene transition to 528, and final valid frame
1151 at `0:47.958` with four landing layers. The renderer placeholder remained
visible throughout.

**Tests added:** 6 inspector tests; 3 existing Studio page tests updated.

### Feature 1.6 — Continuous Integration

**Commit:** `65415a9ddb71a47f9277d64d58dc56c5b8f3aad9`  
**Message:** `ci: add node 24 validation workflow`

**Implementation details**

- Added `.github/workflows/ci.yml` for pushes to `main` and pull requests.
- Uses Node.js 24 LTS, pnpm `11.1.3` (matching `packageManager`), pnpm caching,
  and a frozen lockfile install.
- Runs formatting, lint, strict typecheck, all tests, and the production build.
- Uses read-only repository permissions and requires no secrets.
- Performs no deployment or publishing.
- Documented the workflow in `README.md`.
- Validated YAML syntax locally with Ruby's YAML parser and executed every
  workflow command locally.

**Files**

- `.github/workflows/ci.yml`
- `README.md`

**Acceptance criteria**

| Criterion                                | Result     | Evidence                                                 |
| ---------------------------------------- | ---------- | -------------------------------------------------------- |
| Node.js 24 LTS configured                | PASS       | `node-version: 24` in workflow                           |
| Repository pnpm version used             | PASS       | pnpm `11.1.3` matches `packageManager`                   |
| Frozen lockfile install                  | PASS       | `pnpm install --frozen-lockfile` in workflow and locally |
| Format/lint/typecheck/test/build gates   | PASS       | All commands present and executed locally                |
| No secrets, paid services, or deployment | PASS       | Read-only permissions; no deploy steps                   |
| Workflow configuration verified          | CONFIGURED | YAML parses; remote GitHub execution was not performed   |

### Corrective Commit — Homepage Phase Status

**Commit:** `9cbe1252029279bc40b2b65f39380b4a5659058b`  
**Message:** `fix(web): align homepage with phase 1 status`

- Updated homepage phase labels, foundation copy, and pipeline notes from Phase
  0 to Phase 1.
- Updated the shared `BRAND.phaseLabel`.
- Replaced the “studio-shaped shell” card with the implemented schema and
  deterministic evaluator facts.
- Updated the homepage test assertion.
- Re-ran tests, lint, typecheck, and production build.

### Documentation Status Update

`docs/ARCHITECTURE.md` was updated in the report commit to reflect:
implemented scene schema and animation core statuses; the actual version-1
project shape; frame-plan API; and deferred character/camera/audio/caption
structures. It does not claim any renderer exists.

## D. Final Repository Architecture

### Relevant tree

```text
fableon/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── page.tsx
│       │   ├── page.test.tsx
│       │   └── studio/
│       │       ├── page.tsx
│       │       ├── page.test.tsx
│       │       ├── studio-inspector.tsx
│       │       └── studio-inspector.test.tsx
│       ├── components/          # UI primitives, brand, homepage sections
│       ├── lib/                 # cn helper
│       ├── next.config.ts       # transpiles all three workspace packages
│       └── package.json
├── packages/
│   ├── scene-schema/
│   │   ├── fixtures/where-the-light-lands.project.json
│   │   ├── src/constants.ts
│   │   ├── src/schema.ts
│   │   ├── src/validation.ts
│   │   ├── src/helpers.ts
│   │   ├── src/serialize.ts
│   │   ├── src/fixtures.ts
│   │   ├── src/*.test.ts
│   │   └── src/index.ts
│   ├── animation-core/
│   │   ├── src/timeline.ts
│   │   ├── src/interpolate.ts
│   │   ├── src/evaluate.ts
│   │   ├── src/*.test.ts
│   │   └── src/index.ts
│   └── shared/                  # brand and pipeline constants
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_PROTOCOL.md
│   ├── MVP_SCOPE.md
│   ├── ROADMAP.md
│   └── reports/PHASE_01_REPORT.md
├── .github/workflows/ci.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
└── vitest.setup.ts
```

### Dependency direction

```text
apps/web
  ├── @fableon/shared
  ├── @fableon/scene-schema
  │     └── zod (runtime validation/parsing only)
  └── @fableon/animation-core
        └── @fableon/scene-schema (types/timeline contract)
```

- `scene-schema` has no UI, React, Next.js, or renderer dependency.
- `animation-core` has no UI, React, Next.js, renderer, or provider dependency.
- The web app is the composition boundary. It loads and validates the fixture
  on the server, then passes plain data to the client inspector.
- The domain packages are workspace sources transpiled by Next and consumed
  directly by Vitest; no separate package build is required yet.

## E. Scene Schema Specification

### Root document

Version 1 is identified by:

```json
{
  "format": "fableon.project",
  "schemaVersion": 1
}
```

`format` and `schemaVersion` are literals. A numeric future version is rejected
before Zod parsing with `unsupported_schema_version`. There are no migrations
yet because version 1 is the first format.

Required root fields:

- `id`: stable project identifier.
- `title`: non-blank display title.
- `frameRate`: literal `24` in version 1.
- `canvas`: literal `{ "width": 1920, "height": 1080 }`.
- `seed`: integer in `0..4,294,967,295` for future procedural engines.
- `assets`: ordered asset manifest entries.
- `scenes`: one or more ordered scenes.

### Frame and coordinate policy

- Frame rate: fixed 24 fps in schema version 1.
- Frame indices: non-negative integers; frame 0 is the first frame.
- A scene lasting N frames contains local frames `0..N-1`.
- Global scene intervals are half-open: `[startFrame, endFrame)`.
- Floating-point seconds are never used for frame selection.
- Canvas origin is top-left; X increases right, Y increases down.
- Positions use canvas pixels.
- Rotation uses degrees.
- Opacity is `0..1`.
- Scale uses finite numeric X/Y factors.
- All numeric values must be finite; NaN and Infinity are rejected.
- Transform fields are explicit in persisted data, so no hidden defaults are
  introduced during import. Helpers supply the documented defaults
  (`x=0`, `y=0`, `scaleX=1`, `scaleY=1`, `rotation=0`, `opacity=1`).

### Layers

Every layer has:

- `id`: unique within its scene.
- `type`: `asset`, `text`, or `solid`.
- `name`.
- `visible`: boolean.
- `order`: unique non-negative stacking order within the scene.
- `transform`: complete six-field transform.
- `animation`: optional object keyed by animatable transform property.

Layer-specific content:

- **Asset:** `assetId` referencing the manifest. Image/video assets may be
  visual layers; audio assets are rejected as visual content.
- **Text:** `text`, `fontFamily`, `fontSize`, and `#RRGGBB` color.
- **Solid:** `#RRGGBB` color.

Evaluation sorts by ascending `order`; the stored layer array order is not
trusted for rendering.

### Animation tracks and keyframes

Animation supports `x`, `y`, `scaleX`, `scaleY`, `rotation`, and `opacity`.
Unknown property names are rejected by strict object validation.

Each track requires at least one keyframe. A keyframe contains:

- `frame`: integer scene-local frame, within `0..durationFrames-1`.
- `value`: finite number; opacity values must be within `0..1`.
- `interpolation`: `hold`, `linear`, or `easeInOutCubic`.

Keyframes must be strictly ascending. Duplicate and unsorted frames are rejected
with a path to the offending keyframe.

### Assets

Manifest entries contain `id`, `type` (`image`, `audio`, or `video`), `name`, and
a safe relative `path`.

Rejected paths include absolute roots, URL schemes, backslashes, `..` or `.`
segments, empty segments, query strings, and fragments. Version 1 does not load
files, hash content, or provide storage; paths are portable references only.

### Validation behavior

Validation rejects:

- Unsupported numeric schema versions and malformed root structures.
- Unknown object keys at every level.
- Duplicate project asset IDs and scene IDs.
- Duplicate layer IDs or stacking orders within a scene.
- Missing or invalid asset references.
- Audio assets used as visual layer content.
- Empty scenes, invalid/zero/non-integer durations, and overflowed project
  durations.
- Non-finite or out-of-range transform/opacity values.
- Unknown animation property names.
- Empty tracks, duplicate/unsorted keyframes, out-of-scene frames, and invalid
  opacity keyframe values.
- Unsafe asset paths.

`validateProject` returns a discriminated result; `parseProject` throws
`ProjectValidationError`. Each issue has a stable path, code, and message.
`serializeProject` validates before export; `deserializeProject` validates after
JSON parsing and wraps syntax errors as `invalid_json`.

### Minimal valid project

```json
{
  "format": "fableon.project",
  "schemaVersion": 1,
  "id": "minimal-project",
  "title": "Minimal Project",
  "frameRate": 24,
  "canvas": { "width": 1920, "height": 1080 },
  "seed": 1,
  "assets": [],
  "scenes": [
    {
      "id": "scene-1",
      "name": "First scene",
      "durationFrames": 24,
      "layers": [
        {
          "id": "background",
          "type": "solid",
          "name": "Ink wash",
          "visible": true,
          "order": 0,
          "transform": {
            "x": 0,
            "y": 0,
            "scaleX": 1,
            "scaleY": 1,
            "rotation": 0,
            "opacity": 1
          },
          "color": "#18211f"
        }
      ]
    }
  ]
}
```

### Canonical fixture

`packages/scene-schema/fixtures/where-the-light-lands.project.json` contains:

- Title: “Where the Light Lands”.
- Four scenes: `dawn` (216 frames), `glide` (312), `descent` (312), `landing`
  (312). Total: 1152 frames / 48 seconds.
- Five assets: four image references and one audio reference.
- 3/2/3/4 layers per scene, including a final animated text title.
- Global boundaries: 0, 216, 528, 840, and exclusive end 1152.
- All referenced media paths are intentional data-only placeholders.

## F. Timeline Engine

### Frame indexing and scene boundaries

Global frame resolution uses integer frame indices and half-open intervals:

| Global frame | Active scene | Local frame |
| ------------ | ------------ | ----------- |
| 0            | A            | 0           |
| 71           | A            | 71          |
| 72           | B            | 0           |
| 167          | B            | 95          |
| 168          | invalid      | —           |

A project with scenes of 72 and 96 frames has 168 total frames. Frame 168 is
outside the project even though it is the exclusive end boundary of scene B.

### Core APIs

```ts
buildTimeline(project): Timeline
resolveGlobalFrame(timeline, globalFrame): ResolvedFrame
resolveProjectFrame(project, globalFrame): ResolvedFrame
framesToSeconds(frame, frameRate): number
formatTimestamp(frame, frameRate): string // m:ss.sss
evaluateProjectFrame(project, globalFrame): FramePlan
```

`Timeline` contains `frameRate`, `totalFrames`, and immutable scene timings
with `sceneId`, `sceneName`, `sceneIndex`, `startFrame`, `endFrame`, and
`durationFrames`. No per-frame array is allocated.

### Error behavior

- Frame below zero or non-integer: `InvalidFrameError`.
- Frame at or beyond a project/scene limit: `FrameOutOfRangeError` with `frame`,
  `limit`, and `scope` (`project` or `scene`). No clamping occurs.
- Empty scene list, zero/negative duration, or unsafe frame totals:
  `TimelineError`.
- Local scene evaluation beyond `durationFrames - 1`: `FrameOutOfRangeError`
  with scene scope.
- Schema import errors are separate: `ProjectValidationError` with paths.

### Interpolation math

For segment progress `t = (frame - left.frame) / (right.frame - left.frame)`:

- **Hold:** output is `left.value` for the entire segment.
- **Linear:** output is `left.value + (right.value - left.value) * t`.
- **Cubic ease-in-out:**
  - `t < 0.5`: eased `= 4t³`.
  - `t >= 0.5`: eased `= 1 - (-2t + 2)³ / 2`.
  - Output is linearly interpolated with `eased`.

The interpolation mode belongs to the **left** keyframe. The last keyframe's
mode is irrelevant. Exact keyframe frames return that keyframe's exact value.
Before the first keyframe the first value holds; after the last keyframe the
last value holds; a single-keyframe track is constant.

### Layer ordering and frame plans

`evaluateProjectFrame` returns:

```ts
interface FramePlan {
  globalFrame: number;
  sceneId: string;
  sceneName: string;
  sceneIndex: number;
  localFrame: number;
  frameRate: number;
  layers: EvaluatedLayer[]; // ascending order
}
```

Each `EvaluatedLayer` contains ID, name, layer type, order, visibility, resolved
transform, and renderer-independent content (`assetId`, text attributes, or
solid color). Animation tracks are not returned; only resolved state is.

### Determinism guarantees

- No wall-clock time, locale formatting, network, or unseeded randomness in
  evaluation.
- Layer order is explicit and stable.
- Input projects are never mutated; layer arrays are copied before sorting.
- Repeated evaluation of the same project/frame produces deeply equal plans.
- JSON round-trip produces identical frame plans.
- Frame indices are authoritative; timestamps are derived display values only.
- The project seed is preserved for future deterministic engines but no PRNG is
  used in Phase 1.

## G. Tests and Verification

### Test count

- **9 test files, 66 tests passing.**
- Phase 0 had 12 tests. Phase 1 added 54 tests and updated the 3 Studio page
  tests for the inspector.

Per area:

| Area                              | Tests |
| --------------------------------- | ----- |
| Scene schema validation           | 14    |
| Serialization and fixtures        | 6     |
| Timeline resolution               | 12    |
| Keyframe evaluation               | 16    |
| Studio inspector                  | 6     |
| Homepage and Studio page tests    | 6     |
| Utility and shared-contract tests | 6     |

### Verification table

| Category             | Result     | Evidence                                                                                                                                                                                                                                                          |
| -------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installation         | PASS       | `pnpm install` — 5 workspace projects, “Already up to date”; `pnpm install --frozen-lockfile` also passed                                                                                                                                                         |
| Formatting           | PASS       | `pnpm format:check` — all matched files use Prettier style                                                                                                                                                                                                        |
| Lint                 | PASS       | `pnpm lint` — `eslint . --max-warnings=0`, no warnings                                                                                                                                                                                                            |
| TypeScript           | PASS       | `pnpm typecheck` — 4 packages (`web`, `shared`, `scene-schema`, `animation-core`) with strict `tsc --noEmit`                                                                                                                                                      |
| Unit tests           | PASS       | `pnpm test` — 9 files, 66 tests, 3.54s                                                                                                                                                                                                                            |
| Production build     | PASS       | `pnpm build` — Next.js 16.4.5/Turbopack compiled and typechecked; static routes `/`, `/_not-found`, `/icon.svg`, `/studio`                                                                                                                                        |
| Runtime verification | PASS       | Production server on port 3100: `/` → 200 and `/studio` → 200; homepage pipeline marker and Studio project/slider markers present                                                                                                                                 |
| Browser interaction  | PASS       | Headless Chromium: frame 0 → 216 → 528 via next, back to 216 via previous; scene-list jump to 528; bird transform `760.00 px / 300.00 px / 4.00°`; scrubber to 527; next boundary to 528; final frame 1151 at `0:47.958`; renderer placeholder visible throughout |
| CI workflow          | CONFIGURED | YAML parses; all commands executed locally. GitHub Actions was not executed remotely, so no remote pass is claimed                                                                                                                                                |

Additional evidence:

- Desktop Chromium at 1440×1000 and mobile Chromium at 390×844: Studio layout
  stacked correctly with no horizontal overflow (`scrollWidth` equaled viewport
  width).
- Browser test confirmed 3 dawn layers, 2 glide layers, 3 descent layers, and 4
  landing layers.
- Playwright was not added as a project dependency; the cached local headless
  Chromium was used through the Chrome DevTools Protocol for this verification.

### Warnings and environmental notes

- pnpm reports that `eslint@9.39.5` is deprecated because ESLint 10 is current.
  ESLint 10 remains blocked by peer ranges of `eslint-config-next` 16.4.5's
  bundled plugins.
- Local verification ran on Node `25.9.0` (non-LTS). CI is configured for Node
  24 LTS, but remote CI was not executed.
- Headless Chromium logged non-fatal macOS `CVDisplayLink` and GPU-process
  messages. The page and interactions worked.
- Background servers were stopped intentionally with SIGTERM, yielding exit
  status 143.
- No secrets, paid services, or remote pushes were used.

## H. Technical Decisions

### 1. Zod 4 for runtime validation

**Decision:** Use Zod `4.6.7` with `strictObject` and `discriminatedUnion`.

**Rationale:** The schema is persisted data and must be validated at import.
Zod provides structured issue paths and robust numerics while keeping schema
declarations readable. Its strict objects reject unknown keys, and discriminated
unions enforce layer-specific content.

**Trade-off:** Runtime dependency and bundle cost for the schema package.
`animation-core` imports only types plus the transform-property constant, so
validation remains outside the evaluator's hot path.

### 2. Literal version-1 frame rate and canvas

**Decision:** `frameRate: 24`, `canvas: { width: 1920, height: 1080 }` are
literals in version 1.

**Rationale:** The phase prompt fixes the initial policy. Literals prevent
silent flexibility from leaking into evaluation before time/coordinate policy
is proven. Supporting other values requires a version bump and explicit tests.

**Trade-off:** Alternate frame rates/aspect ratios require a future schema
version rather than a simple field change.

### 3. Explicit IDs and path-safe asset references

**Decision:** IDs use `[A-Za-z0-9][A-Za-z0-9_-]*`. Asset paths must be safe
relative POSIX paths with no traversal, URL scheme, backslash, query, or
fragment.

**Rationale:** Stable identifiers survive reordering; safe paths prevent
ambiguous or unsafe references before any storage exists. The repository never
loads these paths in Phase 1.

**Trade-off:** IDs with spaces or dots are rejected. Asset content hashes and
immutable storage are deferred.

### 4. Explicit stacking order independent of array order

**Decision:** Every layer has a unique non-negative `order`; evaluation sorts by
it. Stored array order is not authoritative.

**Rationale:** Reordering arrays during editing or serialization cannot
accidentally change compositing. Duplicate orders are rejected.

**Trade-off:** Authors must manage the field. A future editor will provide
reordering controls that update it.

### 5. Tracks keyed by property rather than a free-form track array

**Decision:** `animation` is a strict object with keys `x`, `y`, `scaleX`,
`scaleY`, `rotation`, and `opacity`.

**Rationale:** Duplicate track properties are impossible, invalid property names
are rejected directly, and TypeScript consumers get precise optional fields.

**Trade-off:** Adding a new animated property requires a schema change. That is
preferable to accepting arbitrary property names.

### 6. Left-keyframe interpolation semantics

**Decision:** The interpolation mode on the left keyframe controls the following
segment; the last keyframe's mode is unused. Exact frames return exact values.

**Rationale:** This matches common animation timelines, is easy to explain, and
avoids ambiguity at segment boundaries. Tests pin quarter, midpoint, and
three-quarter easing values.

**Trade-off:** Per-target-keyframe easing would require a schema extension.

### 7. Validate at import, assume validity during evaluation

**Decision:** `parseProject`/`deserializeProject` validate; `evaluateProjectFrame`
assumes a validated `Project` and does not re-run Zod per frame.

**Rationale:** Revalidating an entire project for every frame would waste work
and complicate rendering. Import and UI boundaries are where untrusted input
enters. Defensive checks for frame ranges and malformed tracks remain.

**Trade-off:** Callers bypassing the parser with a cast can pass invalid data.
The public API makes `parseProject` the normal entry point.

### 8. Half-open scene intervals and no per-frame arrays

**Decision:** Build a scene timing table once; resolve frames with arithmetic.

**Rationale:** Half-open intervals eliminate boundary ambiguity, and avoiding a
per-frame lookup table keeps memory independent of video length.

**Trade-off:** Timeline resolution is O(number of scenes) per call. That is
small for the MVP and can be cached later without changing semantics.

### 9. Real evaluator in the UI, no second timeline implementation

**Decision:** The inspector calls `buildTimeline` and `evaluateProjectFrame`
directly from `animation-core`.

**Rationale:** The UI must demonstrate the real contract. Duplicating frame math
in React would hide contract defects and create divergence.

**Trade-off:** The UI client receives a library dependency and recomputes the
plan on each frame change. The current scene count is tiny; caching belongs to a
later optimization phase.

### 10. Server-validated fixture, serializable client boundary

**Decision:** The server page imports and validates `SAMPLE_PROJECT`; the client
inspector receives a plain project object.

**Rationale:** Validation runs at the server boundary, and the client does not
need file access or Zod at render time. The project data is JSON-compatible.

**Trade-off:** The hardcoded fixture is not a project picker. Persistence and
file selection remain Phase 5 work.

### 11. CI uses explicit pnpm version and Node 24 LTS

**Decision:** `pnpm/action-setup@v4` with version `11.1.3`, Node 24, frozen
lockfile, read-only permissions.

**Rationale:** Matches the repository's `packageManager` field and supported
runtime. No secrets or deployment are needed for validation.

**Trade-off:** The version is duplicated in the workflow; a future pnpm upgrade
must update both. Remote execution is unverified in this environment.

## I. Limitations and Technical Debt

### Implemented-scope limitations

1. **No migration implementation.** Version 1 is the first schema. Older or
   unsupported versions are rejected; migration hooks are documented as future
   work rather than implemented prematurely.
2. **Assets are references only.** There is no asset file store, content hash,
   upload, fetch, provenance record, or licensing metadata yet. Fixture paths
   intentionally point to files that do not exist.
3. **Character/camera/audio/caption structures are deferred.** This intentionally
   differs from the broader Phase 1 outline in `docs/ROADMAP.md`; the phase
   prompt narrowed the scope. The roadmap should be reconciled during review.
4. **Visibility is not animatable.** Base visibility is resolved, but there are
   no visibility keyframe tracks. Transform properties are the only animated
   properties.
5. **Text/solid layers are minimal.** No alignment, anchors, font assets, blend
   modes, masks, or rich text. These belong to the paint/editor phases.
6. **No camera track or transition schema.** Scenes have hard boundaries in
   Phase 1; camera and transitions are later phases.
7. **No project persistence UI.** The inspector always opens the bundled fixture.
   Opening, creating, saving, and choosing files is Phase 5 work.
8. **No renderer or playback.** The canvas is a labeled placeholder. No frame is
   rasterized and no export exists.
9. **Timeline rebuild per evaluation.** `evaluateProjectFrame` rebuilds the small
   scene timing table on every call. This is correct and cheap for 4–6 scenes,
   but should be cached when frame evaluation becomes frequent in rendering.
10. **Browser verification is not a committed E2E suite.** The headless Chromium
    interaction check is reproducible in principle but lives outside the repo.
    Playwright/visual regression, including accessibility checks, is still
    recommended before the editor becomes interactive.
11. **CI is configured, not remotely proven.** YAML parsing and local command
    execution succeeded; no GitHub Actions run occurred.
12. **No coverage threshold.** Tests are behavior-focused, but coverage is not
    measured or enforced yet.
13. **Fixture media is not proof of visual direction.** The schema contains
    reference paths only; the benchmark visual quality remains entirely future
    work.

### Known environmental constraints

- Local Node is 25.9.0, while the repository and CI target Node 24 LTS.
- ESLint 9.39.5 is a compatibility pin for the current Next.js plugin peer
  ranges; npm labels it deprecated.
- The local browser check used a cached headless Chromium and CDP, not a
  project-managed Playwright dependency.

## J. Phase 2 Readiness

### Recommendation

**GO** for Phase 1 acceptance.

Evidence supporting readiness:

- All required local commands passed, including strict typecheck and 66 tests.
- A production build and real dev/production runtime checks passed.
- Actual browser interactions matched evaluator output at multiple scene
  boundaries and the final frame.
- Scene data is serializable, versioned, validated, and renderer-independent.
- The frame plan is pure and deterministic, with input immutability and JSON
  round-trip tests.
- No out-of-scope renderer, AI, audio, video, database, or cloud dependency was
  introduced.

This GO accepts Phase 1 only. **Phase 2 must not begin without a new prompt.**

### Minimal APIs for the future painterly engine

The Phase 2 renderer should consume:

1. `parseProject(unknown): Project` or `SAMPLE_PROJECT` for validated input.
2. `buildTimeline(project): Timeline` for scene intervals.
3. `evaluateProjectFrame(project, globalFrame): FramePlan` for frame state.
4. `FramePlan.layers[]` with ascending `order`, `visible`, `transform`, and
   `content` (`assetId`, text fields, or solid color).
5. `evaluateSceneFrame(scene, localFrame)` for scene-local previews or cached
   scene rendering.
6. `serializeProject` / `deserializeProject` for project portability.
7. `SAMPLE_PROJECT` and its four-scene fixture for visual benchmarks.

The renderer should not read keyframe arrays directly or reproduce timeline
math. It should paint from `FramePlan` layer state and resolve asset references
through the future asset manifest/storage API. It must not mutate the project.

### Phase 2 prerequisites and considerations

1. Decide how actual fixture assets are supplied and stored; Phase 1 paths are
   not files.
2. Define the paint-engine layer contract against `FramePlan` and establish
   deterministic stroke seeds.
3. Decide rasterization technology (Canvas/WebGL/WebGPU/native) through
   prototypes rather than assuming one.
4. Add deterministic golden-frame tests and visual regression for the bird/forest
   benchmark.
5. Cache timeline/frame plans if profiling shows repeated evaluation overhead.
6. Reconcile the roadmap's broader character/camera/audio/caption expectations
   with the actual version-1 schema before adding those structures.
7. Consider a committed Playwright/accessibility suite before the editor grows
   more interactive.
8. Keep the canvas/honesty boundary: no artwork or playback claims until a real
   renderer produces frames.

### Running the inspector locally

```bash
corepack enable
pnpm install
pnpm dev
```

Open [http://localhost:3000/studio](http://localhost:3000/studio). Use the
global frame slider, scene buttons, Previous/Next scene controls, and layer
buttons. The sample project is
`packages/scene-schema/fixtures/where-the-light-lands.project.json`. No artwork
is rendered; the canvas is a Phase 2 placeholder.
