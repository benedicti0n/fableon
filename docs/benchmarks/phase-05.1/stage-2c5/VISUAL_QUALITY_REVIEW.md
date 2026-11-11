# Stage 2C.5 — Visual Quality Review

## Technical verdict

| Gate                       | Result                                                          |
| -------------------------- | --------------------------------------------------------------- |
| A — mask editor            | PASS                                                            |
| B — source fidelity        | PASS                                                            |
| C — arm topology           | **PARTIAL** — shoulder/elbow/wrist pass; grip hand blocked      |
| D — leg topology           | **PARTIAL** — hip/knee/ankle pass; Gemini foot visually weak    |
| E — rig consistency        | PASS                                                            |
| F — neutral reconstruction | **PARTIAL** — joint placements measured; no new full-master IoU |
| G — visual animation       | PASS technically, with visual limitations                       |
| H — financial              | PASS ($0)                                                       |

## Visual strengths

- OpenAI upper arm and forearm preserve the blue sleeve, floral motif, orange cuff and dark outlines.
- OpenAI hand and shoe separate cleanly from the forearm and shin without duplicating the gold wrist band or shoe outline.
- Gemini extraction removes green-dominant opaque pixels; 0 remain.
- The wrist and ankle joints now move actual separate sprites.
- The neutral Stage 2C.5 hand positions are lower than the Stage 2C.4 baked-hand poses, matching the master wrist rather than the old forearm registration.

## Visual defects

### Arm seams

The paid upper arm is narrower than the Stage 2B sleeve. The shoulder seam is technically connected but not artistically production-approved. Elbow cuffs overlap without a duplicate cover, but close-up edge quality still needs review.

### Hands

The open-hand pose is real paid artwork. A gripping hand does not exist. The hand is intentionally not swapped for Stage 2B vector art.

### Gemini near foot

The Gemini foot is source-proportionate but very small: 30.24×22.08 master px versus the much larger far-side Stage 2B foot. The near ankle moves, but the resulting leg is visually inconsistent. Marked **PARTIAL**.

### Far-side parts

Only the near arm and near leg slots were replaced. The far-side arm/leg remain Stage 2B artwork. That mixed-source pack is a technical candidate, not a production character.

### Style mismatch

The OpenAI paid arm is floral and blue; the Gemini arm is geometric ochre/blue. The Gemini arm does not match the OpenAI decorative language, correctly, because it is its own provider's art. The Gemini arm also differs from its own torso more than a production pack should.

### Master reconstruction

The historical Stage 2B.3 master reconstruction remains ARTWORK-BLOCKED (IoU 0.5086 OpenAI, 0.4620 Gemini). Stage 2C.5 does not claim a new master IoU or artistic improvement.

## Parts requiring future artwork

1. **Grip hand** — closed hand for each provider, wrist-top pivot, provider-matched palette and outline.
2. **Gemini foot** — source-matched foot/shoe at a scale consistent with the near leg and the far foot.
3. **Far-side parity** — paid far upper arm, forearm, hand, thigh, shin and foot if the entire puppet is to use one artwork source.
4. **Shoulder/elbow seam review** — no new generation required until an artist reviews the current overlap.

No new artwork is generated in Stage 2C.5.
