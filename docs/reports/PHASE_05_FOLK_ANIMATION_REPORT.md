# Phase 5 — Rajasthani Folk-Animation Production Report

- **Phase:** 5 — Folk-art production system and pilot film
- **Date:** 2026-11-10
- **Branch:** `main`
- **Starting HEAD:** `7e1815fc49d9287a738846109fa23545b1d6eb31`
- **Mode:** implementation, generation, rigging, animation, production, benchmark
- **Paid API calls:** **0**
- **Remote push:** **none**
- **Subsequent phase:** **not started**

## 1. Executive summary

Fableon now has an end-to-end, locally executed folk-art cutout production system. It
authored six original vector masters, extracted **61 transparent parts**, built reusable
artisan, horse, cart, and bell rigs, created two four-layer village backgrounds, animated a
five-shot 30-second film, exported a valid 720-frame 1080p MP4, and recorded an auditable
production ledger with **$0.00 actual API spend**.

The film, **The Little Brass Bell**, is a coherent animatic: an artisan walks into a
Rajasthani-inspired courtyard holding a brass bell, a horse and decorated cart arrive, the
bell is attached to the harness, the horse nods, and the cart leaves down the lane.

The pilot is **not a final painted film**. The horse reads slightly llama-like, the shot-4
handoff is crowded, the horse gait is closer to a prance than a natural walk, and the
backgrounds are flat vector sets. Artistic approval remains with the user.

The environment could not run FLUX 3 Klein: the host is an Apple M1 with 8 GB unified
memory and 7.1 GiB free disk, with no NVIDIA/CUDA GPU, no ComfyUI, and no remote API
authorization. The pilot therefore uses original local vector art, not AI generation. This
is a real deliverable, but it is not evidence about FLUX/Gemini/OpenAI output quality.

## 2. Repository start and final HEAD

- Starting HEAD: `7e1815fc49d9287a738846109fa23545b1d6eb31`
- Phase 4.1 P1 correction commit: `0efb771`
- Final implementation HEAD before this report: `1eedb01`
- Final report commit: the commit containing this report
- Working tree: clean after the report commit
- No historical benchmark media, user project data, or Phase 4 outputs were overwritten

The two inherited P1 defects were fixed first:

1. **Character ghosting at crossfades** — the outgoing shot's character pass is now
   omitted; one incoming cast is drawn at full opacity while the environment dissolves.
2. **Cancellation leaving a stale job and partial MP4** — cancellation now terminates the
   render process group, writes a terminal `cancelled` state, and deletes partial output.
   Stale active jobs are reconciled on read.

## 3. Hardware and model setup

| Item                     | Result                                                                  |
| ------------------------ | ----------------------------------------------------------------------- |
| Host                     | Apple M1 MacBook Air, macOS 26.5.2, arm64                               |
| GPU                      | Apple M1, 7-core integrated GPU                                         |
| CUDA                     | unavailable                                                             |
| NVIDIA driver / RTX 5060 | not present                                                             |
| System RAM               | 8 GB unified                                                            |
| Free disk at preflight   | 7.1 GiB (97% used)                                                      |
| ComfyUI                  | not installed or reachable                                              |
| FFmpeg                   | 8.1.1 (Homebrew)                                                        |
| Node                     | v25.9.0                                                                 |
| Paid API authorization   | none                                                                    |
| FLUX 3 Klein             | **blocked** — no compatible GPU, no ComfyUI, insufficient disk headroom |

A configured trusted-LAN ComfyUI client is implemented (`ComfyUIClient`) but was not used
because no endpoint exists. The remote providers are gated behind a persisted spending
authorization; no provider call was made.

## 4. Art-style system

Created `docs/art-direction/FOLK_ART_STYLE_BIBLE.md` with:

- original ochre/cream/indigo/terracotta/saffron/gold palette;
- 7–10 px ink silhouettes, 3–5 px interior detail;
- rounded folk shapes, arches, jaali diamonds, lotus motifs, gold bands;
- artisan proportions and identity anchors;
- horse/cart/bell construction rules;
- fabric and jewellery rules;
- two-location background grammar;
- animation limitations and rig-friendly illustration rules;
- acceptable/unacceptable examples from this pilot and the Phase 4 comparison.

The language is deliberately flat and graphic, not photoreal, 3D, anime, or soft AI
painting.

## 5. Actual generated masters

These are **original local vector masters**, not AI-generated images. SVG sources are in
`assets/folk-pilot/masters/`; PNG renders are in
`apps/web/public/assets/folk-pilot/masters/`.

| Master    | Size      | SHA-256                                                            |
| --------- | --------- | ------------------------------------------------------------------ |
| Artisan   | 900×1100  | `c812bf80aaf39d3e52db34414032a19233a686f6edf683207fcb4a1681893615` |
| Horse     | 1400×950  | `cd219577ebcdc9b0036c009696a79eeb060db701fd1641bbb038e282781c0950` |
| Cart      | 1300×800  | `50f7660f00a37c9d468a72e8801179e545802971aeb628f85104db3f38eafced` |
| Bell      | 180×230   | `2d294f4d7d7e9943fb2c0e244e85929a7246ec3bb0a2cb40e779a2b637bab5ff` |
| Courtyard | 2600×1500 | `90d7870cc311d792074f973e2dba81f522075607973c11ea2d41aaed029146c6` |
| Street    | 2600×1500 | `a748777f5baac194df560f8b937041e215d7f51305347ba3ff2542e7d87a0b1c` |

No reference frame was copied. The characters and locations are original constructions
from the style rules.

## 6. Character-part inventories

| Actor     |  Parts | Included                                                                                                                                                                             |
| --------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Artisan   |     29 | head, eye, eyelid, brow, moustache, earring, turban, turban tail, neck, torso, sash, necklace, shoulder sash, pelvis, two arms, open/grip hands, two thighs/shins/feet, dhoti panels |
| Horse     |     27 | torso, neck, head, ears, eye, forelock, mane, tail base/tuft, harness collar/strap/anchor, saddle blanket, bridle, four three-segment legs with hooves                               |
| Cart      |      4 | body/canopy, near wheel, far wheel, shafts                                                                                                                                           |
| Bell      |      1 | complete bell                                                                                                                                                                        |
| **Total** | **61** | all with stable IDs, hashes, offsets, pivots, and review status                                                                                                                      |

The manifest is `apps/web/public/assets/folk-pilot/manifest.json`; a copy is
`docs/benchmarks/phase-05/asset-inventory.json`.

## 7. Rig hierarchies and joints

The reusable rig package is `packages/folk-motion`. It uses absolute master pivots and
hierarchical matrices over the existing `@fableon/sprite-motion` math.

Artisan joints: root/pelvis, torso, neck, head, both shoulders, elbows, wrists, hips,
knees, and ankles, plus turban tail, sash, necklace, and earring. Horse joints: torso,
neck, head, ears, tail, four three-segment legs, hooves, harness, and saddle. Cart:
body + two independent wheel pivots + shafts. Bell: top-loop pivot.

Motion is data-driven: walk speed, cycle duration, body bob, arm swing, step lift, blink
interval, head turn, horse gait phase offsets, gait timing, tail sway, wheel radius, reach
target, and camera keys are configuration values. No motion preset hardcodes the film's
frame numbers.

## 8. Animation demonstrations

Rendered and inspected:

- artisan walk-in with leg articulation, opposing arms, body bob, blink, and hand-held bell;
- horse four-leg gait with body bob, head/neck motion, mane, and tail sway;
- cart following the horse with distance-derived wheel rotation;
- reach, grip, attach, and release with the bell moving from hand to harness;
- horse nod after attachment;
- shot-5 departure walk and wheel rotation;
- camera pans/zooms and four-layer parallax across five shots.

Intermediate checkpoints:

- `outputs/folk-pilot/checkpoint-walk.mp4` — 84 frames;
- `outputs/folk-pilot/checkpoint-exit.mp4` — 110 frames;
- full film — 720 frames.

## 9. Background production

Two original locations, each with four authored layers:

- **Courtyard:** sky, distant rooftops, main haveli/jaali/banners/tree, foreground floor/
  rangoli/pots.
- **Village lane:** sky, distant gate, converging buildings/banners, foreground cobbles/
  pots.

Layer depths are 0.80 / 0.86 / 0.93 / 1.00. The film uses zooms 1.00–1.30; sampled
extreme frames show no blank canvas edges. Background detail is graphic, not final painted
1080p texture.

## 10. Studio implementation

Routes:

- `/studio/folk` — production preview, five-shot timeline, play/scrub, resolution switch,
  local export, job progress/cancel, completed video, gate summary.
- `/studio/folk/assets` — master previews, 61 part thumbnails, hashes, provenance, review
  status, background layer previews.
- `/studio/folk/rigs` — actor selector, skeleton overlay, joint hierarchy, real joint
  rotation slider, motion-preset frames.
- `/studio/folk/production` — five-shot board with actions, camera, transitions, bell mode.
- `/studio/folk/costs` — actual API spend, approved assets, runtimes, provider scenarios,
  electricity limitation.

The production preview and exported MP4 use the same `FolkRenderer` and frame evaluator.

## 11. Full-film metadata

```text
Path: outputs/folk-pilot/final.mp4
Duration: 30.000 s
Frames: 720
FPS: 24
Resolution: 1920×1080
Codec: H.264
Audio: none
Size: 15,198,058 bytes
SHA-256: 1f99ec3e791d09b929f86bf204c61562c2cd599e580d8509f729efee0dfb908e
Preview: outputs/folk-pilot/preview-720p.mp4 (1280×720, 8,602,453 bytes)
```

Full decode exit 0. Five shots at 0/120/264/432/600. No duplicate characters at the three
crossfades. Stable horse/cart shaft alignment. Bell attaches at global frame 504 and stays
on the harness. Final fade ends at frame 719.

## 12. Actual production costs

| Category                   |             Actual |
| -------------------------- | -----------------: |
| External API spend         |          **$0.00** |
| Paid image calls           |              **0** |
| Local asset generation     |           6,009 ms |
| Final 1080p rasterization  |         193,166 ms |
| Final encode               |           1,091 ms |
| Preview 720p rasterization |         175,183 ms |
| Variation renders          | 42,310 + 23,160 ms |
| First-film marginal cash   |          **$0.00** |
| Repeat-render API cash     |          **$0.00** |
| Manual human preparation   |          0 minutes |
| Measured electricity       |        **unknown** |

The ledger is append-only for the final benchmark pass. Development events were archived to
`outputs/folk-pilot/archive/cost-events-development.jsonl` before the final pass; the
committed audit copy is `docs/benchmarks/phase-05/cost-ledger.json`.

## 13. Local vs hosted comparison

Only the local vector provider was executed. Hosted rows are **price-based scenarios** for
six masters × two candidate attempts = 12 outputs, not observed calls.

| Provider                      |              Outputs | Actual/estimated charge | State                 |
| ----------------------------- | -------------------: | ----------------------: | --------------------- |
| Local vector + Canvas/FFmpeg  | 61 parts / 6 masters |        **$0.00 actual** | Executed              |
| BFL FLUX 3 Klein              |          12 scenario |         $0.168 estimate | Not executed; blocked |
| Google Gemini Nano Banana 2.1 |          12 scenario |        $0.6048 estimate | Not executed; blocked |
| OpenAI GPT Image 2            |          12 scenario |         $0.492 estimate | Not executed; blocked |

At one attempt per master, halve the hosted estimates. These are not invoices. See
`COST_ANALYSIS.md` for assumptions, per-master costs, and the eight-minute story estimate.

## 14. Failed-generation and repair statistics

- AI generation attempts: **0** (provider blocked before any call).
- Failed paid outputs: **0**.
- Local vector generation passes in the final benchmark: **1**.
- Rejected paid assets: **0**.
- Development repairs: several authoring iterations before the final pass; all are
  preserved in the archived development ledger.
- **Real defect found and fixed:** artisan and horse both exported a part named `torso`;
  the runtime map overwrote one with the other. The build now namespaces every part as
  `<actor>_<part>`, and a unit test asserts uniqueness and rig coverage.
- **Phase 4 defects not imported:** crossfade character ghosting and cancellation leaving
  a 48-byte partial MP4 were fixed before the folk renderer was built.

## 15. Local electricity measurements or limitations

No calibrated wall-power meter or GPU power telemetry was available. The report leaves
whole-system electricity **unknown** rather than inventing a figure. Measurement
instructions: use a wall meter, sample a 60-second render, record mean kW, multiply by
hours, and label it whole-system energy. GPU-only data must not be labelled total system
energy.

## 16. Manual production time

- Human manual cleanup / mask repair / paid retouch: **0 minutes**.
- The masters, parts, rigs, and film were authored programmatically as original vector
  work in this session. That is development/authoring work, not a monetized marginal cost.
- The cost report keeps development cost separate from the film marginal cost.

## 17. Test results

| Command              | Result                              |
| -------------------- | ----------------------------------- |
| `pnpm format:check`  | PASS                                |
| `pnpm lint`          | PASS — zero warnings                |
| `pnpm typecheck`     | PASS — root + 12 workspace projects |
| `pnpm test`          | PASS — 273 tests / 38 files         |
| `pnpm build`         | PASS                                |
| `pnpm test:browser`  | PASS — 55 tests                     |
| Final MP4 decode     | PASS                                |
| Preview MP4 decode   | PASS                                |
| Variation MP4 decode | PASS                                |

Browser coverage includes the five-shot studio, frame state, play/pause, resolution
switch, local export and playable result, asset workshop, rig slider changing actual
pixels, shot board, and cost dashboard. No test invokes a paid API.

## 18. Actual video and screenshot paths

```text
outputs/folk-pilot/
├── final.mp4
├── preview-720p.mp4
├── film-manifest.json
├── asset-inventory.json
├── generation-costs.csv
├── cost-ledger.json
├── final-cost-report.json
├── render-report.json
├── contact-sheet.png
├── selected-frames/            (16 frames)
├── variation/
│   ├── variation-walk-horse.mp4
│   ├── variation-reach.mp4
│   └── contact-sheet.png
└── archive/cost-events-development.jsonl

docs/benchmarks/phase-05/
├── STYLE_REVIEW.md
├── CHARACTER_ASSET_REPORT.md
├── RIGGING_EVALUATION.md
├── BACKGROUND_EVALUATION.md
├── FILM_STORYBOARD.md
├── COST_ANALYSIS.md
├── QUALITY_ASSESSMENT.md
├── TECHNICAL_VERIFICATION.md
├── contact-sheet.png
├── variation-comparison.png
├── diagnostic-frames/
├── screenshots/
├── motion-analysis.json
├── film-manifest.json
├── asset-inventory.json
├── final-cost-report.json
├── cost-ledger.json
└── generation-costs.csv
```

## 19. Quality limitations

- Horse neck/head reads slightly llama-like; ears are large.
- Shot 4 is crowded: artisan, horse chest, and bell hand overlap.
- Horse gait is a readable prance/trot, not a natural walk.
- Backgrounds are flat vector environments, not final painted 1080p plates.
- Hands are mitten-like; facial acting is limited to blink and small head motion.
- Joint discs are visible as ornamental circles, especially on the horse.
- At frame 600 the cast appears at a new location while the environment dissolves; this
  is a staging pop, not a duplicate character.
- The film is silent.

No P0/P1 film defect was found.

## 20. Full commit hashes

| Commit                                     | Purpose                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `7e1815fc49d9287a738846109fa23545b1d6eb31` | Starting HEAD                                                          |
| `0efb771`                                  | Phase 4.1 P1 fixes: crossfade duplicates and cancellation finalization |
| `f8fd5f4`                                  | Original vector masters, 61-part extraction, style bible               |
| `ac27263`                                  | Reusable folk rigs and deterministic film renderer                     |
| `b5f2e6d`                                  | Hosted image spend-authorization gate                                  |
| `1eedb01`                                  | Production studio, rig inspector, local export                         |
| Report commit                              | The commit containing this report; verify with `git log -1 --oneline`  |

## 21. GO/NO-GO decisions

| Gate                       | Decision                                                                          |
| -------------------------- | --------------------------------------------------------------------------------- |
| A — Asset production       | **PASS** — 61 reusable parts, 6 masters, hashes, provenance, joint overlap        |
| B — Rigging                | **PASS** — required joints and actions execute; no detached limbs at normal poses |
| C — Animation              | **PASS** — saved config drives walk, reach, grip, gait, nod, wheels, camera       |
| D — Full film              | **PASS** — 30.000 s, 720 frames, five shots, valid MP4/decoded                    |
| E — Cost tracking          | **PASS** — append-only final ledger; actual/estimated/unknown separated           |
| F — No unapproved spending | **PASS** — 0 paid calls                                                           |
| Artistic readiness         | **PENDING USER REVIEW** — pilot animatic, not a final painted film                |

**GO for reusing the system and assets in further pilots.**  
**NO-GO for calling this production-ready illustrated film or starting Phase 6 without
art-direction fixes and user approval.**

## 22. Recommendations

1. **Fix the horse anatomy** — shorter ears, more horse-like neck crest and head length.
2. **Restage shot 4** — use a three-quarter or offset composition so the hand, harness,
   and bell read separately; do not put the artisan directly in front of the horse chest.
3. **Improve the horse gait** — add a proper four-beat walk with planted stance and
   independent hoof roll; current motion prances.
4. **Add real background depth** — author native 2600×1500 painted plates with more
   texture and three distinct architectural planes.
5. **Improve hands and face** — at least a thumb/finger silhouette and brow/mouth poses for
   the attach beat; keep the mitten only for distance shots.
6. **Add optional original sound** — a small brass bell, hoofbeats, and courtyard ambience
   would raise the film more than another camera move.
7. **Commission a human art pass** — the system is reusable; the current limitation is
   authored detail, not architecture.
