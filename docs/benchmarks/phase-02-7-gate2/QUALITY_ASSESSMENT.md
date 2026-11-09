# Phase 2.7 Gate 2 — Quality Assessment

> **Gate 2 candidate — not approved production artwork.** These ratings are
> based on the actual Fableon-rendered frames, the source part sheet, the pivot
> debug sheet, and defect crops. Technical integration is not artistic approval.

## Evidence reviewed

- `docs/benchmarks/phase-02-7-gate2/landing-preview.mp4`
- `docs/benchmarks/phase-02-7-gate2/contact-sheet.png`
- `docs/benchmarks/phase-02-7-gate2/selected-frames/`
- `docs/benchmarks/phase-02-7-gate2/pivot-debug-sheet.png`
- `docs/benchmarks/phase-02-7-gate2/character-parts.png`
- `docs/benchmarks/phase-02-7-gate2/master-character.png`
- `docs/benchmarks/phase-02-7-gate2/master-vs-render.png`
- `docs/benchmarks/phase-02-7-gate2/source-poses-contact-sheet.png`
- `docs/benchmarks/phase-02-7-gate2/forest-preview.png`
- `docs/benchmarks/phase-02-7-gate2/defects/`
- `docs/benchmarks/phase-02-7-gate2/PACK_VALIDATION.json`
- `docs/benchmarks/phase-02-7-gate2/RIG_VALIDATION.json`
- `docs/benchmarks/phase-02-7-gate2/performance.json`

## Technical results

| Check                          | Result                                   |
| ------------------------------ | ---------------------------------------- |
| Canonical pack validation      | PASS — 9 parts, v1 schema                |
| Source/prepared hash identity  | PASS — zero re-encoding or pixel edits   |
| Portable pack export/re-import | PASS — verified by test                  |
| Part mapping / hierarchy       | PASS — 9 nodes, explicit order           |
| Foot lock (frames 30–47)       | PASS — max drift 1.14e-13                |
| Deterministic evaluation       | PASS — 48/48 repeated equal              |
| 48-frame render                | PASS — 1920×1080, 24 FPS, 2.000 s MP4    |
| Background                     | Diagnostic Phase 2.5 forest, not premium |

## Ratings

| Criterion                   | Rating                            | Explanation                                                                                   |
| --------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| Import/data integrity       | **PASS**                          | ZIP safety, hashes, dimensions, pack validation, archive round-trip                           |
| Rig compatibility           | **PASS**                          | Pivots map without offsets; hierarchy/order/foot lock/determinism pass                        |
| Animation rendering         | **PASS**                          | Actual Fableon Canvas output; 48 frames; no missing/blank frames                              |
| Character consistency       | **PASS (within pack)**            | Same nine assets and identity across all frames                                               |
| Identity vs approved master | **PARTIAL**                       | Candidate body/head are inferred, broader/rounder, lower-detail, and stylistically simplified |
| Illustration quality        | **PARTIAL**                       | Noticeably more painterly than Phase 2.5, but not production-grade                            |
| Feather anatomy             | **PARTIAL**                       | Wings have readable layered feathers; head/body feather joins are cut seams                   |
| Painted material richness   | **PARTIAL**                       | Good color/texture on wings and body; low-resolution softness and cut edges                   |
| Edge/alpha quality          | **FAIL**                          | Jagged head/body matte edges, visible halos, hard wing-root overlay                           |
| Wing animation              | **PARTIAL**                       | Clear raised/lowered/folded poses; wing roots read as rotating plates                         |
| Landing plausibility        | **PARTIAL**                       | Contact works after registration adjustment; no toe grip or weight deformation                |
| Background quality          | **FAIL (for premium comparison)** | Diagnostic procedural forest; not premium art                                                 |
| Image fidelity              | **PASS**                          | Source and prepared hashes identical; production renderer uses exact source bytes             |
| Temporal consistency        | **PASS**                          | Deterministic; no missing parts or intentional flicker observed                               |
| Production suitability      | **NOT READY**                     | Visible artwork defects prevent production use                                                |
| Artistic approval           | **PENDING USER REVIEW**           | Not self-certified                                                                            |

## Defect inventory

### D01 — Head/body neck seam and jagged matte edge

- **Affected parts:** head, body
- **Frames:** all; most visible in 24–47 and close-up
- **Severity:** **Critical**
- **Evidence:** `defects/01-head-neck-seam.png`,
  `defects/04-body-matte-edge.png`
- **Observed:** The head’s left/back edge is a jagged, light cutout over the
  body. The neck transition is not painted and reads as a layered cutout.
- **Likely cause:** Head/body inferred reconstructions with an estimated
  saturation matte; no authored neck overlap/feather transition.
- **Repair type:** **Artwork.**
- **Proposed remedy:** Repaint/rebuild head and body as true overlapping layers
  with a feathered neck transition; decontaminate alpha edges; match the master
  reference. Do not hide this by moving the head alone.

### D02 — Wing-root hard seam and halo

- **Affected parts:** wing-near, body; possibly wing-far
- **Frames:** 0, 4, 8, 16, 24, 30, 33, 47
- **Severity:** **Major**
- **Evidence:** `defects/02-wing-root-halo.png`
- **Observed:** The near wing sits over the body as a cut sprite. Its root has a
  hard/light edge and lacks covert feathers/body overlap, so rotation exposes
  the cutout construction.
- **Likely cause:** Extracted wing with a hard matte and no authored
  shoulder/covert geometry.
- **Repair type:** **Artwork** (minor rig overlap could help after the art is
  repaired).
- **Proposed remedy:** Paint wing-root coverts and the under-wing body surface;
  create a feathered transparent root; re-mat at higher resolution.

### D03 — White/light alpha fringe

- **Affected parts:** head, body, wings, tail, beak, legs
- **Frames:** all
- **Severity:** **Major**
- **Evidence:** `character-parts.png`, `defects/01-head-neck-seam.png`,
  `defects/02-wing-root-halo.png`, `defects/04-body-matte-edge.png`
- **Observed:** Semi-transparent near-white fringe pixels are visible against
  the dark forest. Edges look jagged and “stuck on” rather than painted.
- **Likely cause:** Estimated saturation mattes; 66–283 near-white fringe pixels
  measured per affected part in the input audit.
- **Repair type:** **Artwork.**
- **Proposed remedy:** Re-extract/re-mat from higher-quality source with proper
  straight-alpha/color decontamination. Do not merely erode alpha or apply a
  blur; that would damage feather edges.

### D04 — Low source resolution and softness

- **Affected parts:** all
- **Frames:** all
- **Severity:** **Major**
- **Evidence:** `character-parts.png`; full-resolution selected frames
- **Observed:** Source sprites are 45–266 px wide. At 1920×1080 and 2× display,
  feather detail is visibly softened; the bird cannot carry a close-up at
  production resolution.
- **Likely cause:** Candidate extracted from reference boards, not authored at
  final resolution.
- **Repair type:** **Artwork.**
- **Proposed remedy:** Supply artist-authored parts at 2048+ px on the long edge
  (or a higher-resolution source crop) with preserved detail.

### D05 — Body/head anatomy and identity drift from the approved master

- **Affected parts:** head, body
- **Frames:** all
- **Severity:** **Major**
- **Evidence:** `master-vs-render.png`, `source-poses-contact-sheet.png`
- **Observed:** The candidate body is broader/longer, the head is more rounded
  and proportionally larger, and feather markings are simplified relative to the
  master reference. The rendered bird is recognizable but not a faithful
  production match.
- **Likely cause:** Model-generated/inferred body/head reconstructions rather
  than authored master parts.
- **Repair type:** **Artwork.**
- **Proposed remedy:** Repaint body/head from the approved master at higher
  resolution; match silhouette, feather groups, markings, and lighting; re-run
  identity review.

### D06 — Rigid sprite/puppet motion

- **Affected parts:** all
- **Frames:** all
- **Severity:** **Major** for production, expected in Gate 2
- **Evidence:** MP4, contact sheet, pivot-debug sheet
- **Observed:** Wings rotate as rigid plates; body motion is transform-driven;
  there is no feather deformation, soft-body settling, or toe grip.
- **Likely cause:** Deliberate Phase 2.5/Gate 2 sprite rig; no skeletal deformation
  or IK.
- **Repair type:** **Engineering / Phase 3.**
- **Proposed remedy:** Phase 3 deformation/rig work after artwork is production
  quality. Do not attempt to solve this with more transform tuning alone.

### D07 — Foot contact lacks toe grip

- **Affected parts:** leg-left, leg-right
- **Frames:** 30–47
- **Severity:** **Minor**
- **Evidence:** `defects/03-foot-contact.png`
- **Observed:** Both feet now touch/overlap the branch after a 12 px vertical registration
  adjustment, but the toes remain flat and do not curl or grip the branch.
- **Likely cause:** Rigid foot art; no toe articulation.
- **Repair type:** **Artwork + future engineering.**
- **Proposed remedy:** Author perching toe curvature; add toe joints in Phase 3 or
  a per-foot contact pose.

### D08 — Beak/facial edge softness

- **Affected parts:** beak, head
- **Frames:** all
- **Severity:** **Minor**
- **Evidence:** `character-parts.png`, close-up crops
- **Observed:** The beak is low-resolution and has a slightly dark outline; the
  eye is coherent but simple.
- **Likely cause:** Low-resolution extracted beak/eye.
- **Repair type:** **Artwork.**
- **Proposed remedy:** Higher-resolution beak and face edge cleanup.

### D09 — Far-wing/shoulder coverage incomplete

- **Affected parts:** wing-far, body
- **Frames:** flight/braking frames
- **Severity:** **Minor–Major**
- **Evidence:** `defects/02-wing-root-halo.png`, pivot-debug sheet
- **Observed:** The far wing is mostly a separate plate; hidden shoulder/body
  coverage is not fully authored.
- **Likely cause:** Extracted/fabricated parts; no complete hidden-side surface.
- **Repair type:** **Artwork.**
- **Proposed remedy:** Paint/author far-wing shoulder and body underlay.

### D10 — Background is diagnostic, not premium

- **Affected scene:** environment
- **Frames:** all
- **Severity:** **Major for the artistic comparison**
- **Evidence:** `forest-preview.png`, contact sheet
- **Observed:** The Phase 2.5 procedural forest has repeated leaf dashes, simple
  trunks, and a straight branch. It is not the premium forest specified for the
  final benchmark.
- **Likely cause:** No premium forest asset was included in the Gate 2 archive.
- **Repair type:** **Artwork dependency.**
- **Proposed remedy:** Supply the premium forest/branch artwork; do not
  procedurally replace it.

## Checked and not observed

- No missing parts in any frame.
- No blank frames.
- No duplicate eye/beak.
- No detached wing or tail by gross silhouette.
- No visible foot sliding after contact (max drift 1.14e-13).
- No nondeterministic frame transforms.
- No unexpected browser errors or missing assets.

The absence of a gross failure does not override the visible matte/seam defects.

## Comparison with Phase 2.5

The candidate is a **clear illustration improvement** over the Phase 2.5
procedural bird:

- richer feather texture and more natural wing detail;
- warmer, more cohesive character palette;
- more expressive eye/face;
- better body volume and less flat vector construction.

It is still **not production-ready**:

- the Phase 2.5 sprite had cleaner matte joins (though flatter art);
- the Gate 2 candidate exposes cutout seams, halos, low resolution, and inferred
  anatomy;
- the diagnostic forest is below the premium target.

This supports the conclusion that the asset pipeline works, but the candidate
artwork needs repair/higher-resolution authoring.

## Prioritized next actions

1. **Artwork repair (blocking):** rebuild head/body neck transition and wing
   roots; re-mat edges without halos; match the approved master.
2. **Resolution:** obtain higher-resolution transparent parts (2048+ px) from
   the illustrator or a controlled higher-resolution source.
3. **Face/feet:** author beak, eye, and perching feet with clear attachment.
4. **Background:** supply the premium forest and branch assets.
5. **Phase 3:** add deformation/IK/contact after the art is stable. Do not
   continue adjusting transforms to compensate for artwork defects.

## Gate decision

| Gate                            | Decision                                     |
| ------------------------------- | -------------------------------------------- |
| A — Import/data integrity       | **PASS**                                     |
| B — Rig/animation compatibility | **PASS**                                     |
| C — Artistic quality            | **PENDING USER REVIEW**                      |
| Production suitability          | **NOT READY**                                |
| Phase 3 recommendation          | **NO-GO until artwork is repaired/approved** |

The pipeline successfully imported, assembled, and animated the candidate. The
candidate is technically usable and visually improved, but its seams, halos,
resolution, inferred anatomy, and rigid motion make it unsuitable for production
without another artwork pass.
