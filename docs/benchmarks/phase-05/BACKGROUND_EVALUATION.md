# Phase 5 — Background Evaluation

**Assets:** `apps/web/public/assets/folk-pilot/backgrounds/`  
**Masters:** `assets/folk-pilot/masters/courtyard.svg`, `street.svg`  
**World:** 2400×1350; authored at 2600×1500 with bleed.

## Layer inventory

Each background has four independently authored layers:

| Layer                    | Depth | Courtyard file             | Street file             |
| ------------------------ | ----: | -------------------------- | ----------------------- |
| Sky / light wash         |  0.80 | `courtyard-sky.png`        | `street-sky.png`        |
| Distant architecture     |  0.86 | `courtyard-distant.png`    | `street-distant.png`    |
| Main architecture        |  0.93 | `courtyard-main.png`       | `street-main.png`       |
| Foreground floor / props |  1.00 | `courtyard-foreground.png` | `street-foreground.png` |

The depth values are deliberately conservative so the 100/75 px bleed always covers the
maximum camera move at the used zooms. The layers are not a single blurred image stretched
to fake parallax; each has its own geometry and transparent regions.

## Courtyard

Actual master: `apps/web/public/assets/folk-pilot/masters/courtyard.png`.

- Sandstone haveli facade with a central indigo gate, gold arch trim, and a cream plinth.
- Six arched windows with jaali lattices in alternating terracotta and indigo.
- Projecting jharokha-like balconies, hanging banners, a neem tree, pots, and a central
  rangoli.
- Warm sky gradient, sun glow, and distant domed rooftops.
- Performance area at world x 500–1800 is kept clear of tall foreground pieces.

Observed strengths:

- Strong theatrical symmetry around the gate.
- Consistent sandstone/indigo/terracotta palette with the characters.
- The tree and banners break the symmetry enough to avoid a diagrammatic look.
- No blank edge appeared at the camera positions used in shots 1–4.

Observed weaknesses:

- The facade is flat and repetitive; the windows are pattern panels rather than deep
  architectural volumes.
- The floor is a simple tile field; it lacks the painted texture of a final background.
- The tree foliage is built from overlapping discs and reads as a graphic device.

## Street

Actual master: `apps/web/public/assets/folk-pilot/masters/street.png`.

- Converging lane with sandstone buildings on both sides.
- Central arched gate, hanging cloth banners, lantern strings, pots, and plants.
- Same warm sky, indigo/terracotta accents, and gold trim as the courtyard.
- Used only in shot 5, with the cart receding to the right.

Observed strengths:

- Clearly reads as a second location rather than a recolored courtyard.
- The converging buildings give the shot a usable exit direction.
- Banners and gate create a strong frame for the closing title.

Observed weaknesses:

- The perspective is shallow and the side buildings are flat cutouts.
- The lane floor is a simple cobble pattern; there is no deep texture or crowd life.
- The central gate is large and simple; at 1080p it is a graphic shape rather than a
  detailed location.

## Camera and edge safety

The film uses zooms from 1.00 to 1.30 and horizontal centers from 680 to 1300. Sampled
frames at the extreme camera positions show no unintended blank canvas edges. The 100 px
bleed is sufficient for the chosen depth spread (0.80–1.00).

## Decision

**Background production: PASS for two original, layered, reusable locations.**  
**Artistic quality: PENDING USER REVIEW.** The backgrounds are coherent graphic
environments, not final painted 1080p plates. The dominant limitation is authored detail,
not missing layer architecture.
