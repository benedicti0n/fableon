# Phase 5.1 Stage 2B.1 — Motion Refinement Report

**Date:** 2026-11-10  
**Starting HEAD:** `01c1cd0`  
**Mode:** code-only rigging and animation refinement  
**Paid API calls:** **0**  
**Image/video generation calls:** **0**  
**Scope:** existing OpenAI and Gemini Stage 2B packs only

## 1. Executive summary

Stage 2B.1 rebuilt the motion layer without generating or replacing any artwork. The main defects
were mechanical, not primarily visual:

- the walk used ankle-local gait targets rather than a measured sole-contact anchor;
- the reach solved the wrist toward an interpolated point, not the hand’s actual grip point;
- the bell and pedestal were evaluated in different coordinate spaces;
- the camera bounds ignored the bell and treated rig-local positions as screen positions;
- grip/release had no contact validation or explicit interaction state.

Those defects are now corrected in a new Stage 2B.1 motion layer. Both provider packs render
polished eight-second tests with:

- zero measurable stance-foot drift;
- 28 px swing clearance;
- hand-to-target error reduced from ~107–109 px to 6–14 px;
- contact-gated bell attachment and continuous release;
- a shared camera that contains turban, feet, hands and prop.

The remaining shoulder, elbow, wrist-band and Gemini arm defects are **artwork-dependent**. The
motion is measurably better, but the cutout construction still limits final artistic quality.

## 2. Starting and final Git HEAD

| Purpose                                          | Commit                       |
| ------------------------------------------------ | ---------------------------- |
| Starting point                                   | `01c1cd0`                    |
| Stage 2B.1 gait, reach, grip and bounds controls | `7d126b8`                    |
| Stage 2B.1 polished/diagnostic renderer          | `2692cc1`                    |
| Stage 2B.1 motion evidence and measurements      | `0a4eb6f`                    |
| This report                                      | final HEAD after this commit |

No push was performed.

## 3. Initial visual defects

The Stage 2B review identified:

- OpenAI: bulky/disconnected shoulder, visible elbow seam, double wrist bands, oversized shoes,
  weak weight transfer, imprecise grip.
- Gemini: tubular upper arms, awkward torso/shoulder registration, headwear near the top edge,
  conspicuous elbow/forearm layering, stiff walk, weak hand-to-bell contact.
- Shared: cardboard-like independent limb rotation, foot sliding, reach not arriving at the
  target, grip lacking contact timing, framing that ignored moving accessories.

## 4. Root causes

| Defect                     | Root cause                                                                   | Code-fixable?            |
| -------------------------- | ---------------------------------------------------------------------------- | ------------------------ |
| Foot sliding               | gait targets were ankle-local; no sole-contact point or stance anchor        | Yes                      |
| Stiff walk                 | no duty-cycle stance/swing split, no pelvis weight shift                     | Yes                      |
| Reach miss                 | arm solved to a wrist target from a lerped point, not the hand grip point    | Yes                      |
| Floating bell              | bell/pedestal mixed rig-local and world spaces                               | Yes                      |
| Grip before contact        | bell attached from phase alone, no contact tolerance                         | Yes                      |
| Turban clipping            | camera bounds ignored accessories and bell; rig-local bell treated as screen | Yes                      |
| Shoulder oval / elbow seam | source sprites lack hidden shoulder geometry; elbow cover is small           | Mostly artwork-dependent |
| Double wrist bands         | hand sprite and forearm cuff both contain gold bands                         | Artwork-dependent        |
| Tubular Gemini arm         | upper arm and forearm are simple sleeve tubes                                | Artwork-dependent        |

## 5. Changes to joint construction

No new artwork was generated. The Stage 2B packs and original hashes are preserved unchanged.

The Stage 2B.1 motion layer:

- keeps the existing 31-part hierarchy and elbow-cover nodes;
- uses the pack’s measured foot contact metadata rather than a generic ankle pivot;
- uses the pack’s hand grip offset rather than the sprite center;
- keeps torso-over-upper-arm and forearm-over-upper-arm occlusion;
- adds configurable contact offsets and per-provider overrides without provider branches in the
  motion algorithm.

Joint appearance remains limited by the source art. No flat-colored patch or invented sleeve was
added. This is reported as a limitation, not disguised as a fix.

## 6. Changes to walking

`stage2b1-motion.ts` adds:

- a configurable gait duty cycle (`0.62` base, `0.60` variation);
- a stance anchor derived from root position at contact time;
- a measured sole-contact offset from the foot pivot;
- ankle targets solved backward from the planted sole;
- a swing trajectory with smoothstep position and sinusoidal lift;
- foot rotation only during swing;
- pelvis sway toward the stance side;
- compression bob at contact;
- forward torso lean;
- opposing arm swing inherited from the existing rig motion.

The stance foot is locked in world space, not merely in local animation space.

## 7. Changes to arm IK

The reach now:

1. converts the world bell target into character-local space;
2. computes the wrist target from the hand grip offset;
3. solves the two-bone chain with the actual upper-arm and forearm lengths;
4. resolves the hand, measures the actual grip point, and iterates the wrist target;
5. blends the solved arm with the rest pose through anticipation and return;
6. clamps unreachable targets through the existing two-bone solver.

If the target remains outside tolerance, the interaction becomes `blocked`; the bell is not
attached.

## 8. Changes to grip and release

Interaction states implemented:

`approaching → contact → gripping → carrying → releasing → settled`

Rules:

- attachment requires the grip phase **and** contact error within tolerance;
- the bell follows the resolved hand grip transform while carried;
- the open/grip hand swap is exclusive;
- release interpolates the bell from the pickup target to the pedestal over eight frames;
- the settled state holds the pedestal position;
- no teleport, gravity simulation or hidden second hand.

## 9. Camera-framing fixes

The renderer now:

- computes animated bounds from every visible part, including turban, feet, hands, dhoti and bell;
- unions bounds across both providers and both motion configurations;
- uses one shared camera for A/B fairness;
- converts rig-local bell positions into screen space before fitting;
- applies safe margins without zooming or jumping during playback.

Final shared camera:

```json
{ "scale": 1, "x": 32.67779683457775, "y": 23.90360848280835 }
```

Animated union bounds:

```json
{
  "minX": 248.54786576759852,
  "minY": -14.669542402771917,
  "maxX": 966.0965405632459,
  "maxY": 686.8623254371552
}
```

Both turban and feet remain inside the 1280×720 frame.

## 10. Motion-timing improvements

- Reach uses smooth anticipation, extension and return.
- Grip contact holds before the hand pose swaps.
- Release has a short settle rather than an instant detach.
- Turban tail, sash and shoulder sash receive phase-based secondary lag.
- Head tracking follows the bell target and returns.
- Blink timing remains configurable per provider/preset.
- No general cloth simulation or accumulated physics state was introduced.

## 11. Before/after measurements

| Measurement                   |                       Stage 2B |                       Stage 2B.1 |
| ----------------------------- | -----------------------------: | -------------------------------: |
| Hand-to-target error, contact |                      107.45 px | 11.56 px OpenAI / 6.02 px Gemini |
| Hand-to-target error, grip    |                      108.79 px | 13.61 px OpenAI / 6.80 px Gemini |
| Maximum stance-foot drift     | not measured / visibly sliding |              **1.14 × 10⁻¹³ px** |
| Maximum swing clearance       |                   not measured |                     **28.00 px** |
| Root displacement during walk |                         320 px |                           320 px |
| Bell attachment gate          |                     phase only |        contact tolerance ≤ 14 px |
| Camera scale                  |      provider-specific framing |                   **1.0 shared** |

Measured stance spans are zero to floating-point precision for both feet. The remaining hand
errors are within the configured 14 px tolerance and are visible as a small palm-to-bell offset,
not a floating prop.

## 12. Before/after visual evidence

- `docs/benchmarks/phase-05.1/stage-2b1/comparison-contact-sheet.png`
- `docs/benchmarks/phase-05.1/stage-2b1/before-after-openai.mp4`
- `docs/benchmarks/phase-05.1/stage-2b1/before-after-gemini.mp4`
- `docs/benchmarks/phase-05.1/stage-2b1/provider-side-by-side.mp4`
- `docs/benchmarks/phase-05.1/stage-2b1/openai-joint-stress.png`
- `docs/benchmarks/phase-05.1/stage-2b1/gemini-joint-stress.png`

The contact sheet uses frames 0, 104 (contact), 120 (grip) and 168 (settled) for both before and
after versions.

## 13. OpenAI results

- Walk: stance foot locks; pelvis shifts toward the stance side; swing foot clears by 28 px.
- Reach: hand arrives at the bell within 11.6 px contact / 13.6 px grip.
- Grip: bell follows the grip hand; no floating prop in the contact frames.
- Release: bell settles to the pedestal; hand returns with the reach weight.
- Camera: turban, feet and hands fit.
- Remaining: shoulder sleeve seam, elbow cuff seam, double wrist band, oversized curled shoes.

## 14. Gemini results

- Walk: stance lock and swing clearance match OpenAI.
- Reach: hand arrives within 6.0 px contact / 6.8 px grip.
- Grip: bell attaches to the grip hand; the arm still reads as a blue tube.
- Release: bell settles; turban remains inside frame.
- Camera: shared camera prevents turban clipping.
- Remaining: tubular upper arm, heavy turban band over the eye, torso shoulder registration,
  forearm/elbow layering, dhoti edge artifacts.

## 15. Remaining artwork limitations

| Defect                          | Classification        | Notes                                                             |
| ------------------------------- | --------------------- | ----------------------------------------------------------------- |
| Shoulder oval/sleeve disconnect | **Artwork-dependent** | source upper-arm art has no hidden shoulder cap                   |
| Elbow seam                      | Mixed                 | code overlap/cover helps; sprite cuff geometry limits final seam  |
| OpenAI double wrist band        | **Artwork-dependent** | hand and forearm both include gold bands                          |
| Oversized curled shoes          | **Artwork-dependent** | shoe silhouette dominates the leg motion                          |
| Gemini tubular arm              | **Artwork-dependent** | sleeve and forearm are simple tubes                               |
| Gemini turban band over eye     | Mixed                 | turban pivot improved; band is baked into the sheet               |
| Dhoti/clothing edge slivers     | Mixed                 | local registration reduces them; source crops still contain edges |
| Facial identity / turban fit    | Mixed                 | pivots corrected; source feature shapes remain fixed              |

No new images were generated to hide these limitations. A future artwork pass would need to
redesign the shoulder socket, wrist cuffs and Gemini arm construction.

## 16. New tests

`apps/web/lib/providers/stage2b1-motion.test.ts` adds 11 tests:

- timeline phases;
- stance-foot locking for both feet;
- swing clearance;
- root displacement and hold;
- hand arrival at the contact target;
- bell attachment and exclusive hand swap;
- unreachable-target blocking;
- release continuity and settled position;
- determinism and config-only variation;
- animated bounds and camera-safe margins;
- invalid-frame rejection.

## 17. Full validation results

| Command                     | Result                          |
| --------------------------- | ------------------------------- |
| `pnpm format:check`         | PASS                            |
| `pnpm lint`                 | PASS                            |
| `pnpm typecheck`            | PASS                            |
| `pnpm test`                 | PASS — **342 tests / 50 files** |
| `pnpm test:browser`         | PASS — **58 tests**             |
| `pnpm build`                | PASS                            |
| Paid API calls during tests | **0**                           |

All new MP4s were checked with `ffprobe` and a full `ffmpeg -f null` decode. The polished and
variation videos are 1280×720, 24 fps, 192 frames, 8.000 s. Walking diagnostics are 120 frames
(normal 2.5 s + slow 5.0 s). Comparison videos are 1280×360, 192 frames, 8.000 s.

## 18. Real output video paths

Required Stage 2B.1 structure:

```text
outputs/folk-provider-benchmark/stage-2b1/
├── openai/
│   ├── polished-character.mp4
│   ├── walking-diagnostic.mp4
│   ├── joint-stress-test.png
│   └── render-report.json
├── gemini/
│   ├── polished-character.mp4
│   ├── walking-diagnostic.mp4
│   ├── joint-stress-test.png
│   └── render-report.json
└── comparison/
    ├── before-after-openai.mp4
    ├── before-after-gemini.mp4
    ├── provider-side-by-side.mp4
    └── comparison-contact-sheet.png
```

Additional variation and measurement files:

- `openai/variation.mp4`, `gemini/variation.mp4`
- `measurements.json`
- `openai/walking-normal.mp4`, `openai/walking-slow.mp4`
- `gemini/walking-normal.mp4`, `gemini/walking-slow.mp4`

Documentation copies are under `docs/benchmarks/phase-05.1/stage-2b1/`.

## 19. Render performance

- Full Stage 2B.1 build: **48.16 seconds** on this machine.
- Outputs: 6 provider MP4s, 2 joint-stress sheets, 2 before/after MP4s, 1 provider side-by-side
  MP4 and 1 contact sheet.
- Provider API calls: **0**.
- No video-generation calls.

## 20. API spending confirmation

**$0.00 spent. Zero paid API calls. Zero image-generation calls. Zero video-generation calls.**

No Stage 2B.1 authorization was created or activated. The Stage 2B authorizations and historical
ledgers were not modified by this phase.

## 21. Full commit hashes

| Purpose                               | Commit                       |
| ------------------------------------- | ---------------------------- |
| Starting point                        | `01c1cd0`                    |
| Gait, reach, grip and bounds controls | `7d126b8`                    |
| Polished/diagnostic renderer          | `2692cc1`                    |
| Motion evidence and measurements      | `0a4eb6f`                    |
| This report                           | final HEAD after this commit |

## 22. Recommended next action

1. Review the before/after contact sheet and both polished videos.
2. Accept the motion mechanics as a measurable improvement.
3. Decide whether to fund an artwork pass for the remaining shoulder, wrist-band and Gemini arm
   defects; those cannot be solved cleanly by code alone.
4. Do not begin the full 30-second film until the user has reviewed the Stage 2B.1 artistic
   result.

### Final verdict

| Gate               | Verdict                                                |
| ------------------ | ------------------------------------------------------ |
| Engineering        | **PASS**                                               |
| Walking            | **PASS**                                               |
| Arm IK             | **PASS**                                               |
| Grip/release       | **PASS**                                               |
| Joint appearance   | **PARTIAL** — seams remain; artwork-limited            |
| Camera framing     | **PASS**                                               |
| Reusability        | **PASS** — config-only variation, both packs, zero API |
| Artistic readiness | **PENDING USER REVIEW**                                |
