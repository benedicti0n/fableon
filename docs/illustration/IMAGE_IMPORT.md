# Image Import & Normalization

**Package:** `@fableon/illustration-pipeline`  
**Formats:** PNG, WebP, JPEG (opaque use).  
**Status:** Phase 2.6 implementation.

## 1. Principles

- Import is **preparation**, not generation.
- Pixels are preserved unless the user explicitly selects trimming or padding.
- No color correction, sharpening, denoising, blur, or contrast filtering is
  applied.
- Alpha is never discarded or flattened automatically.
- Every import records the original byte hash and the prepared derivative hash.
- Warnings describe risks; the importer does not destructively “fix” painted
  edges.

## 2. Decoding

Browser decoding uses `createImageBitmap` where available and falls back to an
`HTMLImageElement`. The decoded image is drawn to a Canvas 2D surface and read
with `getImageData`, yielding straight-alpha RGBA bytes. The importer never
renders the source directly at frame time; the UI composes prepared derivatives
or decoded prepared images.

JPEG is accepted for opaque plates. Because JPEG has no alpha channel, a
transparent character part must be supplied as PNG or WebP. SVG is rejected:
active SVG content must not enter a privileged application context. Rasterize
SVG in an authoring tool and import a PNG/WebP derivative.

## 3. Inspection

For every source the importer reports:

- dimensions and detected format from magic bytes;
- file size;
- alpha presence and opaque/transparent ratios;
- content bounds (`alpha > 0`), opaque bounds (`alpha === 255`), and transparent
  bounds (`alpha === 0`);
- semi-transparent pixel count;
- SHA-256 source hash;
- color-space metadata when the browser supplies it;
- non-destructive warnings.

Warnings include:

| Code                        | Meaning                                                |
| --------------------------- | ------------------------------------------------------ |
| `alpha-missing`             | No transparent pixels; suitable only as opaque art     |
| `opaque-background`         | Every pixel is opaque; mask extraction may be required |
| `white-halo`                | Semi-transparent near-white fringe detected            |
| `black-halo`                | Semi-transparent near-black fringe detected            |
| `transparent-color-residue` | Transparent pixels retain RGB values                   |
| `premultiplied-risk`        | Low-alpha pixels retain bright RGB payload             |
| `empty-content`             | No pixels above alpha 0                                |

Warnings are advisory. Fableon does not automatically key or premultiply them.

## 4. Trimming

The default alpha threshold is **0**. Only fully transparent pixels are
removed, which avoids trimming intentional watercolor/antialiased edges.

`trimPixels` returns:

- the cropped RGBA pixels;
- `offsetX` / `offsetY` in original source coordinates;
- the retained content rectangle;
- an `applied` flag.

`preparedOffset` records where the prepared image sits in original source
coordinates. The pack renderer draws at `registration + preparedOffset`, so
trimming cannot silently move a part, pivot, or registration point.

The character preparation interface exposes trimming as an explicit option;
users can also opt out and keep full source dimensions.

## 5. Padding and normalization

Optional padding adds fully transparent pixels without altering existing
colors. A target canvas size can be supplied for consistent registration;
content is centered and `preparedOffset` records the transform back to source
coordinates. Existing pixels are copied byte-for-byte.

## 6. Hashing and reproducibility

`sha256Hex` hashes the source bytes and the prepared PNG bytes using Web Crypto.
Hashes identify versions and prevent ambiguous cache behavior. The source
hash is independent of whether the file is decoded again.

PNG re-encoding is **pixel-equivalent**, not guaranteed byte-identical across
browsers or operating systems. The prepared hash identifies the exact derivative
bytes produced by a given environment. Original source bytes remain in the
exported archive when included, preserving the authoritative artwork.

## 7. Error handling

Structured `ImageImportError` codes:

- `unsupported_format`
- `invalid_file`
- `invalid_pixels`
- `empty_image`
- `decode_failed`
- `encode_failed`
- `hash_unavailable`

Malformed dimensions, invalid pixel-buffer lengths, empty assets, corrupt
decodes, and failed PNG encodes fail explicitly rather than producing a blank
part.

## 8. Scope boundary

This module does not implement automatic segmentation, inpainting, hidden-body
reconstruction, background removal, color grading, or AI generation. Those
operations require explicit masks, authored replacement parts, or a future
approved provider.
