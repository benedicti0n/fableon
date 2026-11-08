# Phase 2.7 Gate 2 — Input Audit

**Status:** **BLOCKED — EXPECTED ARCHIVE ABSENT**  
**Expected archive:** `incoming/fableon-gate2-repaired-candidate-v2.zip`  
**Repository HEAD at audit:** `02bc9a1`  
**Date:** 2026-11-09

## 1. Archive identity

The archive specified by the Gate 2 prompt was not present in the repository.

| Check                                                                     | Result         |
| ------------------------------------------------------------------------- | -------------- |
| `incoming/` directory exists                                              | **No**         |
| `incoming/fableon-gate2-repaired-candidate-v2.zip` exists                 | **No**         |
| Any `.zip` in repository root/incoming                                    | **None found** |
| Matching archive in `/Users/benediction/Downloads` (depth-limited search) | **None found** |
| Matching archive in the OpenCode temporary directory                      | **None found** |
| Git working tree at audit date                                            | Clean          |

No archive was opened, extracted, or executed. No source pixels were modified.

## 2. Source-file list

**Not available.** The following expected files could not be inspected:

```text
README.md
ART_ASSET_QA.json
rig-candidate-v2.json
assets/premium-bird-v1/parts/body.png
assets/premium-bird-v1/parts/head.png
assets/premium-bird-v1/parts/eye.png
assets/premium-bird-v1/parts/beak.png
assets/premium-bird-v1/parts/wing-near.png
assets/premium-bird-v1/parts/wing-far.png
assets/premium-bird-v1/parts/tail.png
assets/premium-bird-v1/parts/leg-left.png
assets/premium-bird-v1/parts/leg-right.png
assets/premium-bird-v1/references/approved-master-reference.png
assets/premium-bird-v1/references/reconstruction-reference-board.png
previews/pose-contact-sheet.png
previews/wings-raised.png
previews/wings-lowered.png
previews/approach.png
previews/contact.png
previews/perched.png
previews/registration-motion-test.mp4
preview_generator.py
```

## 3. Dimensions, hashes, and alpha

**Not available.** No dimensions, SHA-256 hashes, alpha bounds, decoded pixel
data, or QA metadata could be computed because the archive is missing.

Do not treat the dimensions or source-resolution estimates in the Gate 2 prompt
as measured values. They are expectations, not audit results.

## 4. Provisional rig metadata

**Not available.** `rig-candidate-v2.json` could not be inspected. No coordinate
space, pivot values, registration offsets, hierarchy, or draw order were read.

No provisional rig coordinate has been copied into a Fableon manifest.

## 5. Security and integrity review

The absent archive cannot be checked for:

- path traversal (`../`, absolute paths, links);
- executable or unexpected file types;
- ZIP bombs or excessive expansion;
- malformed PNGs;
- duplicate or missing parts;
- hash/QA metadata disagreement.

The Phase 2.6 illustration-pipeline archive reader already enforces safe paths,
a 256-entry limit, a 100 MiB expansion limit, and manifest/asset presence checks.
Those checks will be applied when a real archive is supplied.

## 6. Source artwork limitations (expected)

The Gate 2 prompt describes the candidate as:

- generated/reference-sheet derived, not an approved final illustration;
- containing inferred body/head reconstruction;
- relatively low resolution (approximately 45–266 px part widths);
- using provisional pivots and imperfect registration;
- containing possible feather/joint/edge defects;
- accompanied by a standalone Python/Pillow preview that is not Fableon output.

These are treated as **unverified reports** until the archive is inspected. No
claim about the actual files is made here.

## 7. Blocker decision

**BLOCKED — PREMIUM SOURCE ARTWORK ARCHIVE REQUIRED.**

The Gate 2 implementation cannot proceed without the actual candidate archive.
No replacement character, procedural substitute, fabricated audit, pack, rig
validation, or benchmark will be created.

## 8. Required action

Place the archive at the exact expected path:

```text
incoming/fableon-gate2-repaired-candidate-v2.zip
```

Then re-run the Gate 2 input audit. The next implementation step will:

1. list and validate archive entries without trusting paths;
2. extract to a quarantined candidate directory;
3. verify the nine PNG parts and actual alpha;
4. compute SHA-256 hashes and alpha/content bounds;
5. compare against `ART_ASSET_QA.json` where present;
6. inspect `rig-candidate-v2.json` and document coordinate spaces;
7. proceed only if the source artwork is usable and Gate 1 approval is documented.
