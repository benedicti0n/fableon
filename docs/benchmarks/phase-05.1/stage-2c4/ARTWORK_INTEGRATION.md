# Stage 2C.4 — Paid Artwork Integration

## Sources

The only paid artwork used is the four Stage 2C.2 sheets. No source file was overwritten and no provider call was made.

| Source                                                      | SHA-256                                                            | Notes                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `docs/benchmarks/phase-05.1/stage-2c2/openai/arm-sheet.png` | `9186a76dafa97379ad794fef70b44803474a77c150db9f7e352d32751e9a87bb` | 1536×1024 RGBA PNG                                                   |
| `docs/benchmarks/phase-05.1/stage-2c2/openai/leg-sheet.png` | `ac2a8e9d919f6b1d5bbc9aa9b082c8a047af184e6e7711b2ed4494b0e55a4404` | 1536×1024 RGBA PNG                                                   |
| `docs/benchmarks/phase-05.1/stage-2c2/gemini/arm-sheet.png` | `838a950e309fe9f22c1530a5705dd933e1fb1d54413cae3f7b3a8fe1fe1455d8` | 2528×1696 JPEG with green background; `.png` extension is historical |
| `docs/benchmarks/phase-05.1/stage-2c2/gemini/leg-sheet.png` | `66c2344e54bb2acd9c7fd41320da9af389b6736f17125038449743b823038156` | 2528×1696 JPEG with green background                                 |

## Extraction

Masks are persisted as full-source-dimension PNGs. Each test writes the mask, reloads it, verifies its byte length against the source dimensions, and only then applies it. Source RGB pixels inside the mask are preserved; fully transparent RGB is zeroed and Gemini green spill is reduced.

| Provider | Part         | Candidate | Source box (x,y) | Mask SHA-256 prefix | Candidate SHA-256 prefix | Green-dominant opaque |
| -------- | ------------ | --------- | ---------------- | ------------------: | -----------------------: | --------------------: |
| openai   | nearUpperArm | 338×855   | 221,85           |     `ff7a4242ca74…` |          `f2577446f724…` |                     0 |
| openai   | nearForearm  | 279×862   | 1029,84          |     `5c92055d2166…` |          `abc612a79576…` |                     0 |
| gemini   | nearUpperArm | 286×646   | 494,239          |     `660a7a948d2f…` |          `821f96895dc3…` |                     0 |
| gemini   | nearForearm  | 339×833   | 1774,621         |     `6be9bf2080a0…` |          `490968d2a2af…` |                     0 |
| openai   | nearThigh    | 432×981   | 104,19           |     `26efad45959f…` |          `4b09a7b3716e…` |                     0 |
| openai   | nearShin     | 430×879   | 968,110          |     `dd5adf2d745c…` |          `1a9ce7072f46…` |                     0 |
| gemini   | nearThigh    | 638×1306  | 341,211          |     `a254784b13c4…` |          `58dbde65e0e1…` |                     0 |
| gemini   | nearShin     | 431×1266  | 1706,221         |     `7dae9a4e2c41…` |          `834416c46dab…` |                     0 |

Full values, alpha counts and revision metadata are in `smoke/04-extract.json` and in the Git-ignored `outputs/folk-provider-benchmark/stage-2c4/{provider}/masks/`.

## Registration

The four semantic slots are replaced in a versioned in-memory pack. All other 31-part pack entries remain the Stage 2B provider artwork.

| Slot           | Target height | Pivot rule                         | Hidden legacy part     |
| -------------- | ------------: | ---------------------------------- | ---------------------- |
| `nearUpperArm` |        221 px | shoulder pivot, 6% from sprite top | none                   |
| `nearForearm`  |        209 px | elbow pivot, 8% from sprite top    | `handOpen`, `handGrip` |
| `nearThigh`    |        235 px | hip pivot, 6% from sprite top      | `nearDhoti`            |
| `nearShin`     |        232 px | knee pivot, 8% from sprite top     | `nearFoot`             |

The old `nearElbowCover` is also hidden because the paid forearm already contains a cuff. The paid forearm contains the hand, so the old hand sprites are intentionally transparent in this technical pack to avoid a duplicate hand. These are documented limitations, not production decisions.

## Production renderer

`scripts/stage2c4/renderer-entry.ts` imports the real `apps/web/lib/folk/renderer.ts` and `@fableon/folk-motion`. Vite bundles it for the browser. The tests call:

- `FolkRenderer.renderFrameDataUrl(frame, width, height)`
- `FolkRenderer.renderRigTestDataUrl(frame, width, height, "artisan", node, extraRotation)`

The pack, background layers and film config are passed to that renderer. No custom substitute compositor is used for the assembly or MP4 gates.

## Frames and video

- `neutral-openai.png`, `neutral-gemini.png`
- `joint-stress-openai.png`, `joint-stress-gemini.png`
- `articulation-openai.png`, `articulation-gemini.png`
- `outputs/folk-provider-benchmark/stage-2c4/{provider}/articulation-1s.mp4`
- per-frame PNGs under `outputs/folk-provider-benchmark/stage-2c4/{provider}/video-frames/`

## Rig validation

For both providers the production pose resolved **29 nodes**, all transform coefficients were finite, all part IDs were present, and the shoulder–elbow distance was **142.04 master px**, matching the Stage 2B connector baseline (shoulder 508,470 → elbow 532,610; distance 142.04). Details: `smoke/06-assembly.json`.

## Video verification

| Provider |  Bytes |  FPS | Frames | Duration | Full decode | SHA-256                                                            |
| -------- | -----: | ---: | -----: | -------: | ----------- | ------------------------------------------------------------------ |
| OpenAI   | 76,703 | 24/1 |     24 |  1.000 s | PASS        | `b010cc68941474dd2832cae218066c0d77603c1cc814329fcced251341ce0664` |
| Gemini   | 71,502 | 24/1 |     24 |  1.000 s | PASS        | `e3e1cb29aa0d1b0ec3bbd8cb2db1fb7b8bdf831272b31ff2218f5cff008948ca` |

Details: `smoke/07-video.json`.
