# Fableon Illustration Pack Format

**Format:** `fableon.illustration-pack`  
**Version:** 1  
**Package:** `@fableon/illustration-pipeline`  
**Status:** Phase 2.6 benchmark-local contract. This is not yet the persisted
scene schema.

## 1. Purpose

An illustration pack describes prepared artwork that can be composed,
inspected, and animated without guessing where its parts belong. It separates
three concerns:

1. **Source artwork** — painted, generated, or user-supplied images.
2. **Preparation metadata** — registration, pivots, trim offsets, draw order,
   hierarchy, and provenance.
3. **Animation** — a rig adapter consumes prepared parts but does not repaint
   them.

The format is serializable JSON. It contains no functions, React state, DOM
handles, canvas objects, or provider-specific fields.

## 2. Pack structure

```json
{
  "format": "fableon.illustration-pack",
  "version": 1,
  "id": "storybook-bird-v1",
  "name": "Storybook Bird",
  "kind": "character",
  "canvas": { "width": 1024, "height": 1024, "pixelDensity": 1 },
  "parts": [
    {
      "id": "body",
      "name": "Body",
      "category": "character-part",
      "source": "assets/body.png",
      "originalSource": "source/body-original.png",
      "originalSize": { "width": 760, "height": 520 },
      "preparedSize": { "width": 760, "height": 520 },
      "registration": { "x": 0, "y": 0 },
      "pivot": { "space": "source", "x": 380, "y": 300 },
      "preparedOffset": { "x": 0, "y": 0 },
      "trim": {
        "applied": false,
        "alphaThreshold": 0,
        "contentBounds": { "x": 0, "y": 0, "width": 760, "height": 520 }
      },
      "alpha": "required",
      "parentId": null,
      "zIndex": 50,
      "role": "body",
      "provenance": {
        "kind": "artist-created",
        "creator": "Example illustrator",
        "license": "private commission"
      }
    }
  ]
}
```

`kind` is one of `character`, `environment`, `prop`, or `mixed`. Part
`category` is one of `character-part`, `background`, `midground`, `foreground`,
`prop`, `atmosphere`, or `reference`.

## 3. Canonical coordinate rules

### Pivot space

Every pivot is stored in **original, untrimmed source-image coordinates**:

```json
"pivot": { "space": "source", "x": 380, "y": 300 }
```

The pivot is not expressed in trimmed-image coordinates and not normalized to
0–1. Trimming produces a derivative image but never moves the pivot in source
space.

### Registration

`registration` is the top-left position of the original source image in the
pack's registration canvas. It is used for previews, environment composition,
and reconstructing the authored layout. Character rigs use source-local pivots
and their own parent transforms; registration is not silently added to rig
transforms.

### Trimming and prepared offsets

`trim.contentBounds` records the retained visible rectangle in original source
coordinates. `trim.applied` records whether transparent-padding trim was
applied. The default alpha threshold is `0`: only fully transparent pixels are
removed, preserving intentional low-alpha watercolor edges.

`preparedOffset` is the top-left of the prepared image in original source
coordinates. It preserves the original-to-prepared transform:

```text
prepared image top-left in pack canvas =
  registration + preparedOffset
```

If no trim or padding occurred, `preparedOffset` is `{ "x": 0, "y": 0 }` and
`preparedSize` equals `originalSize`. If a 4-pixel transparent margin was
removed, `preparedOffset` becomes `{ "x": 4, "y": 4 }`.

### Transform

Environment layers may carry a simple optional transform:

```json
"transform": { "x": 0, "y": 0, "scaleX": 1, "scaleY": 1, "rotation": 0, "opacity": 1 }
```

Character parts use rig transforms, not this presentation transform.

## 4. Character hierarchy and draw order

The recommended character template is:

```text
body
├── head
│   ├── eye
│   └── beak
├── wing-far
├── wing-near
├── tail
├── leg-left
└── leg-right
```

Parent references use stable part IDs. Draw order is an explicit unique
`zIndex`; higher values draw later. The format does not assume that array order
is draw order.

The template is a recommendation, not a hard schema limit. Future characters
may use different anatomy. Character-readiness validation checks the required
template separately from structural pack validation.

## 5. Provenance

Every part requires provenance:

| Kind                     | Meaning                                           |
| ------------------------ | ------------------------------------------------- |
| `user-created`           | Supplied by the Fableon user                      |
| `artist-created`         | Commissioned or hand-authored by an illustrator   |
| `ai-generated`           | Produced by an approved image-generation workflow |
| `licensed-third-party`   | Used under a documented license                   |
| `procedurally-generated` | Painted by Fableon code                           |
| `diagnostic`             | Test fixture, not artistic validation artwork     |

Optional fields: `creator`, `sourceRef`, `license`, and `notes`. Provenance is
required metadata, not a legal guarantee; the human owner remains responsible
for usage rights.

## 6. Validation rules

The parser rejects:

- Duplicate part IDs.
- Duplicate draw orders.
- Missing parent references.
- Cyclic hierarchies.
- Invalid dimensions or pivots outside the original source.
- Unsafe paths, URLs, absolute paths, backslashes, `..`, query strings, and
  unsupported image extensions.
- Trim bounds outside the source.
- Prepared images smaller than their retained content.
- Malformed provenance, transforms, hashes, or top-level metadata.
- Unknown format versions.

Validation returns structured issues with a path such as
`parts.3.pivot`. `parseIllustrationPack` throws `IllustrationPackError` with the
complete issue list. `validateIllustrationPack` returns a discriminated union
instead of throwing.

An empty pack is structurally valid so the preparation interface can inspect
incomplete work. It is **not** animation-ready; character preparation reports
missing parts separately.

## 7. File layout in an exported archive

```text
storybook-bird.fableon-pack.zip
├── manifest.json
├── provenance.json
├── assets/
│   ├── body.png
│   └── head.png
└── source/
    ├── body-original.png
    └── head-original.png
```

`manifest.json` is authoritative. `assets/` contains the prepared derivatives
used for composition; `source/` preserves original imported files when the user
chooses to include them. A pack can reference prepared assets without embedding
original bytes, but the preparation interface includes both by default for
traceability.

## 8. Versioning

`version: 1` is the only accepted version. A future version must add an explicit
migration path; unknown versions fail loudly. This contract is benchmark-local
until Phase 3 defines the production character schema.
