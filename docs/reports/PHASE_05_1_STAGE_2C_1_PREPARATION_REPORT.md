# Phase 5.1 Stage 2C.1 — Preparation Report

**Date:** 2026-11-11  
**Starting HEAD:** `79ac068`  
**Paid calls:** **0**  
**New artwork:** **none**  
**Verdict:** landmarks corrected; extraction masks still fail the production gate

## 1. Summary

Stage 2C.1 corrected the anatomical landmark overlays and replaced the Stage 2C capsule masks with
explicit source masks and missing-geometry maps.

The corrected landmarks now follow the visible near/far limbs on both masters. The extraction
masks are better targeted than the old capsules, but the color-connected segmentation still
under-segments shaded sleeve/skin areas and can retain nearby clothing. They are **not approved
production sprites**.

Paid generation remains blocked.

## 2. Starting state

- HEAD verified at `79ac068`.
- Stage 2C contracts, blueprints, reports and pending authorizations preserved.
- Original masters and all historical artwork unchanged.

## 3. Corrected landmarks

Created Stage 2C.1-only landmark records:

- `openai-landmarks.json`
- `gemini-landmarks.json`

Overlays:

- `openai-landmarks.png`
- `gemini-landmarks.png`

Observed landmarks: head center, eye, nose.  
Manual visible landmarks: near shoulder, elbow, wrist, hip, knee, ankle, sole.  
Inferred: far-side joints where the master occludes them.

The corrected overlays place the near arm on the visible right sleeve/forearm and the near leg on
the visible dhoti/shin band, rather than following the torso centerline.

## 4. Masks and extracts

Produced per provider:

- `mask-nearUpperArm.png`, `mask-nearForearm.png`, `mask-nearThigh.png`, `mask-nearShin.png`
- `extract-*.png`
- `missing-*.png`
- combined `missing-geometry-{provider}.png`
- `neutral-preview-{provider}.png`

The masks are explicit, editable, source-preserving PNGs. They do not flatten or blur the original
outlines.

### Failed extraction gate

The color-connected masks:

- remove most surrounding clothing;
- preserve original pixels and dark outline fragments;
- but under-segment shaded blue sleeve and skin regions, and can include small clothing motifs in
  the thigh mask.

No mask is marked approved. `neutral-preview-{provider}.png` is a review image, not a production
sprite.

## 5. Missing geometry

The missing maps identify the regions that actually require source-preserving paid editing:

- shoulder hidden sleeve extension;
- elbow gusset;
- hip/dhoti overlap;
- knee gusset.

The full list is in `PAID_EDIT_REGIONS.md`. These are localized missing regions, not full-part
regeneration.

## 6. Contracts

Updated Stage 2C.1 contracts:

- `openai-contract.json`
- `gemini-contract.json`
- `contracts.json`

They record corrected landmarks, master hashes, source masks, extracts, missing zones and
`needs-review` status. Historical Stage 2C contracts were not mutated.

## 7. Neutral preview

The neutral previews show the visible extracted regions isolated on a dark background. They confirm:

- source pixels are preserved;
- the arm/leg masks are incomplete;
- hidden joint geometry is still absent.

No assembled production character is claimed.

## 8. Paid gate

**$0.00 spent. No OpenAI or Gemini request.**

Pending Stage 2C authorizations remain inactive:

- OpenAI `auth_1794337129045_16948671` — $2.00 / 4 requests;
- Gemini `auth_1794337129377_7e5ac5a0` — $1.50 / 4 requests.

No new authorization was created or activated.

## 9. Validation

| Command             | Result                                                        |
| ------------------- | ------------------------------------------------------------- |
| `pnpm format:check` | PASS                                                          |
| `pnpm lint`         | PASS                                                          |
| `pnpm typecheck`    | PASS                                                          |
| `pnpm test`         | PASS — 358 tests / 54 files                                   |
| `pnpm build`        | PASS (no app changes since Stage 2C gate)                     |
| `pnpm test:browser` | PASS — 59 tests (Stage 2C browser run; no UI changes in 2C.1) |

No new MP4 was rendered because no approved mask/candidate exists.

## 10. Remaining work before paid editing

1. Manually correct the four masks per provider in the Studio/asset workflow.
2. Approve landmarks and masks explicitly.
3. Assemble the visible regions through the connector rig and verify neutral alignment.
4. Send only the marked missing shoulder/elbow/hip/knee zones to a provider after fresh approval.
5. Keep the existing pending authorizations inactive until then.

## 11. Final verdict

| Category              | Verdict                                             |
| --------------------- | --------------------------------------------------- |
| Corrected landmarks   | **PARTIAL / PASS for overlay review**               |
| Source masks          | **FAIL — under-segmented, needs manual correction** |
| Missing-geometry maps | **PASS as diagnostic**                              |
| Neutral preview       | **PARTIAL — hidden geometry absent**                |
| Paid gate             | **BLOCKED**                                         |
| API spending          | **$0.00**                                           |
| Artistic quality      | **PENDING USER REVIEW**                             |

Stage 2C.1 stops here, as required. Do not submit paid generation requests from these masks.
