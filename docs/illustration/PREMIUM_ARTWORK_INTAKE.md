# Premium Artwork Intake Specification

**Phase:** 2.7  
**Status:** **BLOCKED — PREMIUM SOURCE ARTWORK REQUIRED**  
**Purpose:** Define the exact folder, naming, format, provenance, review, and
preparation contract for premium artwork, without creating a second asset
system.

No premium artwork currently exists in the repository. This document is the
handoff contract for the artwork that must be supplied or generated before
Phase 2.7 can proceed beyond Stage B.

## 1. Authoritative source directories

Place source artwork at the repository root:

```text
assets/
├── premium-bird-v1/
│   ├── references/
│   │   ├── master.png
│   │   ├── wings-raised.png
│   │   ├── wings-lowered.png
│   │   ├── landing.png
│   │   ├── perched.png
│   │   └── turnaround.png
│   ├── parts/
│   │   ├── body.png
│   │   ├── head.png
│   │   ├── eye.png
│   │   ├── beak.png
│   │   ├── wing-near.png
│   │   ├── wing-far.png
│   │   ├── tail.png
│   │   ├── leg-left.png
│   │   └── leg-right.png
│   ├── manifest.json
│   ├── provenance.json
│   └── PROVENANCE.md
└── premium-forest-v1/
    ├── background.png
    ├── distant-trees.png
    ├── midground-trees.png
    ├── foreground-foliage.png
    ├── landing-branch.png
    ├── atmospheric-light.png
    ├── manifest.json
    ├── provenance.json
    └── PROVENANCE.md
```

Rules:

- Lowercase kebab-case filenames.
- Part filenames must use the exact part IDs above.
- Do not commit secrets or provider credentials.
- Do not replace these files with Phase 2.5 procedural or Phase 2.6 diagnostic
  artwork.
- `manifest.json` is produced by exporting from `/studio/assets`; do not
  hand-author a manifest that disagrees with the pack.
- The `assets/` directory is source artwork, not the runtime public asset store.
  Prepared derivatives may be copied to `apps/web/public/assets/` only when a
  benchmark explicitly needs URL-served fixtures.

## 2. Formats and technical requirements

### Character references and parts

- PNG or WebP, 8-bit RGBA sRGB.
- Transparent background for individual parts.
- Master long edge: 3000–4096 px preferred.
- Part long edge: 2048 px or higher where practical.
- Keep intentional soft/watercolor alpha edges; do not hard-key them.
- Consistent registration and scale across parts.
- No JPEG for transparent parts.
- No PSD-only delivery unless a raster export is included.

### Forest

- PNG or lossless source; 1920×1080 minimum, 2560×1440+ preferred.
- Background plate may be opaque; layers must have real transparency.
- No baked-in bird or text.
- Branch must have a clear central contact area.
- Preserve fine painted edges and avoid destructive sharpening/noise.

## 3. Naming and identity

Part role IDs are fixed:

```text
body, head, eye, beak, wing-near, wing-far, tail, leg-left, leg-right
```

Environment roles are fixed:

```text
background, distant-trees, midground-trees, foreground-foliage,
landing-branch, atmospheric-light, foreground-details
```

`background` may substitute for the `sky` role in the pack template. The
preparation workspace maps aliases, but canonical filenames should use the IDs
above.

## 4. Provenance

Each delivery must include `provenance.json` and a human-readable
`PROVENANCE.md`. At minimum:

```json
{
  "packId": "premium-bird-v1",
  "createdAt": "2026-11-09",
  "assets": [
    {
      "path": "parts/wing-near.png",
      "origin": "artist-created",
      "creator": "Illustrator name or approved provider/model",
      "sourceRef": "commission/file version",
      "license": "usage rights",
      "approvedBy": "User/ChatGPT gate reference",
      "notes": "Hidden far-wing surface reconstructed separately."
    }
  ]
}
```

Allowed origins: `user-created`, `artist-created`, `ai-generated`,
`licensed-third-party`, `procedurally-generated`, `diagnostic`.

For AI-generated assets record provider, model/version, prompt reference,
seed/reference image, and approval state. Do not assume an online image is
free to reuse.

## 5. Required views and parts

Character references:

- master three-quarter/full-body;
- neutral;
- wings-raised;
- wings-lowered;
- landing/braking;
- perched;
- turnaround/reference sheet.

Character parts:

- body;
- head;
- eye;
- beak;
- near wing;
- far wing;
- tail;
- left leg;
- right leg.

Every part must share the approved identity, palette, lighting, feather
markings, and scale. Hidden body or far-wing surfaces must be supplied as
authored reconstruction or the pack must remain blocked.

## 6. Intake and validation workflow

Use the existing Phase 2.6 pipeline; do not create another importer.

1. Open `/studio/assets`.
2. Choose Character or Environment mode.
3. Import the source images.
4. Confirm dimensions, alpha, content bounds, trim offsets, hashes, and warnings.
5. Assign files to the fixed part/role IDs.
6. Set source-space pivots and registration.
7. Resolve missing parts, parent mismatches, and unresolved occlusion.
8. Preview neutral and wing poses; check for seams, holes, and identity drift.
9. Export the `.fableon-pack.zip`.
10. Re-import the archive and confirm the same composition.
11. Submit the actual master, poses, prepared pack, and provenance for Gate 2.
12. Only after Gate 2 approval integrate with the existing landing rig.

## 7. Review gates

| Gate                      | Evidence                                               | Status      |
| ------------------------- | ------------------------------------------------------ | ----------- |
| Gate 1 — Master character | Approved master sheet and five poses                   | **BLOCKED** |
| Gate 2 — Prepared artwork | Approved neutral/wing compositions, resolved occlusion | Not started |
| Gate 3 — Final animation  | Actual 48-frame MP4 + representative frames            | Not started |

No automated check can approve identity or artistic quality. Automated checks
supplement human review.

## 8. Practical validation checks

- exact dimensions and alpha bounds;
- source and prepared hashes;
- part completeness and parent/order checks;
- pixel difference between source crop and prepared part (target: 0 or
  documented compression tolerance);
- palette statistics compared with the approved palette;
- registration/pivot overlay inspection;
- silhouette dimensions in neutral and wing poses;
- no visible holes, halos, stretching, or unintended edge damage;
- environment edge preservation and contact-point readability.

Do not invent a single numerical metric that claims to prove artistic identity.
Use measurements to detect drift, not to replace review.

## 9. Current blocker

No approved master character, transparent parts, or premium forest exists. The
repository contains only procedural Phase 2/2.5 art and Phase 2.6 diagnostic
imports. Phase 2.7 therefore remains at Stage A/B and no premium animation will
be rendered until the assets are supplied and approved.
