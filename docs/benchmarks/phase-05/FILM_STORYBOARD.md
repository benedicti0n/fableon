# Phase 5 — Film Storyboard

**Film:** The Little Brass Bell  
**Runtime:** 30.000 s · 720 frames · 24 fps  
**Locations:** courtyard (shots 1–4), village lane (shot 5)  
**Cast:** one artisan, one horse, one decorated cart, one brass bell

## Story spine

A young artisan walks into a warm courtyard carrying a small brass bell. A horse and cart
arrive. The artisan reaches up, attaches the bell to the harness, and steps back. The horse
nods. The cart moves away down the lane while the artisan watches, and the film ends on the
quiet village and the bell.

## Shot table

| Shot                      | Frames  | Time          | Background   | Action                                                        | Camera                      | Transition in                 |
| ------------------------- | ------- | ------------- | ------------ | ------------------------------------------------------------- | --------------------------- | ----------------------------- |
| 1. Morning in the Village | 0–119   | 0.00–5.00 s   | Courtyard    | Empty courtyard reveal; title; dust and light                 | 1.00→1.07 zoom, x 1200→1300 | fade from black, 18f          |
| 2. The Artisan            | 120–263 | 5.00–11.00 s  | Courtyard    | Artisan walks in with the bell; leg/arm swing; blink          | 1.14→1.12 zoom, x 850→1050  | crossfade, 10f                |
| 3. The Horse and Cart     | 264–431 | 11.00–18.00 s | Courtyard    | Horse and cart enter; four-leg gait; head/tail motion; wheels | 1.13→1.12 zoom, x 950       | crossfade, 10f                |
| 4. The Brass Bell         | 432–599 | 18.00–25.00 s | Courtyard    | Reach, grip, attach bell; horse nod; release                  | 1.28→1.30 zoom, x 950→1000  | crossfade, 10f                |
| 5. The Journey Continues  | 600–719 | 25.00–30.00 s | Village lane | Cart recedes; artisan watches; bell sways; fade out           | 1.10→1.02 zoom, x 1000→1150 | crossfade, 10f + 24f fade out |

## Beat detail

### Shot 1 — reveal

- 0–17: fade from warm black.
- 20–108: title “The Little Brass Bell” fades in and out over the haveli.
- 0–119: camera drifts right and pushes in; dust motes and light rays provide life without
  character action.

### Shot 2 — artisan enters

- 120: artisan starts at world x=150.
- 263: artisan reaches world x=680.
- Walk cycle: approximately 1.1 s; opposing arms; body bob; blink every 72 frames.
- Bell is held in the near hand for the whole shot.
- The camera leads the walk and settles as he reaches the courtyard center.

### Shot 3 — horse and cart

- 264: horse is off-screen left; the empty courtyard and waiting artisan establish the
  stage.
- 264–431: horse travels from x=-300 to x=500; cart follows at a -275 offset.
- Four legs use offset phases; wheels rotate from traveled distance; head nods with the
  gait; tail sways.
- The cart shafts stay aligned to the horse chest.
- The artisan waits at x=680 with a small idle.

### Shot 4 — the bell

- 432–457: artisan turns toward the horse; reach begins at local frame 26.
- 458–503: arm extends; hand grips at local frame 60.
- 504 (global): bell attaches to the harness (`attachFrame: 72` is local; global 504).
- 524–557: horse nod (nod starts at local 92 / global 524).
- 528–? artisan releases and steps back; bell stays at the harness.
- Camera is at its closest (1.28–1.30), holding the hand/harness contact.

### Shot 5 — departure

- 600: cut to the lane; horse starts at x=800, cart at x=525.
- 600–719: horse moves to x=1300; cart follows; wheels roll.
- Artisan stands at x=220, watching; no new prop or gesture is introduced.
- 650–706: closing line “Every journey carries a little music.”
- 696–719: 24-frame fade to warm black; final frame is black.

## Transition rule

Environment layers crossfade, but character layers do not. The outgoing cast is omitted
from the previous pass and the incoming cast is drawn once at full opacity. This prevents
duplicate artisans, horses, eyes, and wheels at shot boundaries. Verified frames:
264, 432, 600 in `diagnostic-frames/` and the final MP4.

## Sound

The film is silent by design. No audio API or recording was used. The MP4 is labelled
silent in its manifest.
