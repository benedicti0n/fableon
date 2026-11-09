# Phase 2.7 Gate 2 — Input Audit

**Status:** **AUDITED — CANDIDATE, NOT APPROVED**  
**Archive:** `incoming/fableon-gate2-repaired-candidate-v2.zip`  
**Archive SHA-256:** `7b4f732c3b70d51da9bbcd25db96439791f34ee24094e62811110ab95c43f309`  
**Archive size:** 8,156,360 bytes  
**Audit date:** 2026-11-09  
**Repository HEAD at audit:** `f20768a` (before Gate 2 implementation commits)

## 1. Archive identity and safety

The archive was inspected before extraction:

- 28 entries: 4 directory entries and 24 regular files.
- Single root folder: `fableon-gate2-repaired-candidate/`.
- No absolute paths, `..` traversal, symlinks, or unexpected executable modes.
- Only `.md`, `.json`, `.png`, `.mp4`, and `.py` files are present.
- The Python preview generator was inspected as text and **not executed**.
- The supplied MP4 is a standalone Pillow/Python preview, **not** Fableon output.
- No archive entry was copied into the runtime public asset directory during this
  audit.

The archive was extracted to a quarantined temporary directory for inspection.
Source assets were then copied unchanged into `assets/premium-bird-v1/`; the
candidate metadata and previews were preserved under
`docs/benchmarks/phase-02-7-gate2/source/`.

## 2. Source-file inventory

All nine required PNG parts are present and decode as 8-bit RGBA PNGs.

| Part      | File                  | Dimensions | SHA-256                                                            | QA hash match | Alpha range | Content bounds (x,y,w,h) | Transparent px | Opaque px | Near-white fringe px | Black fringe px |
| --------- | --------------------- | ---------- | ------------------------------------------------------------------ | ------------- | ----------- | ------------------------ | -------------: | --------: | -------------------: | --------------: |
| body      | `parts/body.png`      | 266×161    | `e6fc1f902f6b342279f1976f7155070e48de6683c64d9dd012c42cecacc98d07` | yes           | 0–255       | 7,0,254,161              |          14431 |     27634 |                    0 |               0 |
| head      | `parts/head.png`      | 205×160    | `cfeeaf5777099e9ee814e1dd41fdcc3275f37b1e10a293287b6bdf4f48dab9b3` | yes           | 0–255       | 18,4,166,156             |          14397 |     17572 |                    0 |               0 |
| eye       | `parts/eye.png`       | 45×45      | `c0db91cd3041348937e0c41a121833b087166ff69dd1f5e360f6f8a462dc6f0a` | yes           | 0–255       | 4,4,37,37                |            971 |       794 |                   66 |               0 |
| beak      | `parts/beak.png`      | 65×40      | `6b5608391fbcbe1b3401da6d13c81247013223f74525bd4614fc34fe05a551b1` | yes           | 0–255       | 4,4,57,32                |           1451 |       848 |                  102 |               0 |
| wing-near | `parts/wing-near.png` | 168×149    | `7f2d341bb08f03979c4c5e2d26810e0e2f84efa9c932062146b79b0d0f9d8404` | yes           | 0–255       | 4,4,160,141              |          12157 |     11842 |                  259 |               0 |
| wing-far  | `parts/wing-far.png`  | 163×149    | `c963b91ead947578324f5e240c416b21ab67f9406badf8111967505f4b646b01` | yes           | 0–255       | 4,4,155,141              |          12377 |     10771 |                  283 |               0 |
| tail      | `parts/tail.png`      | 131×119    | `a6a3b4b4c1db22b03359ab0648084c5dd483694d9fb0dd5faaf0eae45d3ed84c` | yes           | 0–255       | 4,4,124,111              |           8368 |      6381 |                  193 |               0 |
| leg-left  | `parts/leg-left.png`  | 93×138     | `7f9978cb3b84bf0f1904ee36ab3cc078c785312420289dcf9181cf8b7327e142` | yes           | 0–255       | 4,4,85,130               |          10369 |      1524 |                  265 |               0 |
| leg-right | `parts/leg-right.png` | 101×121    | `cfe62c9d85cb35dcb1370b6328794ffb714abc750933c9d1122a9726b51d33c0` | yes           | 0–255       | 4,4,93,113               |           9887 |      1448 |                  229 |               0 |

The supplied `ART_ASSET_QA.json` hashes and dimensions match all measured values.
The QA transparent-pixel counts also match.

The “near-white fringe” count is a count of semi-transparent pixels with
R/G/B ≥ 245. It is a **potential halo indicator**, not proof of a defect; bright
feather highlights and antialiased edges can produce the same signature.
No black fringe pixels were detected.

All parts have transparent margins. Trimming was **not** applied in the canonical
pack, so source bytes and dimensions are preserved exactly.

## 3. Reference and preview assets

| Asset                                           | Dimensions / properties    | Status                            |
| ----------------------------------------------- | -------------------------- | --------------------------------- |
| `references/approved-master-reference.png`      | 1536×1024                  | Present; source design reference  |
| `references/reconstruction-reference-board.png` | 1536×1024                  | Present; reconstruction reference |
| `previews/pose-contact-sheet.png`               | 1808×790                   | Present; external PIL preview     |
| `previews/wings-raised.png`                     | 960×540                    | Present; external PIL preview     |
| `previews/wings-lowered.png`                    | 960×540                    | Present; external PIL preview     |
| `previews/approach.png`                         | 960×540                    | Present; external PIL preview     |
| `previews/contact.png`                          | 960×540                    | Present; external PIL preview     |
| `previews/perched.png`                          | 960×540                    | Present; external PIL preview     |
| `previews/registration-motion-test.mp4`         | 960×540, 48 frames, 24 fps | Present; **not Fableon output**   |

The preview generator is a standalone Python/Pillow script. Its MP4 cannot be
used as evidence that the Fableon renderer or rig works.

## 4. Source artwork limitations

The candidate README and QA metadata state:

- artwork was extracted from generated reference boards, not authored as true
  transparent layers;
- body and head are inferred reconstructions, not faithful reveals of hidden
  pixels;
- source parts are low resolution (45–266 px wide), not full-HD production art;
- seams, feather edges, wing anatomy, and leg/body contacts need human review;
- the diagnostic test was rendered with PIL, not Fableon;
- no valid `fableon.illustration-pack` manifest was supplied.

These limitations are accepted for Gate 2 integration validation. They are not
resolved by upscaling.

## 5. Provisional rig metadata

`rig-candidate-v2.json` uses a **960×540 diagnostic coordinate system**:

- x right, y down;
- body top-left at `(300, 225)` in the perched preview;
- joints are relative to body top-left unless the parent is head;
- draw order is tail, wing-far, leg-left, leg-right, body, wing-near, head, beak,
  eye;
- source-space pivots and joints are listed per part.

Provisional pivots/joints:

| Part      | Parent | Pivot  | Local joint | Scale |
| --------- | ------ | ------ | ----------- | ----- |
| body      | —      | 0,0    | 0,0         | 1     |
| head      | body   | 0,0    | 151,−34     | 1     |
| eye       | head   | 22,22  | 140,56      | 0.62  |
| beak      | head   | 8,22   | 175,65      | 0.72  |
| wing-near | body   | 148,23 | 145,65      | 1     |
| wing-far  | body   | 147,25 | 163,51      | 0.94  |
| tail      | body   | 118,18 | 77,114      | 0.9   |
| leg-left  | body   | 53,13  | 142,145     | 0.63  |
| leg-right | body   | 53,12  | 193,145     | 0.64  |

**These coordinates are provisional and are not copied directly into a
1920×1080 animation.** The canonical pack uses source-space pivots. The Gate 2
rig applies a 2× display scale and a scene offset, and separates:

- source-image coordinates;
- body-local joint coordinates;
- pack registration (960×540 diagnostic layout);
- world/scene coordinates (1920×1080).

The prototype body and head pivots at `(0,0)` are not suitable rotation centers.
The canonical rig moves the body pivot to `(133,80)` and the head pivot to
`(30,150)`, preserving the same visible top-left registration through the
draw-offset mapping. This is a rig conversion, not a source-pixel change.

## 6. Identified risks

| Risk                                 | Severity      | Notes                                                                         |
| ------------------------------------ | ------------- | ----------------------------------------------------------------------------- |
| Low native resolution                | Major         | Parts are 45–266 px wide; 2× display scale will soften detail                 |
| Inferred body/head reconstruction    | Major         | Not a faithful reveal of occluded source pixels                               |
| Wing shoulder coverage inferred      | Major         | Possible gaps/holes when wings rotate                                         |
| White/light semi-transparent fringes | Minor–Major   | Potential halos against dark backgrounds; must inspect rendered edges         |
| Provisional registration             | Major         | Requires source-space pivot conversion and visual QA                          |
| Leg length mismatch                  | Major         | Left leg is 138 px tall, right is 121 px; right-foot contact needs adjustment |
| Body/head styling mismatch           | Major         | Reconstructed parts may differ from extracted parts                           |
| External PIL preview                 | Informational | Not production validation                                                     |
| Character identity vs master sheet   | Major         | Extracted/reconstructed parts may not match approved design closely enough    |

## 7. Audit decision

The archive is safe to ingest and contains the nine required parts with valid
alpha and hashes. It is **not** approved production artwork and its provisional
rig is not validated.

Proceed to canonical pack conversion and Fableon rig validation, while keeping
Gate C artistic approval **PENDING USER REVIEW**.
