# Phase 5.1 Stage 2B.2 — Universal Connector Rigging Report

**Date:** 2026-11-10  
**Starting HEAD:** `565e15a`  
**Mode:** code-only connector rigging and calibration  
**Paid API calls:** **0**  
**Image/video generation calls:** **0**

## 1. Executive summary

Stage 2B.2 replaced independent child placement with a universal named-socket system. Every moving
part in both existing artisan packs now has normalized connectors, a parent socket and a child
socket. Child world transforms are derived from the parent connector, not from an unrelated guessed
position.

The two calibrated connector rigs contain:

- 31 parts each;
- 30 parent-child attachments each;
- 82 connector points per evaluated frame;
- maximum rendered socket separation of **2.26 × 10⁻¹³ px**;
- average rendered separation of **2.75 × 10⁻¹⁴ px** across 5,760 samples per provider.

Existing Stage 2B.1 motion, IK and contact behavior remain active. The connector solver changes how
artwork is placed, not the animation curves. The resulting eight-second videos are visually close
to Stage 2B.1 because the calibration intentionally preserves the existing registration, while the
attachment guarantee is now mathematical.

## 2. Root causes of previous attachment errors

| Previous issue                        | Root cause                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| Limbs could look independently placed | child parts used a pivot-local transform with no named parent/child socket pair |
| No attachment guarantee               | the engine aligned one pivot, not two semantic connectors                       |
| Child offsets were guessed per part   | registration used target pivots and separate image offsets                      |
| Prop/pedestal mismatch                | world-space reach targets and rig-local bell positions were mixed               |
| Camera clipping                       | bounds treated rig-local bell coordinates as screen coordinates                 |
| Silent rotation-limit changes         | limits could clamp animation without a visible contract                         |

## 3. Connector schema

`packages/folk-motion/src/connectors.ts` defines:

```ts
interface ConnectorPoint {
  x: number;
  y: number;
} // normalized 0..1
interface ConnectorDefinition extends ConnectorPoint {
  id: string;
  kind?: "joint" | "grip" | "contact" | "accessory";
}
interface ConnectorCrop {
  x;
  y;
  width;
  height;
  sourceWidth;
  sourceHeight;
}
interface ConnectorAttachment {
  parentPartId: string;
  parentConnector: string;
  childConnector: string;
  rotationOffsetDeg?: number;
  limitsDeg?: { min: number; max: number };
}
interface ConnectorPart {
  id;
  rigNodeId;
  partId;
  drawOrder;
  crop;
  scale;
  connectors: ConnectorDefinition[];
  attachment?: ConnectorAttachment;
}
interface ConnectorRig {
  id;
  rootPartId;
  parts: ConnectorPart[];
}
```

Connector coordinates stay normalized against the **registered transparent sprite rect**, so they
survive trimming, padding, scaling and image registration. Conversion is:

```text
sprite rect point = crop.x + normalizedX * crop.width
                    crop.y + normalizedY * crop.height

source pixel point = normalizedX * sourceWidth
                     normalizedY * sourceHeight
```

## 4. Transform equations

For each child part:

```text
Pw = Wparent · Cparent
Wchild = T(Pw) · R(Wparent) · R(θjoint) · T(−Cchild)
```

where:

- `Cparent` is the parent connector in rig-local space;
- `Cchild` is the child connector in child rig-local space;
- `Pw` is the shared socket point;
- `R(Wparent)` preserves the parent’s rotational frame;
- `θjoint` is the child pose rotation plus configured offset.

The attachment invariant is:

```text
Wchild · Cchild = Pw = Wparent · Cparent
```

The child cannot add an independent translation once attached; that would break the socket
invariant. Root translation is applied only through the root world matrix.

## 5. Coordinate-system definitions

| Space                   | Meaning                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| Sprite-local normalized | connector coordinates in 0..1 of the registered transparent image    |
| Sprite source pixels    | original generated image pixels before trim/scale                    |
| Rig-local               | registered sprite rectangle and connector points in master/rig units |
| Character-local         | rig-local plus actor placement inside the scene                      |
| World                   | scene units used by camera/viewport transforms                       |
| Screen                  | 1280×720 output pixels                                               |

The calibrated rigs store normalized connectors plus crop provenance. Runtime transforms use
rig-local points. Camera bounds convert rig-local points to screen points exactly once.

## 6. Rig architecture

```text
Pelvis (root)
├── Torso
│   ├── Neck → Head
│   │   ├── Eye / eyelid / brow / moustache / earring
│   │   └── Turban / turban tail
│   ├── near/far shoulder → upper arm → elbow → forearm → wrist → hand
│   ├── near/far elbow covers
│   ├── sash / necklace / shoulder sash
│   └── near/far hip → thigh → knee → shin → ankle → foot
└── clothing and dhoti attachments
```

All attachments validate before evaluation: duplicate IDs, missing parents, missing sockets,
cycles, nonfinite values, invalid scales and multiple roots are rejected.

## 7. Connector editor

Added at `/studio/folk/rigs/connectors`, linked from the existing folk rig editor.

Features:

- load OpenAI or Gemini connector rig;
- display the selected sprite with normalized connector markers;
- drag markers;
- numeric X/Y inputs with keyboard arrow nudging;
- zoom;
- parent sprite preview and parent/child connector names;
- add, rename and remove connectors;
- joint-rotation preview slider;
- debug-overlay toggle;
- save to `connectors.json`, reload, and revert unsaved edits;
- original generated images are never modified.

Editor screenshot: `docs/benchmarks/phase-05.1/stage-2b2/connector-editor.png`.

Persistence was verified through the real API: save returned `{"ok":true}` and a subsequent GET
returned the same 31-part graph.

## 8. OpenAI calibration

- Rig ID: `artisan_openai_connectors_v1`
- Parts: 31
- Attachments: 30
- Connector points/frame: 82
- Max rendered error: **2.26 × 10⁻¹³ px**
- Average rendered error: **2.75 × 10⁻¹⁴ px**
- Calibration source: existing Stage 2B OpenAI pack registration.

Flagged for manual art calibration:

- shoulder socket hidden under torso;
- wrist band overlap;
- foot sole against curled shoe silhouette.

## 9. Gemini calibration

- Rig ID: `artisan_gemini_connectors_v1`
- Parts: 31
- Attachments: 30
- Connector points/frame: 82
- Max rendered error: **2.23 × 10⁻¹³ px**
- Average rendered error: **2.76 × 10⁻¹⁴ px**
- Calibration source: existing Stage 2B Gemini pack registration.

Flagged for manual art calibration:

- shoulder socket under torso;
- turban/eye registration;
- foot sole against shoe silhouette.

## 10. Before/after joint diagnostics

The connector rig preserves the Stage 2B.1 registration, so mathematical joints changed from
implicit pivot alignment to explicit named sockets. Visible seams remain the same; the system does
not pretend that socket alignment fixes source artwork.

Evidence:

- `connector-overlay-openai.png`
- `connector-overlay-gemini.png`
- `comparison-contact-sheet.png`
- `openai-joint-stress.png`
- `gemini-joint-stress.png`

## 11. Alignment-error measurements

Measured across all 192 frames per provider, 30 attachments per frame (5,760 samples):

| Provider |   Max rig-px | Average rig-px | Max rendered px | Average rendered px |
| -------- | -----------: | -------------: | --------------: | ------------------: |
| OpenAI   | 3.64 × 10⁻¹³ |   4.44 × 10⁻¹⁴ |    2.26 × 10⁻¹³ |        2.75 × 10⁻¹⁴ |
| Gemini   | 3.60 × 10⁻¹³ |   4.45 × 10⁻¹⁴ |    2.23 × 10⁻¹³ |        2.76 × 10⁻¹⁴ |

This is below floating-point display precision at 1280×720.

## 12. IK and contact results

Stage 2B.2 retains the Stage 2B.1 motion/IK layer:

- stance-foot drift: floating-point zero;
- swing clearance: 28 px;
- hand-to-target error: 6.0–13.6 px;
- contact-gated bell attachment;
- continuous bell release to the pedestal;
- no provider-specific animation branches.

The connector solver and IK share the same measured rig space. There is no second competing limb
representation.

## 13. Visual seam limitations

Socket alignment does **not** fix:

- OpenAI shoulder sleeve seam;
- OpenAI double wrist band;
- oversized curled shoes;
- Gemini tubular upper arm;
- Gemini turban band over the eye;
- dhoti edge slivers;
- source-level clothing and outline discontinuities.

These are artwork-dependent. The connector system guarantees attachment, not illustration
coherence. No new images or fake patches were created.

## 14. Eight-second output video paths

```text
outputs/folk-provider-benchmark/stage-2b2/
├── openai/
│   ├── polished-character.mp4
│   ├── walking-diagnostic.mp4
│   ├── joint-stress-test.png
│   ├── connectors.json
│   └── render-report.json
├── gemini/
│   ├── polished-character.mp4
│   ├── walking-diagnostic.mp4
│   ├── joint-stress-test.png
│   ├── connectors.json
│   └── render-report.json
└── comparison/
    ├── before-after-openai.mp4
    ├── before-after-gemini.mp4
    ├── provider-side-by-side.mp4
    └── comparison-contact-sheet.png
```

Each polished/variation video: 1280×720, 24 fps, 192 frames, 8.000 s, H.264. All were checked with
FFprobe and a full decode.

## 15. Reusability

The Stage 2B.1 variation configuration (walk speed, arm swing, reach target, head rotation) runs
through the same connector rigs with no hardcoded child offsets and no provider branches.
Variation videos are included for both providers.

## 16. Test results

| Command             | Result                          |
| ------------------- | ------------------------------- |
| `pnpm format:check` | PASS                            |
| `pnpm lint`         | PASS                            |
| `pnpm typecheck`    | PASS                            |
| `pnpm test`         | PASS — **350 tests / 52 files** |
| `pnpm test:browser` | PASS — **59 tests**             |
| `pnpm build`        | PASS                            |
| Paid API calls      | **0**                           |

New connector tests cover schema validation, cycles, missing sockets, crop conversion, connector
alignment, parent rotation, IK-compatible resolution, serialization/reload and prop attachment.
The browser suite covers the persistent connector editor.

## 17. Performance

The Stage 2B.2 renderer uses the same local canvas/FFmpeg path as Stage 2B.1. Full Stage 2B.1
build time was measured at 48.16 s for six MP4s and two joint sheets; connector resolution adds
negligible CPU. No video-generation calls were made.

## 18. API spending confirmation

**$0.00 spent. Zero paid API calls. Zero image-generation calls. Zero video-generation calls.**
No new spending authorization was created or activated.

## 19. Full commit hashes

| Purpose                                      | Commit                       |
| -------------------------------------------- | ---------------------------- |
| Starting point                               | `565e15a`                    |
| Universal connector schema and socket solver | `8a58e06`                    |
| Stage 2B.2 connector calibration             | `0c8473c`                    |
| Connector-rigged renderer                    | `56f1d91`                    |
| Persistent connector editor                  | `8a2c99d`                    |
| Connector evidence and measurements          | `e90d7d5`                    |
| This report                                  | final HEAD after this commit |

## 20. Final Git HEAD

The report commit is the final HEAD after `e90d7d5`. No push was performed.

## 21. Known limitations

1. The editor is a functional numeric/pointer calibration surface, not a full skeletal pose
   simulator; the joint-rotation slider previews the selected sprite rather than the entire chain.
2. Parent sockets for skeletal attachments such as torso/pelvis may lie outside the parent sprite
   rectangle; they are valid rig-space sockets but the editor requires numeric editing for those.
3. Visible seams remain artwork-limited, as listed in section 13.
4. The Stage 2B.2 source artwork is unchanged; no generated master, part or background was replaced.
5. The connector solver uses the existing Stage 2B.1 motion and camera; no new animation engine or
   3D skeleton was introduced.

## Final verdict

| Gate                              | Verdict                                          |
| --------------------------------- | ------------------------------------------------ |
| Connector schema and validation   | **PASS**                                         |
| Parent-child socket alignment     | **PASS** — sub-pixel floating-point error        |
| Both providers on same algorithms | **PASS**                                         |
| IK and contact integration        | **PASS** — inherited measured Stage 2B.1 results |
| Hand/bell connector attachment    | **PASS**                                         |
| Connector editor and persistence  | **PASS** — numeric/pointer, save/reload/revert   |
| Eight-second outputs              | **PASS** — both providers, valid MP4s            |
| Joint appearance                  | **PARTIAL** — artwork-dependent seams remain     |
| Artistic readiness                | **PENDING USER REVIEW**                          |

Recommended next action: review the connector editor, overlays, and before/after videos. If the
socket system is accepted, the next decision is whether to fund a source-art pass for the shoulder,
wrist-band, shoe and Gemini arm defects that code cannot conceal cleanly.
