# Stage 2C.5 — Mask Revision Inventory

The production seed revisions below are revision 1, created from the paid source sheets with source-alpha or chroma extraction and the audited wrist/ankle split. Their status is deliberately conservative:

- technical validity: **PASS**
- extraction correctness: **NEEDS REVIEW**
- artistic approval: **PENDING**

| Provider | Part         | Candidate | Crop (x,y) | Split | Source hash     | Mask SHA-256    | Candidate SHA-256 |
| -------- | ------------ | --------- | ---------: | ----: | --------------- | --------------- | ----------------- |
| openai   | nearUpperArm | 338×855   |     221,85 |     — | `9186a76dafa9…` | `131fd1c6886a…` | `f2577446f724…`   |
| openai   | nearForearm  | 255×528   |    1053,84 |   612 | `9186a76dafa9…` | `689c32254cea…` | `1039110852b3…`   |
| openai   | handOpen     | 241×334   |   1029,612 |   612 | `9186a76dafa9…` | `41c2b9e8d505…` | `c8eea0e3853e…`   |
| openai   | nearThigh    | 432×981   |     104,19 |     — | `ac2a8e9d919f…` | `2a0c6b0ad4c6…` | `4b09a7b3716e…`   |
| openai   | nearShin     | 359×715   |    995,110 |   825 | `ac2a8e9d919f…` | `3bbf336666dd…` | `e9f4ef62c88b…`   |
| openai   | nearFoot     | 430×164   |    968,825 |   825 | `ac2a8e9d919f…` | `4ab29277d683…` | `d3cabc111f12…`   |
| gemini   | nearUpperArm | 286×646   |    494,239 |     — | `838a950e309f…` | `3e9fb8ff91cd…` | `49d02cac5b8a…`   |
| gemini   | nearForearm  | 258×545   |   1774,621 |  1166 | `838a950e309f…` | `a34eaa86692d…` | `2abecf5ff416…`   |
| gemini   | handOpen     | 223×288   |  1890,1166 |  1166 | `838a950e309f…` | `2e86f4651643…` | `239ce032c49e…`   |
| gemini   | nearThigh    | 638×1306  |    341,211 |     — | `66c2344e54bb…` | `006d4a9f79b3…` | `c00c78d6565b…`   |
| gemini   | nearShin     | 431×1120  |   1706,221 |  1341 | `66c2344e54bb…` | `96cf6eca3ab6…` | `bcc557381a35…`   |
| gemini   | nearFoot     | 200×146   |  1845,1341 |  1341 | `66c2344e54bb…` | `ee89d031604c…` | `93789f9e871d…`   |

Full hashes and alpha counts are in `candidate-inventory.json`; the full-resolution masks and candidate PNGs are under:

```text
outputs/folk-provider-benchmark/stage-2c5/<provider>/masks/
outputs/folk-provider-benchmark/stage-2c5/<provider>/parts/
```

## Editor revision

The Playwright browser test saved an isolated editor revision for `openai/handOpen`:

- revision: **1**
- source hash: checked against the real OpenAI arm sheet
- mask hash: different from the seed hash
- review status: **pending**
- reload: PASS
- preview: PASS

The editor revision lives in the isolated Playwright `FABLEON_DATA_DIR`; it is not presented as a production artwork approval.
