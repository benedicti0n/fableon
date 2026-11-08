/**
 * Version-1 constants. Supporting a new frame rate, canvas size, or schema
 * shape requires a new explicit schema version rather than silent coercion.
 */
export const PROJECT_FORMAT = "fableon.project" as const;
export const PROJECT_SCHEMA_VERSION = 1 as const;
export const PROJECT_FRAME_RATE = 24 as const;
export const PROJECT_CANVAS_WIDTH = 1920 as const;
export const PROJECT_CANVAS_HEIGHT = 1080 as const;
export const PROJECT_MAX_SEED = 4_294_967_295;

/** Canvas pixel coordinates, degrees, and opacity in the 0..1 range. */
export const DEFAULT_TRANSFORM = Object.freeze({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  opacity: 1,
});

export const TRANSFORM_PROPERTIES = ["x", "y", "scaleX", "scaleY", "rotation", "opacity"] as const;

export const INTERPOLATION_MODES = ["hold", "linear", "easeInOutCubic"] as const;
