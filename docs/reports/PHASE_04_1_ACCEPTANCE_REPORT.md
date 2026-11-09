# Phase 4.1 Acceptance Report — Animation Studio & Film Audit

- **Phase:** 4.1 — Independent acceptance testing
- **Date:** 2026-11-10
- **Branch:** `main`
- **Starting HEAD:** `225a0b16a8c3dd00e70ebb688908e870435c282a`
- **Mode:** QA, inspection, evidence collection
- **Paid API calls:** **0**
- **Remote push:** **none**
- **Phase 5:** **not started**

## 1. Executive summary

The Phase 4 film is technically complete and watchable, but it is not production-ready
illustration. The decoded MP4 is a valid 30.000-second, 720-frame, 1920×1080, 24 fps H.264
file with no audio and no corrupt or missing frames. The four-shot story reads clearly:
forest, flight, landing, rest.

Two crossfades are visibly broken: the bird is duplicated during the shot 2→3 transition,
and the face shows a double eye and beak during shot 3→4. The character is provisional
cutout art with white fringes and head/body seams. The forest is a single 852×479 crop
upscaled to 2400×1350 with a blurred duplicate as its only parallax layer. Motion is
smooth but rigid: the bird glides side-on without banking, pitch, or body deformation.

The Studio works for loading, four-shot navigation, scrubbing, playback, resolution
selection, validation, and short export. Long-export cancellation is broken and leaves a
stale `rendering` job plus a 48-byte partial MP4. A 7-second variation with a different
camera path, bird trajectory, and flap speed rendered successfully, proving the engine is
reusable at the code level; however, none of those parameters are editable in the Studio.
Preview and export match structurally (SSIM 0.973–0.976).

**Bottom line:** the architecture is real and reusable, but the dominant limitation is
artwork and character construction, followed by transition compositing and rigid sprite
motion. **Do not begin Phase 5 until the two P1 defects are fixed and approved artwork
replaces the candidate pack.**

## 2. Initial repository state

- HEAD verified as `225a0b16a8c3dd00e70ebb688908e870435c282a`.
- Working tree clean before testing; no user project data or historical benchmark
  artifacts were modified.
- Phase 4 reports, storyboard, shot specification, quality assessment, provenance,
  renderer, composition spec, Studio implementation, and the final MP4 were inspected.
- Existing output hash before testing:
  `61ef10891b96d09eeb06d88bf8bcd9b2477b30514ff87b9d5e64a8e8ea88bf62`.

## 3. Video integrity results

**PASS.** FFprobe and a full decode confirmed:

| Property                         | Result                             |
| -------------------------------- | ---------------------------------- |
| Duration                         | 30.000000 s                        |
| Frames                           | 720                                |
| FPS                              | 24/1                               |
| Resolution                       | 1920×1080                          |
| Codec                            | H.264                              |
| Audio                            | none                               |
| Full decode                      | exit 0, no errors                  |
| Black frames                     | only 0 and 719 (intentional fades) |
| Jump candidates                  | none                               |
| Near-frozen runs                 | 139–143 and 524–527                |
| Missing/corrupt/stretched frames | none found                         |

The file size is 15,419,466 bytes. Full detail is in
`docs/benchmarks/phase-04/acceptance-test/VIDEO_INTEGRITY.md`.

## 4. Visual inspection findings

Fourteen actual decoded frames were assembled into
`docs/benchmarks/phase-04/acceptance-test/full-film-contact-sheet.png`. Defect crops were
extracted from the MP4, not from expected illustrations.

| Criterion                            | Score /10 |
| ------------------------------------ | --------: |
| Illustration quality                 |         4 |
| Character design                     |         4 |
| Wing animation                       |         5 |
| Flight naturalness                   |         5 |
| Landing quality                      |         5 |
| Environment quality                  |         4 |
| Camera movement                      |         6 |
| Temporal consistency                 |         6 |
| Shot transitions                     |         4 |
| Story clarity                        |         7 |
| Overall visual quality               |         4 |
| **Technical correctness (separate)** |     **9** |

The technical score does not raise the artistic score. Ratings are agent assessments
pending human sign-off; evidence is in `VISUAL_QUALITY_REVIEW.md`.

Confirmed visual defects:

- **P1 — shot 2→3 crossfade, frames 360–371 / 15.00–15.46 s.** Two birds are visible at
  once, with duplicate body, wing, and feet (representative frames 364 and 368).
- **P1 — shot 3→4 crossfade, frames 528–539 / 22.00–22.46 s.** Double eye and beak
  ghosting (representative frames 532 and 536).
- **P2 — character seams/fringe.** White halos and hard alpha edges at the belly, neck,
  and wing root (frames 216, 492, 528). The asset manifest itself labels the pack
  “not approved for production”.
- **P2 — environment softness.** Single 852×479 crop upscaled to 2400×1350; distant
  parallax plane is a blurred duplicate of the same plate.
- **P2 — rigid cutout motion.** Wing rotation without feather overlap, banking, body bob,
  or secondary motion.
- **P2 — closing title.** Small and low over busy moss/branch at 28.0 s.
- **P3 — frozen tails** at 139–143 and 524–527.
- **P3 — foot contact softness** at 20.5 s; toes partly buried in moss.

## 5. Motion analysis

All 720 frames were decoded to 320×180 grayscale and compared frame-to-frame.

- Consecutive-frame MAD: mean **2.130**, median **1.367**, p95 **5.487**, p99 **12.921**,
  max **13.284**.
- No MAD above 20 and no jump above 1.5×p99.
- Motion is continuous through every shot; no camera jitter, scale pop, or layer swap was
  detected.
- Near-frozen runs: frames **139–143** (end of shot 1) and **524–527** (landing settle).
- Transition ghosting was confirmed visually; frame differences alone would not prove it.

Per-shot MAD:

| Shot                  | Frames  |  Mean |    p95 |    Max |
| --------------------- | ------- | ----: | -----: | -----: |
| Awakening Forest      | 0–143   | 1.532 | 12.938 | 13.284 |
| Little Bird in Flight | 144–359 | 3.382 |  5.272 |  6.075 |
| The Landing           | 360–527 | 2.110 |  3.792 |  8.304 |
| A Place to Rest       | 528–719 | 1.226 |  5.907 |  6.940 |

## 6. Studio usability results

**PARTIAL.** Tested in Playwright Chromium against the running app with an isolated
temporary data directory.

Working:

- composition page loads; four shots visible; 30-second / 0–719 timeline;
- shot buttons jump to 0 / 144 / 360 / 528;
- scrubbing renders actual Canvas frames; playback advances; pause stops;
- preview resolution switches between 1280×720 and 1920×1080;
- opening and ending titles are present;
- invalid export range shows `endFrame must be at most 719.`;
- short export (24 frames, 1.000 s) completes and is playable;
- duplicate active export is rejected with HTTP 409;
- existing project and shot/review routes still load.

Broken:

- long export cancellation does not reach `cancelled`, `failed`, or `completed`;
- job `dc70309b-cfe9-4951-9a69-4ea289e3fa60` stayed `rendering` at 18/720 frames;
- render process exited, but no terminal status was written;
- a 48-byte partial MP4 remained at
  `outputs/phase-04-acceptance/cancelled-partial.mp4`.

Screenshots: `studio-screenshots/`. Full log: `STUDIO_UX_TEST.md` and
`studio-ux-results.json`.

## 7. Reusability experiment results

**PARTIAL.** A 7-second, 168-frame, 1280×720 variation was rendered with:

- a different shot-2 camera path and zoom (1.02–1.04 → 1.08–1.16);
- a different bird trajectory (`(420,640)→(1150,760)` → `(360,500)→(1450,900)`);
- a faster wing flap (`0.62` → `1.15` multiplier).

The variation is visibly different: SSIM against the corresponding original segment is
**0.484**. It is a genuine render through the same `FilmRenderer`, camera engine, ambient
system, and character-motion package — not a prerecorded substitute.

```text
outputs/phase-04-acceptance/variation.mp4
168 frames · 7.000 s · 1280×720 · H.264 · no audio
SHA-256: 88d8920125864bafb400eb0062ddbd0021ff02999d23953746e382ec78596b93
```

The original film hash was unchanged before and after. Source files were restored with
`git checkout --`; the exact changes are preserved in `variation.patch`.

Why PARTIAL: the parameters required source edits. The Studio exposes no camera,
trajectory, timing, or wing controls, so a user cannot perform this experiment through the
product. The variation manifest also reports the original spec hash because camera tracks
and motion functions are not included in the hash.

## 8. Preview/export consistency

**PASS.** Studio Canvas frames at 1920×1080 were compared with decoded MP4 frames at the
same global frame numbers.

| Frame | Shot                     |     SSIM |
| ----: | ------------------------ | -------: |
|    72 | Awakening Forest / title | 0.973435 |
|   240 | Little Bird in Flight    | 0.973905 |
|   470 | The Landing / contact    | 0.975848 |
|   620 | A Place to Rest / title  | 0.974767 |

Framing, character position, wing pose, title placement, layer order, and lighting match.
Differences are consistent with H.264 compression and yuv420 conversion. Side-by-side
pairs: `comparison/preview-vs-export/`.

## 9. Performance findings

Short Studio export (24 frames, 1280×720): 3,807 ms render + 215 ms encode, 258,967-byte
output, 1.000 s duration.

Variation render (168 frames, 1280×720): 281 ms first frame, 172 ms median, 265 ms p95,
31,065 ms total rasterization, 776 ms encode, 31,841 ms wall, 2,512,338-byte output.

The unchanged full-film baseline is 113 ms first frame, 246 ms median, 325 ms p95,
181,089 ms rasterization, 1,043 ms encode, and 182,132 ms wall at 1920×1080. It was not
rerun because the verified artifact was unchanged.

Failure behavior: invalid ranges are rejected cleanly; duplicate exports return 409;
cancellation is the one unstable path and can leave a partial file. No user data was
corrupted during invalid-operation tests. Missing-asset and nonexistent-composition-ID
cases were not exercised end-to-end and remain unverified.

## 10. Tests executed

| Command                    | Result                               |
| -------------------------- | ------------------------------------ |
| `pnpm format:check`        | PASS                                 |
| `pnpm lint`                | PASS — zero warnings                 |
| `pnpm typecheck`           | PASS — root + 11 workspace projects  |
| `pnpm test`                | PASS — 247 tests / 34 files          |
| `pnpm build`               | PASS                                 |
| `pnpm test:browser`        | PASS — 51 tests                      |
| FFmpeg full decode         | PASS — exit 0                        |
| Variation render + ffprobe | PASS — 168 frames, 7.000 s, 1280×720 |

The browser suite regenerated tracked Phase 3/4 report screenshots; those were restored so
no historical artifact changed. No test was weakened or removed.

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
├── defect-frames/          (8 actual-frame crops)
├── studio-screenshots/     (5 UI captures)
└── comparison/
    ├── preview-vs-export/  (4 side-by-side pairs)
    ├── variation-vs-original.mp4
    └── variation-vs-original-frames.png
```

Git-ignored outputs:

```text
outputs/phase-04-acceptance/
├── variation.mp4
├── variation.manifest.json
├── variation.report.json
├── cancelled-partial.mp4
└── cancelled-job-status.json
```

Large videos remain outside Git. Only artifacts actually produced are listed.

## 12. Confirmed defects

| ID   | Severity | Area           | Description                                                                   |
| ---- | -------- | -------------- | ----------------------------------------------------------------------------- |
| V-01 | **P1**   | Transition 2→3 | Two birds ghosted during crossfade, ≈15.00–15.42 s.                           |
| V-02 | **P1**   | Transition 3→4 | Double eye/beak ghosting, ≈22.04–22.46 s.                                     |
| S-01 | **P1**   | Studio export  | Cancellation never reaches a terminal state; 48-byte partial MP4 remains.     |
| V-03 | P2       | Character      | White fringe, hard alpha edges, head/body seams; art not production-approved. |
| V-04 | P2       | Environment    | Soft upscaled 852×479 plate; distant plane is a blurred duplicate.            |
| V-05 | P2       | Motion         | Rigid cutout flight; no banking, pitch, body bob, or feather overlap.         |
| V-06 | P2       | Presentation   | Closing line is small and low over busy art at 28.0 s.                        |
| V-07 | P3       | Motion         | Near-frozen tails at 139–143 and 524–527.                                     |
| V-08 | P3       | Landing        | Foot contact is visually soft; toes partly buried in moss.                    |
| P-01 | P3       | Provenance     | `filmSpecHash` excludes camera tracks and motion function.                    |

Suggested fixes are in `VISUAL_QUALITY_REVIEW.md` and `MASTER_TEST_REPORT.md`.

## 13. Top five priorities

1. **Fix crossfade character ghosting (P1).** Hold one character state through the
   dissolve or match poses before blending; crossfade environment only. Add a regression
   check for a single character silhouette at transition midpoints.
2. **Fix long-export cancellation (P1).** Guarantee a terminal status, kill the child
   process, delete the partial MP4, and reconcile stale jobs on startup. Remove the cancel
   control if that cannot be guaranteed.
3. **Re-author the bird as approved native-resolution layered art (P2).** Clean alpha,
   matched feather texture at seams, no 2× upscaling of 65–266 px parts. This is the
   biggest visual-quality lever.
4. **Build a real multilayer environment (P2).** Native 2400×1350+ painting with at least
   three distinct depth layers instead of a blurred duplicate.
5. **Add secondary motion and contact polish (P2/P3).** Banking, pitch, body bob,
   wing-root deformation, tail follow-through, and a cleaner foot-contact solve; also
   enlarge and reposition the closing line.

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

**Do not start Phase 5 yet.** Close the two P1 defects and commission approved artwork
first. The engine can produce different animations from different data, but the current
product does not let a user author those differences, and the candidate art cannot carry a
professional result. Phase 5 should begin only after:

- crossfade ghosting is eliminated and covered by a browser regression;
- cancellation is terminal and cannot leave corrupt output;
- approved, native-resolution character and environment art is in place;
- a human reviewer accepts a full-film pass.

## 16. Git commit hashes

| Commit                                     | Purpose                                                               |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `225a0b16a8c3dd00e70ebb688908e870435c282a` | Starting HEAD (Phase 4 completion)                                    |
| `c71c32b16aac53cb3ddf408e31ecaa644c41d6b7` | Acceptance evidence and detailed test documents                       |
| Report commit                              | The commit containing this report; verify with `git log -1 --oneline` |

No feature, source, test, or benchmark change was made during Phase 4.1. The only
committed changes are the acceptance evidence and this report.

## 17. Final working-tree status

- Acceptance evidence committed; report committed separately.
- `outputs/` remains Git-ignored, including the variation and cancellation evidence.
- Original film hash unchanged:
  `61ef10891b96d09eeb06d88bf8bcd9b2477b30514ff87b9d5e64a8e8ea88bf62`.
- Variation hash:
  `88d8920125864bafb400eb0062ddbd0021ff02999d23953746e382ec78596b93`.
- No push performed.
- No Phase 5 work started.
- Working tree clean after the report commit.
