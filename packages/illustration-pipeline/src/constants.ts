export const ILLUSTRATION_PACK_FORMAT = "fableon.illustration-pack" as const;
export const ILLUSTRATION_PACK_VERSION = 1 as const;
export const ILLUSTRATION_PACK_ARCHIVE_EXTENSION = ".fableon-pack.zip";
export const ILLUSTRATION_PACK_MANIFEST_NAME = "manifest.json";
export const ILLUSTRATION_PACK_PROVENANCE_NAME = "provenance.json";

/** Canonical pivot space for every illustration part. */
export const ILLUSTRATION_PIVOT_SPACE = "source" as const;

/**
 * Default trim threshold. Zero means only fully transparent pixels are
 * removed, preserving intentional low-alpha watercolor edges.
 */
export const DEFAULT_TRIM_ALPHA_THRESHOLD = 0;

export const SUPPORTED_IMAGE_EXTENSIONS = ["png", "webp", "jpg", "jpeg"] as const;
export const PREPARED_IMAGE_EXTENSION = "png" as const;

export const ASSET_CATEGORIES = [
  "character-part",
  "background",
  "midground",
  "foreground",
  "prop",
  "atmosphere",
  "reference",
] as const;

export const PACK_KINDS = ["character", "environment", "prop", "mixed"] as const;

export const PROVENANCE_KINDS = [
  "user-created",
  "artist-created",
  "ai-generated",
  "licensed-third-party",
  "procedurally-generated",
  "diagnostic",
] as const;

export const CHARACTER_PART_ROLES = [
  "body",
  "head",
  "eye",
  "beak",
  "wing-far",
  "wing-near",
  "tail",
  "leg-left",
  "leg-right",
] as const;

export const ENVIRONMENT_LAYER_ROLES = [
  "sky",
  "distant-forest",
  "midground-trees",
  "foreground-trees",
  "landing-branch",
  "atmospheric-light",
  "foreground-details",
] as const;
