# Phase 5.1 Stage 2C — Rig-First Artwork Production Report

**Date:** 2026-11-11  
**Starting HEAD:** `2610311`  
**Paid Stage 2C calls:** **0**  
**New artwork generated:** **none**  
**Paid gate:** **BLOCKED — pending authorization**

## 1. Starting and final HEAD

| Purpose                                     | Commit                       |
| ------------------------------------------- | ---------------------------- |
| Starting point                              | `2610311`                    |
| Rig-first part contract                     | `2859cbb`                    |
| Master-referenced blueprints and extraction | `af10d87`                    |
| Studio Stage 2C blueprint inspection        | `c5925b8`                    |
| Offline source-art evidence                 | `b7beef2`                    |
| This report                                 | final HEAD after this commit |

No push was performed.

## 2. Source-art failure analysis

The Stage 2B.3 reconstruction and the source masters confirm:

- OpenAI’s master has integrated sleeves, compact curled shoes and a continuous garment.
- OpenAI’s sheets contain a sleeveless torso, separate sleeve segments, duplicate wrist
  decoration and disproportionately large shoes.
- Gemini’s sheets contain simplified tubular arms, altered headwear and changed garment geometry.
- The previous fixed-height registration normalized parts to rig slots rather than to master
  measurements.
- The previous silhouette IoUs (OpenAI 0.5086, Gemini 0.4620) are diagnostic warnings, not
  anatomical error measurements.

## 3. Root causes in the previous workflow

| Defect               | Cause                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| Master/part mismatch | artwork generated as independent sheets, then fit into existing pivots        |
| Fixed-target scaling | every part normalized to preset slot height rather than master segment length |
| Visible seams        | no concealed shoulder/elbow/hip/knee geometry in the source art               |
| Duplicate cuffs      | decoration ownership not assigned before generation                           |
| Gemini tubular arms  | simplified source sheet, not a rig-aware sleeve                               |
| Weak reconstruction  | independently generated parts lack a shared master construction               |

## 4. Registration and scaling improvements

Stage 2C introduces a rig-first contract that records master segment lengths, expected neutral
location, visible region, orientation, allowed uniform scale, hidden overlap, occlusion and
decoration ownership.

The current offline extractor no longer blindly normalizes every part to a fixed height. It records
the measured master/rig segment ratio and marks parts `source-preserved` or `needs-editing`.

However, the first landmark revision still places some inferred joints near the torso/leg
centerline. The blueprints are a starting point, not an approved calibration.

## 5. Rig-first asset schema

`apps/web/lib/providers/stage2c-contract.ts` defines `Stage2CPartSpec` with:

- character/provider/role;
- master source and hash;
- parent/child joints;
- master landmarks;
- expected segment length in master pixels;
- neutral location and visible region;
- orientation;
- allowed scale adjustment;
- hidden overlap;
- occlusion and decoration ownership;
- source provenance;
- provider-generation reference;
- approval status.

Contracts are versioned in:

- `openai-contract.json`;
- `gemini-contract.json`;
- `contracts.json`.

No Stage 2A–2B.3 manifest was mutated.

## 6. Master-preserving decomposition results

Offline source-preserving extraction was produced for:

- near upper arm;
- near forearm;
- near thigh;
- near shin.

Visible master regions were extracted with capsule masks. They preserve the original master's
pixels, motifs and contours in the masked area.

Limitation: the capsule masks still include overlapping clothing and surrounding torso/leg
pixels. They are **not approved production sprites**; they are source-region studies for precise
manual masks and missing-geometry repair.

## 7. Template-conditioned generation results

Not executed. Method B requires fresh Stage 2C authorization. No provider was contacted, no
candidate was generated, and no method winner is declared.

## 8. Actual OpenAI results

- No paid artwork.
- Full guide and four visible-region extracts produced.
- Contract recorded with measured segment lengths.
- Current extraction/landmark placement needs manual refinement before a paid test.
- No new animation candidate.

## 9. Actual Gemini results

- No paid artwork.
- Full guide and four visible-region extracts produced.
- Chroma-key masks and master silhouette handled offline.
- Current extracts need precise masks; the original binary-like alpha edges were not blurred.
- No new animation candidate.

## 10. Accepted and rejected assets

**Accepted production assets: none.**

Offline extracts are marked `unapproved-extraction` in `candidate-inventory.json`. No paid
candidate exists to accept or reject. Existing Stage 2A–2B.3 assets remain preserved.

## 11. Neutral reconstruction

No new assembled Stage 2C candidate exists. The Stage 2B.3 baseline remains:

- OpenAI IoU 0.5086;
- Gemini IoU 0.4620.

Stage 2C does not claim an improved reconstruction.

## 12. Joint-motion evaluation

No new candidate was rendered. Baseline Stage 2B2 joint-stress images are copied for context:

- `joint-stress-openai.png`;
- `joint-stress-gemini.png`.

No Stage 2C MP4 exists because no new arm/leg candidate was approved.

## 13. Before/after visual comparison

Offline evidence:

- `before-after-openai.png` — Stage 2B.3 master/reconstruction/overlay panel;
- `before-after-gemini.png`;
- `openai-full-guide.png`, `gemini-full-guide.png`;
- visible-region extracts for both providers;
- `studio-blueprints.png`.

These are diagnostic, not a claim of final improvement.

## 14. Transparency improvements

- OpenAI native alpha retained; dark antialiased outlines preserved.
- Gemini chroma-key path retained; no whole-part blur or binary-alpha flattening was added.
- No paid candidate exists for before/after edge comparison.

## 15. Source-art consistency

The master remains the source of truth. The offline extracts preserve visible master pixels where
the masks cover them. Source hashes are recorded in the contracts. No master or historical sprite
was modified.

## 16. Actual API usage and costs

**$0.00. Zero paid requests. Zero image-generation calls.**

Pending, not active:

| Provider | Pending ID                    |   Cap | Requests |
| -------- | ----------------------------- | ----: | -------: |
| OpenAI   | `auth_1794337129045_16948671` | $2.00 |        4 |
| Gemini   | `auth_1794337129377_7e5ac5a0` | $1.50 |        4 |

No Stage 2A/2B balance was reused. Pending records require explicit approval.

## 17. Manual repair work

- landmark correction and guide generation;
- capsule mask generation;
- contract/schema creation;
- source-region extraction;
- Studio blueprint inspection.

No manual artwork repainting was performed. No paid repair was requested.

## 18. Technical regressions

| Command             | Result                          |
| ------------------- | ------------------------------- |
| `pnpm format:check` | PASS                            |
| `pnpm lint`         | PASS                            |
| `pnpm typecheck`    | PASS                            |
| `pnpm test`         | PASS — **358 tests / 54 files** |
| `pnpm test:browser` | PASS — **59 tests**             |
| `pnpm build`        | PASS                            |
| Paid calls in CI    | **0**                           |

## 19. Final generated artifacts

- `docs/benchmarks/phase-05.1/stage-2c/SOURCE_ART_AUDIT.md`
- `MASTER_RIG_BLUEPRINT.md`
- `PART_GENERATION_CONTRACT.md`
- `DECOMPOSITION_METHOD_COMPARISON.md`
- `ALPHA_EDGE_EVALUATION.md`
- `NEUTRAL_RECONSTRUCTION.md`
- `JOINT_TEST_EVALUATION.md`
- `COST_ANALYSIS.md`
- `openai-full-guide.png`, `gemini-full-guide.png`
- `openai-visible-*.png`, `gemini-visible-*.png`
- `openai-contract.json`, `gemini-contract.json`, `contracts.json`
- `candidate-inventory.json`
- `before-after-openai.png`, `before-after-gemini.png`
- `joint-stress-openai.png`, `joint-stress-gemini.png`
- `studio-blueprints.png`

Studio inspection: `/studio/folk/rigs/stage-2c`, linked from the connector editor.

## 20. Full commit hashes

| Purpose                                | Commit                       |
| -------------------------------------- | ---------------------------- |
| Starting point                         | `2610311`                    |
| Rig-first part contract                | `2859cbb`                    |
| Master-referenced blueprint/extraction | `af10d87`                    |
| Studio Stage 2C inspection             | `c5925b8`                    |
| Offline source-art evidence            | `b7beef2`                    |
| Final report                           | final HEAD after this commit |

## 21. GO/NO-GO recommendation

**GO for a limited Stage 2C missing-geometry pilot only after explicit authorization.**  
**NO-GO for a full character, full library, film, or Phase 6.**

The offline process now produces master guides, source-preserved visible regions, measured segment
contracts and a Studio inspection surface. The current capsule masks and inferred landmarks still
need manual refinement before paid generation. The next paid test should generate only missing
shoulder/elbow/hip/knee geometry, not full replacement arms or legs.

### Final acceptance

| Category                           | Verdict                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| Rig-first schema                   | **PASS**                                                 |
| Master blueprints                  | **PARTIAL** — landmark placement needs manual refinement |
| Master-preserving extraction       | **PARTIAL** — capsule masks include surrounding clothing |
| Neutral reconstruction improvement | **NOT CLAIMED**                                          |
| Joint test                         | **BLOCKED** — no paid candidate                          |
| Template-conditioned generation    | **BLOCKED** — no authorization                           |
| Cost accounting                    | **PASS** — $0                                            |
| Existing regressions               | **PASS**                                                 |
| Artistic quality                   | **PENDING USER REVIEW**                                  |
