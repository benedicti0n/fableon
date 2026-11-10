# Phase 5.1 Stage 2B — Rigging Evaluation

**Status:** executed for both providers  
**Packs:** `artisan_openai_v2`, `artisan_gemini_v2`  
**Paid calls:** 9 total

## Engineering checks

| Check                                              | Result                  |
| -------------------------------------------------- | ----------------------- |
| 31 required slots per provider                     | PASS — 31 / 31          |
| Part file hashes                                   | PASS — 31 / 31 each     |
| Joint metadata validates for 15 articulated joints | PASS                    |
| Parent/child hierarchy resolves without cycles     | PASS                    |
| Seam-aware draw order                              | PASS                    |
| Rotation limits                                    | PASS                    |
| Hidden-overlap rectangles inside registered art    | PASS                    |
| Wrist hand-state swap                              | PASS                    |
| Hip/knee/ankle chains resolve through walk         | PASS                    |
| Neck/head rotation and blink                       | PASS                    |
| Pack validator rejects incomplete/invalid packs    | PASS                    |
| Renderer refuses invalid packs                     | PASS                    |
| 192-frame sequence deterministic                   | PASS for both providers |
| 1280×720, 24 fps, 192 frames, 8.000 s MP4          | PASS for both providers |
| Full decode check                                  | PASS for both providers |
| Reused variation render                            | PASS for both providers |
| No provider calls during rendering                 | PASS                    |

## Per-provider result

| Item                  | OpenAI                              | Gemini                             |
| --------------------- | ----------------------------------- | ---------------------------------- |
| Parts                 | 31                                  | 31                                 |
| Base render           | `character-test.mp4`                | `character-test.mp4`               |
| Variation render      | `variation.mp4`                     | `variation.mp4`                    |
| Render probe          | 1280×720, 24 fps, 192 frames, 8.0 s | same                               |
| Determinism           | frame hashes repeat                 | frame hashes repeat                |
| Shoulder articulation | acceptable, visible sleeve seam     | weak, tubular upper arm            |
| Elbow articulation    | acceptable, cuff seam visible       | moderate, tubular forearm          |
| Wrist/hand swap       | pass                                | pass                               |
| Hip/knee/ankle        | pass, cloth thigh compromise        | pass after local thigh/shin repair |
| Bell attach/detach    | pass                                | pass                               |

## Registration repairs required

### OpenAI

- facial pivots moved onto the provider head;
- thigh/dhoti layering adjusted;
- elbow covers and joint overlap validated;
- no pack-level rejection.

### Gemini

- original arms sheet rejected for merged bent arms; one repair sheet used;
- torso shoulder blob filled locally with clean ochre;
- full legs split locally into thigh/shin; feet taken from shoe cells;
- thighs recolored to cloth to avoid exposed bare skin;
- shin crops narrowed to remove the dhoti edge;
- turban lifted, brow scaled down, facial pivots moved;
- turban-tail fragment removed by largest-component filtering;
- final pack validates 31/31.

## Acceptance decision

**Engineering GO:** both packs are complete, deterministic and renderable.

**Artistic gate:** OpenAI conditional pass; Gemini conditional / needs further repair. Neither is
approved for a full film. The technical result must not be read as artistic approval.
