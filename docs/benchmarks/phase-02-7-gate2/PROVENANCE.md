# Phase 2.7 Gate 2 — Provenance

## Artwork status

**Gate 2 candidate — NOT APPROVED PRODUCTION ARTWORK.**

The character is the externally prepared
`fableon-gate2-repaired-candidate-v2.zip`. It is an inferred/repaired candidate,
not a final illustrator-authored master. The supplied approved reference board is
treated as the externally claimed Gate 1 reference; this repository cannot
independently verify the human approval.

## Source archive

| Property         | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Archive          | `incoming/fableon-gate2-repaired-candidate-v2.zip`                 |
| SHA-256          | `7b4f732c3b70d51da9bbcd25db96439791f34ee24094e62811110ab95c43f309` |
| Size             | 8,156,360 bytes                                                    |
| Entries          | 28 (safe root-scoped files/directories)                            |
| Candidate status | `gate2: candidate_needs_user_review`                               |
| Candidate QA     | `ART_ASSET_QA.json`; all measured hashes/dimensions matched        |

The archive was opened read-only, inspected for unsafe paths, and extracted to a
quarantine directory. `preview_generator.py` was inspected but not executed. The
supplied `registration-motion-test.mp4` was not used as production evidence.

## Source files

The nine unmodified PNGs are preserved under `assets/premium-bird-v1/parts/`
and published byte-for-byte for runtime use at
`apps/web/public/assets/premium-bird-v1/parts/`.

| Part      | Dimensions | SHA-256                                                            |
| --------- | ---------- | ------------------------------------------------------------------ |
| body      | 266×161    | `e6fc1f902f6b342279f1976f7155070e48de6683c64d9dd012c42cecacc98d07` |
| head      | 205×160    | `cfeeaf5777099e9ee814e1dd41fdcc3275f37b1e10a293287b6bdf4f48dab9b3` |
| eye       | 45×45      | `c0db91cd3041348937e0c41a121833b087166ff69dd1f5e360f6f8a462dc6f0a` |
| beak      | 65×40      | `6b5608391fbcbe1b3401da6d13c81247013223f74525bd4614fc34fe05a551b1` |
| wing-near | 168×149    | `7f2d341bb08f03979c4c5e2d26810e0e2f84efa9c932062146b79b0d0f9d8404` |
| wing-far  | 163×149    | `c963b91ead947578324f5e240c416b21ab67f9406badf8111967505f4b646b01` |
| tail      | 131×119    | `a6a3b4b4c1db22b03359ab0648084c5dd483694d9fb0dd5faaf0eae45d3ed84c` |
| leg-left  | 93×138     | `7f9978cb3b84bf0f1904ee36ab3cc078c785312420289dcf9181cf8b7327e142` |
| leg-right | 101×121    | `cfe62c9d85cb35dcb1370b6328794ffb714abc750933c9d1122a9726b51d33c0` |

The canonical pack uses the source bytes as prepared derivatives. Source and
prepared hashes are identical; no trim, recolor, sharpening, blur, or alpha
keying was applied.

## Generation and integration pipeline

1. Input archive audited; source parts preserved.
2. Canonical `fableon.illustration-pack` v1 created with source-space pivots,
   registration, hierarchy, z-order, hashes, and provenance.
3. `apps/web/public/assets/premium-bird-v1/manifest.json` validated by
   `@fableon/illustration-pipeline`.
4. Nine parts loaded and mapped to the existing `@fableon/sprite-motion`
   hierarchy.
5. Gate 2 rig converts the candidate’s provisional 960×540 joints to a
   1920×1080 scene using a 2× display scale and explicit body/head pivot
   conversion.
6. The existing Fableon Canvas renderer composes the character over the
   existing Phase 2.5 diagnostic forest.
7. 48 frames rendered, selected frames/contact/pivot sheets captured, and
   ffmpeg used only for final H.264 encoding.

## Artwork provenance

`apps/web/public/assets/premium-bird-v1/provenance.json` records:

- source archive and SHA-256;
- external candidate status;
- per-part provenance in the pack manifest;
- body/head inferred reconstruction notes;
- candidate-only usage status;
- Gate 1 reference path.

The body and head are reconstructed/inferred; the other parts were extracted
from candidate reference boards. No part is claimed as a faithful reveal of
hidden source pixels.

## Background provenance

The forest is the existing Phase 2.5 diagnostic procedural scene. It is **not**
premium background art. The benchmark label and `forest-preview.png` identify
this limitation explicitly.

## Artifacts

| Artifact                    | Path                                                                |
| --------------------------- | ------------------------------------------------------------------- |
| Input audit                 | `docs/benchmarks/phase-02-7-gate2/INPUT_AUDIT.md`                   |
| Source candidate archive    | `incoming/fableon-gate2-repaired-candidate-v2.zip` (git-ignored)    |
| Candidate metadata/previews | `docs/benchmarks/phase-02-7-gate2/source/`                          |
| Canonical pack manifest     | `apps/web/public/assets/premium-bird-v1/manifest.json`              |
| Portable pack               | `docs/benchmarks/phase-02-7-gate2/premium-bird-v1.fableon-pack.zip` |
| Master reference            | `docs/benchmarks/phase-02-7-gate2/master-character.png`             |
| Source pose preview         | `docs/benchmarks/phase-02-7-gate2/source-poses-contact-sheet.png`   |
| Source part sheet           | `docs/benchmarks/phase-02-7-gate2/character-parts.png`              |
| Fidelity report             | `docs/benchmarks/phase-02-7-gate2/fidelity-report.json`             |
| Pack validation             | `docs/benchmarks/phase-02-7-gate2/PACK_VALIDATION.json`             |
| Rig validation              | `docs/benchmarks/phase-02-7-gate2/RIG_VALIDATION.json`              |
| Contact sheet               | `docs/benchmarks/phase-02-7-gate2/contact-sheet.png`                |
| Pivot debug sheet           | `docs/benchmarks/phase-02-7-gate2/pivot-debug-sheet.png`            |
| Selected frames             | `docs/benchmarks/phase-02-7-gate2/selected-frames/`                 |
| Full frame sequence         | `docs/benchmarks/phase-02-7-gate2/frames/` (ignored)                |
| Animation preview           | `docs/benchmarks/phase-02-7-gate2/landing-preview.mp4`              |
| Performance                 | `docs/benchmarks/phase-02-7-gate2/performance.json`                 |
| Defect crops                | `docs/benchmarks/phase-02-7-gate2/defects/`                         |
| Master/render comparison    | `docs/benchmarks/phase-02-7-gate2/master-vs-render.png`             |

## Licensing / approval

The candidate is supplied for review only. No ownership, production license, or
final artistic approval is asserted. The human owner/reviewer must confirm usage
rights and approve the actual artwork before production use.
