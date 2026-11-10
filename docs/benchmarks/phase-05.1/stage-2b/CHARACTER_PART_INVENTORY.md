# Phase 5.1 Stage 2B — Character Part Inventory

**Contract:** `ARTISAN_V2_RIG`  
**Part count:** 31  
**Provider packs:** `artisan_openai_v2`, `artisan_gemini_v2`  
**Status:** contract defined; provider parts not generated (Stage 2B authorization pending)

## Inventory

| Part                     | Node             | Parent       | Draw | Sheet | Joint    | Occlusion         | Cover          | Limits  |
| ------------------------ | ---------------- | ------------ | ---: | ----- | -------- | ----------------- | -------------- | ------- |
| `artisan_turbanTail`     | `turbanTail`     | head         |    0 | head  | —        | —                 | —              | —       |
| `artisan_farHand`        | `farHand`        | farForearm   |    5 | arms  | wrist    | child-over-parent | —              | -70..70 |
| `artisan_farForearm`     | `farForearm`     | farUpperArm  |    3 | arms  | elbow    | cover-over        | farElbowCover  | -140..5 |
| `artisan_farUpperArm`    | `farUpperArm`    | torso        |    2 | arms  | shoulder | parent-over-child | —              | -95..95 |
| `artisan_farDhoti`       | `farDhoti`       | farThigh     |    9 | legs  | —        | —                 | —              | —       |
| `artisan_farThigh`       | `farThigh`       | pelvis       |    6 | legs  | hip      | cover-over        | farDhoti       | -45..45 |
| `artisan_farShin`        | `farShin`        | farThigh     |    7 | legs  | knee     | child-over-parent | —              | -5..85  |
| `artisan_farFoot`        | `farFoot`        | farShin      |    8 | legs  | ankle    | child-over-parent | —              | -35..35 |
| `artisan_pelvis`         | `pelvis`         | root         |   11 | body  | —        | —                 | —              | —       |
| `artisan_nearDhoti`      | `nearDhoti`      | nearThigh    |   15 | legs  | —        | —                 | —              | —       |
| `artisan_nearThigh`      | `nearThigh`      | pelvis       |   12 | legs  | hip      | cover-over        | nearDhoti      | -45..45 |
| `artisan_nearShin`       | `nearShin`       | nearThigh    |   13 | legs  | knee     | child-over-parent | —              | -5..85  |
| `artisan_nearFoot`       | `nearFoot`       | nearShin     |   14 | legs  | ankle    | child-over-parent | —              | -35..35 |
| `artisan_torso`          | `torso`          | pelvis       |   20 | body  | —        | —                 | —              | —       |
| `artisan_sash`           | `sash`           | torso        |   22 | body  | —        | —                 | —              | —       |
| `artisan_necklace`       | `necklace`       | torso        |   26 | body  | —        | —                 | —              | —       |
| `artisan_neck`           | `neck`           | torso        |   25 | head  | neck     | cover-over        | necklace       | -35..35 |
| `artisan_head`           | `head`           | neck         |   30 | head  | neck     | child-over-parent | —              | -35..35 |
| `artisan_eye`            | `eye`            | head         |   31 | head  | —        | —                 | —              | —       |
| `artisan_eyelid`         | `eyelid`         | head         |   32 | head  | —        | —                 | —              | —       |
| `artisan_brow`           | `brow`           | head         |   33 | head  | —        | —                 | —              | —       |
| `artisan_mustache`       | `mustache`       | head         |   34 | head  | —        | —                 | —              | —       |
| `artisan_earring`        | `earring`        | head         |   35 | head  | —        | —                 | —              | —       |
| `artisan_turban`         | `turban`         | head         |   36 | head  | —        | —                 | —              | —       |
| `artisan_shoulderSash`   | `shoulderSash`   | torso        |   37 | body  | —        | —                 | —              | —       |
| `artisan_nearUpperArm`   | `nearUpperArm`   | torso        |   18 | arms  | shoulder | parent-over-child | —              | -95..95 |
| `artisan_nearForearm`    | `nearForearm`    | nearUpperArm |   41 | arms  | elbow    | cover-over        | nearElbowCover | -140..5 |
| `artisan_handOpen`       | `handOpen`       | nearForearm  |   43 | arms  | wrist    | child-over-parent | —              | -70..70 |
| `artisan_handGrip`       | `handGrip`       | nearForearm  |   44 | arms  | wrist    | child-over-parent | —              | -70..70 |
| `artisan_nearElbowCover` | `nearElbowCover` | nearForearm  |   42 | arms  | —        | —                 | —              | —       |
| `artisan_farElbowCover`  | `farElbowCover`  | farForearm   |    4 | arms  | —        | —                 | —              | —       |

## Group counts

| Group                |  Parts |
| -------------------- | -----: |
| Head, face, turban   |      9 |
| Torso, sash, pelvis  |      5 |
| Arms and hands       |      9 |
| Legs, feet and dhoti |      8 |
| **Total**            | **31** |

The body sheet deliberately leaves one 3×2 cell empty. The empty cell is not a missing part; it
keeps the generated sheet readable and avoids inventing an unrelated component.

## Required animation capabilities

- Shoulder: neutral, 45° lift, 90° lift.
- Elbow: straight, 30°, 60°, 90° with elbow-cover artwork.
- Wrist: neutral, gripping, rotated gripping, open-hand swap.
- Hip/knee: straight stance, walking contact, walking swing.
- Neck/head: neutral, small head rotation, blink.

## Provenance rules

- Each pack uses only its own provider’s master and derived sheets.
- No OpenAI part may be mixed into the Gemini pack, or vice versa.
- Stage 2A masters and parts remain the identity references and historical evidence.
- No part is approved solely because its filename exists; `validateProviderPack` and the pose
  review must pass.

## Current per-provider state

| Provider | Master | Stage 2A parts preserved | Stage 2B parts | Pack status                  |
| -------- | ------ | -----------------------: | -------------: | ---------------------------- |
| OpenAI   | yes    |                        4 |             31 | **valid, 31 / 31**           |
| Gemini   | yes    |                        4 |             31 | **valid, 31 / 31, repaired** |

Gemini’s original arms sheet was rejected for merging upper arms and bent forearms; the pack uses
the counted `stage2b-gemini-arms-repair1` sheet. Gemini’s legs were segmented locally from
full-leg cells, its feet use the separate shoe cells, and its thighs were recolored to cloth.
These are local repairs, not silently accepted sheet cells.
