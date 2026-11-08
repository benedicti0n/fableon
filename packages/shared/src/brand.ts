/**
 * Product-level brand constants shared by every Fableon surface.
 *
 * Keep user-facing product language here so the web app, future desktop
 * surfaces, and generated documents describe the product consistently.
 */
export const BRAND = {
  name: "Fableon",
  tagline: "Painterly stories, set in motion.",
  description:
    "An AI-native animation studio that turns a single idea into an illustrated, narrated, animated film.",
  phaseLabel: "Phase 1 · Scene timeline",
} as const;

export type Brand = typeof BRAND;
