# Stage 2C.5 — Mask Editor Validation

## Route

`/studio/folk/rigs/stage-2c` now hosts the interactive precision mask workshop above the existing Stage 2C blueprint review.

## Implemented operations

- Provider and anatomical-part selection.
- Full source sheet display with source hash and dimensions.
- Add-mask brush and erase brush.
- Source-pixel brush diameter.
- Adjustable hardness/feather.
- Zoom, pan, and center.
- Undo / redo with bounded snapshots.
- Mask visibility and source-cell/split guide toggles.
- Numeric source coordinates under the canvas.
- Save a versioned mask revision.
- Load latest or a selected saved revision.
- Revert unsaved work.
- Import an external PNG mask after exact source-dimension validation.
- Extraction preview using the live mask and original source RGB.
- Review-status display.

## Coordinate mapping

Mask edits are always stored in full source-image coordinates. The client maps:

1. pointer client coordinates;
2. canvas bounding rectangle;
3. fitted/letterboxed viewport;
4. zoom and pan;
5. source pixel coordinates.

The saved mask is never a display-resolution mask. The server rejects any mask whose PNG dimensions differ from the source sheet.

## Persistence and concurrency

Revisions are stored under the active data root:

```text
<FABLEON_DATA_DIR>/stage-2c5/masks/<provider>/<part>/
  revision-000001.png
  revision-000001.json
  latest.json
```

Every revision records provider, part, source path/hash, full dimensions, mask path/hash, revision number, creation time, edit origin, review status, technical validity, extraction correctness and articulation compatibility.

- Writes are atomic temp-file + rename.
- A stale `expectedRevision` returns HTTP 409.
- Source-hash mismatch, display-size masks, non-PNG masks and missing alpha are rejected.
- Path traversal is not accepted: provider, part and revision are whitelisted/validated.

## Browser validation

Automated test: `tests/browser/stage-2c5.spec.ts`

Result: **PASS** (1 test, 4.4 s in the isolated Playwright data directory).

The test:

1. opened the real workshop;
2. loaded the real OpenAI arm sheet;
3. selected `handOpen`;
4. painted a brush stroke;
5. erased part of it;
6. undid and redid the eraser;
7. saved revision 1;
8. confirmed the saved PNG hash differs from the seed;
9. previewed the transparent extraction;
10. reloaded the page and selected `handOpen` again;
11. confirmed revision 1 and `review pending` persisted.

Screenshot: `studio-screenshots/mask-editor.png`.

## Limitations

- The editor shows source-cell and wrist/ankle split guides. Full connector calibration remains on `/studio/folk/rigs/connectors`.
- Saving a revision does not artistically approve it. Review status remains `pending`.
- The browser test uses an isolated data directory; its revision is intentionally not a production mask revision.
