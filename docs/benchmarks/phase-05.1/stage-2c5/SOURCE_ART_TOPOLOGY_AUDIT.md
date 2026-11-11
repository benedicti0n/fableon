# Stage 2C.5 — Source-Art Topology Audit

## Inputs

| Provider | Sheet | Real format | Dimensions | SHA-256                                                            |
| -------- | ----- | ----------- | ---------: | ------------------------------------------------------------------ |
| OpenAI   | arm   | PNG         |  1536×1024 | `9186a76dafa97379ad794fef70b44803474a77c150db9f7e352d32751e9a87bb` |
| OpenAI   | leg   | PNG         |  1536×1024 | `ac2a8e9d919f6b1d5bbc9aa9b082c8a047af184e6e7711b2ed4494b0e55a4404` |
| Gemini   | arm   | JPEG        |  2528×1696 | `838a950e309fe9f22c1530a5705dd933e1fb1d54413cae3f7b3a8fe1fe1455d8` |
| Gemini   | leg   | JPEG        |  2528×1696 | `66c2344e54bb2acd9c7fd41320da9af389b6736f17125038449743b823038156` |

The Gemini sheets are JPEG bytes despite the historical `.png` filenames. Format detection is based on the file signature, not the extension.

## Source-cell topology

The paid sheets contain two designed cells separated by a gutter. They are not master-aligned atlases.

| Provider | Anatomical source |  Cell | Source bounds           | Extract                                               |
| -------- | ----------------- | ----: | ----------------------- | ----------------------------------------------------- |
| OpenAI   | upper arm         |  left | x 221, y 85, 338×855    | upper-arm sleeve + shoulder cap                       |
| OpenAI   | forearm + hand    | right | x 1029, y 84, 279×862   | elbow cuff, skin forearm, gold wrist band, open hand  |
| OpenAI   | thigh + dhoti     |  left | x 104, y 19, 432×981    | hip/dhoti drape and border                            |
| OpenAI   | shin + foot       | right | x 968, y 110, 430×879   | knee cuff, dhoti/skin shin, ankle, curled shoe        |
| Gemini   | upper arm         |  left | x 494, y 239, 286×646   | ochre geometric sleeve + blue shoulder/elbow sections |
| Gemini   | forearm + hand    | right | x 1774, y 621, 339×833  | geometric cuff, blue forearm, bangle stack, open hand |
| Gemini   | thigh + dhoti     |  left | x 341, y 211, 638×1306  | dhoti drape and border                                |
| Gemini   | shin + foot       | right | x 1706, y 221, 431×1266 | dhoti hem, ankle, small shoe/foot                     |

## Original baked-part failures

### Arm

The OpenAI and Gemini forearm cells contain the hand as painted pixels. In Stage 2C.4, the entire forearm+hand was one sprite, so `handOpen` and `handGrip` were hidden and wrist rotation was impossible. The forearm could rotate at the elbow, but the hand moved only as part of that baked sprite.

### Leg

The OpenAI shin cell contains the ankle and curled shoe; the Gemini shin cell contains the ankle and small shoe. In Stage 2C.4, `nearFoot` was hidden and ankle rotation was impossible.

## Separation decision

| Provider | Split                      | Assignment                                                        |
| -------- | -------------------------- | ----------------------------------------------------------------- |
| OpenAI   | absolute source y **612**  | forearm owns the gold wrist band above 612; hand starts below 612 |
| Gemini   | absolute source y **1166** | forearm owns the bangle stack; hand starts below 1166             |
| OpenAI   | absolute source y **825**  | shin owns ankle skin above 825; foot/shoe starts below 825        |
| Gemini   | absolute source y **1341** | shin owns ankle skin above 1341; foot starts below 1341           |

The masks are editable in `/studio/folk/rigs/stage-2c`. The split lines are visible guides and can be repainted.

## Visible decorative ownership

| Feature                                                  | Owner     |
| -------------------------------------------------------- | --------- |
| Shoulder sleeve cap and upper-arm floral/geometric motif | upper arm |
| Elbow cuff / upper forearm border                        | forearm   |
| Gold wrist band / Gemini bangle stack                    | forearm   |
| Hand skin and fingers                                    | hand      |
| Dhoti drape and dhoti border                             | thigh     |
| Knee cuff                                                | shin      |
| Ankle skin                                               | shin      |
| Shoe/foot outline                                        | foot      |

No separate elbow-cover, near-dhoti, or near-foot duplicate is rendered in the Stage 2C.5 technical pack. Hand-grip art is not present in the paid sheet; the open hand can rotate at the wrist, but a distinct gripping hand is **ARTWORK-BLOCKED**.
