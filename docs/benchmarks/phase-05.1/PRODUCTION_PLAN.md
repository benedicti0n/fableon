# Phase 5.1 — Production and Spending Plan

**Status:** Stage 1 only. No paid generation is authorized.  
**Experiment ID:** `phase-05.1-folk-pilot`  
**Canonical film:** The Little Brass Bell, 30.000 s, 720 frames, 24 fps, 1920×1080.

## 1. Why the plan is staged

A successful API connection is not a finished pipeline. The plan therefore tests one master,
one head, one upper arm, one forearm and one elbow bend before any full character library is
generated. If the small gate is not rig-usable, that provider stops.

## 2. Stage C — small art-quality gate

For **each provider independently**:

| Item                             | Count |
| -------------------------------- | ----: |
| Artisan master                   |     1 |
| Head part, reference-guided      |     1 |
| Upper-arm part, reference-guided |     1 |
| Forearm part, reference-guided   |     1 |
| Retry/candidate allowance        |     2 |
| **Maximum chargeable outputs**   | **6** |

Then, with **no further image calls**:

1. Validate alpha/edges and dimensions.
2. Register pivots into `artisan_head`, `artisan_nearUpperArm`, `artisan_nearForearm`.
3. Run the existing two-bone elbow stress pose.
4. Inspect identity, outline continuity, joint coverage and white fringe.
5. Record attempts, accepted/rejected, cost and preparation time.

Proposed caps:

| Provider               | Max outputs | Conservative estimate | Proposed cap |
| ---------------------- | ----------: | --------------------: | -----------: |
| OpenAI Sunburst        |           6 |                ~$0.58 |    **$1.50** |
| Gemini Nano Banana 2.1 |           6 |                ~$0.31 |    **$1.00** |

The caps include the conservative estimate plus room for one or two retries. They are not
grants. The user must approve each provider separately.

## 3. Stage D — full asset library

Canonical target, if the small gate passes:

| Group                           | Required outputs |
| ------------------------------- | ---------------: |
| Artisan                         |               29 |
| Horse                           |               27 |
| Cart                            |                4 |
| Bell                            |                1 |
| Courtyard background            |                1 |
| Village-lane background         |                1 |
| **Base total**                  |           **63** |
| Retry/candidate allowance (40%) |               26 |
| **Chargeable ceiling**          |           **89** |

Proposed caps:

| Provider               | Ceiling | Estimate at current bound | Proposed cap |
| ---------------------- | ------: | ------------------------: | -----------: |
| OpenAI Sunburst        |      89 |                    ~$8.57 |   **$15.00** |
| Gemini Nano Banana 2.1 |      89 |                    ~$4.54 |    **$8.00** |

These caps are deliberately above the estimate because reference edits, masks and retries can
change input token consumption. They remain below a typical provider-side alert threshold and
must be paired with provider billing alerts.

## 4. Part-production methods to compare

### Method A — reference-guided parts

- Use the approved master as the reference for every part.
- One request per part, with a part-specific prompt and hidden joint overlap.
- OpenAI can request transparent PNG directly.
- Gemini must use a flat background plus explicit mask/repair.
- Expected: high identity consistency, many API calls, less repair.

### Method B — character sheet + mask extraction

- Generate a small number of consistent component sheets.
- Extract parts with explicit masks; repair hidden joint geometry.
- Fewer API calls, more local mask work and risk of missing geometry.
- Expected: lower API cost, higher preparation time, higher joint-hole risk.

Measure on the small gate before choosing a full-library method. Do not assume Method A or B
wins globally; the two providers may differ.

## 5. Background workflow

Each provider receives equivalent art-direction prompts for:

1. courtyard;
2. village lane.

Preferred output is a flat 16:9 background if the provider cannot produce reliable independent
layers. The pack preparation step center-covers it to 2600×1500 and records it as a **flat**
background. If explicit repaired layers are available, each layer can be supplied separately
and is recorded with its own hash and depth. Blurred copies of one image are not described as a
full multilayer environment.

## 6. Rig integration

Generated files map to the existing semantic slots:

- `artisan_torso`, `artisan_head`, `artisan_nearUpperArm`, … (29 slots)
- `horse_torso`, `horse_nearFrontUpper`, … (27 slots)
- `cartBody`, `nearWheel`, `farWheel`, `shafts` (4 slots)
- `bell_bell` (1 slot)

Each part stores its source pivot, target master pivot, scale, draw offset, SHA-256, alpha
report and repair history. Pack preparation reports every missing slot. A pack with missing
slots is incomplete and cannot be presented as a finished film.

The same `packages/folk-motion` rigs, `FolkRenderer`, five-shot configuration, camera and FFmpeg
export are reused. No second animation engine is written.

## 7. Stage E/F — animation and film

Once both packs pass rig review:

1. Render diagnostic loops for walk, reach/grip, horse gait, cart movement and bell transfer.
2. Inspect actual decoded frames for joint holes, detached parts, identity drift and foot slide.
3. Render five shots at 720 frames, 1920×1080, 24 fps with the canonical config.
4. Encode H.264 locally; no image or video API is called for frames.
5. Verify duration, frame count, resolution, decode, transitions and absence of duplicate casts.
6. Produce separate OpenAI and Gemini MP4s, then a side-by-side comparison.

## 8. Stage G — cost and quality

Required comparison:

- total actual API charge;
- attempts per accepted master and part;
- rejected outputs;
- cost per usable character/background/part;
- preparation/repair time;
- render time;
- output quality and joint quality;
- cost per completed film;
- cost to render another film with the same pack.

No provider film is claimed until a real pack and local MP4 exist.

## 9. Exact authorization sequence

1. User reviews this plan and the provider reference.
2. User creates a **pending** authorization request in `/studio/providers` (or API).
3. User approves it with the exact confirmation string `APPROVE $<cap>` and a named approver.
4. Server persists the active record bound to `phase-05.1-folk-pilot`, provider, model and expiry.
5. Stage C runs at most one attempt per request, with no automatic retry.
6. User reviews the small gate; only then may a full-library cap be approved.
7. Any failure, rejection or over-cap condition stops the run and is recorded.

**Current state: no authorization record has been approved for real spending.**
