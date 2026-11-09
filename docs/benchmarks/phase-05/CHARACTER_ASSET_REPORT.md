# Phase 5 — Character and Asset Report

**Asset pack:** `apps/web/public/assets/folk-pilot/manifest.json`  
**Generation mode:** original local vector art (`fableon-local-vector`, `fableon-svg-v1`)  
**Paid image API calls:** **0**  
**AI image generation:** **blocked** on this host

## Why AI generation is blocked

The executing host is an Apple M1 MacBook Air with 8 GB unified memory and 7.1 GiB free
disk. It has no NVIDIA GPU, no CUDA runtime, no ComfyUI installation, and no configured
remote image API authorization. Downloading FLUX 3 Klein was not attempted because the
disk headroom is insufficient for a safe checkpoint install and the model cannot run on
this GPU. The pipeline therefore uses original vector masters through the same
provider-agnostic asset contract; no generated-image claim is made.

## Master inventory

| Asset     | Master                  | Size      | SHA-256                                                            |
| --------- | ----------------------- | --------- | ------------------------------------------------------------------ |
| Artisan   | `masters/artisan.png`   | 900×1100  | `c812bf80aaf39d3e52db34414032a19233a686f6edf683207fcb4a1681893615` |
| Horse     | `masters/horse.png`     | 1400×950  | `cd219577ebcdc9b0036c009696a79eeb060db701fd1641bbb038e282781c0950` |
| Cart      | `masters/cart.png`      | 1300×800  | `50f7660f00a37c9d468a72e8801179e545802971aeb628f85104db3f38eafced` |
| Bell      | `masters/bell.png`      | 180×230   | `2d294f4d7d7e9943fb2c0e244e85929a7246ec3bb0a2cb40e779a2b637bab5ff` |
| Courtyard | `masters/courtyard.png` | 2600×1500 | `90d7870cc311d792074f973e2dba81f522075607973c11ea2d41aaed029146c6` |
| Street    | `masters/street.png`    | 2600×1500 | `a748777f5baac194df560f8b937041e215d7f51305347ba3ff2542e7d87a0b1c` |

The editable SVG masters are in `assets/folk-pilot/masters/`. Every PNG part is extracted
from the same master registration, so identity does not drift between parts.

## Part counts

| Actor     |  Parts | Notes                                                                                                             |
| --------- | -----: | ----------------------------------------------------------------------------------------------------------------- |
| Artisan   |     29 | head, turban, turban tail, face parts, torso, sash, pelvis, two arms with open/grip hands, two legs, dhoti panels |
| Horse     |     27 | torso, neck, head, ears, eye, forelock, mane, tail, harness, saddle, four three-segment legs                      |
| Cart      |      4 | body/canopy, near wheel, far wheel, shafts                                                                        |
| Bell      |      1 | complete brass bell                                                                                               |
| **Total** | **61** | each with a stable prefixed ID, hash, byte size, and measured bounding box                                        |

## Joint coverage

Each master was authored so moving parts overlap by at least 20–30 px beyond the visible
joint. Joint discs are deliberately readable as bangles, sleeve bands, harness rings, or
cloth knots. The art direction rule is in
`docs/art-direction/FOLK_ART_STYLE_BIBLE.md`.

Verified normal-pose coverage from the actual film frames:

- shoulders and elbows during the walk and reach;
- hips and knees during the walk and step-back;
- neck/head during the nod and look;
- horse shoulders, hocks, and fetlocks during the gait;
- tail base and tuft during the sway;
- cart wheels at the axle;
- bell at the hand and at the harness.

No transparent hole or doubled limb was observed in the sampled diagnostic frames. A
full deformation audit is not possible because the rig is a 2D cutout; see
`RIGGING_EVALUATION.md`.

## Provenance record

Each manifest part records:

- stable ID (`artisan_torso`, `horse_nearFrontLower`, etc.);
- file path;
- master source box;
- sprite offset and size;
- SHA-256 and byte size;
- origin `original-vector-authored`;
- provider `fableon-local-vector`;
- model `fableon-svg-v1`;
- review status `pending_artistic_approval`.

The source masters are tracked under `assets/folk-pilot/masters/`. The exported parts and
background layers are tracked under `apps/web/public/assets/folk-pilot/`. No paid service
was contacted.

## Review status

**Gate A — asset production: PASS for reusable, clean, provenance-tracked parts.**  
**Artistic approval: PENDING USER REVIEW.** The agent does not substitute its own visual
assessment for user sign-off. The pack is explicitly not labelled “approved production
artwork”.
