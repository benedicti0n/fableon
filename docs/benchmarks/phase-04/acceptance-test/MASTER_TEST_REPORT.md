# Phase 4.1 — Master Acceptance Test Report

**Starting HEAD:** `225a0b16a8c3dd00e70ebb688908e870435c282a`  
**Branch:** `main`  
**Test date:** 2026-11-10  
**Mode:** QA / inspection / evidence collection  
**Paid API calls:** **0**  
**Push:** **none**  
**Phase 5:** **not started**

## 1. Verdict in one paragraph

The finished film is a valid, complete, technically correct 30-second 1080p animation. Its
four-shot story is clear, its camera work is smooth, and its preview matches its export.
It is **not** production-ready illustration: two crossfades visibly ghost the bird, the
character is provisional cutout art with seams and fringes, and the forest is a soft
upscaled single plate. The Studio works for preview, scrubbing, playback, and short
exports, but long-export cancellation leaves a stale job and a corrupt partial MP4. The
engine is reusable at the code level — a different 7-second variation rendered
successfully — but camera paths, flight trajectories, and flap speed are not editable in
the Studio. The architecture is real; the artwork is the dominant limitation.

## 2. Question-by-question answers

| Question                                                              | Answer                                                                                                                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does the final video look like a coherent animated story?             | **Yes, at animatic level.** Forest → flight → landing → rest is readable without narration.                                                                           |
| Are the bird and environment actually animated?                       | **Yes.** Wings articulate, the camera moves, particles drift, and the bird translates through the scene. The environment is two-plane parallax, not a static image.   |
| Are the character movements believable?                               | **Partially.** Timed and smooth, but rigid; the bird glides side-on without banking, pitch, or body bob.                                                              |
| Is the footage visually consistent across shots?                      | **Yes in palette and framing; no in transition compositing.** Two crossfades duplicate the character.                                                                 |
| Does Fableon Studio work as expected?                                 | **Partially.** Preview, navigation, scrub, play/pause, resolution, validation, and short export work. Long-export cancellation is broken.                             |
| Can parameters be changed to produce a meaningfully different output? | **Yes, but only by editing source.** A 7-second variation with a different camera, trajectory, and flap speed rendered successfully. Studio exposes no such controls. |
| Are preview and final export visually consistent?                     | **Yes.** SSIM 0.973–0.976 at four sampled frames, with no structural mismatch.                                                                                        |
| What prevents professional storybook quality?                         | **Artwork and character construction first; transition compositing second; rigid sprite motion third.**                                                               |

## 3. Test A — video integrity

**Artifact:** `outputs/where-the-light-lands/final.mp4`  
**SHA-256:** `61ef10891b96d09eeb06d88bf8bcd9b2477b30514ff87b9d5e64a8e8ea88bf62`  
**Size:** 15,419,466 bytes

| Check                                    | Result                                  |
| ---------------------------------------- | --------------------------------------- |
| Duration                                 | 30.000000 s                             |
| Frames                                   | 720                                     |
| Frame rate                               | 24/1                                    |
| Resolution                               | 1920×1080                               |
| Codec                                    | H.264                                   |
| Audio                                    | none                                    |
| Full decode                              | exit 0, no errors                       |
| Black frames                             | only 0 and 719 (intentional fades)      |
| Jump candidates (>20 MAD or >1.5×p99)    | none                                    |
| MAD mean / median / p95 / p99 / max      | 2.130 / 1.367 / 5.487 / 12.921 / 13.284 |
| Near-frozen runs (MAD < 0.02, ≥3 frames) | 139–143 and 524–527                     |
| Corrupt / missing / stretched frames     | none found                              |

Full detail: `VIDEO_INTEGRITY.md`; diagnostics: `motion-analysis.json`.

## 4. Test B — visual inspection

Fourteen actual decoded frames were assembled into `full-film-contact-sheet.png` at the
required timestamps. Additional crops isolate the confirmed defects. Full analysis and
scores are in `VISUAL_QUALITY_REVIEW.md`.

Headline findings:

- **P1 ghosting at 2→3:** frames ≈360–370 show two birds (duplicate body, wing, feet).
- **P1 ghosting at 3→4:** frames ≈529–539 show two eyes and two beaks.
- **P2 character seams/fringe:** hard belly and neck edges, wing-root halo, head/body
  seam; most visible around frames 216, 492, and 528.
- **P2 environment softness:** the plate is an 852×479 crop upscaled to 2400×1350; the
  distant plane is a blurred duplicate, not new art.
- **P2 rigid motion:** wing rotation without feather overlap or body deformation.
- **P2 closing text:** small and low over a busy branch at 28.0 s.
- **P3 frozen tails:** 139–143 and 524–527.
- **P3 contact softness:** toes partly buried in moss at 20.5 s.

## 5. Test C — temporal motion

The film was decoded to 320×180 grayscale for frame-to-frame mean absolute difference
(MAD). No jumps above 20 or above 1.5×p99 were found. Motion is continuous in every shot.
The only static stretches are the two short tails listed above. Crossfade ghosting is a
compositing defect, not a frame-integrity defect, and was confirmed visually rather than
assumed from frame differences.

Shot statistics:

| Shot                  | Frames  | MAD mean | MAD p95 | MAD max |
| --------------------- | ------- | -------: | ------: | ------: |
| Awakening Forest      | 0–143   |    1.532 |  12.938 |  13.284 |
| Little Bird in Flight | 144–359 |    3.382 |   5.272 |   6.075 |
| The Landing           | 360–527 |    2.110 |   3.792 |   8.304 |
| A Place to Rest       | 528–719 |    1.226 |   5.907 |   6.940 |

## 6. Test D — Studio user experience

Route: `/studio/composition`, Playwright Chromium, isolated temporary `FABLEON_DATA_DIR`.

| Check                            | Result                                 |
| -------------------------------- | -------------------------------------- |
| Page loads                       | PASS                                   |
| Four shots visible               | PASS                                   |
| 30-second / 0–719 timeline       | PASS                                   |
| Shot buttons jump correctly      | PASS (0 / 144 / 360 / 528)             |
| Scrubbing updates rendered frame | PASS                                   |
| Play advances                    | PASS (528→540)                         |
| Pause stops                      | PASS (555→555)                         |
| Preview 1280×720 and 1920×1080   | PASS                                   |
| Opening/ending titles            | PASS                                   |
| Invalid export range feedback    | PASS (`endFrame must be at most 719.`) |
| Short export completes           | PASS (24 frames, 1.000 s, 1280×720)    |
| Completed video playable         | PASS (readyState 4)                    |
| Duplicate active export rejected | PASS (HTTP 409)                        |
| Long export cancellation         | **FAIL**                               |
| Existing project route           | PASS                                   |
| Existing shot/review route       | PASS                                   |

Cancellation defect:

- Job `dc70309b-cfe9-4951-9a69-4ea289e3fa60`, frames 0–719 at 1280×720.
- Before cancel: `rendering`, 18/720 frames.
- `cancelRequested: true` was persisted.
- After 60 s: still `rendering`; render process gone; no terminal status.
- Partial output: 48-byte MP4 at
  `outputs/phase-04-acceptance/cancelled-partial.mp4`.
- Status snapshot: `outputs/phase-04-acceptance/cancelled-job-status.json`.

Screenshots are in `studio-screenshots/`. Details: `STUDIO_UX_TEST.md`.

## 7. Test E — reusability experiment

A temporary patch changed three supported parameters:

1. Shot-2 camera path and zoom (start/middle/end positions, zoom 1.02–1.04 → 1.08–1.16).
2. Shot-2 bird trajectory (`(420,640)→(1150,760)` → `(360,500)→(1450,900)`).
3. Wing-flap multiplier (`0.62` → `1.15`).

The original demo was not modified. A 7-second, 168-frame, 1280×720 variation rendered
with the same `FilmRenderer`, camera engine, ambient system, and character-motion pack.

```text
Output: outputs/phase-04-acceptance/variation.mp4
Duration: 7.000 s
Frames: 168
Resolution: 1280×720
FPS: 24
Codec: H.264
SHA-256: 88d8920125864bafb400eb0062ddbd0021ff02999d23953746e382ec78596b93
SSIM vs corresponding original segment: 0.484
```

Original film hash before/after: unchanged
(`61ef1089…8bf62`). Source files were restored with `git checkout --` immediately after
rendering. The exact patch is `variation.patch`.

**Limitation:** these parameters are not exposed in the Studio. They required source
edits, so the result is **PARTIAL**, not PASS.

**Provenance defect:** the variation manifest still reports the original
`filmSpecHash` because the hash covers only the static film composition, not the camera
tracks or motion function. The video is genuine; the provenance hash is incomplete.

Details: `REUSABILITY_TEST.md`; comparison:
`comparison/variation-vs-original.mp4` and `comparison/variation-vs-original-frames.png`.

## 8. Test F — preview vs export

Frames 72, 240, 470, and 620 were captured from the Studio Canvas at 1920×1080 and
compared with the same decoded MP4 frames.

| Frame | Shot                     | SSIM (all) |
| ----: | ------------------------ | ---------: |
|    72 | Awakening Forest / title |   0.973435 |
|   240 | Little Bird in Flight    |   0.973905 |
|   470 | The Landing / contact    |   0.975848 |
|   620 | A Place to Rest / title  |   0.974767 |

Framing, character position, wing pose, title placement, layer order, and lighting match.
Differences are consistent with H.264/yuv420 compression. **PASS.** Details and
side-by-side images: `PREVIEW_EXPORT_COMPARISON.md`, `comparison/preview-vs-export/`.

## 9. Test G — performance and stability

Short Studio export (24 frames, 1280×720):

| Metric        |         Value |
| ------------- | ------------: |
| Render time   |      3,807 ms |
| Encoding time |        215 ms |
| Output size   | 258,967 bytes |
| Duration      |       1.000 s |
| Frames        |            24 |

Variation render (168 frames, 1280×720):

| Metric              |           Value |
| ------------------- | --------------: |
| First-frame render  |          281 ms |
| Median frame render |          172 ms |
| p95 frame render    |          265 ms |
| Total rasterization |       31,065 ms |
| Encoding            |          776 ms |
| Total wall          |       31,841 ms |
| Output size         | 2,512,338 bytes |

Phase 4 full-film baseline (1920×1080, 720 frames, same machine class): 113 ms first
frame, 246 ms median, 325 ms p95, 181,089 ms rasterization, 1,043 ms encode, 182,132 ms
wall. This was not rerun because the verified artifact was unchanged.

Invalid operations tested without corrupting user data:

- out-of-range export frame → visible 400 message;
- duplicate active export → HTTP 409;
- cancelled long export → stale `rendering` status and 48-byte partial file (defect);
- missing/invalid frame indexes → rejected by the API contract;
- existing project data and demo routes → unchanged and loadable.

Browser remained responsive during short export and preview. No unexpected page-level
JavaScript errors occurred in the focused run.

## 10. Tests executed

| Command                    | Result                               |
| -------------------------- | ------------------------------------ |
| `pnpm format:check`        | PASS — all matched files formatted   |
| `pnpm lint`                | PASS — zero warnings                 |
| `pnpm typecheck`           | PASS — root + 11 workspace projects  |
| `pnpm test`                | PASS — 247 tests in 34 files         |
| `pnpm build`               | PASS — Next.js production build      |
| `pnpm test:browser`        | PASS — 51 tests                      |
| FFmpeg full decode         | PASS — exit 0                        |
| Variation render + ffprobe | PASS — 168 frames, 7.000 s, 1280×720 |

The browser suite regenerated tracked Phase 3/4 report screenshots as a side effect; those
were restored with `git checkout --` so no historical benchmark artifact changed. No test
was modified to hide a defect.

## 11. Artifacts created

```text
docs/benchmarks/phase-04/acceptance-test/
├── VIDEO_INTEGRITY.md
├── STUDIO_UX_TEST.md
├── REUSABILITY_TEST.md
├── PREVIEW_EXPORT_COMPARISON.md
├── VISUAL_QUALITY_REVIEW.md
├── MASTER_TEST_REPORT.md
├── full-film-contact-sheet.png
├── motion-analysis.json
├── studio-ux-results.json
├── focused-ux-results.json
├── variation.patch
├── defect-frames/            (8 crops)
├── studio-screenshots/       (5 actual UI captures)
└── comparison/
    ├── preview-vs-export/    (4 side-by-side pairs)
    ├── variation-vs-original.mp4
    └── variation-vs-original-frames.png

outputs/phase-04-acceptance/  (Git-ignored)
├── variation.mp4
├── variation.manifest.json
├── variation.report.json
├── cancelled-partial.mp4
└── cancelled-job-status.json
```

## 12. Confirmed defects

| ID   | Severity | Area           | Summary                                                                        |
| ---- | -------- | -------------- | ------------------------------------------------------------------------------ |
| V-01 | **P1**   | Transition 2→3 | Two birds ghosted during crossfade (≈15.00–15.42 s).                           |
| V-02 | **P1**   | Transition 3→4 | Double eye/beak ghosting (≈22.04–22.46 s).                                     |
| S-01 | **P1**   | Studio export  | Long-render cancellation never reaches a terminal state; leaves a 48-byte MP4. |
| V-03 | P2       | Character      | White fringe, hard alpha edges, head/body seams.                               |
| V-04 | P2       | Environment    | Soft upscaled single plate; distant plane is a blurred duplicate.              |
| V-05 | P2       | Motion         | Rigid cutout flight; no banking, body bob, or feather overlap.                 |
| V-06 | P2       | Presentation   | Closing line is small and low over busy art.                                   |
| V-07 | P3       | Motion         | Near-frozen tails at 139–143 and 524–527.                                      |
| V-08 | P3       | Landing        | Foot contact is visually soft; toes partly buried in moss.                     |
| P-01 | P3       | Provenance     | `filmSpecHash` excludes camera tracks and motion function.                     |

## 13. Top five priorities

1. **Fix crossfade character ghosting (P1).** This is the first obvious defect a viewer
   sees, twice. Hold one character state through the dissolve or match poses before
   blending; crossfade the environment only. Add a browser regression that checks for a
   single character silhouette at transition midpoints.
2. **Fix long-export cancellation and recovery (P1).** Make cancel produce a terminal
   `cancelled` status, kill the render process reliably, delete the partial MP4, and
   reconcile stale jobs on startup. Until then, remove the cancel control or label it
   unsupported. A corrupt 48-byte output is worse than no cancel button.
3. **Re-author the bird as approved, native-resolution layered art (P2).** This is the
   dominant quality limiter. Use clean alpha, matched feather texture at the head/body
   and wing-root seams, and enough resolution to avoid 2× upscaling. The current pack is
   explicitly marked “not approved for production.”
4. **Build a real multilayer environment (P2).** Replace the upscaled 852×479 crop and
   blurred duplicate with a native 2400×1350+ painting and at least three distinct depth
   planes. This raises perceived production value more than additional camera moves.
5. **Add secondary motion and contact polish (P2/P3).** Banking and pitch during flight,
   body bob, wing-root deformation, tail follow-through, and a cleaner foot-contact
   solve will make the existing rig feel less like a sliding cutout. Also enlarge and
   reposition the closing line.

## 14. Final acceptance decisions

| Area                       | Decision                                                           |
| -------------------------- | ------------------------------------------------------------------ |
| Video integrity            | **PASS**                                                           |
| Studio functionality       | **PARTIAL**                                                        |
| Character motion           | **PARTIAL**                                                        |
| Camera motion              | **PASS**                                                           |
| Multi-shot composition     | **PASS**                                                           |
| Preview/export consistency | **PASS**                                                           |
| Animation reusability      | **PARTIAL**                                                        |
| Offline rendering          | **PASS**                                                           |
| Artistic readiness         | **PENDING USER REVIEW** (production recommendation: **NOT READY**) |

## 15. Recommendation for Phase 5

**Do not start Phase 5 as a new feature phase yet.** First close the two P1 defects and
commission approved character/background art. Phase 5 should be authorized only after:

- transition ghosting is gone and regression-tested;
- cancellation reaches a terminal state and cannot leave a partial MP4;
- the bird and forest are re-authored at production resolution with clean alpha;
- a human reviewer signs off on at least one full-film pass.

The engine architecture is reusable and worth keeping. The current result is a strong
technical animatic, not a finished film.
